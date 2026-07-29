/**
 * ===========================================
 * StudySpace ERP Backend - Cafe Validation Schemas
 * ===========================================
 *
 * Joi validation schemas for Cafe-related API endpoints.
 * Validates cafe item CRUD operations and sale creation.
 *
 * @file src/Modules/Cafe/cafe.schema.js
 * @description Cafe Joi validation schemas
 * @task T107, T144
 */

const Joi = require('joi');
const { generalRules } = require('../../Utils/general-rules.utils.js');
const { EXPENSE_TYPES_ARRAY } = require('../../Utils/enum.utils.js');

// ===========================================
// CAFE ITEM SCHEMAS
// ===========================================

/**
 * Schema for creating a new cafe item
 * Required: name, category, price, cost, quantity
 */
const createItemSchema = {
  body: Joi.object({
    /**
     * Item name
     * Must be 2-100 characters
     */
    name: Joi.string()
      .min(2)
      .max(100)
      .trim()
      .required()
      .messages({
        'string.min': 'Item name must be at least 2 characters',
        'string.max': 'Item name cannot exceed 100 characters',
        'any.required': 'Item name is required'
      }),

    /**
     * Item category
     * Must be one of: beverage, snack, meal, other
     */
    category: Joi.string()
      .required()
      .messages({
        'any.required': 'Category is required'
      }),

    /**
     * Item description (optional)
     * Max 500 characters
     */
    description: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),

    /**
     * Selling price
     * Must be >= 0
     */
    price: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.min': 'Price cannot be negative',
        'any.required': 'Price is required'
      }),

    /**
     * Cost price (for profit tracking)
     * Must be >= 0
     */
    cost: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.min': 'Cost cannot be negative',
        'any.required': 'Cost is required'
      }),

    /**
     * Initial stock quantity
     * Must be >= 0
     */
    quantity: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.integer': 'Quantity must be a whole number',
        'number.min': 'Quantity cannot be negative',
        'any.required': 'Quantity is required'
      }),

    /**
     * Low stock threshold
     * Triggers alert when quantity <= this value
     */
    lowStockThreshold: Joi.number()
      .integer()
      .min(0)
      .default(5)
      .messages({
        'number.integer': 'Threshold must be a whole number',
        'number.min': 'Threshold cannot be negative'
      }),

    /**
     * Unit of measurement
     * E.g., pieces, cups, ml
     */
    unit: Joi.string()
      .max(50)
      .trim()
      .default('pieces')
      .messages({
        'string.max': 'Unit cannot exceed 50 characters'
      }),

    /**
     * Availability status
     * Default: true
     */
    isAvailable: Joi.boolean()
      .default(true),

    /**
     * Image URL (optional)
     */
    imageUrl: Joi.string()
      .uri()
      .allow(null, '')
      .optional()
      .messages({
        'string.uri': 'Image URL must be a valid URL'
      }),

    /**
     * Workspace reference (optional)
     */
    workspace: generalRules.objectId.optional()
  }).required()
};

/**
 * Schema for updating a cafe item
 * All fields are optional except item ID in params
 */
const updateItemSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Item ID is required'
    })
  }).required(),
  body: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .trim()
      .optional(),

    category: Joi.string()
      .optional(),

    description: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional(),

    price: Joi.number()
      .min(0)
      .optional(),

    cost: Joi.number()
      .min(0)
      .optional(),

    quantity: Joi.number()
      .integer()
      .min(0)
      .optional(),

    lowStockThreshold: Joi.number()
      .integer()
      .min(0)
      .optional(),

    unit: Joi.string()
      .max(50)
      .trim()
      .optional(),

    isAvailable: Joi.boolean()
      .optional(),

    imageUrl: Joi.string()
      .uri()
      .allow(null, '')
      .optional()
  }).min(1).required().messages({
    'object.min': 'At least one field must be provided for update'
  })
};

/**
 * Schema for getting a single item by ID
 */
const getItemSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Item ID is required'
    })
  }).required()
};

/**
 * Schema for deleting an item
 */
const deleteItemSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Item ID is required'
    })
  }).required()
};

/**
 * Schema for listing items with filters
 */
const listItemsSchema = {
  query: Joi.object({
    /**
     * Filter by category
     */
    category: Joi.string()
      .optional(),

    /**
     * Filter by availability
     */
    isAvailable: Joi.boolean()
      .optional(),

    /**
     * Filter low stock items only
     */
    lowStockOnly: Joi.boolean()
      .optional(),

    /**
     * Search by name
     */
    search: Joi.string()
      .trim()
      .optional(),

    /**
     * Workspace filter
     */
    workspace: generalRules.objectId.optional(),

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
      .default(50),

    /**
     * Sort field and direction
     */
    sort: Joi.string()
      .pattern(/^[\w]+:(asc|desc)$/)
      .default('name:asc')
  }).optional()
};

/**
 * Schema for restocking an item
 */
const restockItemSchema = {
  params: Joi.object({
    id: generalRules.objectId.required()
  }).required(),
  body: Joi.object({
    /**
     * Quantity to add to stock
     */
    quantity: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.integer': 'Quantity must be a whole number',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Restock quantity is required'
      }),

    /**
     * Optional notes about the restock
     */
    notes: Joi.string()
      .max(200)
      .trim()
      .optional()
  }).required()
};

// ===========================================
// CAFE SALE SCHEMAS
// ===========================================

/**
 * Schema for sale item in cart
 */
const saleItemSchema = Joi.object({
  /**
   * Item ID reference
   */
  itemId: generalRules.objectId.required().messages({
    'any.required': 'Item ID is required'
  }),

  /**
   * Quantity to purchase
   */
  quantity: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity must be at least 1',
      'any.required': 'Quantity is required'
    })
});

