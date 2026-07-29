/**
 * ===========================================
 * StudySpace ERP Backend - Room Routes
 * ===========================================
 *
 * Router configuration for room management endpoints.
 * Includes authentication and role-based access control.
 *
 * Route permissions:
 * - GET /availability: All authenticated users
 * - GET /: Staff, Admin
 * - GET /:id: Staff, Admin
 * - POST /: Admin only
 * - PUT /:id: Admin only
 *
 * @file src/Modules/Rooms/room.routes.js
 * @description Room routes definition
 */

const { Router } = require('express');
const roomController = require('./room.controller.js');
const roomSchemas = require('./room.schema.js');
const { validateAll } = require('../../Middlewares/validation.middleware.js');
const { auth, requireRole } = require('../../Middlewares/auth.middleware.js');
const { USER_ROLES } = require('../../Utils/enum.utils.js');

const router = Router();

/**
 * @route GET /api/rooms/availability
 * @desc Get room availability status
 * @access Private - All authenticated users
 */
router.get(
  '/availability',
  auth,
  roomController.getRoomAvailability
);

/**
 * @route GET /api/rooms
 * @desc List all rooms with filters
 * @access Private - Staff, Admin
 */
router.get(
  '/',
  auth,
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(roomSchemas.listRoomsSchema),
  roomController.listRooms
);

/**
 * @route GET /api/rooms/:id
 * @desc Get a single room by ID
 * @access Private - Staff, Admin
 */
router.get(
  '/:id',
  auth,
  requireRole([USER_ROLES.STAFF, USER_ROLES.ADMIN]),
  validateAll(roomSchemas.getRoomSchema),
  roomController.getRoom
);

/**
 * @route POST /api/rooms
 * @desc Create a new room
 * @access Private - Admin only
 */
router.post(
  '/',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(roomSchemas.createRoomSchema),
  roomController.createRoom
);

/**
 * @route PUT /api/rooms/:id
 * @desc Update an existing room
 * @access Private - Admin only
 */
router.put(
  '/:id',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(roomSchemas.updateRoomSchema),
  roomController.updateRoom
);

/**
 * @route DELETE /api/rooms/:id
 * @desc Deactivate a room (soft delete)
 * @access Private - Admin only
 *
 * Note: This does NOT remove the room from the database.
 * It sets isActive to false, preventing new sessions. (T122)
 */
router.delete(
  '/:id',
  auth,
  requireRole([USER_ROLES.ADMIN]),
  validateAll(roomSchemas.getRoomSchema), // Validates :id param
  roomController.deactivateRoom
);

module.exports = router;
