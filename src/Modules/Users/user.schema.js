/**
 * ===========================================
 * StudySpace ERP Backend - User Validation Schemas
 * ===========================================
 *
 * Joi validation schemas for User-related endpoints.
 * Phase 9 focuses on subscription retrieval.
 *
 * @file src/Modules/Users/user.schema.js
 * @description User Joi validation schemas
 */

const Joi = require('joi');
const { generalRules } = require('../../Utils/general-rules.utils.js');
const {
  USER_ROLES_ARRAY,
  USER_STATUS_ARRAY,
  SUBSCRIPTION_STATUS_ARRAY,
  SUBSCRIPTION_TYPES_ARRAY
} = require('../../Utils/enum.utils.js');

/**
 * Schema for listing users with filters
 */
const listUsersSchema = {
  query: Joi.object({
    role: Joi.string()
      .valid(...USER_ROLES_ARRAY)
      .optional(),
    status: Joi.string()
      .valid(...USER_STATUS_ARRAY)
      .optional(),
    search: Joi.string()
      .trim()
      .max(100)
      .optional(),
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),
    sort: Joi.string()
      .pattern(/^[\w]+:(asc|desc)$/)
      .default('createdAt:desc')
  }).optional()
};

/**
 * Schema for creating a user
 */
const createUserSchema = {
  body: Joi.object({
    name: generalRules.name.required(),
    email: generalRules.email.required(),
    password: generalRules.password.optional(),
    phone: generalRules.phone.optional().allow(''),
    role: Joi.string()
      .valid(...USER_ROLES_ARRAY)
      .optional(),
    status: Joi.string()
      .valid(...USER_STATUS_ARRAY)
      .optional(),
    profileImage: Joi.string()
      .uri()
      .allow('')
      .optional()
  }).required()
};

/**
 * Schema for updating a user (excluding role)
 */
const updateUserSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'User ID is required'
    })
  }).required(),
  body: Joi.object({
    name: generalRules.name.optional(),
    email: generalRules.email.optional(),
    phone: generalRules.phone.optional().allow(''),
    status: Joi.string()
      .valid(...USER_STATUS_ARRAY)
      .optional(),
    profileImage: Joi.string()
      .uri()
      .allow('')
      .optional()
  }).required()
};

/**
 * Schema for updating user role
 */
const updateUserRoleSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'User ID is required'
    })
  }).required(),
  body: Joi.object({
    role: Joi.string()
      .valid(...USER_ROLES_ARRAY)
      .required()
  }).required()
};

/**
 * Schema for deactivating a user
 */
const deactivateUserSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'User ID is required'
    })
  }).required()
};

/**
 * Schema for activating a user
 */
const activateUserSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'User ID is required'
    })
  }).required()
};

/**
 * Schema for getting user subscriptions
 */
const getUserSubscriptionsSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'User ID is required'
    })
  }).required(),
  query: Joi.object({
    status: Joi.string()
      .valid(...SUBSCRIPTION_STATUS_ARRAY)
      .optional()
  }).optional()
};

/**
 * Schema for creating a subscription for a user
 */
const createSubscriptionSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'User ID is required'
    })
  }).required(),
  body: Joi.object({
    planName: Joi.string()
      .min(3)
      .max(100)
      .required(),
    planType: Joi.string()
      .valid(...SUBSCRIPTION_TYPES_ARRAY)
      .required(),
    price: Joi.number()
      .min(0)
      .required(),
    startDate: Joi.date()
      .iso()
      .required(),
    endDate: Joi.date()
      .iso()
      .greater(Joi.ref('startDate'))
      .required(),
    status: Joi.string()
      .valid(...SUBSCRIPTION_STATUS_ARRAY)
      .optional(),
    hoursIncluded: Joi.number()
      .min(0)
      .optional(),
    hoursUsed: Joi.number()
      .min(0)
      .optional()
  }).required()
};

module.exports = {
  listUsersSchema,
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  deactivateUserSchema,
  activateUserSchema,
  getUserSubscriptionsSchema,
  createSubscriptionSchema
};