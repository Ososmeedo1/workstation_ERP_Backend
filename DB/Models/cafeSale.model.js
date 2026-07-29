/**
 * ===========================================
 * StudySpace ERP Backend - CafeSale Model
 * ===========================================
 *
 * Mongoose model for cafe sales transactions.
 * Tracks items sold, totals, and payment status.
 *
 * Features:
 * - Multiple items per sale
 * - Item details cached at sale time (price snapshot)
 * - Total amount calculation
 * - Payment status tracking
 * - Staff/customer tracking
 *
 * Business Rules:
 * - Cash-only payments (NON-NEGOTIABLE)
 * - Items array stores price at time of sale
 * - Inventory is decremented when sale is created
 * - Payment status updates on successful payment
 *
 * @file DB/Models/cafeSale.model.js
 * @description Mongoose schema and model for CafeSale
 * @task T106
 */

const mongoose = require('mongoose');
const { PAYMENT_STATUS_ARRAY, PAYMENT_STATUS } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

/**
 * CafeSaleItem Sub-Schema
 *
 * Embedded document for items in a cafe sale.
 * Stores item details at the time of sale to preserve
 * historical accuracy even if item prices change later.
 */
const cafeSaleItemSchema = new Schema({
  /**
   * Reference to the CafeItem
   * Used for inventory tracking and reporting
   */
  itemId: {
    type: Schema.Types.ObjectId,
    ref: 'CafeItem',
    required: [true, 'Item reference is required']
  },

  /**
   * Item name (cached)
   * Stored at sale time for receipt display
   * Preserves name even if item is later renamed/deleted
   */
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },

  /**
   * Quantity sold
   * Must be at least 1
   */
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },

  /**
   * Unit price at sale time (cached)
   * Preserves price even if item price changes later
   * Used for receipt accuracy and historical reports
   */
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },

  /**
   * Line subtotal (calculated)
   * quantity * unitPrice
   */
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  }
}, { _id: false }); // Disable _id for embedded documents

/**
 * CafeSale Schema
 *
 * Main schema for cafe sale transactions.
 * Contains items array and sale metadata.
 */
