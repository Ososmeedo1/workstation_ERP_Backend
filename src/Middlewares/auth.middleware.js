/**
 * ===========================================
 * StudySpace ERP Backend - Auth Middleware
 * ===========================================
 *
 * Middleware for authentication and authorization.
 * Protects routes by verifying JWT tokens and checking user roles.
 *
 * @file src/Middlewares/auth.middleware.js
 * @description Authentication and authorization middlewares
 */

const { verifyToken } = require('../Services/jwt.service.js');
const { User } = require('../../DB/Models/index.js');
const { AppError } = require('../Utils/error-class.utils.js');
const { catchAsync } = require('./error-handle.middleware.js');
const { USER_STATUS } = require('../Utils/enum.utils.js');

/**
 * Middleware to protect routes requiring authentication
 * Verifies JWT token and attaches user to request
 */
const auth = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  let decoded;
  try {
    decoded = verifyToken({ token });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }

    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user is active
  if (currentUser.status !== USER_STATUS.ACTIVE) {
    return next(
      new AppError('Your account is inactive. Please contact support.', 403)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

/**
 * Middleware to restrict access to specific roles
 * @param {string[]} roles - Array of allowed roles
 */
const requireRole = (roles = []) => {
  return (req, res, next) => {
    // roles param can be a single string or an array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

module.exports = {
  auth,
  requireRole
};
