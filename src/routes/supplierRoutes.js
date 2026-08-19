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
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all supplier endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Specific Business Logic Sub-Routes
// Note: Placed above /:id to maintain strict routing priority
// ======================================================

// GET /api/suppliers/:id/due - Get supplier remaining due
router.get(
  "/:id/due",
  requirePermission(PERMISSIONS.SUPPLIERS_VIEW),
  getSupplierDue
);

// GET /api/suppliers/:id/payment-history - Get supplier payment logs
router.get(
  "/:id/payment-history",
  requirePermission(PERMISSIONS.SUPPLIERS_VIEW),
  getSupplierPaymentHistory
);

// POST /api/suppliers/:id/due-payment - Pay due amount to supplier
router.post(
  "/:id/due-payment",
  requirePermission(PERMISSIONS.SUPPLIERS_UPDATE),
  paySupplierDue
);

// ======================================================
// Collection Routes: Root (/api/suppliers)
// ======================================================

router
  .route("/")
  // GET /api/suppliers - Fetch supplier list
  .get(
    requirePermission(PERMISSIONS.SUPPLIERS_VIEW),
    getSuppliers
  )
  // POST /api/suppliers - Create new supplier
  .post(
    requirePermission(PERMISSIONS.SUPPLIERS_CREATE),
    createSupplier
  );

// ======================================================
// Individual Resource Routes: By ID (/api/suppliers/:id)
// ======================================================

router
  .route("/:id")
  // GET /api/suppliers/:id - Fetch single supplier
  .get(
    requirePermission(PERMISSIONS.SUPPLIERS_VIEW),
    getSupplier
  )
  // PATCH /api/suppliers/:id - Update supplier info
  .patch(
    requirePermission(PERMISSIONS.SUPPLIERS_UPDATE),
    updateSupplier
  )
  // DELETE /api/suppliers/:id - Remove supplier
  .delete(
    requirePermission(PERMISSIONS.SUPPLIERS_DELETE),
    deleteSupplier
  );

module.exports = router;