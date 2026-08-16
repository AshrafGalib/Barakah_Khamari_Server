const express = require("express");

const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,

  getSupplierDue,
  paySupplierDue,
  getSupplierPaymentHistory,
} = require("../controllers/supplierController");

const authMiddleware = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Supplier Routes
// ======================================================

// =====================================
// সব Supplier
// Permission: suppliers.view
// =====================================

router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SUPPLIERS_VIEW
  ),
  getSuppliers
);

// =====================================
// Supplier Due
// Permission: suppliers.view
// =====================================

router.get(
  "/:id/due",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SUPPLIERS_VIEW
  ),
  getSupplierDue
);

// =====================================
// Supplier Payment History
// Permission: suppliers.view
// =====================================

router.get(
  "/:id/payment-history",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SUPPLIERS_VIEW
  ),
  getSupplierPaymentHistory
);

// =====================================
// Supplier Due Payment
// Permission: suppliers.update
// =====================================

router.post(
  "/:id/due-payment",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SUPPLIERS_UPDATE
  ),
  paySupplierDue
);

// =====================================
// একটি Supplier
// Permission: suppliers.view
// =====================================

router.get(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SUPPLIERS_VIEW
  ),
  getSupplier
);

// =====================================
// নতুন Supplier
// Permission: suppliers.create
// =====================================

router.post(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SUPPLIERS_CREATE
  ),
  createSupplier
);

// =====================================
// Supplier Update
// Permission: suppliers.update
// =====================================

router.patch(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SUPPLIERS_UPDATE
  ),
  updateSupplier
);

// =====================================
// Supplier Delete
// Permission: suppliers.delete
// =====================================

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.SUPPLIERS_DELETE
  ),
  deleteSupplier
);

module.exports = router;