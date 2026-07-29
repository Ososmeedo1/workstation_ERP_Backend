/**
 * ===========================================
 * StudySpace ERP Backend - Payment Validation Schemas
 * ===========================================
 *
 * Joi validation schemas for Payment-related API endpoints.
 * Validates payment creation and query operations.
 *
 * IMPORTANT (NON-NEGOTIABLE):
 * This system only supports CASH payments.
 * paymentMethod defaults to and must be "cash".
 *
 * @file src/Modules/Payments/payment.schema.js
 * @description Payment Joi validation schemas
 */

const Joi = require('joi');
const { generalRules } = require('../../Utils/general-rules.utils.js');
const { PAYMENT_METHODS_ARRAY, PAYMENT_METHODS } = require('../../Utils/enum.utils.js');

/**
 * Payment types supported by the system
 */
const PAYMENT_TYPES = ['session', 'cafe'];

/**
 * Schema for creating a payment for a session
 * Required fields: sessionId, workspace
 * Amount is calculated from session totalAmount
 */
const createSessionPaymentSchema = {
  body: Joi.object({
    /**
     * Session to pay for
     * Must be a valid MongoDB ObjectId
     */
    sessionId: generalRules.objectId.required().messages({
      'any.required': 'Session ID is required for payment'
    }),

    /**
     * Workspace reference
     * Must be a valid MongoDB ObjectId
     */
    workspace: generalRules.objectId.required().messages({
      'any.required': 'Workspace ID is required'
    }),

    /**
     * Payment method - MUST be "cash"
     * NON-NEGOTIABLE: System only supports cash payments
     */
    paymentMethod: Joi.string()
      .valid(...PAYMENT_METHODS_ARRAY)
      .default(PAYMENT_METHODS.CASH)
      .messages({
        'any.only': 'Only cash payments are accepted'
      }),

    /**
     * Optional: Override amount (for discounts etc.)
     * If not provided, uses session totalAmount
     */
    amount: Joi.number()
      .positive()
      .optional()
      .messages({
        'number.positive': 'Amount must be positive'
      }),

    /**
     * Optional notes about the payment
     */
    notes: Joi.string()
      .max(200)
      .trim()
      .allow('')
      .optional()
  }).required()
};

/**
 * Schema for creating a payment for a cafe sale
 * Required fields: cafeSaleId, workspace
 */
const createCafePaymentSchema = {
  body: Joi.object({
    /**
     * Cafe sale to pay for
     * Must be a valid MongoDB ObjectId
     */
    cafeSaleId: generalRules.objectId.required().messages({
      'any.required': 'Cafe sale ID is required for payment'
    }),

    /**
     * Workspace reference
     */
    workspace: generalRules.objectId.required().messages({
      'any.required': 'Workspace ID is required'
    }),

    /**
     * Payment method - MUST be "cash"
     */
    paymentMethod: Joi.string()
      .valid(...PAYMENT_METHODS_ARRAY)
      .default(PAYMENT_METHODS.CASH),

    /**
     * Optional notes
     */
    notes: Joi.string()
      .max(200)
      .trim()
      .allow('')
      .optional()
  }).required()
};

/**
 * Schema for getting a payment by ID
 */
const getPaymentSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Payment ID is required'
    })
  }).required()
};

/**
 * Schema for getting a payment by receipt number
 */
const getByReceiptSchema = {
  params: Joi.object({
    receiptNumber: Joi.string()
      .pattern(/^RCP-[A-Z0-9]{10}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid receipt number format',
        'any.required': 'Receipt number is required'
      })
  }).required()
};

/**
 * Schema for listing payments with filters
 */
const listPaymentsSchema = {
  query: Joi.object({
    /**
     * Filter by workspace
     */
    workspace: generalRules.objectId.optional(),

    /**
     * Filter by payment type (session/cafe)
     */
    paymentType: Joi.string()
      .valid(...PAYMENT_TYPES)
      .optional(),

    /**
     * Filter by session
     */
    session: generalRules.objectId.optional(),

    /**
     * Filter by cafe sale
     */
    cafeSale: generalRules.objectId.optional(),

    /**
     * Filter by payer (user who paid)
     */
    paidBy: generalRules.objectId.optional(),

    /**
     * Filter by staff who received payment
     */
    receivedBy: generalRules.objectId.optional(),

    /**
     * Filter by date range - start date
     */
    startDate: Joi.date()
      .iso()
      .optional(),

    /**
     * Filter by date range - end date
     */
    endDate: Joi.date()
      .iso()
      .greater(Joi.ref('startDate'))
      .optional(),

    /**
     * Pagination: page number
     */
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),

    /**
     * Pagination: items per page
     */
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),

    /**
     * Sort field and direction
     */
    sort: Joi.string()
      .pattern(/^[\w]+:(asc|desc)$/)
      .default('paidAt:desc')
  }).optional()
};

module.exports = {
  createSessionPaymentSchema,
  createCafePaymentSchema,
  getPaymentSchema,
  getByReceiptSchema,
  listPaymentsSchema,
  PAYMENT_TYPES
};
