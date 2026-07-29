/**
 * ===========================================
 * StudySpace ERP Backend - Enum Utilities
 * ===========================================
 *
 * This module defines all enum constants used throughout
 * the application. Using centralized enums ensures consistency
 * across models, controllers, and validation schemas.
 *
 * When adding new enum values:
 * 1. Add to the appropriate constant object
 * 2. Update the corresponding array
 * 3. Update Joi/Yup validation schemas if needed
 *
 * @file src/Utils/enum.utils.js
 * @description Centralized enum definitions
 */

/**
 * User roles in the system
 * Used for authorization and access control
 *
 * Legacy multi-role enum retained for data integrity:
 * - MEMBER ('member'): Customer records (cannot log in)
 * - STAFF ('staff'): Unused in single-operator mode
 * - ADMIN ('admin'): Operator account (only role that can authenticate)
 *
 * The frontend presents a single-operator interface.
 * Login is restricted to ADMIN only in auth.controller.js.
 * All route guards include ADMIN, so they transparently work.
 *
 * @constant {Object} USER_ROLES
 * @property {string} MEMBER - Customer record (cannot log in)
 * @property {string} STAFF - Legacy, unused
 * @property {string} ADMIN - Operator (full access, can log in)
 */
const USER_ROLES = Object.freeze({
  MEMBER: 'member',
  STAFF: 'staff',
  ADMIN: 'admin'
});

/**
 * Array of valid user role values
 * Used in Joi/Yup validation
 * @type {string[]}
 */
const USER_ROLES_ARRAY = Object.values(USER_ROLES);

/**
 * User account status
 *
 * @constant {Object} USER_STATUS
 * @property {string} ACTIVE - User can log in and use system
 * @property {string} INACTIVE - User is disabled/deactivated
 */
const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive'
});

/**
 * Array of valid user status values
 * @type {string[]}
 */
const USER_STATUS_ARRAY = Object.values(USER_STATUS);

/**
 * Room types available in the workspace
 *
 * @constant {Object} ROOM_TYPES
 * @property {string} PUBLIC - Open/shared workspace area
 * @property {string} PRIVATE - Private meeting room
 * @property {string} SILENT - Quiet/study zone
 */
const ROOM_TYPES = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
  SILENT: 'silent'
});

/**
 * Array of valid room type values
 * @type {string[]}
 */
const ROOM_TYPES_ARRAY = Object.values(ROOM_TYPES);

/**
 * Session status (check-in/check-out workflow)
 *
 * @constant {Object} SESSION_STATUS
 * @property {string} ACTIVE - Session in progress
 * @property {string} COMPLETED - Session ended (checked out)
 */
const SESSION_STATUS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
});

/**
 * Array of valid session status values
 * @type {string[]}
 */
const SESSION_STATUS_ARRAY = Object.values(SESSION_STATUS);

/**
 * Payment status for sessions and cafe sales
 *
 * @constant {Object} PAYMENT_STATUS
 * @property {string} PENDING - Payment not yet received
 * @property {string} PAID - Payment received
 */
const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid'
});

/**
 * Array of valid payment status values
 * @type {string[]}
 */
const PAYMENT_STATUS_ARRAY = Object.values(PAYMENT_STATUS);

/**
 * Payment methods (cash-only per constitution)
 * NON-NEGOTIABLE: System only supports cash payments
 *
 * @constant {Object} PAYMENT_METHODS
 * @property {string} CASH - Cash payment (only supported method)
 */
const PAYMENT_METHODS = Object.freeze({
  CASH: 'cash'
});

/**
 * Array of valid payment method values
 * @type {string[]}
 */
const PAYMENT_METHODS_ARRAY = Object.values(PAYMENT_METHODS);

/**
 * Subscription plan types
 *
 * @constant {Object} SUBSCRIPTION_TYPES
 * @property {string} DAILY - Daily pass
 * @property {string} WEEKLY - Weekly subscription
 * @property {string} MONTHLY - Monthly subscription
 */
const SUBSCRIPTION_TYPES = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
});

/**
 * Array of valid subscription type values
 * @type {string[]}
 */
const SUBSCRIPTION_TYPES_ARRAY = Object.values(SUBSCRIPTION_TYPES);

/**
 * Subscription status
 *
 * @constant {Object} SUBSCRIPTION_STATUS
 * @property {string} ACTIVE - Subscription is active
 * @property {string} EXPIRED - Subscription has expired
 * @property {string} CANCELLED - Subscription was cancelled
 */
const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
});

