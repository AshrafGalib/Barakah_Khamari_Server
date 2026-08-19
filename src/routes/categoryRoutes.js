const express = require("express");
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all category endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Collection Routes: Root (/api/categories)
// ======================================================

router
  .route("/")
  // GET /api/categories - Fetch all categories list
  .get(
    requirePermission(PERMISSIONS.CATEGORIES_VIEW),
    getCategories
  )
  // POST /api/categories - Create a new product category
  .post(
    requirePermission(PERMISSIONS.CATEGORIES_CREATE),
    createCategory
  );

// ======================================================
// Individual Resource Routes: By ID (/api/categories/:id)
// ======================================================

router
  .route("/:id")
  // GET /api/categories/:id - Fetch single category details
  .get(
    requirePermission(PERMISSIONS.CATEGORIES_VIEW),
    getCategory
  )
  // PATCH /api/categories/:id - Update category details
  .patch(
    requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
    updateCategory
  )
  // DELETE /api/categories/:id - Delete product category
  .delete(
    requirePermission(PERMISSIONS.CATEGORIES_DELETE),
    deleteCategory
  );

module.exports = router;