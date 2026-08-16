const express = require("express");

const router = express.Router();

const expenseController =
  require("../controllers/expenseController");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

// ======================================================
// Expense Routes
// ======================================================

// ======================================================
// Get All Expenses
// Permission: expenses.view
// ======================================================

router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.EXPENSES_VIEW
  ),
  expenseController.getExpenses
);

// ======================================================
// Get Expense By ID
// Permission: expenses.view
// ======================================================

router.get(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.EXPENSES_VIEW
  ),
  expenseController.getExpenseById
);

// ======================================================
// Create Expense
// Permission: expenses.create
// ======================================================

router.post(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.EXPENSES_CREATE
  ),
  expenseController.createExpense
);

// ======================================================
// Update Expense
// Permission: expenses.update
// ======================================================

router.put(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.EXPENSES_UPDATE
  ),
  expenseController.updateExpense
);

// ======================================================
// Delete Expense
// Permission: expenses.delete
// ======================================================

router.delete(
  "/:id",
  authMiddleware,
  requirePermission(
    PERMISSIONS.EXPENSES_DELETE
  ),
  expenseController.deleteExpense
);

// ======================================================
// Export
// ======================================================

module.exports = router;