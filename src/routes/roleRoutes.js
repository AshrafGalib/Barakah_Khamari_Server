const express = require("express");
const {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  getAvailablePermissions,
  getRolePermissions,
} = require("../controllers/roleController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// All role routes require authentication
router.use(authMiddleware);

// ======================================================
// Role Management Routes
// ======================================================

// Get all available permissions list
// GET /api/roles/permissions
router.get(
  "/permissions",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  getAvailablePermissions
);

// Get all roles
// GET /api/roles
router.get(
  "/",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  getAllRoles
);

// Get single role
// GET /api/roles/:id
router.get(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  getRoleById
);

// Get permissions of a specific role
// GET /api/roles/:id/permissions
router.get(
  "/:id/permissions",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  getRolePermissions
);

// Create role
// POST /api/roles
router.post(
  "/",
  requirePermission(PERMISSIONS.ROLES_CREATE),
  createRole
);

// Update role
// PATCH /api/roles/:id
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_UPDATE),
  updateRole
);

// Delete role
// DELETE /api/roles/:id
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_DELETE),
  deleteRole
);

module.exports = router;