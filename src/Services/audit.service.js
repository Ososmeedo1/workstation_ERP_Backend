/**
 * ===========================================
 * StudySpace ERP Backend - Audit Service
 * ===========================================
 *
 * Service for logging audit events.
 * Tracks critical actions throughout the application.
 *
 * @file src/Services/audit.service.js
 * @description Audit logging service
 */

const { AuditLog } = require('../../DB/Models/index.js');
const { AUDIT_ACTIONS } = require('../Utils/enum.utils.js');

/**
 * Create an audit log entry
 *
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action type (from AUDIT_ACTIONS)
 * @param {string} params.performedBy - User ID who performed the action
 * @param {string} params.targetModel - Name of the affected model
 * @param {string} [params.targetId] - ID of the affected document
 * @param {string} params.description - Human-readable description
 * @param {Object} [params.changes] - Before/after changes
 * @param {Object} [params.req] - Express request object for IP/user agent
 * @param {Object} [params.metadata] - Additional metadata
 * @returns {Promise<Object>} Created audit log
 */
const createAuditLog = async ({
  action,
  performedBy,
  targetModel,
  targetId,
  description,
  changes = null,
  req = null,
  metadata = {}
}) => {
  try {
    const auditEntry = await AuditLog.create({
      action,
      performedBy,
      targetModel,
      targetId,
      description,
      changes,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      metadata
    });

    return auditEntry;
  } catch (error) {
    // Log error but don't throw - audit should not break main flow
    console.error('Failed to create audit log:', error);
    return null;
  }
};

/**
 * Log a CREATE action
 */
const logCreate = (params) => {
  return createAuditLog({
    ...params,
    action: AUDIT_ACTIONS.CREATE
  });
};

/**
 * Log an UPDATE action
 */
const logUpdate = (params) => {
  return createAuditLog({
    ...params,
    action: AUDIT_ACTIONS.UPDATE
  });
};

/**
 * Log a DELETE action
 */
const logDelete = (params) => {
  return createAuditLog({
    ...params,
    action: AUDIT_ACTIONS.DELETE
  });
};

/**
 * Log a LOGIN action
 */
const logLogin = (params) => {
  return createAuditLog({
    ...params,
    action: AUDIT_ACTIONS.LOGIN,
    targetModel: 'User'
  });
};

/**
 * Log a LOGOUT action
 */
const logLogout = (params) => {
  return createAuditLog({
    ...params,
    action: AUDIT_ACTIONS.LOGOUT,
    targetModel: 'User'
  });
};

/**
 * Log a VIEW action (for sensitive data access)
 */
const logView = (params) => {
  return createAuditLog({
    ...params,
    action: AUDIT_ACTIONS.VIEW
  });
};

/**
 * Get audit logs with pagination
 *
 * @param {Object} filter - Query filter
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Audit logs with pagination info
 */
const getAuditLogs = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    populate = true
  } = options;

  const skip = (page - 1) * limit;

  let query = AuditLog.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  if (populate) {
    query = query.populate('performedBy', 'name email role');
  }

  const [logs, total] = await Promise.all([
    query.exec(),
    AuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get audit logs for a specific resource
 *
 * @param {string} targetModel - Model name
 * @param {string} targetId - Document ID
 * @param {Object} options - Pagination options
 */
const getResourceAuditLogs = async (targetModel, targetId, options = {}) => {
  return getAuditLogs({ targetModel, targetId }, options);
};

/**
 * Get audit logs for a specific user
 *
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 */
const getUserAuditLogs = async (userId, options = {}) => {
  return getAuditLogs({ performedBy: userId }, options);
};

module.exports = {
  createAuditLog,
  logCreate,
  logUpdate,
  logDelete,
  logLogin,
  logLogout,
  logView,
  getAuditLogs,
  getResourceAuditLogs,
  getUserAuditLogs
};
