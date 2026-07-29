/**
 * ===========================================
 * StudySpace ERP Backend - Auth Controller
 * ===========================================
 *
 * Controller for authentication operations.
 * Handles registration, login, and current user profile.
 *
 * Features:
 * - User registration with role assignment
 * - Login with attempt tracking and rate limiting (T103)
 * - Audit logging for auth events (T104)
 * - JWT token generation
 *
 * @file src/Modules/Auth/auth.controller.js
 * @description Auth endpoints implementation
 * @tasks T103, T104
 */

const { User } = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');
const { generateToken } = require('../../Services/jwt.service.js');
const { logLogin, logLogout, createAuditLog } = require('../../Services/audit.service.js');
const { USER_ROLES, AUDIT_ACTIONS } = require('../../Utils/enum.utils.js');

/**
 * In-memory store for login attempt tracking (T103)
 * In production, this should use Redis or similar for distributed systems
 *
 * Structure: { email: { attempts: number, lastAttempt: Date, lockedUntil: Date | null } }
 */
const loginAttempts = new Map();

/**
 * Configuration for login attempt limiting (T103)
 */
const LOGIN_CONFIG = {
  // Maximum failed attempts before lockout
  MAX_ATTEMPTS: 5,
  // Time window for counting attempts (in milliseconds) - 15 minutes
  ATTEMPT_WINDOW_MS: 15 * 60 * 1000,
  // Lockout duration (in milliseconds) - 15 minutes
  LOCKOUT_DURATION_MS: 15 * 60 * 1000
};

/**
 * Check if an email is currently locked out due to failed attempts (T103)
 *
 * @param {string} email - Email to check
 * @returns {Object} { isLocked: boolean, remainingTime: number | null, attempts: number }
 */
const checkLoginLockout = (email) => {
  const record = loginAttempts.get(email.toLowerCase());

  if (!record) {
    return { isLocked: false, remainingTime: null, attempts: 0 };
  }

  const now = Date.now();

  // Check if lockout has expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    // Lockout expired - reset the record
    loginAttempts.delete(email.toLowerCase());
    return { isLocked: false, remainingTime: null, attempts: 0 };
  }

  // Check if still in lockout period
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingTime = Math.ceil((record.lockedUntil - now) / 1000 / 60); // in minutes
    return { isLocked: true, remainingTime, attempts: record.attempts };
  }

  // Check if attempt window has expired
  if (now - record.lastAttempt > LOGIN_CONFIG.ATTEMPT_WINDOW_MS) {
    // Window expired - reset the record
    loginAttempts.delete(email.toLowerCase());
    return { isLocked: false, remainingTime: null, attempts: 0 };
  }

  return { isLocked: false, remainingTime: null, attempts: record.attempts };
};

/**
 * Record a failed login attempt (T103)
 *
 * @param {string} email - Email that failed to login
 * @returns {Object} { attempts: number, isNowLocked: boolean, lockoutMinutes: number | null }
 */
const recordFailedAttempt = (email) => {
  const emailLower = email.toLowerCase();
  const now = Date.now();
  const record = loginAttempts.get(emailLower) || { attempts: 0, lastAttempt: null, lockedUntil: null };

  // Reset if outside the attempt window
  if (record.lastAttempt && now - record.lastAttempt > LOGIN_CONFIG.ATTEMPT_WINDOW_MS) {
    record.attempts = 0;
  }

  // Increment attempts
  record.attempts += 1;
  record.lastAttempt = now;

  // Check if we should lock the account
  if (record.attempts >= LOGIN_CONFIG.MAX_ATTEMPTS) {
    record.lockedUntil = now + LOGIN_CONFIG.LOCKOUT_DURATION_MS;
    loginAttempts.set(emailLower, record);
    return {
      attempts: record.attempts,
      isNowLocked: true,
      lockoutMinutes: LOGIN_CONFIG.LOCKOUT_DURATION_MS / 1000 / 60
    };
  }

  loginAttempts.set(emailLower, record);
  return {
    attempts: record.attempts,
    isNowLocked: false,
    lockoutMinutes: null,
    remainingAttempts: LOGIN_CONFIG.MAX_ATTEMPTS - record.attempts
  };
};

/**
 * Reset login attempts on successful login (T103)
 *
 * @param {string} email - Email to reset attempts for
 */
