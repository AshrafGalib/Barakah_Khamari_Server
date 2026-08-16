const express = require("express");

const {
  getPurchases,
  getPurchase,
  createPurchase,
  payPurchaseDue,
  deletePurchase,
} = require("../controllers/purchaseController");

const authMiddleware = require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Purchase Routes
// ======================================================

// ==========================================
// সব Purchase
// Permission: purchases.view
// ==========================================

router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PURCHASES_VIEW
  ),
  getPurchases
);

// ==========================================
// নতুন Purchase
// Permission: purchases.create
// ==========================================

router.post(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PURCHASES_CREATE
  ),
  createPurchase
);

// ==========================================
// Purchase Due Payment
//
// PATCH /api/purchases/:id/due-payment
//
// Body:
// {
//   "paymentAmount": 2000,
//   "paymentMethod": "ক্যাশ"
// }
//
// Permission: purchases.update
// ==========================================

router.patch(
  "/:id/due-payment",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PURCHASES_UPDATE
  ),
  payPurchaseDue
);

// ==========================================
// একটি Purchase
//
// Permission: purchases.view
// ==========================================

router.get(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PURCHASES_VIEW
  ),
  getPurchase
);

// ==========================================
// Purchase Delete
// Permission: purchases.delete
// ==========================================

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.PURCHASES_DELETE
  ),
  deletePurchase
);

module.exports = router;