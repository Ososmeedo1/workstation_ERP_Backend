/**
 * ===========================================
 * StudySpace ERP Backend - AuditLog Routes
 * ===========================================
 *
 * Router configuration for audit log endpoints.
 * All routes are protected and require admin role.
 *
 * Routes:
 * - GET /api/audit          - List audit logs with filters
 * - GET /api/audit/stats    - Get audit statistics
 * - GET /api/audit/entity/:entityId - Get entity history
 * - GET /api/audit/:id      - Get single audit log
 *
 * @file src/Modules/AuditLogs/auditLog.routes.js
 * @description AuditLog routes definition
 */

const { Router } = require('express');
const auditLogController = require('./auditLog.controller.js');
const auditLogSchemas = require('./auditLog.schema.js');
const { validateAll } = require('../../Middlewares/validation.middleware.js');
const { auth, requireRole } = require('../../Middlewares/auth.middleware.js');
const { USER_ROLES } = require('../../Utils/enum.utils.js');

const router = Router();

/**
 * Middleware for admin-only routes
 * Audit logs contain sensitive information and should only be visible to admins
 */
const adminOnly = [auth, requireRole([USER_ROLES.ADMIN])];

/**
 * @route GET /api/audit
 * @desc List audit logs with filters
 * @access Private - Admin only
 *
 * Query params:
 * - startDate: ISO date string (filter logs from this date)
 * - endDate: ISO date string (filter logs until this date)
 * - userId: ObjectId (filter by user who performed action)
 * - action: string (filter by action type)
 * - targetModel: string (filter by entity type)
 * - search: string (search in description)
 * - page: number (pagination)
 * - limit: number (pagination)
 * - sort: string (e.g., 'createdAt:desc')
 */
router.get(
  '/',
  ...adminOnly,
  validateAll(auditLogSchemas.listAuditLogsSchema),
  auditLogController.listAuditLogs
);

/**
 * @route GET /api/audit/stats
 * @desc Get audit log statistics
 * @access Private - Admin only
 *
 * Returns aggregated statistics about audit logs
 */
router.get(
  '/stats',
  ...adminOnly,
  auditLogController.getAuditStats
);

/**
 * @route GET /api/audit/entity/:entityId
 * @desc Get all audit logs for a specific entity
 * @access Private - Admin only
 *
 * Returns the complete audit trail for a particular entity
 *
 * Path params:
 * - entityId: ObjectId of the entity
 *
 * Query params:
 * - targetModel: string (optional - filter by model type)
 * - page: number (pagination)
 * - limit: number (pagination)
 * - sort: string (sorting)
 */
router.get(
  '/entity/:entityId',
  ...adminOnly,
  validateAll(auditLogSchemas.getEntityHistorySchema),
  auditLogController.getEntityHistory
);

/**
 * @route GET /api/audit/:id
 * @desc Get a single audit log by ID
 * @access Private - Admin only
 *
 * Returns detailed information about a specific audit log entry
 */
router.get(
  '/:id',
  ...adminOnly,
  validateAll(auditLogSchemas.getAuditLogByIdSchema),
  auditLogController.getAuditLogById
);

module.exports = router;
