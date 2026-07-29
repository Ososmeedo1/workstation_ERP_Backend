/**
 * ===========================================
 * StudySpace ERP Backend - FinanceReport Model
 * ===========================================
 *
 * Mongoose model for FinanceReport entity.
 * Used for caching generated financial reports.
 *
 * Report Types:
 * - daily: Single day report
 * - weekly: 7-day period report
 * - monthly: Calendar month report
 *
 * Report Contents:
 * - Session income: Revenue from room sessions
 * - Cafe income: Revenue from cafe sales
 * - Expenses: All recorded expenses
 * - Profit: Total income minus expenses
 *
 * Caching Strategy:
 * - Reports are cached to avoid repeated aggregation
 * - Cache invalidates when source data changes
 * - Daily reports regenerated on demand
 *
 * @file DB/Models/financeReport.model.js
 * @description Mongoose schema and model for FinanceReport
 * @task T129
 */

const mongoose = require('mongoose');
const { REPORT_TYPES_ARRAY } = require('../../src/Utils/enum.utils.js');

const { Schema, model } = mongoose;

/**
 * Breakdown Schema (embedded)
 * Detailed breakdown of income sources
 */
const breakdownSchema = new Schema({
  /**
   * Session breakdown
   */
  sessions: {
    count: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    byRoomType: [{
      type: { type: String },
      count: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    }]
  },

  /**
   * Cafe breakdown
   */
  cafe: {
    salesCount: { type: Number, default: 0 },
    byCategory: [{
      category: { type: String },
      count: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    }]
  },

  /**
   * Expense breakdown
   */
  expenses: {
    count: { type: Number, default: 0 },
    byType: [{
      type: { type: String },
      count: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    }]
  }
}, { _id: false });

/**
 * FinanceReport Schema
 *
 * Defines the structure for cached financial reports.
 * Stores aggregated financial data for quick retrieval.
 */
const financeReportSchema = new Schema({
  /**
   * Reference to the workspace (optional for future multi-location)
   */
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false
  },

  /**
   * Type of report (daily, weekly, monthly)
   */
  reportType: {
    type: String,
    required: [true, 'Report type is required'],
    enum: {
      values: REPORT_TYPES_ARRAY,
      message: 'Invalid report type. Must be: ' + REPORT_TYPES_ARRAY.join(', ')
    }
  },

  /**
   * Start date of the report period
   * For daily: same as periodEnd
   * For weekly: Monday of the week
   * For monthly: First day of month
   */
  periodStart: {
    type: Date,
    required: [true, 'Period start date is required']
  },

  /**
   * End date of the report period
   * For daily: same as periodStart
   * For weekly: Sunday of the week
   * For monthly: Last day of month
   */
  periodEnd: {
    type: Date,
    required: [true, 'Period end date is required']
  },

  /**
   * Total income from room sessions
   * Calculated from completed sessions with paid status
   */
  sessionIncome: {
    type: Number,
    required: true,
    min: [0, 'Session income cannot be negative'],
    default: 0
  },

  /**
   * Total income from cafe sales
   * Calculated from paid cafe sales
   */
  cafeIncome: {
    type: Number,
    required: true,
    min: [0, 'Cafe income cannot be negative'],
    default: 0
  },

  /**
   * Total income (sessionIncome + cafeIncome)
   * Computed field stored for convenience
   */
  totalIncome: {
    type: Number,
    required: true,
    min: [0, 'Total income cannot be negative'],
    default: 0
  },

  /**
   * Total expenses for the period
   */
  totalExpenses: {
    type: Number,
    required: true,
    min: [0, 'Total expenses cannot be negative'],
    default: 0
  },

  /**
   * Net profit (totalIncome - totalExpenses)
   * Can be negative if expenses exceed income
   */
  netProfit: {
    type: Number,
    required: true,
    default: 0
  },

  /**
   * Detailed breakdown by category
   */
  breakdown: {
    type: breakdownSchema,
    default: () => ({})
  },

  /**
   * When the report was generated
   */
  generatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },

  /**
   * User who generated the report (optional)
   */
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  /**
   * Schema options
   * - timestamps: Automatically adds createdAt and updatedAt
   * - versionKey: Disable __v field
   */
  timestamps: true,
  versionKey: false
});

/**
 * Indexes for efficient report lookup
 * - reportType + periodStart: Unique report lookup
 * - generatedAt: Recent reports
 * - workspace + reportType + periodStart: Multi-location support
 */
financeReportSchema.index({ reportType: 1, periodStart: 1 }, { unique: true });
financeReportSchema.index({ generatedAt: -1 });
financeReportSchema.index({ workspace: 1, reportType: 1, periodStart: 1 });

/**
 * Pre-save hook to calculate totals
 */
financeReportSchema.pre('save', function (next) {
  // Calculate total income
  this.totalIncome = this.sessionIncome + this.cafeIncome;

  // Calculate net profit
  this.netProfit = this.totalIncome - this.totalExpenses;

  next();
});

/**
 * Ensure JSON output includes virtuals
 */
financeReportSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

financeReportSchema.set('toObject', { virtuals: true });

/**
 * FinanceReport Model
 * @type {mongoose.Model}
 */
const FinanceReport = model('FinanceReport', financeReportSchema);

module.exports = FinanceReport;
