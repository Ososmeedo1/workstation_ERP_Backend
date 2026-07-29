/**
 * ===========================================
 * StudySpace ERP Backend - CafeItem Model
 * ===========================================
 *
 * Mongoose model for cafe menu items.
 * Tracks inventory, pricing, and availability for the cafe.
 *
 * Features:
 * - Item details (name, category, description)
 * - Pricing (selling price, cost for profit tracking)
 * - Inventory tracking (quantity, low stock threshold)
 * - Availability status
 *
 * Business Rules:
 * - Items with quantity = 0 should be marked as unavailable
 * - Low stock alert triggers when quantity <= lowStockThreshold
 * - Cost is used for profit margin calculations in reports
 *
 * @file DB/Models/cafeItem.model.js
 * @description Mongoose schema and model for CafeItem
 * @task T105
 */

const mongoose = require('mongoose');
const { CAFE_CATEGORIES } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

/**
 * CafeItem Schema
 *
 * Defines the structure for cafe menu items including
 * inventory management and pricing information.
 */
const cafeItemSchema = new Schema({
  /**
   * Item name
   * Display name shown in the cafe menu
   */
  name: {
    type: String,
    required: [true, 'Item name is required'],
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    trim: true
  },

  /**
   * Item category
   * Used for organizing and filtering items
   * Categories: beverage, snack, meal, other
   */
  category: {
    type: String,
    required: [true, 'Item category is required'],
    default: CAFE_CATEGORIES.OTHER
  },

  /**
   * Item description
   * Optional detailed description for the item
   */
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true,
    default: ''
  },

  /**
   * Selling price
   * The price charged to customers (in local currency)
   * Must be non-negative
   */
  price: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Price cannot be negative']
  },

  /**
   * Cost price
   * The purchase/production cost for profit tracking
   * Used in financial reports to calculate margins
   */
  cost: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost cannot be negative'],
    default: 0
  },

  /**
   * Current quantity in stock
   * Decremented on each sale
   * Incremented on restock
   */
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },

  /**
   * Low stock threshold
   * Alert is triggered when quantity <= this value
   * Helps staff know when to reorder items
   */
  lowStockThreshold: {
    type: Number,
    required: [true, 'Low stock threshold is required'],
    min: [0, 'Threshold cannot be negative'],
    default: 5
  },

  /**
   * Unit of measurement
   * Describes how the item is measured/sold
   * Examples: pieces, cups, plates, ml, grams
   */
  unit: {
    type: String,
    maxlength: [50, 'Unit cannot exceed 50 characters'],
    trim: true,
    default: 'pieces'
  },

  /**
   * Availability status
   * Whether the item can be ordered
   * Should be false when quantity = 0
   */
  isAvailable: {
    type: Boolean,
    default: true
  },

  /**
   * Image URL
   * Optional image for displaying in the cafe menu
   */
  imageUrl: {
    type: String,
    trim: true,
    default: null
  },

  /**
   * Workspace reference
   * Links item to a specific workspace (for multi-location support)
   */
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false // Optional for now, can be required when multi-workspace is implemented
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
 * Compound index for category filtering with availability
 * Used when listing items by category
 */
cafeItemSchema.index({ category: 1, isAvailable: 1 });

/**
 * Index for name searches
 * Used when searching for items by name
 */
cafeItemSchema.index({ name: 'text' });

/**
 * Index for low stock queries
 * Used when finding items that need restocking
 */
cafeItemSchema.index({ quantity: 1, lowStockThreshold: 1 });

/**
 * Workspace index for multi-location queries
 */
cafeItemSchema.index({ workspace: 1, isAvailable: 1 });

// ===========================================
// Virtual Properties (Computed Fields)
// ===========================================

/**
 * Check if item is low on stock
 * @virtual isLowStock
 * @returns {boolean} True if quantity <= lowStockThreshold
 */
cafeItemSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

