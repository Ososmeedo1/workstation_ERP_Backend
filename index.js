/**
 * ===========================================
 * StudySpace ERP Backend - Main Entry Point
 * ===========================================
 *
 * This is the main entry point for the backend server.
 * It loads environment variables, establishes database connection,
 * and starts the Express server.
 *
 * @file index.js
 * @description Application entry point and server initialization
 */

// Load environment variables first (before any other imports)
require('dotenv').config();

const bootstrap = require('./bootstrap');
const { connectDB } = require('./DB/connection');

/**
 * Server port from environment or default to 5000
 * @type {number}
 */
const PORT = process.env.PORT || 5000;

/**
 * Current environment (development, production, test)
 * @type {string}
 */
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize and start the server
 *
 * This function:
 * 1. Connects to MongoDB database
 * 2. Initializes the Express application
 * 3. Starts listening for incoming requests
 *
 * @async
 * @function startServer
 * @returns {Promise<void>}
 */
const startServer = async () => {
  try {
    // Step 1: Connect to MongoDB
    // This must complete before starting the server
    await connectDB();

    // Step 2: Initialize Express application with all middleware and routes
    const app = bootstrap();

    // Step 3: Start the HTTP server
    app.listen(PORT, () => {
      console.log('===========================================');
      console.log('🚀 StudySpace ERP Backend Server');
      console.log('===========================================');
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log(`📅 Started: ${new Date().toISOString()}`);
      console.log('===========================================');
    });

  } catch (error) {
    // Log the error and exit if server fails to start
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

/**
 * Handle unhandled promise rejections
 * This prevents the application from silently failing
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Exit with failure code after logging
  process.exit(1);
});

/**
 * Handle uncaught exceptions
 * This catches synchronous errors that were not caught
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  // Exit with failure code after logging
  process.exit(1);
});

// Start the server
startServer();
