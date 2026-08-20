const express = require("express");
const router = express.Router();

// Controller Import (Object Destructuring নিশ্চিত করুন)
const { getReportSummary } = require("../controllers/reportController");

// Route Handler
router.get("/summary", getReportSummary);

module.exports = router;