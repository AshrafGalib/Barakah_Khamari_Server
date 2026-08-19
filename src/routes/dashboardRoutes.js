const express = require("express");
const dashboardController = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissionConstants");

const router = express.Router();

// ======================================================
// Global Middleware Configuration
// ======================================================
// Protect all dashboard endpoints with authentication
router.use(authMiddleware);

// ======================================================
// Specific Sub-Routes: Opening Balance Management
// Note: Placed above root GET / to avoid routing ambiguities
// ======================================================

// GET /api/dashboard/opening-balance/status - Check if today's opening balance is configured
router.get(
  "/opening-balance/status",
  requirePermission(PERMISSIONS.CASH_BALANCE_VIEW),
  dashboardController.getOpeningBalanceStatus
);

// POST /api/dashboard/opening-balance - Submit initial daily opening cash balance
router.post(
  "/opening-balance",
  requirePermission(PERMISSIONS.CASH_BALANCE_OPENING),
  dashboardController.setOpeningBalance
);

// ======================================================
// Main Overview Route: Root (/api/dashboard)
// ======================================================

// GET /api/dashboard - Fetch aggregated KPI summary & dashboard statistics
router.get(
  "/",
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  dashboardController.getDashboard
);

module.exports = router;