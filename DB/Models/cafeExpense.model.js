/**
 * ===========================================
 * StudySpace ERP Backend - CafeExpense Model
 * ===========================================
 *
 * Mongoose model for CafeExpense entity.
 * Tracks operational expenses for the cafe and workspace.
 *
 * Expense Categories:
 * - inventory: Stock purchases (coffee, snacks, etc.)
 * - utilities: Electricity, water, internet
 * - maintenance: Repairs, cleaning services
 * - supplies: Office supplies, consumables
 * - salary: Staff wages
 * - rent: Facility rent
 * - other: Miscellaneous expenses
 *
 * Business Rules:
 * - All expenses must have positive amounts
 * - Expenses are used in financial report calculations
 * - Cash-only tracking (NON-NEGOTIABLE)
 *
 * @file DB/Models/cafeExpense.model.js
 * @description Mongoose schema and model for CafeExpense
 * @task T128
 */

const mongoose = require('mongoose');
const { EXPENSE_TYPES_ARRAY, EXPENSE_TYPES } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

/**
 * CafeExpense Schema
 *
 * Defines the structure for expense documents.
 * Used for tracking all operational costs.
 */
const cafeExpenseSchema = new Schema({
  /**
   * Reference to the workspace (optional for future multi-location)
   * Defaults to main workspace if not specified
   */
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false
  },

  /**
   * Description of the expense
   * Example: "Coffee beans - 5kg bag", "Monthly electricity bill"
   */
  description: {
    type: String,
    required: [true, 'Expense description is required'],
    minlength: [3, 'Description must be at least 3 characters'],
    maxlength: [200, 'Description cannot exceed 200 characters'],
    trim: true
  },

  /**
   * Expense amount in currency units
   * Must be a positive value
   */
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },

  /**
   * Category of the expense
   * Used for grouping in financial reports
   */
  expenseType: {
    type: String,
    required: [true, 'Expense type is required'],
    enum: {
      values: EXPENSE_TYPES_ARRAY,
      message: 'Invalid expense type. Must be: ' + EXPENSE_TYPES_ARRAY.join(', ')
    },
    default: EXPENSE_TYPES.OTHER
  },

  /**
   * Vendor or supplier name (optional)
   * Example: "ABC Coffee Supplies", "Utility Company"
   */
  vendor: {
    type: String,
    maxlength: [100, 'Vendor name cannot exceed 100 characters'],
    trim: true,
    default: ''
  },

  /**
   * Date when the expense occurred
   * May differ from createdAt if expense is recorded later
   */
  date: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now
  },

  /**
   * URL to receipt image (optional)
   * For record-keeping and verification
   */
  receiptImage: {
    type: String,
    default: ''
  },

  /**
   * Reference to user who recorded this expense
   * For audit trail and accountability
   */
  recordedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recorded by user is required']
  },

  /**
   * Additional notes about the expense
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
 * - date + expenseType: For date range and category filtering
 * - recordedBy: For user expense history
 * - workspace + date: For workspace-specific reports
 */
cafeExpenseSchema.index({ date: -1, expenseType: 1 });
cafeExpenseSchema.index({ recordedBy: 1 });
cafeExpenseSchema.index({ workspace: 1, date: -1 });
// Indexes for list filtering and recent activity
cafeExpenseSchema.index({ expenseType: 1 });
cafeExpenseSchema.index({ createdAt: -1 });

/**
 * Ensure JSON output includes virtuals
 */
cafeExpenseSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

cafeExpenseSchema.set('toObject', { virtuals: true });

/**
 * CafeExpense Model
 * @type {mongoose.Model}
 */
const CafeExpense = model('CafeExpense', cafeExpenseSchema);

module.exports = CafeExpense;
