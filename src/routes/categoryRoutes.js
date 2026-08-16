const express = require("express");

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const authMiddleware = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Category Routes
// ======================================================

// View all categories
router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CATEGORIES_VIEW
  ),
  getCategories
);

// View single category
router.get(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CATEGORIES_VIEW
  ),
  getCategory
);

// Create category
router.post(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CATEGORIES_CREATE
  ),
  createCategory
);

// Update category
router.patch(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CATEGORIES_UPDATE
  ),
  updateCategory
);

// Delete category
router.delete(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CATEGORIES_DELETE
  ),
  deleteCategory
);

module.exports = router;