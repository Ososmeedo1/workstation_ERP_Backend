/**
 * ===========================================
 * StudySpace ERP Backend - Session Controller
 * ===========================================
 *
 * Controller for session management operations.
 * Handles check-in, check-out, and session tracking.
 *
 * Session workflow:
 * 1. Check-in: Creates session, increments room occupancy
 * 2. Session active: User uses the room
 * 3. Check-out: Ends session, calculates duration/amount, decrements occupancy
 * 4. Payment: Recorded separately via Payment module
 *
 * @file src/Modules/Sessions/session.controller.js
 * @description Session endpoints implementation
 */

const { Session, Room, User, Workspace } = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');
const { logCreate, logUpdate } = require('../../Services/audit.service.js');
const { calculateDuration, calculateAmount, getCurrentTimestamp } = require('./session.utils.js');
const { SESSION_STATUS, PAYMENT_STATUS, USER_STATUS } = require('../../Utils/enum.utils.js');

/**
 * Check in a user to a room (create new session)
 *
 * @route POST /api/sessions/checkin
 * @access Private (Staff, Admin)
 *
 * This function:
 * 1. Validates user, room, and workspace exist
 * 2. Checks room has available capacity
 * 3. Checks user doesn't have an active session
 * 4. Creates the session
 * 5. Increments room occupancy
 * 6. Logs the action for audit
 */
const checkIn = catchAsync(async (req, res, next) => {
  const { user: userId, room: roomId, workspace: workspaceId, notes } = req.body;
  const staffId = req.user._id;

  // Verify user exists and is active
  const user = await User.findById(userId).lean();
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  if (user.status === USER_STATUS.INACTIVE) {
    return next(new AppError('Customer account is inactive. Cannot check in.', 400));
  }

  // Verify room exists and is active
  const room = await Room.findById(roomId).lean();
  if (!room) {
    return next(new AppError('Room not found', 404));
  }
  if (!room.isActive) {
    return next(new AppError('Room is not available', 400));
  }

  // Verify workspace exists
  const workspace = await Workspace.findById(workspaceId).lean();
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  // Verify room belongs to workspace
  if (room.workspace.toString() !== workspaceId) {
    return next(new AppError('Room does not belong to specified workspace', 400));
  }

  // Check room has available capacity
  if (room.currentOccupancy >= room.capacity) {
    return next(new AppError('Room is at full capacity', 400));
  }

  // Check user doesn't have an active session
  const activeSession = await Session.findOne({
    user: userId,
    status: SESSION_STATUS.ACTIVE
  }).lean();
  if (activeSession) {
    return next(new AppError('User already has an active session', 400));
  }

  // Create the session
  const session = await Session.create({
    user: userId,
    room: roomId,
    workspace: workspaceId,
    checkIn: getCurrentTimestamp(),
    status: SESSION_STATUS.ACTIVE,
    hourlyRate: room.hourlyRate,
    paymentStatus: PAYMENT_STATUS.PENDING,
    checkedInBy: staffId,
    notes: notes || ''
  });

  // Increment room occupancy
  await Room.findByIdAndUpdate(roomId, {
    $inc: { currentOccupancy: 1 }
  });

  // Populate session data for response
  await session.populate([
    { path: 'user', select: 'name email phone' },
    { path: 'room', select: 'name type hourlyRate' },
    { path: 'workspace', select: 'name' },
    { path: 'checkedInBy', select: 'name' }
  ]);

  // Log the check-in action for audit (T081)
  await logCreate({
    performedBy: staffId,
    targetModel: 'Session',
    targetId: session._id,
    description: `Checked in user "${user.name}" to room "${room.name}"`,
    metadata: {
      userName: user.name,
      roomName: room.name,
      workspaceName: workspace.name,
      checkInTime: session.checkIn
    },
    req
  });

  res.status(201).json({
    status: 'success',
    message: 'User checked in successfully',
    payload: { session }
  });
});

/**
 * Check out a user from a room (end session)
 *
 * @route POST /api/sessions/:id/checkout
 * @access Private (Staff, Admin)
 *
 * This function:
 * 1. Validates session exists and is active
 * 2. Sets checkout time
 * 3. Calculates duration and amount
 * 4. Updates session status to completed
 * 5. Decrements room occupancy
 * 6. Logs the action for audit
 */
