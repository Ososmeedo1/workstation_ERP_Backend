/**
 * ===========================================
 * StudySpace ERP Backend - AuditLog Validation Schemas
 * ===========================================
 *
 * Joi validation schemas for audit log endpoints.
 * Provides filtering capabilities for date range, user, action, and entity.
 *
 * @file src/Modules/AuditLogs/auditLog.schema.js
 * @description AuditLog Joi validation schemas
 */

const Joi = require('joi');
const { generalRules } = require('../../Utils/general-rules.utils.js');
const { AUDIT_ACTIONS_ARRAY } = require('../../Utils/enum.utils.js');

/**
 * Valid target model types for filtering
 * These correspond to the models in the system that can be audited
 */
const VALID_TARGET_MODELS = [
  'User',
  'Room',
  'Session',
  'Payment',
  'CafeItem',
  'CafeSale',
  'CafeExpense',
  'Subscription',
  'FinanceReport'
];

/**
 * Schema for listing audit logs with filters
 *
 * Supports:
 * - Date range filtering (startDate, endDate)
 * - User filtering (userId)
 * - Action type filtering (action)
 * - Entity type filtering (targetModel)
 * - Pagination (page, limit)
 * - Sorting (sort)
 */
const listAuditLogsSchema = {
  query: Joi.object({
    // Date range filters
    startDate: Joi.date()
      .iso()
      .optional()
      .messages({
        'date.format': 'Start date must be in ISO format (YYYY-MM-DD)'
      }),
    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
        'date.min': 'End date must be after start date'
      }),

    // User filter - filter by who performed the action
    userId: generalRules.objectId
      .optional()
      .messages({
        'string.pattern.base': 'User ID must be a valid ObjectId'
      }),

    // Action filter - filter by action type
    action: Joi.string()
      .valid(...AUDIT_ACTIONS_ARRAY)
      .optional()
      .messages({
        'any.only': `Action must be one of: ${AUDIT_ACTIONS_ARRAY.join(', ')}`
      }),

    // Entity type filter - filter by target model
    targetModel: Joi.string()
      .valid(...VALID_TARGET_MODELS)
      .optional()
      .messages({
        'any.only': `Target model must be one of: ${VALID_TARGET_MODELS.join(', ')}`
      }),

    // Search in description
    search: Joi.string()
      .trim()
      .max(100)
      .optional(),

    // Pagination parameters
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.min': 'Page must be at least 1'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),

    // Sorting - format: field:direction (e.g., createdAt:desc)
    sort: Joi.string()
      .pattern(/^[\w]+:(asc|desc)$/)
      .default('createdAt:desc')
      .messages({
        'string.pattern.base': 'Sort must be in format field:asc or field:desc'
      })
  }).optional()
};

/**
 * Schema for getting entity history
 *
 * Returns all audit logs for a specific entity (by entityId)
 * Useful for tracking all changes made to a particular record
 */
const getEntityHistorySchema = {
  params: Joi.object({
    entityId: generalRules.objectId
      .required()
      .messages({
        'any.required': 'Entity ID is required',
        'string.pattern.base': 'Entity ID must be a valid ObjectId'
      })
  }).required(),
  query: Joi.object({
    // Optional: filter by target model type
    targetModel: Joi.string()
      .valid(...VALID_TARGET_MODELS)
      .optional(),

    // Pagination
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(20),

    // Sort direction for history (default newest first)
    sort: Joi.string()
      .pattern(/^[\w]+:(asc|desc)$/)
      .default('createdAt:desc')
  }).optional()
};

/**
 * Schema for getting audit log by ID
 */
const getAuditLogByIdSchema = {
  params: Joi.object({
    id: generalRules.objectId
      .required()
      .messages({
        'any.required': 'Audit log ID is required',
        'string.pattern.base': 'Audit log ID must be a valid ObjectId'
      })
  }).required()
};

module.exports = {
  listAuditLogsSchema,
  getEntityHistorySchema,
  getAuditLogByIdSchema,
  VALID_TARGET_MODELS
};
