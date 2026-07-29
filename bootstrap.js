/**
 * ===========================================
 * StudySpace ERP Backend - Application Bootstrap
 * ===========================================
 *
 * This module initializes and configures the Express application
 * with all necessary middleware, security settings, and route handlers.
 *
 * Middleware chain order is important for proper request processing:
 * 1. Security middleware (helmet)
 * 2. CORS configuration
 * 3. Body parsing (JSON)
 * 4. Request logging (development)
 * 5. API routes
 * 6. Error handling (must be last)
 *
 * @file bootstrap.js
 * @description Express application configuration and middleware setup
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routerHandler = require('./router-handler');
const { globalErrorHandler, notFoundHandler } = require('./src/Middlewares/error-handle.middleware');

/**
 * Bootstrap and configure the Express application
 *
 * This function creates and configures the Express app with:
 * - Security headers via Helmet
 * - CORS for cross-origin requests
 * - JSON body parsing
 * - API routes
 * - Global error handling
 *
 * @function bootstrap
 * @returns {express.Application} Configured Express application
 */
const bootstrap = () => {
  // Create Express application instance
  const app = express();

  // ===========================================
  // Security Middleware
  // ===========================================

  /**
   * Helmet adds various HTTP headers for security:
   * - Content-Security-Policy
   * - X-DNS-Prefetch-Control
   * - X-Frame-Options
   * - X-Content-Type-Options
   * - And more...
   */
  app.use(helmet());

  // ===========================================
  // CORS Configuration
  // ===========================================

  /**
   * Configure Cross-Origin Resource Sharing
   * Allows frontend to make requests to this API
   */
  const corsOptions = {
    // Allow requests from frontend URL (from environment)
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept'
    ],

    // Cache preflight requests for 24 hours
    maxAge: 86400
  };

  app.use(cors(corsOptions));

  // ===========================================
  // Body Parsing Middleware
  // ===========================================

  /**
   * Parse incoming JSON request bodies
   * Limit to 10kb to prevent large payload attacks
   */
  app.use(express.json({ limit: '10kb' }));

  /**
   * Parse URL-encoded bodies (form submissions)
   * Extended: true allows nested objects
   */
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ===========================================
  // Request Logging (Development Only)
  // ===========================================

  if (process.env.NODE_ENV === 'development') {
    /**
     * Simple request logger for development
     * Logs: METHOD URL - timestamp
     */
    app.use((req, res, next) => {
      console.log(`📥 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
      next();
    });
  }

  // ===========================================
  // Health Check Endpoint
  // ===========================================

  /**
   * Health check endpoint for monitoring
   * Returns basic server status
   */
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'StudySpace ERP Backend is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // ===========================================
  // API Routes
  // ===========================================

  /**
   * Register all API routes under /api prefix
   * Routes are organized by module in router-handler.js
   */
  app.use('/api', routerHandler());

  // ===========================================
  // Error Handling (Must be last)
  // ===========================================

  /**
   * Handle 404 - Route not found
   * This catches any request that didn't match a route
   */
  app.use(notFoundHandler);

  /**
   * Global error handler
   * Catches all errors thrown in the application
   * Must be the LAST middleware
   */
  app.use(globalErrorHandler);

  return app;
};

module.exports = bootstrap;
