/**
 * ===========================================
 * StudySpace ERP Backend - Cafe Routes
 * ===========================================
 *
 * Route definitions for cafe operations.
 * Implements role-based access control for staff and admin roles.
 *
 * Access Control:
 * - Item CRUD (create, update, delete): Admin only
 * - Item listing and viewing: Staff, Admin
 * - Sales operations: Staff, Admin
 * - Restocking: Staff, Admin
 * - Expenses (CRUD): Admin only (T144)
 *
 * @file src/Modules/Cafe/cafe.routes.js
 * @description Cafe module routing with middleware protection
 * @task T112, T144
 */

const { Router } = require('express');

// Import controllers
const {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  restockItem,
  getLowStockItems,
  createSale,
  listSales,
  getSale,
  // Expense controllers (T144)
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense
} = require('./cafe.controller.js');

// Import validation middleware and schemas
const { validateAll } = require('../../Middlewares/validation.middleware.js');
const {
  createItemSchema,
  updateItemSchema,
  getItemSchema,
  deleteItemSchema,
  listItemsSchema,
  restockItemSchema,
  createSaleSchema,
  getSaleSchema,
  listSalesSchema,
  // Expense schemas (T144)
  createExpenseSchema,
  updateExpenseSchema,
  getExpenseSchema,
  listExpensesSchema
} = require('./cafe.schema.js');

// Import authentication and authorization middleware
const { auth, requireRole } = require('../../Middlewares/auth.middleware.js');

// Import role constants
const { USER_ROLES } = require('../../Utils/enum.utils.js');

// Create router instance
const router = Router();

// ===========================================
// AUTHENTICATION MIDDLEWARE
// ===========================================
// All cafe routes require authentication
router.use(auth);

// ===========================================
// CAFE ITEM ROUTES
// ===========================================

/**
 * @route   GET /api/cafe/items/low-stock
 * @desc    Get all low stock items (items below threshold)
 * @access  Staff, Admin
 * @note    This route MUST be before /:id to avoid matching
 */
router.get(
  '/items/low-stock',
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  getLowStockItems
);

/**
 * @route   GET /api/cafe/items
 * @desc    List all cafe items with optional filters
 * @access  Staff, Admin
 * @query   category, isAvailable, lowStockOnly, search, page, limit, sort
 */
router.get(
  '/items',
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(listItemsSchema),
  listItems
);

/**
 * @route   GET /api/cafe/items/:id
 * @desc    Get a single cafe item by ID
 * @access  Staff, Admin
 */
router.get(
  '/items/:id',
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(getItemSchema),
  getItem
);

/**
 * @route   POST /api/cafe/items
 * @desc    Create a new cafe item
 * @access  Admin only
 * @body    name, category, price, cost, quantity, lowStockThreshold, unit, description, imageUrl
 */
router.post(
  '/items',
  requireRole([USER_ROLES.ADMIN]),
  validateAll(createItemSchema),
  createItem
);

/**
 * @route   PATCH /api/cafe/items/:id
 * @desc    Update a cafe item
 * @access  Admin only
 * @body    Any updatable field (name, category, price, cost, quantity, etc.)
 */
router.patch(
  '/items/:id',
  requireRole([USER_ROLES.ADMIN]),
  validateAll(updateItemSchema),
  updateItem
);

/**
 * @route   DELETE /api/cafe/items/:id
 * @desc    Delete (deactivate) a cafe item
 * @access  Admin only
 * @note    Soft delete - marks isAvailable = false
 */
router.delete(
  '/items/:id',
  requireRole([USER_ROLES.ADMIN]),
  validateAll(deleteItemSchema),
  deleteItem
);

/**
 * @route   POST /api/cafe/items/:id/restock
 * @desc    Restock a cafe item
 * @access  Staff, Admin
 * @body    quantity (number), notes (optional string)
 */
router.post(
  '/items/:id/restock',
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(restockItemSchema),
  restockItem
);

// ===========================================
// CAFE SALE ROUTES
// ===========================================

/**
 * @route   GET /api/cafe/sales
 * @desc    List all cafe sales with optional filters
 * @access  Staff, Admin
 * @query   workspace, servedBy, customerId, paymentStatus, startDate, endDate, page, limit, sort
 */
router.get(
  '/sales',
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(listSalesSchema),
  listSales
);

/**
 * @route   GET /api/cafe/sales/:id
 * @desc    Get a single sale by ID
 * @access  Staff, Admin
 */
router.get(
  '/sales/:id',
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(getSaleSchema),
  getSale
);

/**
 * @route   POST /api/cafe/sales
 * @desc    Create a new cafe sale
 * @access  Staff, Admin
 * @body    items (array of {itemId, quantity}), customerId (optional), notes (optional)
 * @note    This route auto-decrements inventory and validates stock (T110, T111)
 */
router.post(
  '/sales',
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(createSaleSchema),
  createSale
);

// ===========================================
// EXPENSE ROUTES (T144)
// ===========================================

/**
 * @route   GET /api/cafe/expenses
 * @desc    List all expenses with optional filters
 * @access  Admin only
 * @query   expenseType, startDate, endDate, page, limit, sort
 */
router.get(
  '/expenses',
  requireRole([USER_ROLES.ADMIN]),
  validateAll(listExpensesSchema),
  listExpenses
);

/**
 * @route   GET /api/cafe/expenses/:id
 * @desc    Get a single expense by ID
 * @access  Admin only
 */
router.get(
  '/expenses/:id',
  requireRole([USER_ROLES.ADMIN]),
  validateAll(getExpenseSchema),
  getExpense
);

/**
 * @route   POST /api/cafe/expenses
 * @desc    Create a new expense
 * @access  Admin only
 * @body    description, amount, expenseType, vendor (opt), date (opt), notes (opt)
 */
router.post(
  '/expenses',
  requireRole([USER_ROLES.ADMIN]),
  validateAll(createExpenseSchema),
  createExpense
);

/**
 * @route   PATCH /api/cafe/expenses/:id
 * @desc    Update an expense
 * @access  Admin only
 */
router.patch(
  '/expenses/:id',
  requireRole([USER_ROLES.ADMIN]),
  validateAll(updateExpenseSchema),
  updateExpense
);

/**
 * @route   DELETE /api/cafe/expenses/:id
 * @desc    Delete an expense
 * @access  Admin only
 */
router.delete(
  '/expenses/:id',
  requireRole([USER_ROLES.ADMIN]),
  validateAll(getExpenseSchema),
  deleteExpense
);

module.exports = router;