const cafeSaleSchema = new Schema({
  /**
   * Array of items in this sale
   * Must contain at least one item
   */
  items: {
    type: [cafeSaleItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function (items) {
        return items && items.length > 0;
      },
      message: 'Sale must contain at least one item'
    }
  },

  /**
   * Total sale amount
   * Sum of all item subtotals
   */
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },

  /**
   * Payment status
   * Tracks whether the sale has been paid
   * Default: pending (until cash payment is recorded)
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
   * Reference to the payment record
   * Links to Payment collection when paid
   */
  payment: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },

  /**
   * Staff member who made the sale
   * Required for audit trail and reporting
   */
  servedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Staff member (servedBy) is required']
  },

  /**
   * Customer reference (optional)
   * Can link to a member if they have an account
   * Used for customer loyalty/history tracking
   */
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  /**
   * Sale timestamp
   * When the sale was created
   */
  saleTime: {
    type: Date,
    default: Date.now,
    required: true
  },

  /**
   * Optional notes
   * Staff can add notes about the sale
   * E.g., "Customer requested extra sugar"
   */
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true,
    default: ''
  },

  /**
   * Workspace reference
   * Links sale to a specific workspace
   */
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false
  }
}, {
  // Enable automatic timestamps
  timestamps: true,
  // Include virtuals when converting to JSON/Object
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===========================================
// Indexes for Query Performance
// ===========================================

/**
 * Index for date range queries
 * Used in daily/weekly/monthly reports
 */
cafeSaleSchema.index({ saleTime: 1 });

/**
 * Index for staff sales lookup
 * Used for staff performance reports
 */
cafeSaleSchema.index({ servedBy: 1, saleTime: -1 });

/**
 * Index for pending payments
 * Used when listing unpaid sales
 */
cafeSaleSchema.index({ paymentStatus: 1, saleTime: -1 });
// Index for payment status only (used by status filters)
cafeSaleSchema.index({ paymentStatus: 1 });

/**
 * Index for customer history
 * Used when looking up customer's purchase history
 */
cafeSaleSchema.index({ customerId: 1, saleTime: -1 });

/**
 * Compound index for workspace and date
 * Used for workspace-specific reports
 */
cafeSaleSchema.index({ workspace: 1, saleTime: -1 });
// Index for createdAt to speed up generic list queries
cafeSaleSchema.index({ createdAt: -1 });

// ===========================================
// Virtual Properties
// ===========================================

/**
 * Check if sale is paid
 * @virtual isPaid
 * @returns {boolean} True if payment status is 'paid'
 */
cafeSaleSchema.virtual('isPaid').get(function () {
  return this.paymentStatus === PAYMENT_STATUS.PAID;
});

/**
 * Get total number of items sold
 * @virtual totalItems
 * @returns {number} Sum of all item quantities
 */
cafeSaleSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

/**
 * Get unique item count
 * @virtual uniqueItems
 * @returns {number} Number of unique items in the sale
 */
cafeSaleSchema.virtual('uniqueItems').get(function () {
  return this.items.length;
});

// ===========================================
// Pre-save Middleware
// ===========================================

/**
 * Pre-save hook to calculate totals
 * Ensures totalAmount matches sum of subtotals
 */
cafeSaleSchema.pre('save', function (next) {
  // Recalculate subtotals for each item
  this.items.forEach(item => {
    item.subtotal = item.quantity * item.unitPrice;
  });

  // Recalculate total amount
  this.totalAmount = this.items.reduce((sum, item) => sum + item.subtotal, 0);

  next();
});

// ===========================================
// Instance Methods
// ===========================================

/**
 * Mark sale as paid
 *
 * @method markAsPaid
 * @param {ObjectId} paymentId - Reference to the payment record
 * @returns {Promise} Saved sale document
 */
cafeSaleSchema.methods.markAsPaid = function (paymentId) {
  this.paymentStatus = PAYMENT_STATUS.PAID;
  this.payment = paymentId;
  return this.save();
};

/**
 * Add a receipt number reference
 * Note: Receipt is stored in Payment model, this is just for reference
 *
 * @method addReceiptReference
 * @param {ObjectId} paymentId - Payment record ID
 */
cafeSaleSchema.methods.addReceiptReference = function (paymentId) {
  this.payment = paymentId;
};

/**
 * Get sale summary for display/printing
 *
 * @method getSummary
 * @returns {Object} Sale summary with items and totals
 */
cafeSaleSchema.methods.getSummary = function () {
  return {
    saleId: this._id,
    saleTime: this.saleTime,
    items: this.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal
    })),
    totalItems: this.totalItems,
    totalAmount: this.totalAmount,
    paymentStatus: this.paymentStatus,
    isPaid: this.isPaid
  };
};

// ===========================================
// Static Methods
// ===========================================

/**
 * Find sales by date range
 *
 * @static findByDateRange
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {Object} options - Additional filters
 * @returns {Promise<Array>} Sales in the date range
 */
cafeSaleSchema.statics.findByDateRange = function (startDate, endDate, options = {}) {
  const query = {
    saleTime: {
      $gte: startDate,
      $lte: endDate
    }
  };

  if (options.workspace) {
    query.workspace = options.workspace;
  }

  if (options.servedBy) {
    query.servedBy = options.servedBy;
  }

  if (options.paymentStatus) {
    query.paymentStatus = options.paymentStatus;
  }

  return this.find(query)
    .populate('servedBy', 'name email')
    .sort({ saleTime: -1 });
};

/**
 * Get sales statistics for a period
 *
 * @static getStatsByDateRange
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Object>} Aggregated statistics
 */
cafeSaleSchema.statics.getStatsByDateRange = async function (startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        saleTime: { $gte: startDate, $lte: endDate },
        paymentStatus: PAYMENT_STATUS.PAID
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        avgSaleAmount: { $avg: '$totalAmount' },
        totalItemsSold: { $sum: { $size: '$items' } }
      }
    }
  ]);

  return stats[0] || {
    totalSales: 0,
    totalRevenue: 0,
    avgSaleAmount: 0,
    totalItemsSold: 0
  };
};

/**
 * Find pending (unpaid) sales
 *
 * @static findPendingSales
 * @param {ObjectId} workspaceId - Optional workspace filter
 * @returns {Promise<Array>} Unpaid sales
 */
cafeSaleSchema.statics.findPendingSales = function (workspaceId = null) {
  const query = { paymentStatus: PAYMENT_STATUS.PENDING };

  if (workspaceId) {
    query.workspace = workspaceId;
  }

  return this.find(query)
    .populate('servedBy', 'name')
    .sort({ saleTime: -1 });
};

// Create and export the model
const CafeSale = model('CafeSale', cafeSaleSchema);

module.exports = CafeSale;
