/**
 * ===========================================
 * StudySpace ERP Backend - Payment Routes
 * ===========================================
 *
 * Router configuration for payment management endpoints.
 * Includes authentication and role-based access control.
 *
 * IMPORTANT (NON-NEGOTIABLE):
 * All payments are CASH ONLY.
 *
 * Route permissions:
 * - All routes: Staff, Admin only
 *
 * @file src/Modules/Payments/payment.routes.js
 * @description Payment routes definition
 */

const { Router } = require('express');
const paymentController = require('./payment.controller.js');
const paymentSchemas = require('./payment.schema.js');
const { validateAll } = require('../../Middlewares/validation.middleware.js');
const { auth, requireRole } = require('../../Middlewares/auth.middleware.js');
const { USER_ROLES } = require('../../Utils/enum.utils.js');

const router = Router();

/**
 * Middleware applied to all payment routes
 * Only staff and admin can manage payments
 */
const staffOrAdmin = [auth, requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN])];

/**
 * @route GET /api/payments/summary/today
 * @desc Get today's payment summary
 * @access Private - Staff, Admin
 */
router.get(
  '/summary/today',
  ...staffOrAdmin,
  paymentController.getTodaySummary
);

/**
 * @route GET /api/payments/receipt/:receiptNumber
 * @desc Get payment by receipt number
 * @access Private - Staff, Admin
 */
router.get(
  '/receipt/:receiptNumber',
  ...staffOrAdmin,
  validateAll(paymentSchemas.getByReceiptSchema),
  paymentController.getByReceipt
);

/**
 * @route POST /api/payments/session
 * @desc Create a payment for a session (cash only)
 * @access Private - Staff, Admin
 */
router.post(
  '/session',
  ...staffOrAdmin,
  validateAll(paymentSchemas.createSessionPaymentSchema),
  paymentController.createSessionPayment
);

/**
 * @route POST /api/payments/cafe
 * @desc Create a payment for a cafe sale (cash only)
 * @access Private - Staff, Admin
 */
router.post(
  '/cafe',
  ...staffOrAdmin,
  validateAll(paymentSchemas.createCafePaymentSchema),
  paymentController.createCafePayment
);

/**
 * @route GET /api/payments
 * @desc List all payments with filters
 * @access Private - Staff, Admin
 */
router.get(
  '/',
  ...staffOrAdmin,
  validateAll(paymentSchemas.listPaymentsSchema),
  paymentController.listPayments
);

/**
 * @route GET /api/payments/:id
 * @desc Get a single payment by ID
 * @access Private - Staff, Admin
 */
router.get(
  '/:id',
  ...staffOrAdmin,
  validateAll(paymentSchemas.getPaymentSchema),
  paymentController.getPayment
);

module.exports = router;
