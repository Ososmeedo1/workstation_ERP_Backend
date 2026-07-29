/**
 * ===========================================
 * StudySpace ERP Backend - API Features Utility
 * ===========================================
 *
 * This module provides a chainable class for building
 * MongoDB queries with common API features:
 * - Filtering (by field values)
 * - Sorting (by one or more fields)
 * - Field selection (projection)
 * - Pagination (page, limit, skip)
 * - Search (text search across fields)
 *
 * @file src/Utils/api-features.utils.js
 * @description Query builder for common API operations
 */

/**
 * API Features class for building MongoDB queries
 *
 * This class provides a chainable API for applying common
 * query modifications. Each method returns `this` to allow
 * method chaining.
 *
 * @class APIFeatures
 *
 * @example
 * const features = new APIFeatures(User.find(), req.query)
 *   .filter()
 *   .sort()
 *   .limitFields()
 *   .paginate();
 *
 * const users = await features.query;
 */
class APIFeatures {
  /**
   * Create an APIFeatures instance
   *
   * @constructor
   * @param {mongoose.Query} query - Mongoose query object
   * @param {Object} queryString - Request query parameters (req.query)
   */
  constructor(query, queryString) {
    /**
     * Mongoose query object being built
     * @type {mongoose.Query}
     */
    this.query = query;

    /**
     * Query parameters from request
     * @type {Object}
     */
    this.queryString = queryString;

    /**
     * Pagination metadata (populated after paginate())
     * @type {Object|null}
     */
    this.paginationInfo = null;
  }

