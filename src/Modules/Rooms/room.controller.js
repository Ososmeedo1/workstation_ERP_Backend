/**
 * ===========================================
 * StudySpace ERP Backend - Room Controller
 * ===========================================
 *
 * Controller for room management operations.
 * Handles CRUD operations and availability queries.
 *
 * Room Deactivation Rules (T122):
 * - Soft delete: rooms are deactivated, not removed from DB
 * - Deactivated rooms cannot be used for new sessions
 * - Existing active sessions continue until checkout
 * - Audit logs track all create/update/deactivate actions
 *
 * @file src/Modules/Rooms/room.controller.js
 * @description Room endpoints implementation
 */

const { Room, Workspace, Session } = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');
const { logCreate, logUpdate, logDelete } = require('../../Services/audit.service.js');
const { SESSION_STATUS } = require('../../Utils/enum.utils.js');

/**
 * List all rooms with optional filters
 *
 * @route GET /api/rooms
 * @access Private (Staff, Admin)
 *
 * Query params:
 * - workspace: Filter by workspace ID
 * - type: Filter by room type (public/private/silent)
 * - isActive: Filter by active status
 * - available: Only show rooms with available capacity
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sort: Sort field:direction (default: name:asc)
 */
const listRooms = catchAsync(async (req, res, next) => {
  const {
    workspace,
    type,
    isActive = true,
    available,
    page = 1,
    limit = 20,
    sort = 'name:asc'
  } = req.query;

  // Build filter object
  const filter = {};

  if (workspace) {
    filter.workspace = workspace;
  }

  if (type) {
    filter.type = type;
  }

  // Default to showing only active rooms unless explicitly requested
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }

  // Build query
  let query = Room.find(filter)
    .select('name type capacity hourlyRate currentOccupancy isActive workspace createdAt');

  // If filtering for available rooms, add occupancy condition
  if (available === 'true' || available === true) {
    query = query.where('$expr').equals({
      $lt: ['$currentOccupancy', '$capacity']
    });
  }

  // Parse sort parameter
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;
  query = query.sort({ [sortField]: sortOrder });

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  query = query.skip(skip).limit(parseInt(limit));

  // Populate workspace name for display
  query = query.populate('workspace', 'name');

  // Execute query and count
  const [rooms, total] = await Promise.all([
    query.lean(),
    Room.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Rooms retrieved successfully',
    payload: {
      rooms,
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
 * Get a single room by ID
 *
 * @route GET /api/rooms/:id
 * @access Private (Staff, Admin)
 */
const getRoom = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const room = await Room.findById(id)
    .populate('workspace', 'name address')
    .lean();

  if (!room) {
    return next(new AppError('Room not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Room retrieved successfully',
    payload: { room }
  });
});

/**
 * Create a new room
 *
 * @route POST /api/rooms
 * @access Private (Admin only)
 */
const createRoom = catchAsync(async (req, res, next) => {
  const { workspace, name, type, capacity, hourlyRate, description } = req.body;

  // Verify workspace exists
  const workspaceExists = await Workspace.findById(workspace).lean();
  if (!workspaceExists) {
    return next(new AppError('Workspace not found', 404));
  }

  // Check for duplicate room name in same workspace
  const existingRoom = await Room.findOne({ workspace, name }).lean();
  if (existingRoom) {
    return next(new AppError('A room with this name already exists in this workspace', 409));
  }

  // Create the room
  const room = await Room.create({
    workspace,
    name,
    type,
    capacity,
    hourlyRate,
    description: description || '',
    currentOccupancy: 0,
    isActive: true
  });

  // Log the creation for audit
  await logCreate({
    performedBy: req.user._id,
    targetModel: 'Room',
    targetId: room._id,
    description: `Created room "${room.name}" in workspace`,
    req
  });

  res.status(201).json({
    status: 'success',
    message: 'Room created successfully',
    payload: { room }
  });
});

/**
 * Update an existing room
 *
 * @route PUT /api/rooms/:id
 * @access Private (Admin only)
 */
const updateRoom = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  // Find the room first to get old values for audit
  const room = await Room.findById(id);
  if (!room) {
    return next(new AppError('Room not found', 404));
  }

  // If changing name, check for duplicates
  if (updateData.name && updateData.name !== room.name) {
    const existingRoom = await Room.findOne({
      workspace: room.workspace,
      name: updateData.name,
      _id: { $ne: id }
    }).lean();
    if (existingRoom) {
      return next(new AppError('A room with this name already exists in this workspace', 409));
    }
  }

  // Store old values for audit log
  const oldValues = {
    name: room.name,
    type: room.type,
    capacity: room.capacity,
    hourlyRate: room.hourlyRate,
    isActive: room.isActive
  };

  // Update the room
  Object.assign(room, updateData);
  await room.save();

  // Log the update for audit
  await logUpdate({
    performedBy: req.user._id,
    targetModel: 'Room',
    targetId: room._id,
    description: `Updated room "${room.name}"`,
    changes: {
      before: oldValues,
      after: updateData
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Room updated successfully',
    payload: { room }
  });
});

/**
 * Get room availability status
 * Returns all rooms with their current availability
 * Real-time calculation based on active sessions (T123)
 *
 * @route GET /api/rooms/availability
 * @access Private (All authenticated users)
 */
const getRoomAvailability = catchAsync(async (req, res, next) => {
  const { workspace } = req.query;

  const filter = { isActive: true };
  if (workspace) {
    filter.workspace = workspace;
  }

  // Get all active rooms
  const rooms = await Room.find(filter)
    .select('name type capacity currentOccupancy hourlyRate description')
    .populate('workspace', 'name')
    .lean();

  // For real-time accuracy, recalculate occupancy from active sessions (T123)
  // This ensures occupancy is always accurate even if updates were missed
  const roomIds = rooms.map(r => r._id);

  const occupancyCounts = await Session.aggregate([
    {
      $match: {
        room: { $in: roomIds },
        status: SESSION_STATUS.ACTIVE
      }
    },
    {
      $group: {
        _id: '$room',
        activeCount: { $sum: 1 }
      }
    }
  ]);

  // Create a map for quick lookup
  const occupancyMap = {};
  occupancyCounts.forEach(oc => {
    occupancyMap[oc._id.toString()] = oc.activeCount;
  });

  // Add availability info to each room with real-time occupancy
  const roomsWithAvailability = rooms.map(room => {
    // Use real-time count from sessions, fallback to stored value
    const realTimeOccupancy = occupancyMap[room._id.toString()] || 0;
    const availableSpots = room.capacity - realTimeOccupancy;

    return {
      ...room,
      currentOccupancy: realTimeOccupancy,
      availableSpots: Math.max(0, availableSpots),
      isAvailable: realTimeOccupancy < room.capacity,
      occupancyPercentage: Math.round((realTimeOccupancy / room.capacity) * 100)
    };
  });

  res.status(200).json({
    status: 'success',
    message: 'Room availability retrieved successfully',
    payload: { rooms: roomsWithAvailability }
  });
});

/**
 * Deactivate a room (soft delete) - T122
 * Does NOT remove the room from database.
 * Prevents the room from being used in new sessions.
 *
 * Business Rules:
 * - Rooms with active sessions can still be deactivated
 * - Active sessions continue until checkout
 * - Deactivated rooms won't appear in check-in room selection
 * - Admins can reactivate rooms later via updateRoom
 *
 * @route DELETE /api/rooms/:id
 * @access Private (Admin only)
 */
const deactivateRoom = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find the room
  const room = await Room.findById(id);
  if (!room) {
    return next(new AppError('Room not found', 404));
  }

  // Check if already deactivated
  if (!room.isActive) {
    return next(new AppError('Room is already deactivated', 400));
  }

  // Count active sessions in this room (informational)
  const activeSessionCount = await Session.countDocuments({
    room: id,
    status: SESSION_STATUS.ACTIVE
  });

  // Store old state for audit
  const oldState = {
    isActive: room.isActive,
    name: room.name
  };

  // Soft delete: set isActive to false
  room.isActive = false;
  await room.save();

  // Audit log for deactivation (T124)
  await logDelete({
    performedBy: req.user._id,
    targetModel: 'Room',
    targetId: room._id,
    description: `Deactivated room "${room.name}"${activeSessionCount > 0 ? ` (${activeSessionCount} active sessions)` : ''}`,
    changes: {
      before: oldState,
      after: { isActive: false }
    },
    req
  });

  res.status(200).json({
    status: 'success',
    message: 'Room deactivated successfully',
    payload: {
      room,
      warning: activeSessionCount > 0
        ? `Room has ${activeSessionCount} active session(s). They will continue until checkout.`
        : null
    }
  });
});

module.exports = {
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
  getRoomAvailability,
  deactivateRoom
};
