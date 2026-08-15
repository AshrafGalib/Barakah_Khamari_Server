const express = require("express");

const router =
  express.Router();

const dashboardController =
  require("../controllers/dashboardController");

// ======================================================
// Dashboard
// ======================================================

router.get(
  "/",
  dashboardController.getDashboard
);

// ======================================================
// Opening Balance Status
//
// Dashboard frontend এই API দিয়ে check করবে
// আজকের Opening Balance set করা হয়েছে কি না।
// ======================================================

router.get(
  "/opening-balance/status",
  dashboardController.getOpeningBalanceStatus
);

// ======================================================
// Set Opening Balance
//
// First-time Opening Balance modal থেকে
// এই API-তে amount পাঠানো হবে।
// ======================================================

router.post(
  "/opening-balance",
  dashboardController.setOpeningBalance
);

module.exports = router;