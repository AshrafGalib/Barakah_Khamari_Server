const express = require("express");

const {
  getPurchases,
  getPurchase,
  createPurchase,
  payPurchaseDue,
  deletePurchase,
} = require("../controllers/purchaseController");

const router =
  express.Router();

// ==========================================
// সব Purchase
// ==========================================

router.get(
  "/",
  getPurchases
);

// ==========================================
// নতুন Purchase
// ==========================================

router.post(
  "/",
  createPurchase
);

// ==========================================
// Supplier Due Payment
//
// Example:
// PATCH /api/purchases/:id/due-payment
//
// Body:
// {
//   "paymentAmount": 2000,
//   "paymentMethod": "ক্যাশ"
// }
// ==========================================

router.patch(
  "/:id/due-payment",
  payPurchaseDue
);

// ==========================================
// একটি Purchase
//
// এটি dynamic route
// ==========================================

router.get(
  "/:id",
  getPurchase
);

// ==========================================
// Purchase Delete
// ==========================================

router.delete(
  "/:id",
  deletePurchase
);

module.exports = router;