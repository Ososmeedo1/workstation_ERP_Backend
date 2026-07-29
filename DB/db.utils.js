/**
 * ===========================================
 * StudySpace ERP Backend - Database Utilities
 * ===========================================
 *
 * This module provides common database utility functions
 * for working with MongoDB/Mongoose. These utilities help
 * maintain consistency and reduce code duplication.
 *
 * Features:
 * - ObjectId validation
 * - Document existence checking
 * - Soft delete helpers
 * - Common query patterns
 *
 * @file DB/db.utils.js
 * @description Database utility functions
 */

const mongoose = require('mongoose');

/**
 * Check if a string is a valid MongoDB ObjectId
 *
 * Use this to validate IDs before querying the database
 * to prevent Mongoose CastError exceptions.
 *
 * @function isValidObjectId
 * @param {string} id - The string to validate
 * @returns {boolean} True if valid ObjectId, false otherwise
 *
 * @example
 * if (isValidObjectId(req.params.id)) {
 *   const doc = await Model.findById(req.params.id);
 * }
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Convert a string to MongoDB ObjectId
 *
 * @function toObjectId
 * @param {string} id - The string to convert
 * @returns {mongoose.Types.ObjectId|null} ObjectId or null if invalid
 *
 * @example
 * const objectId = toObjectId('507f1f77bcf86cd799439011');
 */
const toObjectId = (id) => {
  if (!isValidObjectId(id)) {
    return null;
  }
  return new mongoose.Types.ObjectId(id);
};

/**
 * Check if a document exists in a collection
 *
 * This is more efficient than findById when you only
 * need to check existence (doesn't retrieve full document).
 *
 * @async
 * @function documentExists
 * @param {mongoose.Model} Model - Mongoose model to query
 * @param {Object} query - Query conditions
 * @returns {Promise<boolean>} True if document exists
 *
 * @example
 * const exists = await documentExists(User, { email: 'test@example.com' });
 */
const documentExists = async (Model, query) => {
  const count = await Model.countDocuments(query).limit(1);
  return count > 0;
};

/**
 * Check if a document exists by ID
 *
 * Shorthand for documentExists with _id query.
 *
 * @async
 * @function documentExistsById
 * @param {mongoose.Model} Model - Mongoose model to query
 * @param {string} id - Document ID to check
 * @returns {Promise<boolean>} True if document exists
 *
 * @example
 * const exists = await documentExistsById(User, userId);
 */
const documentExistsById = async (Model, id) => {
  if (!isValidObjectId(id)) {
    return false;
  }
  return documentExists(Model, { _id: id });
};

/**
 * Get document by ID with optional population
 *
 * A wrapper around findById that adds:
 * - ObjectId validation
 * - Optional population
 * - Lean query option
 *
 * @async
 * @function getDocumentById
 * @param {mongoose.Model} Model - Mongoose model to query
 * @param {string} id - Document ID
 * @param {Object} options - Query options
 * @param {string|Object} [options.populate] - Fields to populate
 * @param {boolean} [options.lean=false] - Return plain object instead of Mongoose doc
 * @param {string} [options.select] - Fields to include/exclude
 * @returns {Promise<Object|null>} Document or null if not found
 *
 * @example
 * const user = await getDocumentById(User, userId, {
 *   select: '-password',
 *   lean: true
 * });
 */
const getDocumentById = async (Model, id, options = {}) => {
  if (!isValidObjectId(id)) {
    return null;
  }

  let query = Model.findById(id);

  // Apply select (field projection)
  if (options.select) {
    query = query.select(options.select);
  }

  // Apply populate
  if (options.populate) {
    query = query.populate(options.populate);
  }

  // Apply lean (returns plain JS object)
  if (options.lean) {
    query = query.lean();
  }

  return query.exec();
};

/**
 * Soft delete a document by setting status to inactive
 *
 * Instead of removing the document, this updates a status field.
 * Useful for maintaining data integrity and audit trails.
 *
 * @async
 * @function softDelete
 * @param {mongoose.Model} Model - Mongoose model
 * @param {string} id - Document ID to soft delete
 * @param {string} [statusField='status'] - Name of status field
 * @param {string} [inactiveValue='inactive'] - Value for inactive status
 * @returns {Promise<Object|null>} Updated document or null
 *
 * @example
 * const deleted = await softDelete(User, userId);
 */
const softDelete = async (Model, id, statusField = 'status', inactiveValue = 'inactive') => {
  if (!isValidObjectId(id)) {
    return null;
  }

  return Model.findByIdAndUpdate(
    id,
    { [statusField]: inactiveValue },
    { new: true }
  );
};

/**
 * Build pagination options from query parameters
 *
 * Extracts page and limit from request query and calculates skip.
 * Includes safeguards against invalid values.
 *
 * @function buildPaginationOptions
 * @param {Object} query - Request query object
 * @param {number} [defaultLimit=10] - Default items per page
 * @param {number} [maxLimit=100] - Maximum allowed limit
 * @returns {Object} Pagination options { page, limit, skip }
 *
 * @example
 * const { page, limit, skip } = buildPaginationOptions(req.query);
 * const docs = await Model.find().skip(skip).limit(limit);
 */
const buildPaginationOptions = (query, defaultLimit = 10, maxLimit = 100) => {
  // Parse page number (minimum 1)
  let page = parseInt(query.page, 10) || 1;
  if (page < 1) {page = 1;}

  // Parse limit (between 1 and maxLimit)
  let limit = parseInt(query.limit, 10) || defaultLimit;
  if (limit < 1) {limit = 1;}
  if (limit > maxLimit) {limit = maxLimit;}

  // Calculate skip
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination metadata for API responses
 *
 * @function buildPaginationMeta
 * @param {number} total - Total documents count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 *
 * @example
 * const meta = buildPaginationMeta(100, 2, 10);
 * // { total: 100, page: 2, limit: 10, totalPages: 10, hasMore: true }
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages
  };
};

/**
 * Build sort options from query parameters
 *
 * Parses sort string like "createdAt:desc,name:asc" into
 * Mongoose sort object.
 *
 * @function buildSortOptions
 * @param {string} sortQuery - Sort query string
 * @param {Object} [defaultSort={ createdAt: -1 }] - Default sort
 * @returns {Object} Mongoose sort object
 *
 * @example
 * const sort = buildSortOptions('name:asc,createdAt:desc');
 * // { name: 1, createdAt: -1 }
 */
const buildSortOptions = (sortQuery, defaultSort = { createdAt: -1 }) => {
  if (!sortQuery) {
    return defaultSort;
  }

  const sortObj = {};
  const sortFields = sortQuery.split(',');

  for (const field of sortFields) {
    const [key, order] = field.split(':');
    if (key) {
      sortObj[key.trim()] = order?.toLowerCase() === 'asc' ? 1 : -1;
    }
  }

  return Object.keys(sortObj).length > 0 ? sortObj : defaultSort;
};

module.exports = {
  isValidObjectId,
  toObjectId,
  documentExists,
  documentExistsById,
  getDocumentById,
  softDelete,
  buildPaginationOptions,
  buildPaginationMeta,
  buildSortOptions
};
