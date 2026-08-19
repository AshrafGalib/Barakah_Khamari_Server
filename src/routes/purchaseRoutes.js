const express = require("express");
const {
  getPurchases,
  getPurchase,
  createPurchase,
  payPurchaseDue,
  deletePurchase,
} = require("../controllers/purchaseController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all purchase endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Specific Business Logic Sub-Routes
// Note: Placed above /:id to maintain strict routing priority
// ======================================================

// PATCH /api/purchases/:id/due-payment - Pay due amount for a purchase
router.patch(
  "/:id/due-payment",
  requirePermission(PERMISSIONS.PURCHASES_UPDATE),
  payPurchaseDue
);

// ======================================================
// Collection Routes: Root (/api/purchases)
// ======================================================

router
  .route("/")
  // GET /api/purchases - Fetch purchase history list
  .get(
    requirePermission(PERMISSIONS.PURCHASES_VIEW),
    getPurchases
  )
  // POST /api/purchases - Create a new purchase record
  .post(
    requirePermission(PERMISSIONS.PURCHASES_CREATE),
    createPurchase
  );

// ======================================================
// Individual Resource Routes: By ID (/api/purchases/:id)
// ======================================================

router
  .route("/:id")
  // GET /api/purchases/:id - Fetch single purchase record details
  .get(
    requirePermission(PERMISSIONS.PURCHASES_VIEW),
    getPurchase
  )
  // DELETE /api/purchases/:id - Delete purchase record
  .delete(
    requirePermission(PERMISSIONS.PURCHASES_DELETE),
    deletePurchase
  );

module.exports = router;