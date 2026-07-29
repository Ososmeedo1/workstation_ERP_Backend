/**
 * ===========================================
 * StudySpace ERP Backend - User Controller
 * ===========================================
 *
 * Controller for user management operations.
 * Phase 9 focuses on subscription retrieval for members.
 *
 * @file src/Modules/Users/user.controller.js
 * @description User endpoints implementation
 */

const { User, Subscription, Session, Payment, CafeSale } = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');
const { logCreate, logUpdate, logDelete } = require('../../Services/audit.service.js');
const {
  SUBSCRIPTION_STATUS,
  USER_ROLES,
  USER_STATUS,
  SESSION_STATUS
} = require('../../Utils/enum.utils.js');

/**
 * List users with optional filters
 *
 * @route GET /api/users
 * @access Private (Admin)
 */
const listUsers = catchAsync(async (req, res, next) => {
  const {
    role,
    status,
    search,
    page = 1,
    limit = 20,
    sort = 'createdAt:desc'
  } = req.query;

  const filter = {};
  // Default to showing customer records (member role) when no role filter provided
  filter.role = role || USER_ROLES.MEMBER;
  if (status) {filter.status = status;}

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex }
    ];
  }

  // Sort handling
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Users retrieved successfully',
    payload: {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

/**
 * Create a new user
 *
 * @route POST /api/users
 * @access Private (Admin)
 */
const createUser = catchAsync(async (req, res, next) => {
  const { name, email, password, phone, role, status, profileImage } = req.body;
  const adminId = req.user._id;

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    return next(new AppError('Email already exists', 409));
  }

  const userPassword = password || `${name.replace(/\s+/g, '')}@${Math.random().toString(36).slice(2, 8)}`;

  // Customer records always get member role (cannot authenticate)
  const userRole = role || USER_ROLES.MEMBER;

  const user = await User.create({
    name,
    email,
    password: userPassword,
    phone,
    role: userRole,
    status: status || USER_STATUS.ACTIVE,
    profileImage
  });

  await logCreate({
    performedBy: adminId,
    targetModel: 'User',
    targetId: user._id,
    description: `Created user "${user.name}" (${user.email})`,
    metadata: {
      role: user.role,
      status: user.status
    },
    req
  });

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    payload: { user: user.toSafeObject() }
  });
});

/**
 * Update a user (excluding role)
 *
 * @route PUT /api/users/:id
 * @access Private (Admin)
 */
const updateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const { name, email, phone, status, profileImage } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check for email uniqueness if changed
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email }).lean();
    if (emailExists) {
      return next(new AppError('Email already exists', 409));
    }
  }

  const oldValues = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    profileImage: user.profileImage
  };

  if (name !== undefined) {user.name = name;}
  if (email !== undefined) {user.email = email;}
  if (phone !== undefined) {user.phone = phone;}
  if (status !== undefined) {user.status = status;}
  if (profileImage !== undefined) {user.profileImage = profileImage;}

  await user.save();

  await logUpdate({
    performedBy: adminId,
    targetModel: 'User',
    targetId: user._id,
    description: `Updated user "${user.name}" (${user.email})`,
    changes: {
      before: oldValues,
      after: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        profileImage: user.profileImage
      }
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    payload: { user: user.toSafeObject() }
  });
});

/**
 * Deactivate a user (soft delete)
 *
 * @route DELETE /api/users/:id
 * @access Private (Admin)
 */
const deactivateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent deactivation if user has active sessions
  const activeSession = await Session.findOne({
    user: id,
    status: SESSION_STATUS.ACTIVE
  }).lean();
  if (activeSession) {
    return next(new AppError('Cannot deactivate user with active sessions', 400));
  }

  if (user.status === USER_STATUS.INACTIVE) {
    return res.status(200).json({
      status: 'success',
      message: 'User is already inactive',
      payload: { user: user.toSafeObject() }
    });
  }

  user.status = USER_STATUS.INACTIVE;
  await user.save();

  await logDelete({
    performedBy: adminId,
    targetModel: 'User',
    targetId: user._id,
    description: `Deactivated user "${user.name}" (${user.email})`,
    changes: {
      before: { status: USER_STATUS.ACTIVE },
      after: { status: USER_STATUS.INACTIVE }
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'User deactivated successfully',
    payload: { user: user.toSafeObject() }
  });
});

/**
 * Reactivate a user
 *
 * @route PUT /api/users/:id/activate
 * @access Private (Admin)
 */
const activateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const user = await User.findByIdAndUpdate(
    id,
    { status: USER_STATUS.ACTIVE },
    { new: true, runValidators: true }
  );
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  await logUpdate({
    performedBy: adminId,
    targetModel: 'User',
    targetId: user._id,
    description: `Activated user "${user.name}" (${user.email})`,
    changes: {
      before: { status: USER_STATUS.INACTIVE },
      after: { status: USER_STATUS.ACTIVE }
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'User activated successfully',
    payload: { user: user.toSafeObject() }
  });
});

/**
 * Hard delete a customer and all their data
 *
 * @route DELETE /api/users/:id/hard
 * @access Private (Admin)
 */
const deleteUserAndData = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role !== USER_ROLES.MEMBER) {
    return next(new AppError('Only customer accounts can be fully deleted', 400));
  }

  const activeSession = await Session.findOne({
    user: id,
    status: SESSION_STATUS.ACTIVE
  }).lean();
  if (activeSession) {
    return next(new AppError('Cannot delete user with active sessions. Cancel their session first.', 400));
  }

  await Promise.all([
    Session.deleteMany({ user: id }),
    Payment.deleteMany({ paidBy: id }),
    CafeSale.deleteMany({ customerId: id }),
    Subscription.deleteMany({ user: id })
  ]);

  await logDelete({
    performedBy: adminId,
    targetModel: 'User',
    targetId: user._id,
    description: `Deleted user "${user.name}" (${user.email}) and all associated data`,
    req
  });

  await User.findByIdAndDelete(id);

  res.status(200).json({
    status: 'success',
    message: 'User and all associated data deleted successfully'
  });
});

/**
 * Update user role
 *
 * @route PUT /api/users/:id/role
 * @access Private (Admin)
 */
const updateUserRole = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body;
  const adminId = req.user._id;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  await logUpdate({
    performedBy: adminId,
    targetModel: 'User',
    targetId: user._id,
    description: `Updated role for user "${user.name}" (${user.email})`,
    changes: {
      before: { role: oldRole },
      after: { role: user.role }
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully',
    payload: { user: user.toSafeObject() }
  });
});

/**
 * Create a subscription for a user
 *
 * @route POST /api/users/:id/subscriptions
 * @access Private (Admin)
 */
const createUserSubscription = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    planName,
    planType,
    price,
    startDate,
    endDate,
    status,
    hoursIncluded,
    hoursUsed
  } = req.body;
  const adminId = req.user._id;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Validate hours usage
  if (hoursIncluded !== undefined && hoursUsed !== undefined && hoursUsed > hoursIncluded) {
    return next(new AppError('Hours used cannot exceed hours included', 400));
  }

  const subscription = await Subscription.create({
    user: id,
    planName,
    planType,
    price,
    startDate,
    endDate,
    status: status || SUBSCRIPTION_STATUS.ACTIVE,
    hoursIncluded: hoursIncluded !== undefined ? hoursIncluded : null,
    hoursUsed: hoursUsed !== undefined ? hoursUsed : 0,
    createdBy: adminId
  });

  await logCreate({
    performedBy: adminId,
    targetModel: 'Subscription',
    targetId: subscription._id,
    description: `Created subscription for user "${user.name}" (${user.email})`,
    metadata: {
      planName: subscription.planName,
      planType: subscription.planType,
      status: subscription.status
    },
    req
  });

  res.status(201).json({
    status: 'success',
    message: 'Subscription created successfully',
    payload: { subscription }
  });
});

/**
 * Get subscriptions for a specific user (T155)
 *
 * @route GET /api/users/:id/subscriptions
 * @access Private (Member can only access own, Staff/Admin can access any)
 *
 * Query params:
 * - status (optional): filter by subscription status
 */
const getUserSubscriptions = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.query;

  // Verify user exists
  const user = await User.findById(id).select('name role status').lean();
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Member can only access their own subscriptions
  if (req.user.role === USER_ROLES.MEMBER && req.user._id.toString() !== id) {
    return next(new AppError('You can only access your own subscriptions', 403));
  }

  // Build query filter
  const query = { user: id };
  if (status) {
    query.status = status;
  }

  // Fetch subscriptions
  const subscriptions = await Subscription.find(query)
    .populate('createdBy', 'name email')
    .sort({ startDate: -1 })
    .lean();

  // Determine active subscription (if any)
  const activeSubscription = subscriptions.find(sub => sub.status === SUBSCRIPTION_STATUS.ACTIVE) || null;

  res.status(200).json({
    status: 'success',
    message: 'Subscriptions retrieved successfully',
    payload: {
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        status: user.status
      },
      subscriptions,
      activeSubscription
    }
  });
});

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUserAndData,
  updateUserRole,
  getUserSubscriptions,
  createUserSubscription
};