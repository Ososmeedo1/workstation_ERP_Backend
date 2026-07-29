/**
 * ===========================================
 * StudySpace ERP Backend - Joi General Rules
 * ===========================================
 *
 * This module provides reusable Joi validation rules
 * for common field types used throughout the application.
 *
 * Using these rules ensures:
 * - Consistent validation across all endpoints
 * - Reusable validation patterns
 * - Centralized error messages
 *
 * @file src/Utils/general-rules.utils.js
 * @description Reusable Joi validation rules
 */

const Joi = require('joi');
// Note: joiMessages is available via joi-messages.utils.js for use with .messages()
const {
  USER_ROLES_ARRAY,
  USER_STATUS_ARRAY,
  ROOM_TYPES_ARRAY,
  SESSION_STATUS_ARRAY,
  PAYMENT_STATUS_ARRAY,
  SUBSCRIPTION_TYPES_ARRAY,
  SUBSCRIPTION_STATUS_ARRAY,
  EXPENSE_TYPES_ARRAY,
  REPORT_TYPES_ARRAY
} = require('./enum.utils');

/**
 * Regular expression for MongoDB ObjectId validation
 * ObjectIds are 24 character hex strings
 * @constant {RegExp}
 */
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * General validation rules object
 * Contains Joi schema definitions for common field types
 *
 * @constant {Object} generalRules
 */
