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

const router =
  express.Router();

// =====================================
// সব Supplier
// =====================================

router.get(
  "/",
  getSuppliers
);

// =====================================
// Supplier Due
// =====================================

router.get(
  "/:id/due",
  getSupplierDue
);

// =====================================
// Supplier Payment History
// =====================================

router.get(
  "/:id/payment-history",
  getSupplierPaymentHistory
);

// =====================================
// Supplier Due Payment
// =====================================

router.post(
  "/:id/due-payment",
  paySupplierDue
);

// =====================================
// একটি Supplier
// =====================================

router.get(
  "/:id",
  getSupplier
);

// =====================================
// নতুন Supplier
// =====================================

router.post(
  "/",
  createSupplier
);

// =====================================
// Supplier Update
// =====================================

router.patch(
  "/:id",
  updateSupplier
);

// =====================================
// Supplier Delete
// =====================================

router.delete(
  "/:id",
  deleteSupplier
);

module.exports = router;