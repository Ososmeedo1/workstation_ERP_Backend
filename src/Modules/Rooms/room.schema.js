/**
 * ===========================================
 * StudySpace ERP Backend - Room Validation Schemas
 * ===========================================
 *
 * Joi validation schemas for Room-related API endpoints.
 * Validates room creation, updates, and query parameters.
 *
 * @file src/Modules/Rooms/room.schema.js
 * @description Room Joi validation schemas
 */

const Joi = require('joi');
const { generalRules } = require('../../Utils/general-rules.utils.js');
const { ROOM_TYPES_ARRAY } = require('../../Utils/enum.utils.js');

/**
 * Schema for creating a new room
 * Required fields: workspace, name, type, capacity, hourlyRate
 */
const createRoomSchema = {
  body: Joi.object({
    /**
     * Reference to workspace this room belongs to
     * Must be a valid MongoDB ObjectId
     */
    workspace: generalRules.objectId.required().messages({
      'any.required': 'Workspace ID is required'
    }),

    /**
     * Room name for identification
     * Example: "Room A", "Meeting Room 1"
     */
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.min': 'Room name must be at least 2 characters',
        'string.max': 'Room name cannot exceed 50 characters',
        'any.required': 'Room name is required'
      }),

    /**
     * Type of room: public, private, or silent
     * Determines usage rules and pricing tier
     */
    type: Joi.string()
      .valid(...ROOM_TYPES_ARRAY)
      .required()
      .messages({
        'any.only': `Room type must be one of: ${ROOM_TYPES_ARRAY.join(', ')}`,
        'any.required': 'Room type is required'
      }),

    /**
     * Maximum occupancy for the room
     * Must be at least 1, max 100
     */
    capacity: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .required()
      .messages({
        'number.min': 'Capacity must be at least 1',
        'number.max': 'Capacity cannot exceed 100',
        'any.required': 'Room capacity is required'
      }),

    /**
     * Cost per hour for using this room
     * Must be non-negative
     */
    hourlyRate: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.min': 'Hourly rate cannot be negative',
        'any.required': 'Hourly rate is required'
      }),

    /**
     * Optional description of the room
     */
    description: Joi.string()
      .max(200)
      .trim()
      .allow('')
      .optional()
  }).required()
};

/**
 * Schema for updating an existing room
 * All fields are optional - only provided fields will be updated
 */
const updateRoomSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Room ID is required'
    })
  }).required(),

  body: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .optional(),

    type: Joi.string()
      .valid(...ROOM_TYPES_ARRAY)
      .optional()
      .messages({
        'any.only': `Room type must be one of: ${ROOM_TYPES_ARRAY.join(', ')}`
      }),

    capacity: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional(),

    hourlyRate: Joi.number()
      .min(0)
      .optional(),

    description: Joi.string()
      .max(200)
      .trim()
      .allow('')
      .optional(),

    /**
     * Active status - can be used to "soft delete" rooms
     */
    isActive: Joi.boolean()
      .optional()
  }).required().min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

/**
 * Schema for getting a single room by ID
 */
const getRoomSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Room ID is required'
    })
  }).required()
};

/**
 * Schema for listing rooms with filters
 */
const listRoomsSchema = {
  query: Joi.object({
    /**
     * Filter by workspace
     */
    workspace: generalRules.objectId.optional(),

    /**
     * Filter by room type
     */
    type: Joi.string()
      .valid(...ROOM_TYPES_ARRAY)
      .optional(),

    /**
     * Filter by active status (default: true)
     */
    isActive: Joi.boolean()
      .optional(),

    /**
     * Only show rooms with available capacity
     */
    available: Joi.boolean()
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
     * Format: "field:asc" or "field:desc"
     */
    sort: Joi.string()
      .pattern(/^[\w]+:(asc|desc)$/)
      .default('name:asc')
  }).optional()
};

module.exports = {
  createRoomSchema,
  updateRoomSchema,
  getRoomSchema,
  listRoomsSchema
};
