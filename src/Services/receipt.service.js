/**
 * ===========================================
 * StudySpace ERP Backend - Receipt Service
 * ===========================================
 *
 * Service for generating unique receipt numbers.
 * Uses nanoid for secure, collision-resistant identifiers.
 *
 * Receipt format: RCP-XXXXXXXXXX (prefix + 10-char alphanumeric)
 *
 * @file src/Services/receipt.service.js
 * @description Receipt number generation service
 */

const { nanoid } = require('nanoid');

/**
 * Prefix for receipt numbers
 * Used to identify receipts in the system
 */
const RECEIPT_PREFIX = 'RCP';

/**
 * Length of the unique portion of receipt number
 * 10 characters provides ~1 trillion combinations
 */
const RECEIPT_ID_LENGTH = 10;

/**
 * Generate a unique receipt number
 *
 * Format: RCP-XXXXXXXXXX
 * - RCP: Prefix indicating receipt
 * - XXXXXXXXXX: 10-character alphanumeric unique ID
 *
 * @returns {string} Unique receipt number
 *
 * @example
 * generateReceiptNumber(); // Returns: "RCP-A1B2C3D4E5"
 */
const generateReceiptNumber = () => {
  const uniqueId = nanoid(RECEIPT_ID_LENGTH).toUpperCase();
  return `${RECEIPT_PREFIX}-${uniqueId}`;
};

/**
 * Generate a batch of unique receipt numbers
 * Useful for pre-generating receipts for offline mode
 *
 * @param {number} count - Number of receipts to generate
 * @returns {string[]} Array of unique receipt numbers
 *
 * @example
 * generateReceiptBatch(5); // Returns: ["RCP-A1B2...", "RCP-X9Y8...", ...]
 */
const generateReceiptBatch = (count = 10) => {
  const receipts = [];
  for (let i = 0; i < count; i++) {
    receipts.push(generateReceiptNumber());
  }
  return receipts;
};

/**
 * Validate receipt number format
 * Checks if a string matches the expected receipt format
 *
 * @param {string} receiptNumber - Receipt number to validate
 * @returns {boolean} True if valid format
 *
 * @example
 * isValidReceiptFormat("RCP-A1B2C3D4E5"); // Returns: true
 * isValidReceiptFormat("invalid"); // Returns: false
 */
const isValidReceiptFormat = (receiptNumber) => {
  if (!receiptNumber || typeof receiptNumber !== 'string') {
    return false;
  }

  // Pattern: RCP-[10 alphanumeric characters]
  const pattern = /^RCP-[A-Z0-9]{10}$/;
  return pattern.test(receiptNumber);
};

module.exports = {
  generateReceiptNumber,
  generateReceiptBatch,
  isValidReceiptFormat,
  RECEIPT_PREFIX,
  RECEIPT_ID_LENGTH
};
