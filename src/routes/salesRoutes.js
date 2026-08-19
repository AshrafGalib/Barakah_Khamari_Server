const express = require("express");
const {
  getSales,
  getSale,
  createSale,
  deleteSale,
} = require("../controllers/salesController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all sales endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Collection Routes: Root (/api/sales)
// ======================================================

router
  .route("/")
  // GET /api/sales - Fetch list of sales records
  .get(
    requirePermission(PERMISSIONS.SALES_VIEW),
    getSales
  )
  // POST /api/sales - Create a new sale invoice
  .post(
    requirePermission(PERMISSIONS.SALES_CREATE),
    createSale
  );

// ======================================================
// Individual Resource Routes: By ID (/api/sales/:id)
// ======================================================

router
  .route("/:id")
  // GET /api/sales/:id - Fetch single sale details
  .get(
    requirePermission(PERMISSIONS.SALES_VIEW),
    getSale
  )
  // DELETE /api/sales/:id - Delete sale record
  .delete(
    requirePermission(PERMISSIONS.SALES_DELETE),
    deleteSale
  );

module.exports = router;