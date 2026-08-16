const express = require("express");

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAvailableRoles,
} = require("../controllers/userController");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

const router =
  express.Router();

// ======================================================
// User Management Routes
// ======================================================

// ======================================================
// Get Available Roles
//
// GET /api/users/available-roles
//
// Frontend user creation/edit form-এর role dropdown
// এই endpoint থেকে roles load করবে.
//
// Permission:
// users.create
// ======================================================

router.get(
  "/available-roles",
  authMiddleware,
  requirePermission(
    PERMISSIONS.USERS_CREATE
  ),
  getAvailableRoles
);

// ======================================================
// Get All Users
//
// GET /api/users
//
// Optional:
// /api/users?includeInactive=false
//
// Permission:
// users.view
// ======================================================

router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.USERS_VIEW
  ),
  getUsers
);

// ======================================================
// Get User By ID
//
// GET /api/users/:id
//
// Permission:
// users.view
// ======================================================

router.get(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.USERS_VIEW
  ),
  getUserById
);

// ======================================================
// Create User
//
// POST /api/users
//
// Body:
//
// {
//   "name": "Shop Manager",
//   "email": "manager@shop.com",
//   "password": "password123",
//   "roleId": "ROLE_ID"
// }
//
// Permission:
// users.create
// ======================================================

router.post(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.USERS_CREATE
  ),
  createUser
);

// ======================================================
// Update User
//
// PATCH /api/users/:id
//
// Body:
//
// {
//   "name": "Updated Name",
//   "email": "updated@email.com"
// }
//
// Permission:
// users.update
// ======================================================

router.patch(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.USERS_UPDATE
  ),
  updateUser
);

// ======================================================
// Update User Role
//
// PATCH /api/users/:id/role
//
// Body:
//
// {
//   "roleId": "ROLE_ID"
// }
//
// Permission:
// users.update
// ======================================================

router.patch(
  "/:id/role",
  authMiddleware,
  requirePermission(
    PERMISSIONS.USERS_UPDATE
  ),
  updateUserRole
);

// ======================================================
// Activate / Deactivate User
//
// PATCH /api/users/:id/status
//
// Body:
//
// {
//   "isActive": false
// }
//
// Permission:
// users.update
// ======================================================

router.patch(
  "/:id/status",
  authMiddleware,
  requirePermission(
    PERMISSIONS.USERS_UPDATE
  ),
  updateUserStatus
);

// ======================================================
// Delete User
//
// DELETE /api/users/:id
//
// IMPORTANT:
// Current implementation is SOFT DELETE.
// User permanently deleted হবে না.
// isActive = false হবে.
//
// Permission:
// users.delete
// ======================================================

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.USERS_DELETE
  ),
  deleteUser
);

// ======================================================
// Export
// ======================================================

module.exports = router;