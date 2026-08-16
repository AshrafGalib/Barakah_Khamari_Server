const express = require("express");

const router = express.Router();

const cashBalanceController =
  require("../controllers/cashBalanceController");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

// ======================================================
// Today's Cash Balance
// ======================================================
//
// GET:
// /api/cash-balance/today
//
// Permission:
// cashBalance.view
//
// ======================================================

router.get(
  "/today",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CASH_BALANCE_VIEW
  ),
  cashBalanceController.getTodayBalance
);

// ======================================================
// Opening Balance Status
// ======================================================
//
// IMPORTANT:
// This route must remain BEFORE /:date
//
// GET:
// /api/cash-balance/opening-status
//
// Permission:
// cashBalance.view
//
// ======================================================

router.get(
  "/opening-status",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CASH_BALANCE_VIEW
  ),
  cashBalanceController
    .getOpeningBalanceStatus
);

// ======================================================
// Set Opening Balance
// ======================================================
//
// POST:
// /api/cash-balance/opening
//
// Permission:
// cashBalance.opening
//
// This is a financial operation.
// Only authorized users can set opening balance.
//
// ======================================================

router.post(
  "/opening",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CASH_BALANCE_OPENING
  ),
  cashBalanceController
    .setOpeningBalance
);

// ======================================================
// Get Specific Date Balance
// ======================================================
//
// GET:
// /api/cash-balance/:date
//
// Example:
// /api/cash-balance/2026-08-15
//
// Permission:
// cashBalance.view
//
// IMPORTANT:
// Keep this route LAST because :date is dynamic.
//
// ======================================================

router.get(
  "/:date",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CASH_BALANCE_VIEW
  ),
  cashBalanceController
    .getDailyBalance
);

// ======================================================
// Export
// ======================================================

module.exports = router;