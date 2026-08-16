const express = require("express");

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  payCustomerDue,
  deleteCustomer,
} = require("../controllers/customerController");

const authMiddleware = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Customer Routes
// ======================================================

// ======================================================
// সব Customer
// Permission: customers.view
// ======================================================

router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CUSTOMERS_VIEW
  ),
  getCustomers
);

// ======================================================
// একটি Customer
// Permission: customers.view
// ======================================================

router.get(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CUSTOMERS_VIEW
  ),
  getCustomerById
);

// ======================================================
// নতুন Customer
// Permission: customers.create
// ======================================================

router.post(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CUSTOMERS_CREATE
  ),
  createCustomer
);

// ======================================================
// Customer Due Payment
//
// Customer page থেকে Due Payment করলে:
//
// Customer Due ↓
// Customer Paid ↑
//
// Related Sales:
// Paid ↑
// Due ↓
//
// Cash Balance:
// Cash Inflow ↑
//
// Dashboard:
// Sales Paid / Due update
//
// Permission: customers.duePayment
// ======================================================

router.patch(
  "/:id/due-payment",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CUSTOMERS_DUE_PAYMENT
  ),
  payCustomerDue
);

// ======================================================
// Customer Update
// Permission: customers.update
// ======================================================

router.patch(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CUSTOMERS_UPDATE
  ),
  updateCustomer
);

// ======================================================
// Customer Delete
// Permission: customers.delete
// ======================================================

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CUSTOMERS_DELETE
  ),
  deleteCustomer
);

// ======================================================
// Export
// ======================================================

module.exports = router;