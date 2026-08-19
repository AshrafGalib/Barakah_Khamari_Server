const express = require("express");
const cashBalanceController = require("../controllers/cashBalanceController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all cash balance endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Specific Static Sub-Routes
// Note: Must remain above dynamic /:date route to prevent parsing issues
// ======================================================

// GET /api/cash-balance/today - Fetch current day cash summary
router.get(
  "/today",
  requirePermission(PERMISSIONS.CASH_BALANCE_VIEW),
  cashBalanceController.getTodayBalance
);

// GET /api/cash-balance/opening-status - Check if opening balance for today is set
router.get(
  "/opening-status",
  requirePermission(PERMISSIONS.CASH_BALANCE_VIEW),
  cashBalanceController.getOpeningBalanceStatus
);

// POST /api/cash-balance/opening - Initialize daily opening cash balance
router.post(
  "/opening",
  requirePermission(PERMISSIONS.CASH_BALANCE_OPENING),
  cashBalanceController.setOpeningBalance
);

// ======================================================
// Dynamic Param Resource Routes
// Note: Placed LAST as :date matches any trailing path string
// ======================================================

// GET /api/cash-balance/:date - Fetch cash balance for specific date (e.g. 2026-08-15)
router.get(
  "/:date",
  requirePermission(PERMISSIONS.CASH_BALANCE_VIEW),
  cashBalanceController.getDailyBalance
);

module.exports = router;