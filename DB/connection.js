/**
 * ===========================================
 * StudySpace ERP Backend - MongoDB Connection
 * ===========================================
 *
 * This module handles MongoDB database connection using Mongoose.
 * It includes retry logic for connection failures and proper
 * error handling for production environments.
 *
 * Features:
 * - Automatic retry on connection failure
 * - Configurable retry attempts and delay
 * - Connection event logging
 * - Graceful disconnection handling
 *
 * @file DB/connection.js
 * @description MongoDB connection manager with retry logic
 */

const mongoose = require('mongoose');

/**
 * Maximum number of connection retry attempts
 * @type {number}
 */
const MAX_RETRIES = 5;

/**
 * Delay between retry attempts in milliseconds
 * @type {number}
 */
const RETRY_DELAY = 5000;

/**
 * Track current retry count
 * @type {number}
 */
let retryCount = 0;

/**
 * Connect to MongoDB database with retry logic
 *
 * This function attempts to connect to MongoDB using the URI
 * from environment variables. If connection fails, it will
 * retry up to MAX_RETRIES times with RETRY_DELAY between attempts.
 *
 * @async
 * @function connectDB
 * @returns {Promise<mongoose.Connection>} Mongoose connection instance
 * @throws {Error} If connection fails after all retry attempts
 *
 * @example
 * // In index.js
 * const { connectDB } = require('./DB/connection');
 * await connectDB();
 */
const connectDB = async () => {
  // Get MongoDB URI from environment
  const mongoURI = process.env.MONGODB_URI;

  // Validate that MongoDB URI is provided
  if (!mongoURI) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    // Configure Mongoose options for optimal performance
    const options = {
      // Use new URL parser (required in Mongoose 6+)
      // These options are now default but included for clarity
      maxPoolSize: 10, // Maximum number of connections in pool
      minPoolSize: 2,  // Minimum number of connections in pool
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000 // Timeout for socket operations
    };

    // Attempt to connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, options);

    // Reset retry count on successful connection
    retryCount = 0;

    console.log('✅ MongoDB connected successfully');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🏠 Host: ${mongoose.connection.host}`);

    // Set up connection event listeners
    setupConnectionListeners();

    return mongoose.connection;

  } catch (error) {
    // Handle connection failure
    console.error(`❌ MongoDB connection failed: ${error.message}`);

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`🔄 Retrying connection (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY / 1000} seconds...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

      // Recursive retry
      return connectDB();
    }

    // All retries exhausted
    console.error(`❌ Failed to connect after ${MAX_RETRIES} attempts`);
    throw new Error(`Failed to connect after ${MAX_RETRIES} attempts`);
  }
};

/**
 * Set up event listeners for MongoDB connection events
 *
 * This function attaches listeners for:
 * - disconnected: When connection is lost
 * - reconnected: When connection is re-established
 * - error: When a connection error occurs
 *
 * @function setupConnectionListeners
 * @returns {void}
 */
const setupConnectionListeners = () => {
  const connection = mongoose.connection;

  // Handle disconnection
  connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  // Handle reconnection
  connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });

  // Handle connection errors
  connection.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error.message);
  });

  // Handle process termination - close connection gracefully
  process.on('SIGINT', async () => {
    await gracefulDisconnect('SIGINT');
  });

  process.on('SIGTERM', async () => {
    await gracefulDisconnect('SIGTERM');
  });
};

/**
 * Gracefully disconnect from MongoDB
 *
 * This function properly closes the database connection
 * when the application is shutting down.
 *
 * @async
 * @function gracefulDisconnect
 * @param {string} signal - The signal that triggered the disconnect
 * @returns {Promise<void>}
 */
const gracefulDisconnect = async (signal) => {
  console.log(`\n📤 ${signal} received. Closing MongoDB connection...`);

  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
    process.exit(1);
  }
};

/**
 * Get the current database connection status
 *
 * @function getConnectionStatus
 * @returns {string} Connection state (disconnected, connected, connecting, disconnecting)
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState];
};

module.exports = {
  connectDB,
  getConnectionStatus,
  gracefulDisconnect
};
