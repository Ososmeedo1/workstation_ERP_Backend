/**
 * ===========================================
 * StudySpace ERP Backend - Session Model
 * ===========================================
 *
 * Mongoose model for Session entity.
 * Represents a member's usage session in a room.
 * Tracks check-in/check-out times and calculates costs.
 *
 * Session workflow:
 * 1. Staff checks member in → creates session (status: active)
 * 2. Member uses the room
 * 3. Staff checks member out → updates session (status: completed)
 * 4. Duration and amount calculated, payment recorded
 *
 * @file DB/Models/session.model.js
 * @description Mongoose schema and model for Sessions
 */

const mongoose = require('mongoose');
const {
  SESSION_STATUS_ARRAY,
  SESSION_STATUS,
  PAYMENT_STATUS_ARRAY,
  PAYMENT_STATUS
} = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

/**
 * Session Schema
 *
 * Defines the structure for session documents.
 * Each session links a user to a room for a time period.
 */
const sessionSchema = new Schema({
  /**
   * Reference to the user (member) having the session
   * Links to User model for member identification
   */
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },

  /**
   * Reference to the room being used
   * Links to Room model for location and rate info
   */
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room reference is required']
  },

  /**
   * Reference to the workspace
   * Denormalized for efficient querying by workspace
   */
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace reference is required']
  },

  /**
   * Timestamp when member checked into the room
   * Set automatically when session is created
   */
  checkIn: {
    type: Date,
    required: [true, 'Check-in time is required'],
    default: Date.now
  },

  /**
   * Timestamp when member checked out of the room
   * Null while session is active, set on checkout
   */
  checkOut: {
    type: Date,
    default: null
  },

  /**
   * Current status of the session
   * - active: Member currently in room
   * - completed: Member has checked out
   */
  status: {
    type: String,
    required: true,
    enum: {
      values: SESSION_STATUS_ARRAY,
      message: 'Invalid session status'
    },
    default: SESSION_STATUS.ACTIVE
  },

  /**
   * Duration of the session in minutes
   * Calculated on checkout from checkIn and checkOut times
   */
  durationMinutes: {
    type: Number,
    default: 0,
    min: [0, 'Duration cannot be negative']
  },

  /**
   * Hourly rate at time of session
   * Copied from room to preserve rate even if room rate changes
   */
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [0, 'Hourly rate cannot be negative']
  },

  /**
   * Total amount due for this session
   * Calculated as: (durationMinutes / 60) * hourlyRate
   */
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total amount cannot be negative']
  },

  /**
   * Payment status for this session
   * - pending: Payment not yet received
   * - paid: Cash payment confirmed
   */
  paymentStatus: {
    type: String,
    enum: {
      values: PAYMENT_STATUS_ARRAY,
      message: 'Invalid payment status'
    },
    default: PAYMENT_STATUS.PENDING
  },

  /**
   * Reference to payment record if paid
   * Links to Payment model for receipt info
   */
  payment: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },

  /**
   * Staff member who checked the user in
   * For audit and accountability
   */
  checkedInBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Staff reference is required']
  },

  /**
   * Staff member who checked the user out
   * May be different from checkedInBy (shift changes)
   */
  checkedOutBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  /**
   * Optional notes about the session
   * Staff can add comments if needed
   */
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
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
 * Indexes for efficient queries
 * - user + status: Find active sessions for a user
 * - room + status: Find active sessions in a room
 * - workspace + createdAt: Daily session reports
 * - status: Filter by session status
 * - checkIn: Date range queries for reports
 */
sessionSchema.index({ user: 1, status: 1 });
sessionSchema.index({ room: 1, status: 1 });
sessionSchema.index({ workspace: 1, createdAt: -1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ checkIn: -1 });
sessionSchema.index({ paymentStatus: 1 });
sessionSchema.index({ user: 1 });
sessionSchema.index({ room: 1 });

/**
 * Virtual to check if session is currently active
 * @returns {boolean} True if session is active
 */
sessionSchema.virtual('isActive').get(function () {
  return this.status === SESSION_STATUS.ACTIVE;
});

/**
 * Transform output when converting to JSON
 */
sessionSchema.set('toJSON', {
  virtuals: true
});

sessionSchema.set('toObject', { virtuals: true });

/**
 * Session Model
 * @type {mongoose.Model}
 */
const Session = model('Session', sessionSchema);

module.exports = Session;
