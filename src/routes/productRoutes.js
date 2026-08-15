const express = require("express");

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();

// ==========================================
// Product Routes
// ==========================================

// GET /api/products
router.get("/", getProducts);

// GET /api/products/:id
router.get("/:id", getProduct);

// POST /api/products
router.post("/", createProduct);

// PATCH /api/products/:id
router.patch("/:id", updateProduct);

// DELETE /api/products/:id
router.delete("/:id", deleteProduct);

module.exports = router;