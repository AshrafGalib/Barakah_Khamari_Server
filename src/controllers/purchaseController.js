const purchaseService = require("../services/purchaseService");

// ==========================================
// Get All Purchases
// ==========================================

const getPurchases = async (req, res) => {
  try {
    const purchases =
      await purchaseService.getPurchases();

    res.status(200).json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Purchase history লোড করা যায়নি",
      error: error.message,
    });
  }
};

// ==========================================
// Get Single Purchase
// ==========================================

const getPurchase = async (req, res) => {
  try {
    const purchase =
      await purchaseService.getPurchaseById(
        req.params.id
      );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Purchase লোড করা যায়নি",
      error: error.message,
    });
  }
};

// ==========================================
// Create Purchase
// ==========================================

const createPurchase = async (req, res) => {
  try {
    const purchase =
      await purchaseService.createPurchase(
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "Purchase সফলভাবে যোগ হয়েছে এবং Stock update হয়েছে",
      data: purchase,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Pay Purchase Due
//
// Existing Purchase-এর বাকি টাকা পরিশোধ করা।
//
// Example:
// Total = 5000
// Paid  = 3000
// Due   = 2000
//
// পরে 2000 দিলে:
// Paid = 5000
// Due  = 0
//
// এবং Cash Balance থেকে 2000 কমবে।
// ==========================================

const payPurchaseDue = async (req, res) => {
  try {
    const {
      paymentAmount,
      paymentMethod,
      paymentDate,
      notes,
    } = req.body;

    if (
      paymentAmount === undefined ||
      paymentAmount === null ||
      paymentAmount === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount দিতে হবে",
      });
    }

    const numericPaymentAmount =
      Number(paymentAmount);

    if (
      !Number.isFinite(
        numericPaymentAmount
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "সঠিক payment amount দিতে হবে",
      });
    }

    if (
      numericPaymentAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount 0-এর বেশি হতে হবে",
      });
    }

    const purchase =
      await purchaseService.payPurchaseDue(
        req.params.id,
        {
          paymentAmount:
            numericPaymentAmount,

          paymentMethod,

          paymentDate,

          notes,
        }
      );

    res.status(200).json({
      success: true,
      message:
        "Supplier due payment সফলভাবে সম্পন্ন হয়েছে",
      data: purchase,
    });
  } catch (error) {
    console.error(
      "Pay Purchase Due Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Delete Purchase
// ==========================================

const deletePurchase = async (req, res) => {
  try {
    const deleted =
      await purchaseService.deletePurchase(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Purchase পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Purchase মুছে ফেলা হয়েছে এবং Stock reverse হয়েছে",
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getPurchases,
  getPurchase,
  createPurchase,
  payPurchaseDue,
  deletePurchase,
};