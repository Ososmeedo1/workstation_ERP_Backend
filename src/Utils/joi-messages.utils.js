/**
 * ===========================================
 * StudySpace ERP Backend - Joi Error Messages
 * ===========================================
 *
 * This module provides user-friendly, consistent error messages
 * for Joi validation. These messages are used as defaults when
 * custom messages aren't specified.
 *
 * Message placeholders:
 * - {{#label}} - The field name
 * - {{#limit}} - Numeric limit (min, max)
 * - {{#valids}} - Valid values for 'any.only'
 *
 * @file src/Utils/joi-messages.utils.js
 * @description Joi validation error messages
 */

/**
 * Default Joi error messages for common validation types
 *
 * These messages are designed to be:
 * - User-friendly (avoid technical jargon)
 * - Consistent in tone and format
 * - Helpful (tell user what to do, not just what's wrong)
 *
 * @constant {Object} joiMessages
 */
const joiMessages = {
  // ===========================================
  // String Validation Messages
  // ===========================================

  /**
   * Generic string type error
   */
  'string.base': '{{#label}} must be text',

  /**
   * Empty string error
   */
  'string.empty': '{{#label}} cannot be empty',

  /**
   * Minimum length error
   */
  'string.min': '{{#label}} must be at least {{#limit}} characters',

  /**
   * Maximum length error
   */
  'string.max': '{{#label}} must be at most {{#limit}} characters',

  /**
   * Email format error
   */
  'string.email': '{{#label}} must be a valid email address',

  /**
   * Pattern/regex mismatch error
   */
  'string.pattern.base': '{{#label}} format is invalid',

  /**
   * URI/URL format error
   */
  'string.uri': '{{#label}} must be a valid URL',

  /**
   * Exact length error
   */
  'string.length': '{{#label}} must be exactly {{#limit}} characters',

  /**
   * Alphanumeric only error
   */
  'string.alphanum': '{{#label}} must only contain letters and numbers',

  /**
   * Lowercase requirement error
   */
  'string.lowercase': '{{#label}} must be in lowercase',

  /**
   * Uppercase requirement error
   */
  'string.uppercase': '{{#label}} must be in uppercase',

  // ===========================================
  // Number Validation Messages
  // ===========================================

  /**
   * Generic number type error
   */
  'number.base': '{{#label}} must be a number',

  /**
   * Minimum value error
   */
  'number.min': '{{#label}} must be at least {{#limit}}',

  /**
   * Maximum value error
   */
  'number.max': '{{#label}} must be at most {{#limit}}',

  /**
   * Positive number error
   */
  'number.positive': '{{#label}} must be a positive number',

  /**
   * Negative number error
   */
  'number.negative': '{{#label}} must be a negative number',

  /**
   * Integer requirement error
   */
  'number.integer': '{{#label}} must be a whole number',

  /**
   * Greater than error
   */
  'number.greater': '{{#label}} must be greater than {{#limit}}',

  /**
   * Less than error
   */
  'number.less': '{{#label}} must be less than {{#limit}}',

  // ===========================================
  // Date Validation Messages
  // ===========================================

  /**
   * Generic date type error
   */
  'date.base': '{{#label}} must be a valid date',

  /**
   * ISO date format error
   */
  'date.format': '{{#label}} must be in ISO date format',

  /**
   * Minimum date error
   */
  'date.min': '{{#label}} must be on or after {{#limit}}',

  /**
   * Maximum date error
   */
  'date.max': '{{#label}} must be on or before {{#limit}}',

  /**
   * Greater than date error
   */
  'date.greater': '{{#label}} must be after {{#limit}}',

  /**
   * Less than date error
   */
  'date.less': '{{#label}} must be before {{#limit}}',

  // ===========================================
  // Boolean Validation Messages
  // ===========================================

  /**
   * Generic boolean type error
   */
  'boolean.base': '{{#label}} must be true or false',

  // ===========================================
  // Array Validation Messages
  // ===========================================

  /**
   * Generic array type error
   */
  'array.base': '{{#label}} must be an array',

  /**
   * Minimum items error
   */
  'array.min': '{{#label}} must have at least {{#limit}} items',

  /**
   * Maximum items error
   */
  'array.max': '{{#label}} must have at most {{#limit}} items',

  /**
   * Exact length error
   */
  'array.length': '{{#label}} must have exactly {{#limit}} items',

  /**
   * Unique items error
   */
  'array.unique': '{{#label}} must not contain duplicate items',

  /**
   * Empty array error
   */
  'array.includesRequiredUnknowns': '{{#label}} cannot be empty',

  // ===========================================
  // Object Validation Messages
  // ===========================================

  /**
   * Generic object type error
   */
  'object.base': '{{#label}} must be an object',

  /**
   * Unknown keys error
   */
  'object.unknown': '{{#label}} contains an unknown field',

  // ===========================================
  // Any Type Validation Messages
  // ===========================================

  /**
   * Required field error
   */
  'any.required': '{{#label}} is required',

  /**
   * Invalid value error (not in valid list)
   */
  'any.only': '{{#label}} must be one of: {{#valids}}',

  /**
   * Invalid type error
   */
  'any.invalid': '{{#label}} contains an invalid value',

  /**
   * Custom validation error (fallback)
   */
  'any.custom': '{{#label}} is invalid',

  /**
   * Unknown field error
   */
  'any.unknown': 'Unknown field: {{#label}}',

  // ===========================================
  // Binary Validation Messages
  // ===========================================

  /**
   * Generic binary type error
   */
  'binary.base': '{{#label}} must be a binary buffer',

  /**
   * Binary length error
   */
  'binary.min': '{{#label}} must be at least {{#limit}} bytes',
  'binary.max': '{{#label}} must be at most {{#limit}} bytes'
};

/**
 * Apply default messages to a Joi schema
 *
 * @function applyMessages
 * @param {Joi.Schema} schema - Joi schema to apply messages to
 * @returns {Joi.Schema} Schema with default messages
 *
 * @example
 * const schema = applyMessages(Joi.object({
 *   email: Joi.string().email().required()
 * }));
 */
const applyMessages = (schema) => {
  return schema.messages(joiMessages);
};

/**
 * Create a Joi schema with default messages pre-applied
 *
 * @function createSchema
 * @param {Object} schemaDefinition - Schema definition object
 * @returns {Joi.ObjectSchema} Joi schema with default messages
 *
 * @example
 * const userSchema = createSchema({
 *   email: Joi.string().email().required(),
 *   name: Joi.string().min(3).max(50).required()
 * });
 */
const createSchema = (schemaDefinition) => {
  const Joi = require('joi');
  return Joi.object(schemaDefinition).messages(joiMessages);
};

module.exports = {
  joiMessages,
  applyMessages,
  createSchema
};
