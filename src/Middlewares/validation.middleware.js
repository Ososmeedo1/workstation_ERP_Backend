/**
 * ===========================================
 * StudySpace ERP Backend - Validation Middleware
 * ===========================================
 *
 * This module provides middleware for validating request data
 * using Joi schemas. It supports validation of:
 * - Request body (POST, PUT, PATCH)
 * - Query parameters (GET with filters)
 * - URL parameters (route params)
 *
 * @file src/Middlewares/validation.middleware.js
 * @description Joi validation middleware wrapper
 */

const { joiMessages } = require('../Utils/joi-messages.utils');

/**
 * Validation sources - where to look for data to validate
 * @constant {Object}
 */
const ValidationSource = {
  BODY: 'body',
  QUERY: 'query',
  PARAMS: 'params'
};

/**
 * Default Joi validation options
 * @constant {Object}
 */
const defaultOptions = {
  // Return all errors, not just the first one
  abortEarly: false,

  // Remove unknown keys from the validated data
  stripUnknown: true,

  // Apply default messages
  messages: joiMessages
};

/**
 * Format Joi validation errors into a user-friendly structure
 *
 * @function formatValidationErrors
 * @param {Array} details - Joi error details array
 * @returns {Object} Formatted errors by field
 *
 * @example
 * // Returns: { email: 'Email is required', name: 'Name must be at least 3 characters' }
 */
const formatValidationErrors = (details) => {
  return details.reduce((acc, error) => {
    // Get field name from path (handles nested objects)
    const field = error.path.join('.');
    acc[field] = error.message;
    return acc;
  }, {});
};

/**
 * Create validation middleware for a Joi schema
 *
 * This function returns an Express middleware that validates
 * request data against the provided Joi schema. If validation
 * fails, it returns a 400 error with detailed error messages.
 *
 * @function validate
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} [source='body'] - Data source: 'body', 'query', or 'params'
 * @param {Object} [options={}] - Additional Joi options to merge
 * @returns {Function} Express middleware function
 *
 * @example
 * // Validate request body
 * router.post('/users', validate(createUserSchema), createUser);
 *
 * // Validate query parameters
 * router.get('/users', validate(listUsersSchema, 'query'), listUsers);
 *
 * // Validate URL parameters
 * router.get('/users/:id', validate(userIdSchema, 'params'), getUser);
 */
const validate = (schema, source = ValidationSource.BODY, options = {}) => {
  return (req, res, next) => {
    // Get data from the specified source
    const dataToValidate = req[source];

    // Merge default options with custom options
    const validationOptions = { ...defaultOptions, ...options };

    // Validate the data against the schema
    const { error, value } = schema.validate(dataToValidate, validationOptions);

    if (error) {
      // Format error messages
      const formattedErrors = formatValidationErrors(error.details);

      // Create user-friendly error message
      const errorMessages = error.details.map(d => d.message).join('. ');

      // Return validation error with details
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: formattedErrors,
        details: errorMessages
      });
    }

    // Replace the source data with validated/sanitized data
    // This ensures cleaned data is passed to controllers
    req[source] = value;

    next();
  };
};

/**
 * Create validation middleware for request body
 * Shorthand for validate(schema, 'body')
 *
 * @function validateBody
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {Object} [options={}] - Additional Joi options
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/login', validateBody(loginSchema), login);
 */
const validateBody = (schema, options = {}) => {
  return validate(schema, ValidationSource.BODY, options);
};

/**
 * Create validation middleware for query parameters
 * Shorthand for validate(schema, 'query')
 *
 * @function validateQuery
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {Object} [options={}] - Additional Joi options
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/sessions', validateQuery(listSessionsSchema), listSessions);
 */
const validateQuery = (schema, options = {}) => {
  return validate(schema, ValidationSource.QUERY, options);
};

/**
 * Create validation middleware for URL parameters
 * Shorthand for validate(schema, 'params')
 *
 * @function validateParams
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {Object} [options={}] - Additional Joi options
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/rooms/:roomId', validateParams(roomIdSchema), getRoom);
 */
const validateParams = (schema, options = {}) => {
  return validate(schema, ValidationSource.PARAMS, options);
};

/**
 * Combined validation middleware for multiple sources
 *
 * Validates body, query, and/or params in a single middleware
 *
 * @function validateAll
 * @param {Object} schemas - Object with schemas for each source
 * @param {Joi.Schema} [schemas.body] - Schema for request body
 * @param {Joi.Schema} [schemas.query] - Schema for query params
 * @param {Joi.Schema} [schemas.params] - Schema for URL params
 * @returns {Function} Express middleware function
 *
 * @example
 * router.put('/rooms/:roomId',
 *   validateAll({
 *     params: roomIdSchema,
 *     body: updateRoomSchema
 *   }),
 *   updateRoom
 * );
 */
const validateAll = (schemas) => {
  return (req, res, next) => {
    const errors = {};
    let hasErrors = false;

    // Validate each source if schema is provided
    for (const [source, schema] of Object.entries(schemas)) {
      if (schema && req[source] !== undefined) {
        const { error, value } = schema.validate(req[source], defaultOptions);

        if (error) {
          hasErrors = true;
          const sourceErrors = formatValidationErrors(error.details);
          errors[source] = sourceErrors;
        } else {
          // Replace with validated data
          req[source] = value;
        }
      }
    }

    if (hasErrors) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateAll,
  ValidationSource
};
