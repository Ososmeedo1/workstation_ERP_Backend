/**
 * ===========================================
 * StudySpace ERP Backend - Router Handler
 * ===========================================
 *
 * This module aggregates all API routes from different modules
 * and mounts them under their respective base paths.
 *
 * Route structure:
 * - /api/auth     - Authentication (login, signup, logout)
 * - /api/users    - User management
 * - /api/rooms    - Room management
 * - /api/sessions - Session check-in/check-out
 * - /api/payments - Payment processing
 * - /api/cafe     - Cafe items and sales
 * - /api/finance  - Financial reports
 * - /api/audit    - Audit logs
 *
 * @file router-handler.js
 * @description Central route aggregation
 */

const express = require('express');

/**
 * Create and configure the main API router
 *
 * This function imports all module routes and mounts them
 * on their respective paths. Each module is responsible for
 * its own routes, controllers, and middleware.
 *
 * @function routerHandler
 * @returns {express.Router} Configured API router
 *
 * @example
 * // In bootstrap.js
 * app.use('/api', routerHandler());
 */
const routerHandler = () => {
  // Create the main router
  const router = express.Router();

  // ===========================================
  // Import Module Routes
  // ===========================================

  /**
   * Import routes from modules
   * These will be added as modules are implemented
   * Currently commented out until modules are created
   */

  // Authentication routes
  const authRoutes = require('./src/Modules/Auth/auth.routes.js');

  // User management routes
  const userRoutes = require('./src/Modules/Users/user.routes.js');

  // Room management routes
  const roomRoutes = require('./src/Modules/Rooms/room.routes.js');

  // Session management routes
  const sessionRoutes = require('./src/Modules/Sessions/session.routes.js');

  // Payment routes
  const paymentRoutes = require('./src/Modules/Payments/payment.routes.js');

  // Cafe routes (items and sales)
  const cafeRoutes = require('./src/Modules/Cafe/cafe.routes.js');

  // Finance routes (reports and expenses)
  const financeRoutes = require('./src/Modules/Finance/finance.routes.js');

  // Workspace routes
  const workspaceRoutes = require('./src/Modules/Workspaces/workspace.routes.js');

  // Audit log routes
  const auditLogRoutes = require('./src/Modules/AuditLogs/auditLog.routes.js');

  // Category routes
  const categoryRoutes = require('./src/Modules/Categories/category.routes.js');

  // ===========================================
  // Mount Routes
  // ===========================================

  /**
   * Mount module routes on their base paths
   * Uncomment as modules are implemented
   */

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/rooms', roomRoutes);
  router.use('/sessions', sessionRoutes);
  router.use('/payments', paymentRoutes);
  router.use('/cafe', cafeRoutes);
  router.use('/finance', financeRoutes);
  router.use('/workspaces', workspaceRoutes);
  router.use('/audit', auditLogRoutes);
  router.use('/categories', categoryRoutes);

  // ===========================================
  // API Info Endpoint
  // ===========================================

  /**
   * Root API endpoint - provides API information
   * GET /api
   */
  router.get('/', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'StudySpace ERP API',
      version: '1.0.0',
      documentation: '/api/docs',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        rooms: '/api/rooms',
        sessions: '/api/sessions',
        payments: '/api/payments',
        cafe: '/api/cafe',
        finance: '/api/finance',
        workspaces: '/api/workspaces',
        audit: '/api/audit'
      }
    });
  });

  return router;
};

module.exports = routerHandler;
