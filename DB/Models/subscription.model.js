/**
 * ===========================================
 * StudySpace ERP Backend - Subscription Model
 * ===========================================
 *
 * Mongoose model for Subscription entity.
 * Tracks member subscription plans and usage.
 *
 * @file DB/Models/subscription.model.js
 * @description Mongoose schema and model for subscriptions
 */

const mongoose = require('mongoose');
const { SUBSCRIPTION_TYPES_ARRAY, SUBSCRIPTION_STATUS_ARRAY } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

/**
 * Subscription Schema
 *
 * Defines the structure for subscription documents.
 * Tracks plan details, duration, and usage.
 */
const subscriptionSchema = new Schema({
  /**
   * Reference to the subscribing member
   */
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required for subscription']
  },

  /**
   * Subscription plan name
   */
  planName: {
    type: String,
    required: [true, 'Plan name is required'],
    minlength: [3, 'Plan name must be at least 3 characters'],
    maxlength: [100, 'Plan name cannot exceed 100 characters'],
    trim: true
  },

  /**
   * Subscription plan type
   */
  planType: {
    type: String,
    required: [true, 'Plan type is required'],
    enum: {
      values: SUBSCRIPTION_TYPES_ARRAY,
      message: 'Invalid plan type. Must be: ' + SUBSCRIPTION_TYPES_ARRAY.join(', ')
    }
  },

  /**
   * Plan price
   */
  price: {
    type: Number,
    required: [true, 'Plan price is required'],
    min: [0, 'Plan price must be a positive number']
  },

  /**
   * Plan start date
   */
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },

  /**
   * Plan end date
   * Must be after start date
   */
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function (value) {
        if (!this.startDate || !value) {return true;}
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },

  /**
   * Subscription status
   */
  status: {
    type: String,
    required: [true, 'Subscription status is required'],
    enum: {
      values: SUBSCRIPTION_STATUS_ARRAY,
      message: 'Invalid subscription status. Must be: ' + SUBSCRIPTION_STATUS_ARRAY.join(', ')
    }
  },

  /**
   * Total hours included in the plan (optional)
   */
  hoursIncluded: {
    type: Number,
    min: [0, 'Hours included must be >= 0'],
    default: null
  },

  /**
   * Hours used from the plan
   */
  hoursUsed: {
    type: Number,
    min: [0, 'Hours used must be >= 0'],
    default: 0,
    validate: {
      validator: function (value) {
        if (this.hoursIncluded === null || this.hoursIncluded === undefined) {return true;}
        return value <= this.hoursIncluded;
      },
      message: 'Hours used cannot exceed hours included'
    }
  },

  /**
   * Staff/admin who created the subscription
   */
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  }
}, {
  timestamps: true
});

/**
 * Indexes
 */
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

const Subscription = model('Subscription', subscriptionSchema);

module.exports = Subscription;