/**
 * Schema for creating a new cafe sale
 * Required: items array with at least one item
 */
const createSaleSchema = {
  body: Joi.object({
    /**
     * Array of items being purchased
     * Must have at least one item
     */
    items: Joi.array()
      .items(saleItemSchema)
      .min(1)
      .required()
      .messages({
        'array.min': 'Sale must contain at least one item',
        'any.required': 'Items array is required'
      }),

    /**
     * Customer user ID (optional)
     * Used if sale is for a registered member
     */
    customerId: generalRules.objectId.optional(),

    /**
     * Sale notes (optional)
     */
    notes: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional(),

    /**
     * Workspace reference (optional)
     */
    workspace: generalRules.objectId.optional()
  }).required()
};

/**
 * Schema for getting a single sale
 */
const getSaleSchema = {
  params: Joi.object({
    id: generalRules.objectId.required().messages({
      'any.required': 'Sale ID is required'
    })
  }).required()
};

/**
 * Schema for listing sales with filters
 */
const listSalesSchema = {
  query: Joi.object({
    /**
     * Filter by workspace
     */
    workspace: generalRules.objectId.optional(),

    /**
     * Filter by staff who made the sale
     */
    servedBy: generalRules.objectId.optional(),

    /**
     * Filter by customer
     */
    customerId: generalRules.objectId.optional(),

    /**
     * Filter by payment status
     */
    paymentStatus: Joi.string()
      .valid('pending', 'paid')
      .optional(),

    /**
     * Filter by date range - start
     */
    startDate: Joi.date()
      .iso()
      .optional(),

    /**
     * Filter by date range - end
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
      .default('saleTime:desc')
  }).optional()
};

// ===========================================
// EXPENSE SCHEMAS (T144)
// ===========================================

/**
 * Schema for creating a new expense
 * Required: description, amount, expenseType
 */
const createExpenseSchema = {
  body: Joi.object({
    /**
     * Expense description
     */
    description: Joi.string()
      .min(3)
      .max(200)
      .trim()
      .required()
      .messages({
        'string.min': 'Description must be at least 3 characters',
        'string.max': 'Description cannot exceed 200 characters',
        'any.required': 'Description is required'
      }),

    /**
     * Expense amount (positive number)
     */
    amount: Joi.number()
      .min(0.01)
      .required()
      .messages({
        'number.min': 'Amount must be greater than 0',
        'any.required': 'Amount is required'
      }),

    /**
     * Expense type/category
     */
    expenseType: Joi.string()
      .valid(...EXPENSE_TYPES_ARRAY)
      .required()
      .messages({
        'any.only': 'Expense type must be one of: ' + EXPENSE_TYPES_ARRAY.join(', '),
        'any.required': 'Expense type is required'
      }),

    /**
     * Vendor/supplier name (optional)
     */
    vendor: Joi.string()
      .max(100)
      .trim()
      .allow('')
      .optional(),

    /**
     * Date of expense (defaults to current date)
     */
    date: Joi.date()
      .iso()
      .max('now')
      .optional()
      .messages({
        'date.max': 'Expense date cannot be in the future'
      }),

    /**
     * Receipt image URL (optional)
     */
    receiptImage: Joi.string()
      .uri()
      .allow('')
      .optional(),

    /**
     * Additional notes
     */
    notes: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional(),

    /**
     * Workspace reference
     */
    workspace: generalRules.objectId.optional()
  }).required()
};

/**
 * Schema for updating an expense
 */
const updateExpenseSchema = {
  params: Joi.object({
    id: generalRules.objectId.required()
  }).required(),
  body: Joi.object({
    description: Joi.string()
      .min(3)
      .max(200)
      .trim()
      .optional(),

    amount: Joi.number()
      .min(0.01)
      .optional(),

    expenseType: Joi.string()
      .valid(...EXPENSE_TYPES_ARRAY)
      .optional(),

    vendor: Joi.string()
      .max(100)
      .trim()
      .allow('')
      .optional(),

    date: Joi.date()
      .iso()
      .max('now')
      .optional(),

    receiptImage: Joi.string()
      .uri()
      .allow('')
      .optional(),

    notes: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional()
  }).min(1).required().messages({
    'object.min': 'At least one field must be provided for update'
  })
};

/**
 * Schema for getting/deleting a single expense
 */
const getExpenseSchema = {
  params: Joi.object({
    id: generalRules.objectId.required()
  }).required()
};

/**
 * Schema for listing expenses with filters
 */
const listExpensesSchema = {
  query: Joi.object({
    /**
     * Filter by expense type
     */
    expenseType: Joi.string()
      .valid(...EXPENSE_TYPES_ARRAY)
      .optional(),

    /**
     * Workspace filter
     */
    workspace: generalRules.objectId.optional(),

    /**
     * Date range - start
     */
    startDate: Joi.date()
      .iso()
      .optional(),

    /**
     * Date range - end
     */
    endDate: Joi.date()
      .iso()
      .greater(Joi.ref('startDate'))
      .optional(),

    /**
     * Pagination
     */
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),

    /**
     * Sort
     */
    sort: Joi.string()
      .pattern(/^[\w]+:(asc|desc)$/)
      .default('date:desc')
  }).optional()
};

// Export all schemas
module.exports = {
  // Item schemas
  createItemSchema,
  updateItemSchema,
  getItemSchema,
  deleteItemSchema,
  listItemsSchema,
  restockItemSchema,
  // Sale schemas
  createSaleSchema,
  getSaleSchema,
  listSalesSchema,
  // Expense schemas (T144)
  createExpenseSchema,
  updateExpenseSchema,
  getExpenseSchema,
  listExpensesSchema
};
