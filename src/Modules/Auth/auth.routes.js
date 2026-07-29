/**
 * ===========================================
 * StudySpace ERP Backend - Auth Routes
 * ===========================================
 *
 * Router configuration for authentication endpoints.
 *
 * @file src/Modules/Auth/auth.routes.js
 * @description Auth routes definition
 */

const { Router } = require('express');
const authController = require('./auth.controller.js');
const authValidation = require('./auth.validation_schema.js');
const { validateAll } = require('../../Middlewares/validation.middleware.js');
const { auth } = require('../../Middlewares/auth.middleware.js');

const router = Router();

// Public routes
router.post(
  '/register',
  validateAll(authValidation.registerSchema),
  authController.register
);

router.post(
  '/login',
  validateAll(authValidation.loginSchema),
  authController.login
);

// Private routes
router.get(
  '/me',
  auth,
  authController.getMe
);

router.post(
  '/logout',
  auth,
  authController.logout
);

module.exports = router;
