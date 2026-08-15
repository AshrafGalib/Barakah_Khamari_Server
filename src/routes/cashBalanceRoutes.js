const express = require("express");

const router =
  express.Router();

const cashBalanceController =
  require("../controllers/cashBalanceController");

// ======================================================
// Today's Cash Balance
// ======================================================

router.get(
  "/today",
  cashBalanceController.getTodayBalance
);

// ======================================================
// Opening Balance Status
//
// IMPORTANT:
// This must be BEFORE /:date
// ======================================================

router.get(
  "/opening-status",
  cashBalanceController
    .getOpeningBalanceStatus
);

// ======================================================
// Set Opening Balance
// ======================================================

router.post(
  "/opening",
  cashBalanceController
    .setOpeningBalance
);

// ======================================================
// Get Specific Date Balance
//
// Keep this LAST because it is dynamic.
// ======================================================

router.get(
  "/:date",
  cashBalanceController
    .getDailyBalance
);

module.exports = router;