/**
 * ===========================================
 * StudySpace ERP Backend - Custom Error Class
 * ===========================================
 *
 * This module provides a custom error class that extends
 * the native Error class with additional properties for
 * API error handling.
 *
 * Features:
 * - HTTP status code
 * - Operational vs programming errors
 * - Error stack capture
 * - Consistent error structure
 *
 * @file src/Utils/error-class.utils.js
 * @description Custom error class for API error handling
 */

/**
 * Custom Application Error Class
 *
 * Extends the native Error class with HTTP status code and
 * operational error flag. Use this class to throw errors
 * that should be sent to the client.
 *
 * @class AppError
 * @extends Error
 *
 * @example
 * // In a controller
 * throw new AppError('User not found', 404);
 *
 * @example
 * // Validation error
 * throw new AppError('Email is required', 400);
 *
 * @example
 * // Unauthorized
 * throw new AppError('Invalid credentials', 401);
 */
class AppError extends Error {
  /**
   * Create an AppError instance
   *
   * @constructor
   * @param {string} message - Error message to send to client
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 500, etc.)
   */
  constructor(message, statusCode) {
    // Call parent constructor with message
    super(message);

    /**
     * HTTP status code for the error response
     * @type {number}
     */
    this.statusCode = statusCode;

    /**
     * Status string based on status code
     * 4xx errors are 'fail', 5xx errors are 'error'
     * @type {string}
     */
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    /**
     * Flag to identify operational (expected) errors
     * Operational errors are safe to send to client
     * Non-operational errors (bugs) should be logged but not exposed
     * @type {boolean}
     */
    this.isOperational = true;

    /**
     * Capture the stack trace, excluding the constructor call
     * This helps with debugging by showing where the error originated
     */
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Factory function for creating common error types
 * These provide semantic shortcuts for common error scenarios
 */

/**
 * Create a 400 Bad Request error
 * Use for validation errors or malformed requests
 *
 * @function badRequest
 * @param {string} message - Error message
 * @returns {AppError} AppError with status 400
 *
 * @example
 * throw badRequest('Invalid email format');
 */
const badRequest = (message) => new AppError(message, 400);

/**
 * Create a 401 Unauthorized error
 * Use when authentication is required but not provided or invalid
 *
 * @function unauthorized
 * @param {string} [message='Authentication required'] - Error message
 * @returns {AppError} AppError with status 401
 *
 * @example
 * throw unauthorized('Invalid token');
 */
const unauthorized = (message = 'Authentication required') => new AppError(message, 401);

/**
 * Create a 403 Forbidden error
 * Use when user is authenticated but doesn't have permission
 *
 * @function forbidden
 * @param {string} [message='Access denied'] - Error message
 * @returns {AppError} AppError with status 403
 *
 * @example
 * throw forbidden('Only admins can perform this action');
 */
const forbidden = (message = 'Access denied') => new AppError(message, 403);

/**
 * Create a 404 Not Found error
 * Use when a requested resource doesn't exist
 *
 * @function notFound
 * @param {string} [message='Resource not found'] - Error message
 * @returns {AppError} AppError with status 404
 *
 * @example
 * throw notFound('User not found');
 */
const notFound = (message = 'Resource not found') => new AppError(message, 404);

/**
 * Create a 409 Conflict error
 * Use when the request conflicts with current state (e.g., duplicate)
 *
 * @function conflict
 * @param {string} [message='Resource already exists'] - Error message
 * @returns {AppError} AppError with status 409
 *
 * @example
 * throw conflict('Email already registered');
 */
const conflict = (message = 'Resource already exists') => new AppError(message, 409);

/**
 * Create a 422 Unprocessable Entity error
 * Use when the request is valid but cannot be processed
 *
 * @function unprocessable
 * @param {string} message - Error message
 * @returns {AppError} AppError with status 422
 *
 * @example
 * throw unprocessable('Room is at full capacity');
 */
const unprocessable = (message) => new AppError(message, 422);

/**
 * Create a 500 Internal Server error
 * Use for unexpected server errors (should be rare)
 *
 * @function serverError
 * @param {string} [message='Something went wrong'] - Error message
 * @returns {AppError} AppError with status 500
 *
 * @example
 * throw serverError('Failed to process payment');
 */
const serverError = (message = 'Something went wrong') => new AppError(message, 500);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError
};
