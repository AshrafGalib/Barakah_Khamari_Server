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

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

// সঠিক ইমপোর্ট (Destructuring সহ)
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all user management endpoints
router.use(authMiddleware);

// ======================================================
// Specific & Helper Routes
// ======================================================

// GET /api/users/available-roles
// Note: Placed above /:id to prevent Express from treating "available-roles" as an ID
router.get(
  "/available-roles",
  requirePermission(PERMISSIONS.USERS_VIEW),
  getAvailableRoles
);

// ======================================================
// Collection Routes: Root (/api/users)
// ======================================================

router
  .route("/")
  // GET /api/users - Fetch paginated/filtered user list
  .get(
    requirePermission(PERMISSIONS.USERS_VIEW),
    getUsers
  )
  // POST /api/users - Create new user
  .post(
    requirePermission(PERMISSIONS.USERS_CREATE),
    createUser
  );

// ======================================================
// Individual Resource Routes: By ID (/api/users/:id)
// ======================================================

router
  .route("/:id")
  // GET /api/users/:id - Fetch single user details
  .get(
    requirePermission(PERMISSIONS.USERS_VIEW),
    getUserById
  )
  // PATCH /api/users/:id - Update basic profile details
  .patch(
    requirePermission(PERMISSIONS.USERS_UPDATE),
    updateUser
  )
  // DELETE /api/users/:id - Remove user
  .delete(
    requirePermission(PERMISSIONS.USERS_DELETE),
    deleteUser
  );

// ======================================================
// Specific Field Mutation Routes
// ======================================================

// PATCH /api/users/:id/role - Update user's system role
router.patch(
  "/:id/role",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  updateUserRole
);

// PATCH /api/users/:id/status - Update active/inactive status
router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  updateUserStatus
);

module.exports = router;