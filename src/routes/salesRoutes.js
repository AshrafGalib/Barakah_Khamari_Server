const express = require("express");

const {
  getSales,
  getSale,
  createSale,
  deleteSale,
} = require("../controllers/salesController");

const authMiddleware = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Sales Routes
// ======================================================

// ==========================================
// সব Sale
// Permission: sales.view
// ==========================================

router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SALES_VIEW
  ),
  getSales
);

// ==========================================
// একটি Sale
// Permission: sales.view
// ==========================================

router.get(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SALES_VIEW
  ),
  getSale
);

// ==========================================
// নতুন Sale
// Permission: sales.create
// ==========================================

router.post(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SALES_CREATE
  ),
  createSale
);

// ==========================================
// Sale Delete
// Permission: sales.delete
// ==========================================

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SALES_DELETE
  ),
  deleteSale
);

// ======================================================
// Export
// ======================================================

module.exports = router;