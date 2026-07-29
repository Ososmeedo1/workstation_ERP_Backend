/**
 * ===========================================
 * StudySpace ERP Backend - Room Model
 * ===========================================
 *
 * Mongoose model for Room entity.
 * Represents individual rooms within a workspace where members
 * can have study/work sessions.
 *
 * Room types:
 * - public: Open shared workspace area
 * - private: Private meeting/study room
 * - silent: Quiet zone for focused work
 *
 * @file DB/Models/room.model.js
 * @description Mongoose schema and model for Rooms
 */

const mongoose = require('mongoose');
const { ROOM_TYPES_ARRAY, ROOM_TYPES } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

/**
 * Room Schema
 *
 * Defines the structure for room documents.
 * Each room belongs to a workspace and has capacity limits.
 */
const roomSchema = new Schema({
  /**
   * Reference to the parent workspace
   * Links the room to a specific workspace location
   */
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace reference is required']
  },

  /**
   * Room name for identification
   * Example: "Room A", "Meeting Room 1", "Silent Zone"
   */
  name: {
    type: String,
    required: [true, 'Room name is required'],
    minlength: [2, 'Room name must be at least 2 characters'],
    maxlength: [50, 'Room name cannot exceed 50 characters'],
    trim: true
  },

  /**
   * Type of room determining usage rules
   * - public: Open area, shared desks
   * - private: Bookable private room
   * - silent: Quiet zone, no talking
   */
  type: {
    type: String,
    required: [true, 'Room type is required'],
    enum: {
      values: ROOM_TYPES_ARRAY,
      message: 'Invalid room type. Must be: ' + ROOM_TYPES_ARRAY.join(', ')
    },
    default: ROOM_TYPES.PUBLIC
  },

  /**
   * Maximum number of people allowed in the room
   * Used for availability checks and capacity enforcement
   */
  capacity: {
    type: Number,
    required: [true, 'Room capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [100, 'Capacity cannot exceed 100']
  },

  /**
   * Cost per hour for using this room
   * Used to calculate session totals on checkout
   */
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [0, 'Hourly rate cannot be negative']
  },

  /**
   * Current number of active sessions in this room
   * Updated on check-in (+1) and check-out (-1)
   * Used for real-time availability display
   */
  currentOccupancy: {
    type: Number,
    default: 0,
    min: [0, 'Occupancy cannot be negative']
  },

  /**
   * Whether the room is available for use
   * Admin can deactivate rooms for maintenance
   */
  isActive: {
    type: Boolean,
    default: true
  },

  /**
   * Optional description of the room
   * Example: "Corner room with window view"
   */
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    trim: true,
    default: ''
  }
}, {
  /**
   * Schema options
   * - timestamps: Automatically adds createdAt and updatedAt fields
   * - versionKey: Disable __v field
   */
  timestamps: true,
  versionKey: false
});

/**
 * Index for faster queries
 * - workspace + isActive: List active rooms in a workspace
 * - type: Filter by room type
 */
roomSchema.index({ workspace: 1, isActive: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ isActive: 1 });

/**
 * Virtual to check if room has available spots
 * @returns {boolean} True if currentOccupancy < capacity
 */
roomSchema.virtual('isAvailable').get(function () {
  return this.currentOccupancy < this.capacity && this.isActive;
});

/**
 * Virtual to get available spots count
 * @returns {number} Number of available spots
 */
roomSchema.virtual('availableSpots').get(function () {
  return Math.max(0, this.capacity - this.currentOccupancy);
});

/**
 * Ensure virtuals are included in JSON output
 */
roomSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

roomSchema.set('toObject', { virtuals: true });

/**
 * Room Model
 * @type {mongoose.Model}
 */
const Room = model('Room', roomSchema);

module.exports = Room;
