/**
 * ===========================================
 * StudySpace ERP Backend - Error Handling Middleware
 * ===========================================
 *
 * This module provides centralized error handling for the application.
 * All errors (thrown or passed via next()) flow through these handlers.
 *
 * Error handling strategy:
 * 1. Operational errors (AppError) - Send appropriate message to client
 * 2. Mongoose errors - Convert to user-friendly messages
 * 3. JWT errors - Convert to authentication errors
 * 4. Unknown errors - Log and send generic message (don't leak details)
 *
 * @file src/Middlewares/error-handle.middleware.js
 * @description Global error handling middleware
 */

const { AppError } = require('../Utils/error-class.utils');

/**
 * Handle Mongoose CastError (invalid ObjectId)
 *
 * @function handleCastError
 * @param {Error} err - Mongoose CastError
 * @returns {AppError} Formatted AppError
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Error (code 11000)
 *
 * @function handleDuplicateFieldsError
 * @param {Error} err - Mongoose duplicate key error
 * @returns {AppError} Formatted AppError
 */
const handleDuplicateFieldsError = (err) => {
  // Extract field name from error message
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : 'value';
  const message = `${field} "${value}" already exists. Please use a different value.`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose Validation Error
 *
 * @function handleValidationError
 * @param {Error} err - Mongoose validation error
 * @returns {AppError} Formatted AppError with all validation messages
 */
const handleValidationError = (err) => {
  // Extract all validation error messages
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Invalid Token Error
 *
 * @function handleJWTError
 * @returns {AppError} Authentication error
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT Expired Token Error
 *
 * @function handleJWTExpiredError
 * @returns {AppError} Authentication error
 */
const handleJWTExpiredError = () => {
  return new AppError('Your session has expired. Please log in again.', 401);
};

/**
 * Send error response in development environment
 * Includes full error details for debugging
 *
 * @function sendErrorDev
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

/**
 * Send error response in production environment
 * Only sends safe, user-friendly messages
 *
 * @function sendErrorProd
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
  // Operational errors: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or unknown errors: don't leak details
    console.error('❌ ERROR:', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.'
    });
  }
};

/**
 * Global Error Handler Middleware
 *
 * This is the main error handling middleware that catches all errors
 * in the application. It must be the LAST middleware in the chain.
 *
 * @function globalErrorHandler
 * @param {Error} err - Error object (from throw or next(err))
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 *
 * @example
 * // In bootstrap.js (must be last)
 * app.use(globalErrorHandler);
 */
const globalErrorHandler = (err, req, res, next) => {
  // Set default values if not present
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Determine environment
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Development: send full error details
    sendErrorDev(err, res);
  } else {
    // Production: process specific error types
    let error = { ...err, message: err.message, name: err.name };

    // Handle specific error types
    if (err.name === 'CastError') {
      error = handleCastError(err);
    }

    if (err.code === 11000) {
      error = handleDuplicateFieldsError(err);
    }

    if (err.name === 'ValidationError') {
      error = handleValidationError(err);
    }

    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }

    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

/**
 * Not Found Handler (404)
 *
 * This middleware catches requests that don't match any route.
 * Place before the global error handler.
 *
 * @function notFoundHandler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 *
 * @example
 * // In bootstrap.js (after all routes)
 * app.use(notFoundHandler);
 * app.use(globalErrorHandler);
 */
const notFoundHandler = (req, res, next) => {
  const message = `Cannot find ${req.method} ${req.originalUrl} on this server`;
  next(new AppError(message, 404));
};

/**
 * Async Handler Wrapper
 *
 * Wraps async route handlers to catch errors and pass to next().
 * Eliminates the need for try/catch in every async controller.
 *
 * @function catchAsync
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 *
 * @example
 * // In controller
 * exports.getUsers = catchAsync(async (req, res, next) => {
 *   const users = await User.find();
 *   res.json({ status: 'success', data: users });
 * });
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  catchAsync
};
