/**
 * ===========================================
 * StudySpace ERP Backend - Payment Model
 * ===========================================
 *
 * Mongoose model for Payment entity.
 * Records cash payments for sessions and cafe sales.
 *
 * IMPORTANT (NON-NEGOTIABLE):
 * This system only supports CASH payments.
 * paymentMethod is always "cash" - no online payments.
 *
 * Payment types:
 * - session: Payment for room usage session
 * - cafe: Payment for cafe item purchase
 *
 * @file DB/Models/payment.model.js
 * @description Mongoose schema and model for Payments
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { PAYMENT_METHODS, PAYMENT_METHODS_ARRAY } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

/**
 * Payment types enum
 * Defines what the payment is for
 */
const PAYMENT_TYPES = Object.freeze({
  SESSION: 'session',
  CAFE: 'cafe'
});

const PAYMENT_TYPES_ARRAY = Object.values(PAYMENT_TYPES);

/**
 * Payment Schema
 *
 * Defines the structure for payment documents.
 * Each payment is linked to either a session or cafe sale.
 */
const paymentSchema = new Schema({
  /**
   * Unique receipt number for this payment
   * Generated using nanoid for uniqueness
   * Format: RCP-XXXXXXXXXX (10 char alphanumeric)
   */
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    default: function () {
      return `RCP-${nanoid(10).toUpperCase()}`;
    }
  },

  /**
   * Type of payment
   * - session: For room usage
   * - cafe: For cafe purchases
   */
  paymentType: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: {
      values: PAYMENT_TYPES_ARRAY,
      message: 'Invalid payment type. Must be: ' + PAYMENT_TYPES_ARRAY.join(', ')
    }
  },

  /**
   * Total amount paid
   * In local currency (EGP assumed)
   */
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },

  /**
   * Payment method - ALWAYS "cash"
   * NON-NEGOTIABLE: System only supports cash payments
   * This field exists for audit/reporting consistency
   */
  paymentMethod: {
    type: String,
    required: true,
    enum: {
      values: PAYMENT_METHODS_ARRAY,
      message: 'Invalid payment method'
    },
    default: PAYMENT_METHODS.CASH
  },

  /**
   * Reference to the session being paid for
   * Required if paymentType is 'session'
   */
  session: {
    type: Schema.Types.ObjectId,
    ref: 'Session',
    default: null
  },

  /**
   * Reference to the cafe sale being paid for
   * Required if paymentType is 'cafe'
   */
  cafeSale: {
    type: Schema.Types.ObjectId,
    ref: 'CafeSale',
    default: null
  },

  /**
   * Reference to the workspace
   * Denormalized for efficient reporting by location
   */
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace reference is required']
  },

  /**
   * User who made the payment (customer)
   * May be null for walk-in cafe customers
   */
  paidBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  /**
   * Staff member who received the payment
   * For accountability and audit trail
   */
  receivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Staff reference is required']
  },

  /**
   * Date and time when payment was received
   * Defaults to current time
   */
  paidAt: {
    type: Date,
    required: true,
    default: Date.now
  },

  /**
   * Optional notes about the payment
   * Example: "Paid with exact change"
   */
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters'],
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
 * - workspace + paidAt: Daily payment reports
 * - paymentType: Filter by payment type
 * - session: Find payment for a session
 * - cafeSale: Find payment for a cafe sale
 * Note: receiptNumber index created automatically by unique: true
 */
paymentSchema.index({ workspace: 1, paidAt: -1 });
paymentSchema.index({ paymentType: 1 });
paymentSchema.index({ session: 1 });
paymentSchema.index({ cafeSale: 1 });
paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ createdAt: -1 });

/**
 * Pre-validate hook to ensure payment has valid reference
 * A payment must be linked to either a session or cafe sale
 */
paymentSchema.pre('validate', function (next) {
  if (this.paymentType === PAYMENT_TYPES.SESSION && !this.session) {
    next(new Error('Session reference is required for session payments'));
  } else if (this.paymentType === PAYMENT_TYPES.CAFE && !this.cafeSale) {
    next(new Error('Cafe sale reference is required for cafe payments'));
  } else {
    next();
  }
});

/**
 * Transform output when converting to JSON
 */
paymentSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

/**
 * Payment Model
 * @type {mongoose.Model}
 */
const Payment = model('Payment', paymentSchema);

/**
 * Export model and payment types for use in other modules
 */
module.exports = Payment;
module.exports.PAYMENT_TYPES = PAYMENT_TYPES;
module.exports.PAYMENT_TYPES_ARRAY = PAYMENT_TYPES_ARRAY;
