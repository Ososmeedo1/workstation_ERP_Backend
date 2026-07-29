/**
 * ===========================================
 * StudySpace ERP Backend - Middlewares Index
 * ===========================================
 *
 * Central export point for all middleware modules.
 * Import middlewares from this file for cleaner imports.
 *
 * @file src/Middlewares/index.js
 * @description Middleware module exports
 *
 * @example
 * // Instead of multiple imports:
 * // const { validate } = require('./Middlewares/validation.middleware');
 * // const { catchAsync } = require('./Middlewares/error-handle.middleware');
 *
 * // Use single import:
 * const { validate, catchAsync } = require('./Middlewares');
 */

// ===========================================
// Error Handling Middleware
// ===========================================

const {
  globalErrorHandler,
  notFoundHandler,
  catchAsync
} = require('./error-handle.middleware');

// ===========================================
// Validation Middleware
// ===========================================

const {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateAll,
  ValidationSource
} = require('./validation.middleware');

// ===========================================
// Module Exports
// ===========================================

module.exports = {
  // Error handling
  globalErrorHandler,
  notFoundHandler,
  catchAsync,

  // Validation
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateAll,
  ValidationSource
};
