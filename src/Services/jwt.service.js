/**
 * ===========================================
 * StudySpace ERP Backend - JWT Service
 * ===========================================
 *
 * Utility service for handling JSON Web Tokens.
 * Provides methods for generating and verifying tokens.
 *
 * @file src/Services/jwt.service.js
 * @description JWT generation and verification service
 */

const jwt = require('jsonwebtoken');

/**
 * Generate a new JWT token
 *
 * @param {Object} payload - Data to encode in the token (e.g., { id, role })
 * @param {Object} [options] - Additional options (expiresIn, etc.)
 * @returns {string} Signed JWT token
 */
const generateToken = ({ payload = {}, signature = process.env.JWT_SECRET, options = {} } = {}) => {
  const tokenOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    ...options
  };

  return jwt.sign(payload, signature, tokenOptions);
};

/**
 * Verify a JWT token
 *
 * @param {string} token - Token string to verify
 * @param {string} [signature] - Secret key used for signing
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = ({ token, signature = process.env.JWT_SECRET } = {}) => {
  if (!token) {
    throw new Error('Token is required for verification');
  }

  return jwt.verify(token, signature);
};

/**
 * Decode a JWT token without verifying signature
 * Useful for debugging or inspecting payload on client side (though this is backend)
 *
 * @param {string} token - Token string to decode
 * @returns {Object|null} Decoded payload or null if invalid
 */
const decodeToken = (token) => {
  if (!token) {return null;}
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};
