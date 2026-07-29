/**
 * ===========================================
 * StudySpace ERP Backend - Finance Validation Schemas
 * ===========================================
 *
 * Joi validation schemas for finance-related requests.
 * Includes report generation and expense management schemas.
 *
 * Validation Rules:
 * - Dates must be valid and in correct format
 * - Report types must be valid enum values
 * - Expense amounts must be positive
 *
 * @file src/Modules/Finance/finance.schema.js
 * @description Joi validation schemas for Finance module
 * @task T130
 */

const Joi = require('joi');
const { generalRules } = require('../../Utils/general-rules.utils.js');
const { EXPENSE_TYPES_ARRAY } = require('../../Utils/enum.utils.js');

/**
 * Schema for daily report request
 * Requires a single date parameter
 */
const dailyReportSchema = {
  query: Joi.object({
    date: Joi.date()
      .iso()
      .required()
      .messages({
        'date.base': 'Date must be a valid date',
        'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
        'any.required': 'Date is required for daily report'
      })
  })
};

/**
 * Schema for weekly report request
 * Requires start and end dates (should be Monday to Sunday)
 */
const weeklyReportSchema = {
  query: Joi.object({
    startDate: Joi.date()
      .iso()
      .required()
      .messages({
        'date.base': 'Start date must be a valid date',
        'date.format': 'Start date must be in ISO format (YYYY-MM-DD)',
        'any.required': 'Start date is required for weekly report'
      }),
    endDate: Joi.date()
      .iso()
      .greater(Joi.ref('startDate'))
      .required()
      .messages({
        'date.base': 'End date must be a valid date',
        'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
        'date.greater': 'End date must be after start date',
        'any.required': 'End date is required for weekly report'
      })
  })
};

/**
 * Schema for monthly report request
 * Requires year and month parameters
 */
const monthlyReportSchema = {
  query: Joi.object({
    year: Joi.number()
      .integer()
      .min(2020)
      .max(2100)
      .required()
      .messages({
        'number.base': 'Year must be a number',
        'number.integer': 'Year must be an integer',
        'number.min': 'Year must be 2020 or later',
        'number.max': 'Year cannot exceed 2100',
        'any.required': 'Year is required for monthly report'
      }),
    month: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .required()
      .messages({
        'number.base': 'Month must be a number',
        'number.integer': 'Month must be an integer',
        'number.min': 'Month must be between 1 and 12',
        'number.max': 'Month must be between 1 and 12',
        'any.required': 'Month is required for monthly report'
      })
  })
};

/**
 * Schema for finance summary request (dashboard)
 * No required parameters - uses current date context
 */
const summarySchema = {
  query: Joi.object({
    workspace: generalRules.objectId
      .messages({
        'string.pattern.base': 'Invalid workspace ID format'
      })
  })
};

/**
 * Schema for listing expenses
 */
const listExpensesSchema = {
  query: Joi.object({
    search: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.min': 'Search must be at least 1 character',
        'string.max': 'Search cannot exceed 100 characters'
      }),
    startDate: Joi.date()
      .iso()
      .messages({
        'date.base': 'Start date must be a valid date',
        'date.format': 'Start date must be in ISO format'
      }),
    endDate: Joi.date()
      .iso()
      .when('startDate', {
        is: Joi.exist(),
        then: Joi.date().greater(Joi.ref('startDate')),
        otherwise: Joi.date()
      })
      .messages({
        'date.base': 'End date must be a valid date',
        'date.format': 'End date must be in ISO format',
        'date.greater': 'End date must be after start date'
      }),
    expenseType: Joi.string()
      .valid(...EXPENSE_TYPES_ARRAY)
      .messages({
        'any.only': `Expense type must be one of: ${EXPENSE_TYPES_ARRAY.join(', ')}`
      }),
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Page must be a number',
        'number.min': 'Page must be at least 1'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.base': 'Limit must be a number',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    sort: Joi.string()
      .valid('date:asc', 'date:desc', 'amount:asc', 'amount:desc')
      .default('date:desc')
      .messages({
        'any.only': 'Sort must be one of: date:asc, date:desc, amount:asc, amount:desc'
      })
  })
};

/**
 * Schema for creating a new expense
 */
const createExpenseSchema = {
  body: Joi.object({
    description: Joi.string()
      .trim()
      .min(3)
      .max(200)
      .required()
      .messages({
        'string.base': 'Description must be a string',
        'string.min': 'Description must be at least 3 characters',
        'string.max': 'Description cannot exceed 200 characters',
        'string.empty': 'Description is required',
        'any.required': 'Description is required'
      }),
    amount: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.base': 'Amount must be a number',
        'number.positive': 'Amount must be greater than 0',
        'any.required': 'Amount is required'
      }),
    expenseType: Joi.string()
      .valid(...EXPENSE_TYPES_ARRAY)
      .required()
      .messages({
        'any.only': `Expense type must be one of: ${EXPENSE_TYPES_ARRAY.join(', ')}`,
        'any.required': 'Expense type is required'
      }),
    vendor: Joi.string()
      .trim()
      .max(100)
      .allow('')
      .messages({
        'string.max': 'Vendor name cannot exceed 100 characters'
      }),
    date: Joi.date()
      .iso()
      .default(() => new Date())
      .messages({
        'date.base': 'Date must be a valid date',
        'date.format': 'Date must be in ISO format'
      }),
    receiptImage: Joi.string()
      .uri()
      .allow('')
      .messages({
        'string.uri': 'Receipt image must be a valid URL'
      }),
    notes: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Notes cannot exceed 500 characters'
      }),
    workspace: generalRules.objectId
      .messages({
        'string.pattern.base': 'Invalid workspace ID format'
      })
  })
};

/**
 * Schema for updating an expense
 */
const updateExpenseSchema = {
  params: Joi.object({
    id: generalRules.objectId
      .required()
      .messages({
        'any.required': 'Expense ID is required',
        'string.pattern.base': 'Invalid expense ID format'
      })
  }),
  body: Joi.object({
    description: Joi.string()
      .trim()
      .min(3)
      .max(200)
      .messages({
        'string.min': 'Description must be at least 3 characters',
        'string.max': 'Description cannot exceed 200 characters'
      }),
    amount: Joi.number()
      .positive()
      .precision(2)
      .messages({
        'number.positive': 'Amount must be greater than 0'
      }),
    expenseType: Joi.string()
      .valid(...EXPENSE_TYPES_ARRAY)
      .messages({
        'any.only': `Expense type must be one of: ${EXPENSE_TYPES_ARRAY.join(', ')}`
      }),
    vendor: Joi.string()
      .trim()
      .max(100)
      .allow('')
      .messages({
        'string.max': 'Vendor name cannot exceed 100 characters'
      }),
    date: Joi.date()
      .iso()
      .messages({
        'date.base': 'Date must be a valid date'
      }),
    receiptImage: Joi.string()
      .uri()
      .allow('')
      .messages({
        'string.uri': 'Receipt image must be a valid URL'
      }),
    notes: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Notes cannot exceed 500 characters'
      })
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

/**
 * Schema for getting/deleting expense by ID
 */
const expenseIdSchema = {
  params: Joi.object({
    id: generalRules.objectId
      .required()
      .messages({
        'any.required': 'Expense ID is required',
        'string.pattern.base': 'Invalid expense ID format'
      })
  })
};

module.exports = {
  dailyReportSchema,
  weeklyReportSchema,
  monthlyReportSchema,
  summarySchema,
  listExpensesSchema,
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdSchema
};
