const express = require("express");

const {
  getSales,
  getSale,
  createSale,
  deleteSale,
} = require("../controllers/salesController");

const router = express.Router();

// ==========================================
// সব Sale
// ==========================================

router.get("/", getSales);

// ==========================================
// একটি Sale
// ==========================================

router.get("/:id", getSale);

// ==========================================
// নতুন Sale
// ==========================================

router.post("/", createSale);

// ==========================================
// Sale Delete
// ==========================================

router.delete("/:id", deleteSale);

module.exports = router;