/**
 * Array of valid subscription status values
 * @type {string[]}
 */
const SUBSCRIPTION_STATUS_ARRAY = Object.values(SUBSCRIPTION_STATUS);

/**
 * Cafe item categories
 *
 * @constant {Object} CAFE_CATEGORIES
 * @property {string} BEVERAGE - Drinks (coffee, tea, juice, etc.)
 * @property {string} SNACK - Light snacks
 * @property {string} MEAL - Full meals
 * @property {string} OTHER - Miscellaneous items
 */
const CAFE_CATEGORIES = Object.freeze({
  BEVERAGE: 'beverage',
  SNACK: 'snack',
  MEAL: 'meal',
  OTHER: 'other'
});

/**
 * Array of valid cafe category values
 * @type {string[]}
 */
const CAFE_CATEGORIES_ARRAY = Object.values(CAFE_CATEGORIES);

/**
 * Expense types for cafe/operational expenses
 *
 * @constant {Object} EXPENSE_TYPES
 * @property {string} INVENTORY - Stock purchases
 * @property {string} UTILITIES - Electricity, water, internet
 * @property {string} MAINTENANCE - Repairs, cleaning
 * @property {string} SUPPLIES - Office supplies, consumables
 * @property {string} SALARY - Staff wages
 * @property {string} RENT - Facility rent
 * @property {string} OTHER - Miscellaneous expenses
 */
const EXPENSE_TYPES = Object.freeze({
  INVENTORY: 'inventory',
  UTILITIES: 'utilities',
  MAINTENANCE: 'maintenance',
  SUPPLIES: 'supplies',
  SALARY: 'salary',
  RENT: 'rent',
  OTHER: 'other'
});

/**
 * Array of valid expense type values
 * @type {string[]}
 */
const EXPENSE_TYPES_ARRAY = Object.values(EXPENSE_TYPES);

/**
 * Finance report types
 *
 * @constant {Object} REPORT_TYPES
 * @property {string} DAILY - Daily financial report
 * @property {string} WEEKLY - Weekly financial report
 * @property {string} MONTHLY - Monthly financial report
 */
const REPORT_TYPES = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
});

/**
 * Array of valid report type values
 * @type {string[]}
 */
const REPORT_TYPES_ARRAY = Object.values(REPORT_TYPES);

/**
 * Audit log action types
 * Used for tracking user actions in the system
 *
 * @constant {Object} AUDIT_ACTIONS
 */
const AUDIT_ACTIONS = Object.freeze({
  // User actions
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',

  // General CRUD actions (used by audit service)
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',

  // Session actions
  SESSION_CHECKIN: 'session.checkin',
  SESSION_CHECKOUT: 'session.checkout',

  // Payment actions
  PAYMENT_CREATE: 'payment.create',

  // Cafe actions
  CAFE_SALE: 'cafe.sale',
  CAFE_RESTOCK: 'cafe.restock',
  CAFE_ITEM_CREATE: 'cafe.item.create',
  CAFE_ITEM_UPDATE: 'cafe.item.update',

  // Expense actions
  EXPENSE_CREATE: 'expense.create',

  // Report actions
  REPORT_GENERATE: 'report.generate',

  // Room actions
  ROOM_CREATE: 'room.create',
  ROOM_UPDATE: 'room.update'
});

/**
 * Array of valid audit action values
 * @type {string[]}
 */
const AUDIT_ACTIONS_ARRAY = Object.values(AUDIT_ACTIONS);

module.exports = {
  // User enums
  USER_ROLES,
  USER_ROLES_ARRAY,
  USER_STATUS,
  USER_STATUS_ARRAY,

  // Room enums
  ROOM_TYPES,
  ROOM_TYPES_ARRAY,

  // Session enums
  SESSION_STATUS,
  SESSION_STATUS_ARRAY,

  // Payment enums
  PAYMENT_STATUS,
  PAYMENT_STATUS_ARRAY,
  PAYMENT_METHODS,
  PAYMENT_METHODS_ARRAY,

  // Subscription enums
  SUBSCRIPTION_TYPES,
  SUBSCRIPTION_TYPES_ARRAY,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_ARRAY,

  // Cafe enums
  CAFE_CATEGORIES,
  CAFE_CATEGORIES_ARRAY,

  // Expense enums
  EXPENSE_TYPES,
  EXPENSE_TYPES_ARRAY,

  // Report enums
  REPORT_TYPES,
  REPORT_TYPES_ARRAY,

  // Audit enums
  AUDIT_ACTIONS,
  AUDIT_ACTIONS_ARRAY
};
