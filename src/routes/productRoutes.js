const express = require("express");

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const authMiddleware = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Product Routes
// ======================================================

// GET /api/products
// Permission: products.view
router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PRODUCTS_VIEW
  ),
  getProducts
);

// GET /api/products/:id
// Permission: products.view
router.get(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PRODUCTS_VIEW
  ),
  getProduct
);

// POST /api/products
// Permission: products.create
router.post(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PRODUCTS_CREATE
  ),
  createProduct
);

// PATCH /api/products/:id
// Permission: products.update
router.patch(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PRODUCTS_UPDATE
  ),
  updateProduct
);

// DELETE /api/products/:id
// Permission: products.delete
router.delete(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PRODUCTS_DELETE
  ),
  deleteProduct
);

module.exports = router;