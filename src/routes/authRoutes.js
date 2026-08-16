const express = require("express");

const {
  login,
  getCurrentUser,
  createUser,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// Authentication Routes
// ======================================================

// ------------------------------------------------------
// Login
// POST /api/auth/login
// ------------------------------------------------------

router.post(
  "/login",
  login
);

// ------------------------------------------------------
// Current User
// GET /api/auth/me
// Protected route
// ------------------------------------------------------

router.get(
  "/me",
  authMiddleware,
  getCurrentUser
);

// ------------------------------------------------------
// Create User
// POST /api/auth/users
//
// Temporary route for initial admin/user creation.
// Later this route will be protected by admin role.
// ------------------------------------------------------

router.post(
  "/users",
  createUser
);

module.exports = router;