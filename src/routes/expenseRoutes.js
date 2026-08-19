const express = require("express");
const expenseController = require("../controllers/expenseController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all expense endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Collection Routes: Root (/api/expenses)
// ======================================================

router
  .route("/")
  // GET /api/expenses - Fetch all expenses list
  .get(
    requirePermission(PERMISSIONS.EXPENSES_VIEW),
    expenseController.getExpenses
  )
  // POST /api/expenses - Create a new expense entry
  .post(
    requirePermission(PERMISSIONS.EXPENSES_CREATE),
    expenseController.createExpense
  );

// ======================================================
// Individual Resource Routes: By ID (/api/expenses/:id)
// ======================================================

router
  .route("/:id")
  // GET /api/expenses/:id - Fetch single expense record details
  .get(
    requirePermission(PERMISSIONS.EXPENSES_VIEW),
    expenseController.getExpenseById
  )
  // PUT /api/expenses/:id - Update full expense entry
  .put(
    requirePermission(PERMISSIONS.EXPENSES_UPDATE),
    expenseController.updateExpense
  )
  // DELETE /api/expenses/:id - Delete expense record
  .delete(
    requirePermission(PERMISSIONS.EXPENSES_DELETE),
    expenseController.deleteExpense
  );

module.exports = router;