const checkOut = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { notes } = req.body || {};
  const staffId = req.user._id;

  // Find the session
  const session = await Session.findById(id)
    .populate('user', 'name email')
    .populate('room', 'name type');

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  // Verify session is active
  if (session.status !== SESSION_STATUS.ACTIVE) {
    return next(new AppError('Session is not active', 400));
  }

  // Set checkout time
  const checkOutTime = getCurrentTimestamp();

  // Calculate duration using Luxon utility (T074)
  const duration = calculateDuration(session.checkIn, checkOutTime);

  // Calculate total amount (T074)
  const totalAmount = calculateAmount(duration.totalMinutes, session.hourlyRate);

  // Store old values for audit
  const oldStatus = session.status;

  // Update session with checkout info
  session.checkOut = checkOutTime;
  session.status = SESSION_STATUS.COMPLETED;
  session.durationMinutes = duration.totalMinutes;
  session.totalAmount = totalAmount;
  session.checkedOutBy = staffId;

  if (notes) {
    session.notes = session.notes ? `${session.notes}\n${notes}` : notes;
  }

  await session.save();

  // Decrement room occupancy (T073)
  await Room.findByIdAndUpdate(session.room._id, {
    $inc: { currentOccupancy: -1 }
  });

  // Log the check-out action for audit (T082)
  await logUpdate({
    performedBy: staffId,
    targetModel: 'Session',
    targetId: session._id,
    description: `Checked out user "${session.user.name}" from room "${session.room.name}"`,
    changes: {
      before: { status: oldStatus },
      after: {
        status: session.status,
        checkOut: checkOutTime,
        durationMinutes: duration.totalMinutes,
        totalAmount
      }
    },
    metadata: {
      userName: session.user.name,
      roomName: session.room.name,
      duration: duration.formatted,
      totalAmount
    },
    req
  });

  // Populate staff info for response
  await session.populate('checkedOutBy', 'name');

  res.status(200).json({
    status: 'success',
    message: 'User checked out successfully',
    payload: {
      session,
      duration: duration.formatted,
      totalAmount
    }
  });
});

/**
 * List sessions with filters
 *
 * @route GET /api/sessions
 * @access Private (Staff, Admin)
 */