const resetLoginAttempts = (email) => {
  loginAttempts.delete(email.toLowerCase());
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, password, phone, role } = req.body;

  // Check if email already exists
  const isEmailExist = await User.findOne({ email }).lean();
  if (isEmailExist) {
    return next(new AppError('Email is already in use', 409));
  }

  // Determine role (default to MEMBER if not specified)
  const userRole = role || USER_ROLES.MEMBER;

  // Create user
  const newUser = await User.create({
    name,
    email,
    password,
    phone,
    role: userRole
  });

  // Generate token
  const token = generateToken({
    payload: {
      id: newUser._id,
      email: newUser.email,
      role: newUser.role
    }
  });

  // Log the registration event (T104)
  await createAuditLog({
    action: AUDIT_ACTIONS.USER_CREATE,
    performedBy: newUser._id,
    targetModel: 'User',
    targetId: newUser._id,
    description: `New user registered: ${newUser.email} (role: ${newUser.role})`,
    metadata: {
      email: newUser.email,
      role: newUser.role,
      registrationMethod: 'self'
    },
    req
  });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    payload: {
      user: newUser.toSafeObject(),
      token
    }
  });
});

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 *
 * Security features (T103):
 * - Tracks failed login attempts
 * - Locks account after MAX_ATTEMPTS failures
 * - Resets counter on successful login
 *
 * Audit logging (T104):
 * - Logs successful logins
 * - Logs failed login attempts
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if account is locked due to failed attempts (T103)
  const lockStatus = checkLoginLockout(email);
  if (lockStatus.isLocked) {
    // Log the blocked attempt (T104)
    await createAuditLog({
      action: AUDIT_ACTIONS.USER_LOGIN,
      performedBy: null, // Unknown user
      targetModel: 'User',
      targetId: null,
      description: `Login blocked for ${email} - account temporarily locked`,
      metadata: {
        email,
        reason: 'account_locked',
        remainingMinutes: lockStatus.remainingTime
      },
      req
    });

    return next(new AppError(
      `Too many failed login attempts. Please try again in ${lockStatus.remainingTime} minutes.`,
      429 // Too Many Requests
    ));
  }

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    // Record failed attempt (T103)
    const attemptResult = recordFailedAttempt(email);

    // Log failed attempt (T104)
    await createAuditLog({
      action: AUDIT_ACTIONS.USER_LOGIN,
      performedBy: null,
      targetModel: 'User',
      targetId: null,
      description: `Failed login attempt for ${email} - user not found`,
      metadata: {
        email,
        reason: 'user_not_found',
        attemptNumber: attemptResult.attempts,
        isNowLocked: attemptResult.isNowLocked
      },
      req
    });

    // Return generic error to prevent email enumeration
    if (attemptResult.isNowLocked) {
      return next(new AppError(
        `Invalid email or password. Account locked for ${attemptResult.lockoutMinutes} minutes due to too many failed attempts.`,
        401
      ));
    }

    return next(new AppError(
      `Invalid email or password. ${attemptResult.remainingAttempts} attempts remaining.`,
      401
    ));
  }

  // Check password
  const isMatch = await user.isPasswordMatch(password);
  if (!isMatch) {
    // Record failed attempt (T103)
    const attemptResult = recordFailedAttempt(email);

    // Log failed attempt (T104)
    await createAuditLog({
      action: AUDIT_ACTIONS.USER_LOGIN,
      performedBy: user._id,
      targetModel: 'User',
      targetId: user._id,
      description: `Failed login attempt for ${email} - incorrect password`,
      metadata: {
        email,
        userId: user._id.toString(),
        reason: 'incorrect_password',
        attemptNumber: attemptResult.attempts,
        isNowLocked: attemptResult.isNowLocked
      },
      req
    });

    if (attemptResult.isNowLocked) {
      return next(new AppError(
        `Invalid email or password. Account locked for ${attemptResult.lockoutMinutes} minutes due to too many failed attempts.`,
        401
      ));
    }

    return next(new AppError(
      `Invalid email or password. ${attemptResult.remainingAttempts} attempts remaining.`,
      401
    ));
  }

  // Check if user account is active
  if (user.status !== 'active') {
    // Log inactive account login attempt (T104)
    await createAuditLog({
      action: AUDIT_ACTIONS.USER_LOGIN,
      performedBy: user._id,
      targetModel: 'User',
      targetId: user._id,
      description: `Login attempt for inactive account: ${email}`,
      metadata: {
        email,
        userId: user._id.toString(),
        reason: 'account_inactive',
        accountStatus: user.status
      },
      req
    });

    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  // Single-operator system: only admin role can authenticate
  if (user.role !== USER_ROLES.ADMIN) {
    return next(new AppError('Access denied. Only operator accounts can log in.', 403));
  }

  // Successful login - reset failed attempts (T103)
  resetLoginAttempts(email);

  // Generate token
  const token = generateToken({
    payload: {
      id: user._id,
      email: user.email,
      role: user.role
    }
  });

  // Log successful login (T104)
  await logLogin({
    performedBy: user._id,
    targetId: user._id,
    description: `User logged in: ${user.email}`,
    metadata: {
      email: user.email,
      role: user.role
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully',
    payload: {
      user: user.toSafeObject(),
      token
    }
  });
});

/**
 * Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
const getMe = catchAsync(async (req, res, next) => {
  // User is already attached to req by auth middleware
  const user = req.user.toSafeObject();

  res.status(200).json({
    status: 'success',
    payload: {
      user
    }
  });
});

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 *
 * Audit logging (T104):
 * - Logs logout events for security tracking
 */
const logout = catchAsync(async (req, res, next) => {
  // Log the logout event (T104)
  await logLogout({
    performedBy: req.user._id,
    targetId: req.user._id,
    description: `User logged out: ${req.user.email}`,
    metadata: {
      email: req.user.email,
      role: req.user.role
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

module.exports = {
  register,
  login,
  getMe,
  logout
};
