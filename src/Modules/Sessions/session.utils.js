/**
 * ===========================================
 * StudySpace ERP Backend - Session Utilities
 * ===========================================
 *
 * Utility functions for session-related calculations.
 * Uses Luxon for accurate date/time manipulation.
 *
 * Key functions:
 * - Duration calculation between check-in and check-out
 * - Amount calculation based on hourly rate
 * - Time formatting for display
 *
 * @file src/Modules/Sessions/session.utils.js
 * @description Session calculation utilities
 */

const { DateTime } = require('luxon');

/**
 * Calculate the duration between two timestamps
 *
 * @param {Date|string} checkIn - Check-in timestamp
 * @param {Date|string} checkOut - Check-out timestamp
 * @returns {Object} Duration object with various formats
 *
 * @example
 * calculateDuration(checkInDate, checkOutDate);
 * // Returns: {
 * //   totalMinutes: 135,
 * //   hours: 2,
 * //   minutes: 15,
 * //   formatted: "2h 15m",
 * //   decimal: 2.25
 * // }
 */
const calculateDuration = (checkIn, checkOut) => {
  // Convert to Luxon DateTime objects
  const start = DateTime.fromJSDate(new Date(checkIn));
  const end = DateTime.fromJSDate(new Date(checkOut));

  // Validate dates
  if (!start.isValid || !end.isValid) {
    throw new Error('Invalid date provided for duration calculation');
  }

  // Calculate difference
  const diff = end.diff(start, ['hours', 'minutes']);

  // Total minutes for storage
  const totalMinutes = Math.ceil(diff.as('minutes'));

  // Hours and remaining minutes for display
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Decimal hours for billing calculation
  const decimalHours = totalMinutes / 60;

  // Formatted string for display
  let formatted = '';
  if (hours > 0) {
    formatted += `${hours}h `;
  }
  formatted += `${minutes}m`;

  return {
    totalMinutes,      // Total duration in minutes (for DB storage)
    hours,             // Whole hours
    minutes,           // Remaining minutes
    formatted: formatted.trim(), // Human-readable format "2h 15m"
    decimal: Math.round(decimalHours * 100) / 100 // Decimal hours (2.25)
  };
};

/**
 * Calculate the total amount for a session
 *
 * @param {number} durationMinutes - Session duration in minutes
 * @param {number} hourlyRate - Hourly rate for the room
 * @param {Object} options - Calculation options
 * @param {number} options.minimumCharge - Minimum charge amount (default: hourlyRate)
 * @param {boolean} options.roundUp - Round up to nearest hour (default: false)
 * @returns {number} Total amount to charge
 *
 * @example
 * calculateAmount(135, 50); // 135 min @ 50/hr = 112.50
 * calculateAmount(30, 50, { roundUp: true }); // 30 min rounded to 1hr = 50
 */
const calculateAmount = (durationMinutes, hourlyRate, options = {}) => {
  const { minimumCharge = 0, roundUp = false } = options;

  // Validate inputs
  if (durationMinutes < 0 || hourlyRate < 0) {
    throw new Error('Duration and hourly rate must be non-negative');
  }

  let hoursToCharge;

  if (roundUp) {
    // Round up to nearest hour
    hoursToCharge = Math.ceil(durationMinutes / 60);
  } else {
    // Charge by actual time (pro-rated)
    hoursToCharge = durationMinutes / 60;
  }

  // Calculate raw amount
  let amount = hoursToCharge * hourlyRate;

  // Apply minimum charge if specified
  if (minimumCharge > 0 && amount < minimumCharge) {
    amount = minimumCharge;
  }

  // Round to 2 decimal places
  return Math.round(amount * 100) / 100;
};

/**
 * Format a duration for display
 *
 * @param {number} totalMinutes - Duration in minutes
 * @returns {string} Formatted duration string
 *
 * @example
 * formatDuration(135); // Returns: "2h 15m"
 * formatDuration(45); // Returns: "45m"
 * formatDuration(120); // Returns: "2h 0m"
 */
const formatDuration = (totalMinutes) => {
  if (totalMinutes < 0) {
    return '0m';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

/**
 * Check if a session duration is valid
 * (Check-out must be after check-in)
 *
 * @param {Date|string} checkIn - Check-in timestamp
 * @param {Date|string} checkOut - Check-out timestamp
 * @returns {boolean} True if valid
 */
const isValidSessionDuration = (checkIn, checkOut) => {
  const start = DateTime.fromJSDate(new Date(checkIn));
  const end = DateTime.fromJSDate(new Date(checkOut));

  return start.isValid && end.isValid && end > start;
};

/**
 * Get the current timestamp in ISO format
 * Useful for setting check-in/check-out times
 *
 * @returns {Date} Current date/time
 */
const getCurrentTimestamp = () => {
  return DateTime.now().toJSDate();
};

module.exports = {
  calculateDuration,
  calculateAmount,
  formatDuration,
  isValidSessionDuration,
  getCurrentTimestamp
};
