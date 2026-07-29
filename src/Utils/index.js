/**
 * ===========================================
 * StudySpace ERP Backend - Utils Index
 * ===========================================
 *
 * Central export point for all utility modules.
 * Import utilities from this file for cleaner imports.
 *
 * @file src/Utils/index.js
 * @description Utility module exports
 *
 * @example
 * // Instead of multiple imports:
 * // const { AppError } = require('./Utils/error-class.utils');
 * // const { USER_ROLES } = require('./Utils/enum.utils');
 *
 * // Use single import:
 * const { AppError, USER_ROLES, generalRules } = require('./Utils');
 */

// ===========================================
// Error Handling Utilities
// ===========================================

const {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError
} = require('./error-class.utils');

// ===========================================
// Enum Constants
// ===========================================

const {
  // User enums
  USER_ROLES,
  USER_ROLES_ARRAY,
  USER_STATUS,
  USER_STATUS_ARRAY,

  // Room enums
  ROOM_TYPES,
  ROOM_TYPES_ARRAY,

  // Session enums
  SESSION_STATUS,
  SESSION_STATUS_ARRAY,

  // Payment enums
  PAYMENT_STATUS,
  PAYMENT_STATUS_ARRAY,
  PAYMENT_METHODS,
  PAYMENT_METHODS_ARRAY,

  // Subscription enums
  SUBSCRIPTION_TYPES,
  SUBSCRIPTION_TYPES_ARRAY,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_ARRAY,

  // Cafe enums
  CAFE_CATEGORIES,
  CAFE_CATEGORIES_ARRAY,

  // Expense enums
  EXPENSE_TYPES,
  EXPENSE_TYPES_ARRAY,

  // Report enums
  REPORT_TYPES,
  REPORT_TYPES_ARRAY,

  // Audit enums
  AUDIT_ACTIONS,
  AUDIT_ACTIONS_ARRAY
} = require('./enum.utils');

// ===========================================
// Validation Utilities
// ===========================================

const { generalRules } = require('./general-rules.utils');
const { joiMessages, applyMessages, createSchema } = require('./joi-messages.utils');

// ===========================================
// API Feature Utilities
// ===========================================

const {
  APIFeatures,
  getCount,
  buildPaginationResponse
} = require('./api-features.utils');

// ===========================================
// Module Exports
// ===========================================

module.exports = {
  // Error classes and factories
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError,

  // User enums
  USER_ROLES,
  USER_ROLES_ARRAY,
  USER_STATUS,
  USER_STATUS_ARRAY,

  // Room enums
  ROOM_TYPES,
  ROOM_TYPES_ARRAY,

  // Session enums
  SESSION_STATUS,
  SESSION_STATUS_ARRAY,

  // Payment enums
  PAYMENT_STATUS,
  PAYMENT_STATUS_ARRAY,
  PAYMENT_METHODS,
  PAYMENT_METHODS_ARRAY,

  // Subscription enums
  SUBSCRIPTION_TYPES,
  SUBSCRIPTION_TYPES_ARRAY,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_ARRAY,

  // Cafe enums
  CAFE_CATEGORIES,
  CAFE_CATEGORIES_ARRAY,

  // Expense enums
  EXPENSE_TYPES,
  EXPENSE_TYPES_ARRAY,

  // Report enums
  REPORT_TYPES,
  REPORT_TYPES_ARRAY,

  // Audit enums
  AUDIT_ACTIONS,
  AUDIT_ACTIONS_ARRAY,

  // Validation utilities
  generalRules,
  joiMessages,
  applyMessages,
  createSchema,

  // API features
  APIFeatures,
  getCount,
  buildPaginationResponse
};