/**
 * Check if item is out of stock
 * @virtual isOutOfStock
 * @returns {boolean} True if quantity = 0
 */
cafeItemSchema.virtual('isOutOfStock').get(function () {
  return this.quantity === 0;
});

/**
 * Calculate profit margin percentage
 * @virtual profitMargin
 * @returns {number} Profit margin as percentage (0-100)
 */
cafeItemSchema.virtual('profitMargin').get(function () {
  if (this.price === 0) {return 0;}
  return ((this.price - this.cost) / this.price) * 100;
});

/**
 * Calculate profit per unit
 * @virtual profitPerUnit
 * @returns {number} Profit amount per unit sold
 */
cafeItemSchema.virtual('profitPerUnit').get(function () {
  return this.price - this.cost;
});

// ===========================================
// Pre-save Middleware
// ===========================================

/**
 * Pre-save hook to auto-update availability
 * Sets isAvailable to false when quantity reaches 0
 */
cafeItemSchema.pre('save', function (next) {
  // Auto-mark as unavailable if out of stock
  if (this.quantity === 0 && this.isAvailable) {
    this.isAvailable = false;
  }
  next();
});

// ===========================================
// Instance Methods
// ===========================================

/**
 * Check if sufficient quantity is available for a sale
 *
 * @method canSell
 * @param {number} requestedQuantity - Quantity to check
 * @returns {boolean} True if sale is possible
 */
cafeItemSchema.methods.canSell = function (requestedQuantity) {
  return this.isAvailable && this.quantity >= requestedQuantity;
};

/**
 * Decrement stock after a sale
 *
 * @method decrementStock
 * @param {number} soldQuantity - Quantity sold
 * @returns {number} New quantity after decrement
 */
cafeItemSchema.methods.decrementStock = function (soldQuantity) {
  this.quantity = Math.max(0, this.quantity - soldQuantity);

  // Auto-disable if out of stock
  if (this.quantity === 0) {
    this.isAvailable = false;
  }

  return this.quantity;
};

/**
 * Increment stock on restock
 *
 * @method restockItem
 * @param {number} addedQuantity - Quantity to add
 * @returns {number} New quantity after restock
 */
cafeItemSchema.methods.restockItem = function (addedQuantity) {
  this.quantity += addedQuantity;

  // Auto-enable if restocked and was disabled
  if (this.quantity > 0 && !this.isAvailable) {
    this.isAvailable = true;
  }

  return this.quantity;
};

// ===========================================
// Static Methods
// ===========================================

/**
 * Find all items that are low on stock
 *
 * @static findLowStock
 * @param {ObjectId} workspaceId - Optional workspace filter
 * @returns {Promise<Array>} Items with low stock
 */
cafeItemSchema.statics.findLowStock = function (workspaceId = null) {
  const query = {
    $expr: { $lte: ['$quantity', '$lowStockThreshold'] }
  };

  if (workspaceId) {
    query.workspace = workspaceId;
  }

  return this.find(query).sort({ quantity: 1 });
};

/**
 * Find all out-of-stock items
 *
 * @static findOutOfStock
 * @param {ObjectId} workspaceId - Optional workspace filter
 * @returns {Promise<Array>} Items with zero quantity
 */
cafeItemSchema.statics.findOutOfStock = function (workspaceId = null) {
  const query = { quantity: 0 };

  if (workspaceId) {
    query.workspace = workspaceId;
  }

  return this.find(query);
};

/**
 * Find items by category
 *
 * @static findByCategory
 * @param {string} category - Category to filter
 * @param {boolean} availableOnly - Only return available items
 * @returns {Promise<Array>} Items in the category
 */
cafeItemSchema.statics.findByCategory = function (category, availableOnly = true) {
  const query = { category };

  if (availableOnly) {
    query.isAvailable = true;
  }

  return this.find(query).sort({ name: 1 });
};

// Create and export the model
const CafeItem = model('CafeItem', cafeItemSchema);

module.exports = CafeItem;
