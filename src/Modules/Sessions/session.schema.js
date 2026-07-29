/**
 * ===========================================
 * StudySpace ERP Backend - Session Validation Schemas
 * ===========================================
 *
 * Joi validation schemas for Session-related API endpoints.
 * Validates check-in, check-out, and query operations.
 *
 * @file src/Modules/Sessions/session.schema.js
 * @description Session Joi validation schemas
 */

const Joi = require('joi');
const { generalRules } = require('../../Utils/general-rules.utils.js');
const { SESSION_STATUS_ARRAY, PAYMENT_STATUS_ARRAY } = require('../../Utils/enum.utils.js');

/**
 * Schema for checking in a user (creating a new session)
 * Required fields: user, room, workspace
 */
const checkInSchema = {
  body: Joi.object({
    /**
     * User (member) being checked in
     * Must be a valid MongoDB ObjectId
     */
    user: generalRules.objectId.required().messages({
      'any.required': 'User ID is required for check-in'
    }),

    /**
     * Room where the user is checking in
     * Must be a valid MongoDB ObjectId
     */
    room: generalRules.objectId.required().messages({
      'any.required': 'Room ID is required for check-in'
    }),

    /**
     * Workspace for the session
     * Must be a valid MongoDB ObjectId
     */
    workspace: generalRules.objectId.required().messages({
      'any.required': 'Workspace ID is required for check-in'
    }),

    /**
     * Optional notes for the session
     */
    notes: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional()
  }).required()
};

/**
 * Schema for checking out a user (ending a session)
 */
const checkOutSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Session ID is required for check-out'
    })
  }).required(),

  body: Joi.object({
    /**
     * Optional notes to add on checkout
     */
    notes: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional()
  }).optional()
};

/**
 * Schema for getting a single session by ID
 */
const getSessionSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Session ID is required'
    })
  }).required()
};

/**
 * Schema for listing sessions with filters
 */
const listSessionsSchema = {
  query: Joi.object({
    /**
     * Filter by user
     */
    user: generalRules.objectId.optional(),

    /**
     * Filter by room
     */
    room: generalRules.objectId.optional(),

    /**
     * Filter by workspace
     */
    workspace: generalRules.objectId.optional(),

    /**
     * Filter by session status (active/completed)
     */
    status: Joi.string()
      .valid(...SESSION_STATUS_ARRAY)
      .optional(),

    /**
     * Filter by payment status (pending/paid)
     */
    paymentStatus: Joi.string()
      .valid(...PAYMENT_STATUS_ARRAY)
      .optional(),

    /**
     * Filter by date range - start date
     */
    startDate: Joi.date()
      .iso()
      .optional(),

    /**
     * Filter by date range - end date
     */
    endDate: Joi.date()
      .iso()
      .greater(Joi.ref('startDate'))
      .optional(),

    /**
     * Pagination: page number (1-based)
     */
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),

    /**
     * Pagination: items per page
     */
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),

    /**
     * Sort field and direction
     */
    sort: Joi.string()
      .pattern(/^[\w]+:(asc|desc)$/)
      .default('checkIn:desc')
  }).optional()
};

/**
 * Schema for getting active sessions
 */
const getActiveSessionsSchema = {
  query: Joi.object({
    /**
     * Filter by room
     */
    room: generalRules.objectId.optional(),

    /**
     * Filter by workspace
     */
    workspace: generalRules.objectId.optional()
  }).optional()
};

/**
 * Schema for member session history (T153)
 * Used by logged-in members to view their own session history
 */
const mySessionHistorySchema = {
  query: Joi.object({
    /**
     * Filter by session status
     */
    status: Joi.string()
      .valid(...SESSION_STATUS_ARRAY)
      .optional(),

    /**
     * Filter by date range - start date
     */
    startDate: Joi.date()
      .iso()
      .optional(),

    /**
     * Filter by date range - end date
     */
    endDate: Joi.date()
      .iso()
      .optional(),

    /**
     * Pagination: page number (1-based)
     */
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),

    /**
     * Pagination: items per page
     */
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
  }).optional()
};

module.exports = {
  checkInSchema,
  checkOutSchema,
  getSessionSchema,
  listSessionsSchema,
  getActiveSessionsSchema,
  mySessionHistorySchema
};
