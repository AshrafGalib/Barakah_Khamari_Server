const express = require("express");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all product endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Collection Routes: Root (/api/products)
// ======================================================

router
  .route("/")
  // GET /api/products - Fetch all products list
  .get(
    requirePermission(PERMISSIONS.PRODUCTS_VIEW),
    getProducts
  )
  // POST /api/products - Create a new product entry
  .post(
    requirePermission(PERMISSIONS.PRODUCTS_CREATE),
    createProduct
  );

// ======================================================
// Individual Resource Routes: By ID (/api/products/:id)
// ======================================================

router
  .route("/:id")
  // GET /api/products/:id - Fetch single product details
  .get(
    requirePermission(PERMISSIONS.PRODUCTS_VIEW),
    getProduct
  )
  // PATCH /api/products/:id - Update product details
  .patch(
    requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
    updateProduct
  )
  // DELETE /api/products/:id - Delete product entry
  .delete(
    requirePermission(PERMISSIONS.PRODUCTS_DELETE),
    deleteProduct
  );

module.exports = router;