const express = require("express");

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  payCustomerDue,
  deleteCustomer,
} = require("../controllers/customerController");

const router = express.Router();

// ======================================================
// সব Customer
// ======================================================

router.get(
  "/",
  getCustomers
);

// ======================================================
// একটি Customer
// ======================================================

router.get(
  "/:id",
  getCustomerById
);

// ======================================================
// নতুন Customer
// ======================================================

router.post(
  "/",
  createCustomer
);

// ======================================================
// Customer Due Payment
// ======================================================
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
// Cash Sales ↑
//
// Dashboard:
// Sales Paid / Due update
//
// ======================================================

router.patch(
  "/:id/due-payment",
  payCustomerDue
);

// ======================================================
// Customer Update
// ======================================================

router.patch(
  "/:id",
  updateCustomer
);

// ======================================================
// Customer Delete
// ======================================================

router.delete(
  "/:id",
  deleteCustomer
);

// ======================================================
// Export
// ======================================================

module.exports = router;