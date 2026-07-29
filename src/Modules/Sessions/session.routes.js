/**
 * ===========================================
 * StudySpace ERP Backend - Session Routes
 * ===========================================
 *
 * Router configuration for session management endpoints.
 * Includes authentication and role-based access control.
 *
 * Route permissions:
 * - All routes: Staff, Admin only
 *
 * @file src/Modules/Sessions/session.routes.js
 * @description Session routes definition
 */

const { Router } = require('express');
const sessionController = require('./session.controller.js');
const sessionSchemas = require('./session.schema.js');
const { validateAll } = require('../../Middlewares/validation.middleware.js');
const { auth, requireRole } = require('../../Middlewares/auth.middleware.js');
const { USER_ROLES } = require('../../Utils/enum.utils.js');

const router = Router();

/**
 * Middleware applied to all session routes
 * Only staff and admin can manage sessions
 */
const staffOrAdmin = [auth, requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN])];

/**
 * Middleware for member session history (member/staff/admin)
 */
const memberOrStaffOrAdmin = [
  auth,
  requireRole([USER_ROLES.MEMBER, USER_ROLES.STAFF, USER_ROLES.ADMIN])
];

/**
 * @route GET /api/sessions/my-history
 * @desc Get session history for the logged-in user
 * @access Private - Member, Staff, Admin
 */
router.get(
  '/my-history',
  ...memberOrStaffOrAdmin,
  validateAll(sessionSchemas.mySessionHistorySchema),
  sessionController.getMySessionHistory
);

/**
 * @route GET /api/sessions/active
 * @desc Get all active sessions
 * @access Private - Staff, Admin
 */
router.get(
  '/active',
  ...staffOrAdmin,
  validateAll(sessionSchemas.getActiveSessionsSchema),
  sessionController.getActiveSessions
);

/**
 * @route POST /api/sessions/checkin
 * @desc Check in a user to a room
 * @access Private - Staff, Admin
 */
router.post(
  '/checkin',
  ...staffOrAdmin,
  validateAll(sessionSchemas.checkInSchema),
  sessionController.checkIn
);

/**
 * @route POST /api/sessions/:id/checkout
 * @desc Check out a user from a room
 * @access Private - Staff, Admin
 */
router.post(
  '/:id/checkout',
  ...staffOrAdmin,
  validateAll(sessionSchemas.checkOutSchema),
  sessionController.checkOut
);

/**
 * @route GET /api/sessions
 * @desc List all sessions with filters
 * @access Private - Staff, Admin
 */
router.get(
  '/',
  ...staffOrAdmin,
  validateAll(sessionSchemas.listSessionsSchema),
  sessionController.listSessions
);

/**
 * @route POST /api/sessions/:id/cancel
 * @desc Cancel an active session (no charge)
 * @access Private - Staff, Admin
 */
router.post(
  '/:id/cancel',
  ...staffOrAdmin,
  validateAll(sessionSchemas.getSessionSchema),
  sessionController.cancelSession
);

/**
 * @route GET /api/sessions/:id
 * @desc Get a single session by ID
 * @access Private - Staff, Admin
 */
router.get(
  '/:id',
  ...staffOrAdmin,
  validateAll(sessionSchemas.getSessionSchema),
  sessionController.getSession
);

module.exports = router;
