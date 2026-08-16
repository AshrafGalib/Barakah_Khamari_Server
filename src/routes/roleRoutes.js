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

const router = express.Router();

// ======================================================
// Role Management Routes
// ======================================================

// Get all available permissions
// GET /api/roles/permissions
router.get(
  "/permissions",
  authMiddleware,
  getAvailablePermissions
);

// Get all roles
// GET /api/roles
router.get(
  "/",
  authMiddleware,
  getAllRoles
);

// Get single role
// GET /api/roles/:id
router.get(
  "/:id",
  authMiddleware,
  getRoleById
);

// Get permissions of a specific role
// GET /api/roles/:id/permissions
router.get(
  "/:id/permissions",
  authMiddleware,
  getRolePermissions
);

// Create role
// POST /api/roles
router.post(
  "/",
  authMiddleware,
  createRole
);

// Update role
// PATCH /api/roles/:id
router.patch(
  "/:id",
  authMiddleware,
  updateRole
);

// Delete role
// DELETE /api/roles/:id
router.delete(
  "/:id",
  authMiddleware,
  deleteRole
);

module.exports = router;