
const express = require("express");
const {
  login,
  getCurrentUser,
  createUser,
  changePassword,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Authentication & User Account Routes
// ======================================================

// Public Route: User Login
// POST /api/auth/login
router.post("/login", login);

// Protected Route: Get Logged In User Info
// GET /api/auth/me
router.get("/me", authMiddleware, getCurrentUser);

// Protected Route: Change Own Password
// POST /api/auth/change-password
router.post("/change-password", authMiddleware, changePassword);

// Protected Route: Create New User (Requires USERS_CREATE permission)
// POST /api/auth/users
router.post(
  "/users",
  authMiddleware,
  requirePermission(PERMISSIONS.USERS_CREATE),
  createUser
);

module.exports = router;