  /**
   * Apply filtering based on query parameters
   *
   * Supports MongoDB comparison operators by prefixing with:
   * - gte, gt, lte, lt, ne
   *
   * Example: ?price[gte]=100&price[lte]=500&status=active
   *
   * @method filter
   * @returns {APIFeatures} this for chaining
   *
   * @example
   * // Filter by exact match
   * ?status=active
   *
   * // Filter by comparison
   * ?price[gte]=100&price[lte]=500
   */
  filter() {
    // Create a copy of query string (avoid mutating original)
    const queryObj = { ...this.queryString };

    // Fields to exclude from filtering (reserved for other features)
    const excludedFields = ['page', 'limit', 'sort', 'fields', 'search'];
    excludedFields.forEach(field => delete queryObj[field]);

    // Convert query to string for regex replacement
    let queryStr = JSON.stringify(queryObj);

    // Add $ prefix to comparison operators (MongoDB format)
    // Converts { price: { gte: '100' } } to { price: { $gte: '100' } }
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt|ne|in|nin)\b/g,
      match => `$${match}`
    );

    // Parse back to object and apply to query
    const parsedQuery = JSON.parse(queryStr);
    this.query = this.query.find(parsedQuery);

    return this;
  }

  /**
   * Apply sorting based on sort parameter
   *
   * Example: ?sort=createdAt:desc,name:asc or ?sort=-createdAt,name
   *
   * Supports two formats:
   * 1. Field:direction - sort=name:asc,createdAt:desc
   * 2. Prefix with - for desc - sort=-createdAt,name
   *
   * @method sort
   * @param {string} [defaultSort='-createdAt'] - Default sort if not specified
   * @returns {APIFeatures} this for chaining
   *
   * @example
   * // Sort by createdAt descending (newest first)
   * ?sort=-createdAt
   *
   * // Sort by name ascending, then createdAt descending
   * ?sort=name,-createdAt
   */
  sort(defaultSort = '-createdAt') {
    if (this.queryString.sort) {
      let sortBy;

      // Check if using field:direction format
      if (this.queryString.sort.includes(':')) {
        // Convert "field:asc,field2:desc" to "field -field2"
        const sortFields = this.queryString.sort.split(',');
        sortBy = sortFields.map(field => {
          const [name, direction] = field.split(':');
          return direction === 'desc' ? `-${name}` : name;
        }).join(' ');
      } else {
        // Standard format: "-field1,field2" becomes "-field1 field2"
        sortBy = this.queryString.sort.split(',').join(' ');
      }

      this.query = this.query.sort(sortBy);
    } else {
      // Apply default sort
      this.query = this.query.sort(defaultSort);
    }

    return this;
  }

  /**
   * Apply field selection (projection)
   *
   * Example: ?fields=name,email,createdAt
   *
   * @method limitFields
   * @param {string} [defaultFields=''] - Default fields to select
   * @returns {APIFeatures} this for chaining
   *
   * @example
   * // Return only name and email
   * ?fields=name,email
   *
   * // Exclude password (not recommended, use model-level)
   * ?fields=-password
   */
  limitFields(defaultFields = '') {
    if (this.queryString.fields) {
      // Convert comma-separated to space-separated
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else if (defaultFields) {
      this.query = this.query.select(defaultFields);
    } else {
      // Exclude __v by default (Mongoose version key)
      this.query = this.query.select('-__v');
    }

    return this;
  }

  /**
   * Apply pagination
   *
   * Example: ?page=2&limit=10
   *
   * @method paginate
   * @param {number} [defaultLimit=10] - Default items per page
   * @param {number} [maxLimit=100] - Maximum allowed limit
   * @returns {APIFeatures} this for chaining
   *
   * @example
   * // Get page 2 with 20 items per page
   * ?page=2&limit=20
   */
  paginate(defaultLimit = 10, maxLimit = 100) {
    // Parse and validate page number (minimum 1)
    const page = Math.max(1, parseInt(this.queryString.page, 10) || 1);

    // Parse and validate limit (between 1 and maxLimit)
    let limit = parseInt(this.queryString.limit, 10) || defaultLimit;
    limit = Math.max(1, Math.min(limit, maxLimit));

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Apply pagination to query
    this.query = this.query.skip(skip).limit(limit);

    // Store pagination info for response
    this.paginationInfo = {
      page,
      limit,
      skip
    };

    return this;
  }

  /**
   * Apply text search across specified fields
   *
   * Creates a case-insensitive regex search on multiple fields
   *
   * @method search
   * @param {string[]} searchFields - Fields to search in
   * @returns {APIFeatures} this for chaining
   *
   * @example
   * // Search in name and email fields
   * ?search=john
   * features.search(['name', 'email'])
   */
  search(searchFields = []) {
    if (this.queryString.search && searchFields.length > 0) {
      const searchTerm = this.queryString.search;

      // Create case-insensitive regex search
      const searchRegex = new RegExp(searchTerm, 'i');

      // Build $or query for all search fields
      const searchQuery = {
        $or: searchFields.map(field => ({
          [field]: searchRegex
        }))
      };

      this.query = this.query.find(searchQuery);
    }

    return this;
  }

  /**
   * Apply date range filtering
   *
   * Example: ?startDate=2024-01-01&endDate=2024-12-31
   *
   * @method dateRange
   * @param {string} dateField - Field to apply date range to
   * @param {string} [startParam='startDate'] - Query param for start date
   * @param {string} [endParam='endDate'] - Query param for end date
   * @returns {APIFeatures} this for chaining
   *
   * @example
   * features.dateRange('createdAt', 'from', 'to')
   */
  dateRange(dateField, startParam = 'startDate', endParam = 'endDate') {
    const dateFilter = {};

    if (this.queryString[startParam]) {
      dateFilter.$gte = new Date(this.queryString[startParam]);
    }

    if (this.queryString[endParam]) {
      dateFilter.$lte = new Date(this.queryString[endParam]);
    }

    if (Object.keys(dateFilter).length > 0) {
      this.query = this.query.find({ [dateField]: dateFilter });
    }

    return this;
  }

  /**
   * Make the query return plain JavaScript objects (lean)
   *
   * Lean queries are faster but don't have Mongoose document methods
   * Use for read-only operations
   *
   * @method lean
   * @returns {APIFeatures} this for chaining
   */
  lean() {
    this.query = this.query.lean();
    return this;
  }

  /**
   * Apply population to the query
   *
   * @method populate
   * @param {string|Object|Array} populateOptions - Population options
   * @returns {APIFeatures} this for chaining
   *
   * @example
   * features.populate('userId')
   * features.populate({ path: 'userId', select: 'name email' })
   */
  populate(populateOptions) {
    this.query = this.query.populate(populateOptions);
    return this;
  }
}

/**
 * Get count of documents matching the query (without pagination)
 *
 * @async
 * @function getCount
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} filter - Filter conditions
 * @returns {Promise<number>} Document count
 */
const getCount = async (Model, filter = {}) => {
  return Model.countDocuments(filter);
};

/**
 * Build pagination metadata for API response
 *
 * @function buildPaginationResponse
 * @param {number} total - Total document count
 * @param {Object} paginationInfo - Pagination info from APIFeatures
 * @returns {Object} Pagination metadata
 */
const buildPaginationResponse = (total, paginationInfo) => {
  const { page, limit } = paginationInfo;
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  APIFeatures,
  getCount,
  buildPaginationResponse
};
