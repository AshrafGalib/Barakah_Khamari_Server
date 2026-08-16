const express = require("express");

const router = express.Router();

const dashboardController =
  require("../controllers/dashboardController");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  requirePermission,
} = require("../middleware/permissionMiddleware");

const {
  PERMISSIONS,
} = require("../constants/permissionConstants");

// ======================================================
// Dashboard
// ======================================================

// GET /api/dashboard
// Permission: dashboard.view
//
// User can access dashboard only if
// dashboard.view permission is enabled.

router.get(
  "/",
  authMiddleware,
  requirePermission(
    PERMISSIONS.DASHBOARD_VIEW
  ),
  dashboardController.getDashboard
);

// ======================================================
// Opening Balance Status
// ======================================================
//
// GET:
// /api/dashboard/opening-balance/status
//
// Permission:
// cashBalance.view
//
// Used to check whether today's
// opening balance has been set.
//

router.get(
  "/opening-balance/status",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CASH_BALANCE_VIEW
  ),
  dashboardController.getOpeningBalanceStatus
);

// ======================================================
// Set Opening Balance
// ======================================================
//
// POST:
// /api/dashboard/opening-balance
//
// Permission:
// cashBalance.opening
//
// Only users who have this permission
// can set the opening balance.
//

router.post(
  "/opening-balance",
  authMiddleware,
  requirePermission(
    PERMISSIONS.CASH_BALANCE_OPENING
  ),
  dashboardController.setOpeningBalance
);

// ======================================================
// Export
// ======================================================

module.exports = router;