const generalRules = {
  /**
   * MongoDB ObjectId validation
   * Validates that the string is a valid 24-character hex ObjectId
   *
   * @example
   * roomId: generalRules.objectId.required()
   */
  objectId: Joi.string()
    .pattern(OBJECT_ID_REGEX)
    .messages({
      'string.pattern.base': '{{#label}} must be a valid ObjectId'
    }),

  /**
   * Email validation with lowercase normalization
   *
   * @example
   * email: generalRules.email.required()
   */
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .max(100)
    .messages({
      'string.email': '{{#label}} must be a valid email address'
    }),

  /**
   * Password validation
   * Minimum 8 characters, must contain letters and numbers
   *
   * @example
   * password: generalRules.password.required()
   */
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)/)
    .messages({
      'string.min': '{{#label}} must be at least 8 characters',
      'string.max': '{{#label}} must be at most 128 characters',
      'string.pattern.base': '{{#label}} must contain at least one letter and one number'
    }),

  /**
   * Name validation (for user names, room names, etc.)
   * 3-100 characters, trimmed
   *
   * @example
   * name: generalRules.name.required()
   */
  name: Joi.string()
    .min(3)
    .max(100)
    .trim()
    .messages({
      'string.min': '{{#label}} must be at least 3 characters',
      'string.max': '{{#label}} must be at most 100 characters'
    }),

  /**
   * Phone number validation (optional, flexible format)
   * Allows digits, spaces, dashes, parentheses, plus sign
   *
   * @example
   * phone: generalRules.phone.optional()
   */
  phone: Joi.string()
    .pattern(/^[\d\s\-()+ ]+$/)
    .min(7)
    .max(20)
    .messages({
      'string.pattern.base': '{{#label}} must be a valid phone number',
      'string.min': '{{#label}} must be at least 7 characters',
      'string.max': '{{#label}} must be at most 20 characters'
    }),

  /**
   * Description/notes validation
   * Optional text field, max 500 characters
   *
   * @example
   * description: generalRules.description.optional()
   */
  description: Joi.string()
    .max(500)
    .trim()
    .allow('')
    .messages({
      'string.max': '{{#label}} must be at most 500 characters'
    }),

  /**
   * Positive number validation (for amounts, prices, etc.)
   * Must be greater than 0
   *
   * @example
   * amount: generalRules.positiveNumber.required()
   */
  positiveNumber: Joi.number()
    .positive()
    .messages({
      'number.positive': '{{#label}} must be a positive number'
    }),

  /**
   * Non-negative number validation (allows 0)
   * Must be greater than or equal to 0
   *
   * @example
   * quantity: generalRules.nonNegativeNumber.required()
   */
  nonNegativeNumber: Joi.number()
    .min(0)
    .messages({
      'number.min': '{{#label}} cannot be negative'
    }),

  /**
   * Integer validation (whole numbers only)
   *
   * @example
   * capacity: generalRules.positiveInteger.required()
   */
  positiveInteger: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.integer': '{{#label}} must be a whole number',
      'number.positive': '{{#label}} must be a positive number'
    }),

  /**
   * Non-negative integer (allows 0)
   *
   * @example
   * currentOccupancy: generalRules.nonNegativeInteger.required()
   */
  nonNegativeInteger: Joi.number()
    .integer()
    .min(0)
    .messages({
      'number.integer': '{{#label}} must be a whole number',
      'number.min': '{{#label}} cannot be negative'
    }),

  /**
   * Date validation (ISO string or Date object)
   *
   * @example
   * checkIn: generalRules.date.required()
   */
  date: Joi.date()
    .iso()
    .messages({
      'date.format': '{{#label}} must be a valid date'
    }),

  /**
   * URL validation
   *
   * @example
   * imageUrl: generalRules.url.optional()
   */
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .messages({
      'string.uri': '{{#label}} must be a valid URL'
    }),

  /**
   * Boolean validation
   *
   * @example
   * isAvailable: generalRules.boolean.default(true)
   */
  boolean: Joi.boolean(),

  // ===========================================
  // Enum Validators
  // ===========================================

  /**
   * User role validation
   * @example
   * role: generalRules.userRole.required()
   */
  userRole: Joi.string()
    .valid(...USER_ROLES_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + USER_ROLES_ARRAY.join(', ')
    }),

  /**
   * User status validation
   * @example
   * status: generalRules.userStatus.default('active')
   */
  userStatus: Joi.string()
    .valid(...USER_STATUS_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + USER_STATUS_ARRAY.join(', ')
    }),

  /**
   * Room type validation
   * @example
   * type: generalRules.roomType.required()
   */
  roomType: Joi.string()
    .valid(...ROOM_TYPES_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + ROOM_TYPES_ARRAY.join(', ')
    }),

  /**
   * Session status validation
   * @example
   * status: generalRules.sessionStatus.default('active')
   */
  sessionStatus: Joi.string()
    .valid(...SESSION_STATUS_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + SESSION_STATUS_ARRAY.join(', ')
    }),

  /**
   * Payment status validation
   * @example
   * paymentStatus: generalRules.paymentStatus.default('pending')
   */
  paymentStatus: Joi.string()
    .valid(...PAYMENT_STATUS_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + PAYMENT_STATUS_ARRAY.join(', ')
    }),

  /**
   * Subscription type validation
   * @example
   * planType: generalRules.subscriptionType.required()
   */
  subscriptionType: Joi.string()
    .valid(...SUBSCRIPTION_TYPES_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + SUBSCRIPTION_TYPES_ARRAY.join(', ')
    }),

  /**
   * Subscription status validation
   * @example
   * status: generalRules.subscriptionStatus.default('active')
   */
  subscriptionStatus: Joi.string()
    .valid(...SUBSCRIPTION_STATUS_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + SUBSCRIPTION_STATUS_ARRAY.join(', ')
    }),

  /**
   * Cafe category validation
   * @example
   * category: generalRules.cafeCategory.required()
   */
  cafeCategory: Joi.string()
    .messages({}),

  /**
   * Expense type validation
   * @example
   * expenseType: generalRules.expenseType.required()
   */
  expenseType: Joi.string()
    .valid(...EXPENSE_TYPES_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + EXPENSE_TYPES_ARRAY.join(', ')
    }),

  /**
   * Report type validation
   * @example
   * reportType: generalRules.reportType.required()
   */
  reportType: Joi.string()
    .valid(...REPORT_TYPES_ARRAY)
    .messages({
      'any.only': '{{#label}} must be one of: ' + REPORT_TYPES_ARRAY.join(', ')
    }),

  // ===========================================
  // Pagination Validators
  // ===========================================

  /**
   * Page number for pagination (minimum 1)
   * @example
   * page: generalRules.pageNumber.default(1)
   */
  pageNumber: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': '{{#label}} must be at least 1'
    }),

  /**
   * Limit for pagination (1-100)
   * @example
   * limit: generalRules.pageLimit.default(10)
   */
  pageLimit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': '{{#label}} must be at least 1',
      'number.max': '{{#label}} cannot exceed 100'
    }),

  /**
   * Sort string (e.g., "createdAt:desc,name:asc")
   * @example
   * sort: generalRules.sortString.optional()
   */
  sortString: Joi.string()
    .pattern(/^[\w]+:(asc|desc)(,[\w]+:(asc|desc))*$/)
    .messages({
      'string.pattern.base': '{{#label}} must be in format "field:asc" or "field:desc"'
    })
};

module.exports = { generalRules };
