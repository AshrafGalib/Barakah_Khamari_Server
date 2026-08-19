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
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all customer endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Specific Business Logic Sub-Routes
// Note: Placed above /:id to maintain strict routing priority
// ======================================================

// PATCH /api/customers/:id/due-payment - Process customer due payment
router.patch(
  "/:id/due-payment",
  requirePermission(PERMISSIONS.CUSTOMERS_DUE_PAYMENT || PERMISSIONS.CUSTOMERS_UPDATE),
  payCustomerDue
);

// ======================================================
// Collection Routes: Root (/api/customers)
// ======================================================

router
  .route("/")
  // GET /api/customers - Fetch all customers list
  .get(
    requirePermission(PERMISSIONS.CUSTOMERS_VIEW),
    getCustomers
  )
  // POST /api/customers - Create a new customer entry
  .post(
    requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
    createCustomer
  );

// ======================================================
// Individual Resource Routes: By ID (/api/customers/:id)
// ======================================================

router
  .route("/:id")
  // GET /api/customers/:id - Fetch single customer details
  .get(
    requirePermission(PERMISSIONS.CUSTOMERS_VIEW),
    getCustomerById
  )
  // PATCH /api/customers/:id - Update customer details
  .patch(
    requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
    updateCustomer
  )
  // DELETE /api/customers/:id - Delete customer entry
  .delete(
    requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
    deleteCustomer
  );

module.exports = router;