const listSessions = catchAsync(async (req, res, next) => {
  const {
    user,
    room,
    workspace,
    status,
    paymentStatus,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sort = 'checkIn:desc'
  } = req.query;

  // Build filter object
  const filter = {};

  if (user) {filter.user = user;}
  if (room) {filter.room = room;}
  if (workspace) {filter.workspace = workspace;}
  if (status) {filter.status = status;}
  if (paymentStatus) {filter.paymentStatus = paymentStatus;}

  // Date range filter
  if (startDate || endDate) {
    filter.checkIn = {};
    if (startDate) {filter.checkIn.$gte = new Date(startDate);}
    if (endDate) {filter.checkIn.$lte = new Date(endDate);}
  }

  // Parse sort parameter
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;

  // Build and execute query
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .select('user room workspace status paymentStatus checkIn checkOut durationMinutes totalAmount hourlyRate payment checkedInBy checkedOutBy createdAt')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email phone')
      .populate('room', 'name type hourlyRate')
      .populate('workspace', 'name')
      .populate('checkedInBy', 'name')
      .populate('checkedOutBy', 'name')
      .lean(),
    Session.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Sessions retrieved successfully',
    payload: {
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * Get all active sessions
 *
 * @route GET /api/sessions/active
 * @access Private (Staff, Admin)
 */
const getActiveSessions = catchAsync(async (req, res, next) => {
  const { room, workspace } = req.query;

  // Build filter
  const filter = { status: SESSION_STATUS.ACTIVE };

  if (room) {filter.room = room;}
  if (workspace) {filter.workspace = workspace;}

  const sessions = await Session.find(filter)
    .select('user room workspace status paymentStatus checkIn hourlyRate checkedInBy createdAt')
    .populate('user', 'name email phone')
    .populate('room', 'name type hourlyRate capacity currentOccupancy')
    .populate('workspace', 'name')
    .populate('checkedInBy', 'name')
    .sort({ checkIn: -1 })
    .lean();

  // Add current duration to each session
  const now = getCurrentTimestamp();
  const sessionsWithDuration = sessions.map(session => {
    const duration = calculateDuration(session.checkIn, now);
    const currentAmount = calculateAmount(duration.totalMinutes, session.hourlyRate);
    return {
      ...session,
      currentDuration: duration.formatted,
      currentDurationMinutes: duration.totalMinutes,
      currentAmount
    };
  });

  res.status(200).json({
    status: 'success',
    message: 'Active sessions retrieved successfully',
    payload: {
      sessions: sessionsWithDuration,
      count: sessionsWithDuration.length
    }
  });
});

/**
 * Get a single session by ID
 *
 * @route GET /api/sessions/:id
 * @access Private (Staff, Admin)
 */
const getSession = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const session = await Session.findById(id)
    .populate('user', 'name email phone')
    .populate('room', 'name type hourlyRate')
    .populate('workspace', 'name')
    .populate('checkedInBy', 'name')
    .populate('checkedOutBy', 'name')
    .populate('payment')
    .lean();

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  // If session is active, add current duration
  const responseData = { session };
  if (session.status === SESSION_STATUS.ACTIVE) {
    const duration = calculateDuration(session.checkIn, getCurrentTimestamp());
    responseData.currentDuration = duration.formatted;
    responseData.currentAmount = calculateAmount(duration.totalMinutes, session.hourlyRate);
  }

  res.status(200).json({
    status: 'success',
    message: 'Session retrieved successfully',
    payload: responseData
  });
});

/**
 * Get session history for the logged-in member (T153)
 *
 * @route GET /api/sessions/my-history
 * @access Private (Member, Staff, Admin)
 *
 * This function retrieves the authenticated user's session history.
 * Supports pagination and filtering by status and date range.
 */
const getMySessionHistory = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const {
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = req.query;

  // Build query filter - always filter by current user
  const query = { user: userId };

  // Filter by status if provided
  if (status) {
    query.status = status;
  }

  // Filter by date range if provided (T153)
  if (startDate || endDate) {
    query.checkIn = {};
    if (startDate) {
      query.checkIn.$gte = new Date(startDate);
    }
    if (endDate) {
      query.checkIn.$lte = new Date(endDate);
    }
  }

  // Calculate pagination values
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Get total count for pagination
  const total = await Session.countDocuments(query);

  // Fetch sessions with pagination, sorted by most recent first
  const sessions = await Session.find(query)
    .select('room workspace status checkIn checkOut durationMinutes totalAmount hourlyRate createdAt')
    .populate('room', 'name type')
    .populate('workspace', 'name')
    .sort({ checkIn: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Enhance sessions with calculated duration for active sessions
  const enhancedSessions = sessions.map(session => {
    if (session.status === SESSION_STATUS.ACTIVE) {
      const duration = calculateDuration(session.checkIn, getCurrentTimestamp());
      return {
        ...session,
        currentDuration: duration.formatted,
        currentAmount: calculateAmount(duration.totalMinutes, session.hourlyRate)
      };
    }
    return session;
  });

  // Calculate summary statistics for the member (T153)
  const stats = await Session.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalMinutes: { $sum: '$durationMinutes' },
        totalSpent: { $sum: '$totalAmount' },
        completedSessions: {
          $sum: { $cond: [{ $eq: ['$status', SESSION_STATUS.COMPLETED] }, 1, 0] }
        }
      }
    }
  ]);

  const summary = stats.length > 0 ? {
    totalSessions: stats[0].totalSessions,
    totalMinutes: stats[0].totalMinutes || 0,
    totalSpent: stats[0].totalSpent || 0,
    completedSessions: stats[0].completedSessions
  } : {
    totalSessions: 0,
    totalMinutes: 0,
    totalSpent: 0,
    completedSessions: 0
  };

  res.status(200).json({
    status: 'success',
    message: 'Session history retrieved successfully',
    payload: {
      sessions: enhancedSessions,
      summary,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

/**
 * Cancel an active session (no charge)
 *
 * @route POST /api/sessions/:id/cancel
 * @access Private (Staff, Admin)
 */
const cancelSession = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const staffId = req.user._id;

  const session = await Session.findById(id)
    .populate('user', 'name email')
    .populate('room', 'name');

  if (!session) {
    return next(new AppError('Session not found', 404));
  }

  if (session.status !== SESSION_STATUS.ACTIVE) {
    return next(new AppError('Only active sessions can be cancelled', 400));
  }

  const oldStatus = session.status;

  session.status = SESSION_STATUS.CANCELLED;
  session.checkOut = getCurrentTimestamp();
  session.checkedOutBy = staffId;
  session.totalAmount = 0;
  session.durationMinutes = 0;
  await session.save();

  await Room.findByIdAndUpdate(session.room._id, {
    $inc: { currentOccupancy: -1 }
  });

  await logUpdate({
    performedBy: staffId,
    targetModel: 'Session',
    targetId: session._id,
    description: `Cancelled session for user "${session.user.name}" in room "${session.room.name}"`,
    changes: {
      before: { status: oldStatus },
      after: { status: SESSION_STATUS.CANCELLED }
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Session cancelled successfully',
    payload: { session }
  });
});

module.exports = {
  checkIn,
  checkOut,
  cancelSession,
  listSessions,
  getActiveSessions,
  getSession,
  getMySessionHistory
};
