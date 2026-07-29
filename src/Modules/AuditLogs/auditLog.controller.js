/**
 * ===========================================
 * StudySpace ERP Backend - AuditLog Controller
 * ===========================================
 *
 * Controller for audit log viewing operations.
 * Provides admin-only access to system audit trail.
 *
 * Features:
 * - List audit logs with comprehensive filters
 * - Get entity-specific history
 * - Optimized read-only queries using .lean()
 *
 * @file src/Modules/AuditLogs/auditLog.controller.js
 * @description AuditLog endpoints implementation
 */

const { AuditLog } = require('../../../DB/Models/index.js');
const { AppError } = require('../../Utils/error-class.utils.js');
const { catchAsync } = require('../../Middlewares/error-handle.middleware.js');

/**
 * List audit logs with optional filters
 *
 * Supports filtering by:
 * - Date range (startDate, endDate)
 * - User who performed the action (userId)
 * - Action type (action)
 * - Entity type (targetModel)
 * - Search in description
 *
 * Uses .lean() for performance optimization on read-only queries
 *
 * @route GET /api/audit
 * @access Private (Admin only)
 */
const listAuditLogs = catchAsync(async (req, res, next) => {
  const {
    startDate,
    endDate,
    userId,
    action,
    targetModel,
    search,
    page = 1,
    limit = 20,
    sort = 'createdAt:desc'
  } = req.query;

  // Build filter object based on query params
  const filter = {};

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      // Start of the day for startDate
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      // End of the day for endDate (23:59:59.999)
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endOfDay;
    }
  }

  // User filter - who performed the action
  if (userId) {
    filter.performedBy = userId;
  }

  // Action type filter
  if (action) {
    filter.action = action;
  }

  // Entity type filter
  if (targetModel) {
    filter.targetModel = targetModel;
  }

  // Search in description
  if (search) {
    filter.description = { $regex: search, $options: 'i' };
  }

  // Parse sort parameter
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;

  // Calculate pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Execute query with projection for better performance
  // Using .lean() for read-only query optimization
  const [auditLogs, total] = await Promise.all([
    AuditLog.find(filter)
      .select('action performedBy targetModel targetId description createdAt ipAddress')
      .populate({
        path: 'performedBy',
        select: 'name email role'
      })
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Audit logs retrieved successfully',
    payload: {
      auditLogs,
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
 * Get entity history - all audit logs for a specific entity
 *
 * Returns the complete audit trail for a particular entity,
 * useful for tracking all changes made to a specific record.
 *
 * Uses .lean() for performance optimization on read-only queries
 *
 * @route GET /api/audit/entity/:entityId
 * @access Private (Admin only)
 */
const getEntityHistory = catchAsync(async (req, res, next) => {
  const { entityId } = req.params;
  const {
    targetModel,
    page = 1,
    limit = 20,
    sort = 'createdAt:desc'
  } = req.query;

  // Build filter - must match the targetId
  const filter = { targetId: entityId };

  // Optional: filter by target model type
  if (targetModel) {
    filter.targetModel = targetModel;
  }

  // Parse sort parameter
  const [sortField, sortDirection] = sort.split(':');
  const sortOrder = sortDirection === 'desc' ? -1 : 1;

  // Calculate pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Execute query with .lean() for read-only optimization
  const [history, total] = await Promise.all([
    AuditLog.find(filter)
      .select('action performedBy targetModel description changes createdAt ipAddress')
      .populate({
        path: 'performedBy',
        select: 'name email role'
      })
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(filter)
  ]);

  // Return 404 if no history found
  if (history.length === 0 && pageNum === 1) {
    return res.status(200).json({
      status: 'success',
      message: 'No audit history found for this entity',
      payload: {
        history: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          pages: 0
        }
      }
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Entity history retrieved successfully',
    payload: {
      history,
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
 * Get a single audit log by ID
 *
 * Returns detailed information about a specific audit log entry,
 * including full change details and metadata.
 *
 * @route GET /api/audit/:id
 * @access Private (Admin only)
 */
const getAuditLogById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find audit log with full details
  const auditLog = await AuditLog.findById(id)
    .populate({
      path: 'performedBy',
      select: 'name email role'
    })
    .lean();

  if (!auditLog) {
    return next(new AppError('Audit log not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Audit log retrieved successfully',
    payload: { auditLog }
  });
});

/**
 * Get audit log statistics
 *
 * Returns aggregated statistics about audit logs:
 * - Total count
 * - Count by action type
 * - Count by target model
 * - Recent activity summary
 *
 * @route GET /api/audit/stats
 * @access Private (Admin only)
 */
const getAuditStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      dateFilter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.createdAt.$lte = endOfDay;
    }
  }

  // Aggregation pipeline for statistics
  const [
    totalCount,
    actionStats,
    modelStats,
    recentActivity
  ] = await Promise.all([
    // Total count
    AuditLog.countDocuments(dateFilter),

    // Count by action type
    AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),

    // Count by target model
    AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$targetModel', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),

    // Recent activity (last 24 hours)
    AuditLog.countDocuments({
      ...dateFilter,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Audit statistics retrieved successfully',
    payload: {
      total: totalCount,
      actionBreakdown: actionStats.map(item => ({
        action: item._id,
        count: item.count
      })),
      modelBreakdown: modelStats.map(item => ({
        model: item._id,
        count: item.count
      })),
      recentActivityCount: recentActivity
    }
  });
});

module.exports = {
  listAuditLogs,
  getEntityHistory,
  getAuditLogById,
  getAuditStats
};
