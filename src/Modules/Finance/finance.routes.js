/**
 * ===========================================
 * StudySpace ERP Backend - Finance Routes
 * ===========================================
 *
 * Router configuration for finance endpoints.
 * All routes require admin authentication.
 *
 * Route Groups:
 * - /reports: Financial report generation
 * - /expenses: Expense management
 * - /summary: Dashboard KPIs
 *
 * Access Control:
 * - All routes: Admin only
 *
 * @file src/Modules/Finance/finance.routes.js
 * @description Finance routes definition
 * @task T135
 */

const { Router } = require('express');
const financeController = require('./finance.controller.js');
const financeSchemas = require('./finance.schema.js');
const { validateAll } = require('../../Middlewares/validation.middleware.js');
const { auth, requireRole } = require('../../Middlewares/auth.middleware.js');
const { USER_ROLES } = require('../../Utils/enum.utils.js');

const router = Router();

// ============================================
// All routes require Admin authentication
// ============================================

/**
 * @route GET /api/finance/summary
 * @desc Get financial summary for dashboard
 * @access Private - Admin only
 */
router.get(
  '/summary',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.summarySchema),
  financeController.getFinanceSummary
);

// ============================================
// Report Routes
// ============================================

/**
 * @route GET /api/finance/reports/daily
 * @desc Generate daily financial report
 * @access Private - Admin only
 */
router.get(
  '/reports/daily',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.dailyReportSchema),
  financeController.getDailyReport
);

/**
 * @route GET /api/finance/reports/weekly
 * @desc Generate weekly financial report
 * @access Private - Admin only
 */
router.get(
  '/reports/weekly',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.weeklyReportSchema),
  financeController.getWeeklyReport
);

/**
 * @route GET /api/finance/reports/monthly
 * @desc Generate monthly financial report
 * @access Private - Admin only
 */
router.get(
  '/reports/monthly',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.monthlyReportSchema),
  financeController.getMonthlyReport
);

// ============================================
// Expense Routes
// ============================================

/**
 * @route GET /api/finance/expenses
 * @desc List expenses with filters
 * @access Private - Admin only
 */
router.get(
  '/expenses',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.listExpensesSchema),
  financeController.listExpenses
);

/**
 * @route POST /api/finance/expenses
 * @desc Create a new expense
 * @access Private - Admin only
 */
router.post(
  '/expenses',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.createExpenseSchema),
  financeController.createExpense
);

/**
 * @route GET /api/finance/expenses/:id
 * @desc Get expense by ID
 * @access Private - Admin only
 */
router.get(
  '/expenses/:id',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.expenseIdSchema),
  financeController.getExpense
);

/**
 * @route PUT /api/finance/expenses/:id
 * @desc Update an expense
 * @access Private - Admin only
 */
router.put(
  '/expenses/:id',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.updateExpenseSchema),
  financeController.updateExpense
);

/**
 * @route DELETE /api/finance/expenses/:id
 * @desc Delete an expense
 * @access Private - Admin only
 */
router.delete(
  '/expenses/:id',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(financeSchemas.expenseIdSchema),
  financeController.deleteExpense
);

module.exports = router;
