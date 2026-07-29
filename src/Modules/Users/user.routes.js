/**
 * ===========================================
 * StudySpace ERP Backend - User Routes
 * ===========================================
 *
 * Router configuration for user management endpoints.
 * Phase 9 includes subscription retrieval for members.
 *
 * @file src/Modules/Users/user.routes.js
 * @description User routes definition
 */

const { Router } = require('express');
const userController = require('./user.controller.js');
const userSchemas = require('./user.schema.js');
const { validateAll } = require('../../Middlewares/validation.middleware.js');
const { auth, requireRole } = require('../../Middlewares/auth.middleware.js');
const { USER_ROLES } = require('../../Utils/enum.utils.js');

const router = Router();

/**
 * Middleware for admin-only routes
 */
const adminOnly = [auth, requireRole([USER_ROLES.ADMIN])];

/**
 * @route GET /api/users
 * @desc List users with filters
 * @access Private - Admin
 */
router.get(
  '/',
  ...adminOnly,
  validateAll(userSchemas.listUsersSchema),
  userController.listUsers
);

/**
 * @route POST /api/users
 * @desc Create a new user
 * @access Private - Admin
 */
router.post(
  '/',
  ...adminOnly,
  validateAll(userSchemas.createUserSchema),
  userController.createUser
);

/**
 * @route PUT /api/users/:id
 * @desc Update user details
 * @access Private - Admin
 */
router.put(
  '/:id',
  ...adminOnly,
  validateAll(userSchemas.updateUserSchema),
  userController.updateUser
);

/**
 * @route DELETE /api/users/:id
 * @desc Deactivate user
 * @access Private - Admin
 */
router.delete(
  '/:id',
  ...adminOnly,
  validateAll(userSchemas.deactivateUserSchema),
  userController.deactivateUser
);

/**
 * @route DELETE /api/users/:id/hard
 * @desc Hard delete customer and all their data
 * @access Private - Admin
 */
router.delete(
  '/:id/hard',
  ...adminOnly,
  validateAll(userSchemas.deactivateUserSchema),
  userController.deleteUserAndData
);

/**
 * @route PUT /api/users/:id/activate
 * @desc Activate user
 * @access Private - Admin
 */
router.put(
  '/:id/activate',
  ...adminOnly,
  validateAll(userSchemas.activateUserSchema),
  userController.activateUser
);

/**
 * @route PUT /api/users/:id/role
 * @desc Update user role
 * @access Private - Admin
 */
router.put(
  '/:id/role',
  ...adminOnly,
  validateAll(userSchemas.updateUserRoleSchema),
  userController.updateUserRole
);

/**
 * @route GET /api/users/:id/subscriptions
 * @desc Get subscriptions for a specific user
 * @access Private - Member (own), Staff, Admin
 */
router.get(
  '/:id/subscriptions',
  auth,
  requireRole([USER_ROLES.MEMBER, USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(userSchemas.getUserSubscriptionsSchema),
  userController.getUserSubscriptions
);

/**
 * @route POST /api/users/:id/subscriptions
 * @desc Create subscription for user
 * @access Private - Admin
 */
router.post(
  '/:id/subscriptions',
  ...adminOnly,
  validateAll(userSchemas.createSubscriptionSchema),
  userController.createUserSubscription
);

module.exports = router;