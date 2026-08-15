const salesService = require("../services/salesService");

// ==========================================
// Get All Sales
// ==========================================

const getSales = async (req, res) => {
  try {
    const sales =
      await salesService.getSales();

    res.status(200).json({
      success: true,
      data: sales,
    });
  } catch (error) {
    console.error(
      "Get Sales Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "বিক্রয়ের তালিকা লোড করা যায়নি",
      error: error.message,
    });
  }
};

// ==========================================
// Get Single Sale
// ==========================================

const getSale = async (req, res) => {
  try {
    const sale =
      await salesService.getSaleById(
        req.params.id
      );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "বিক্রয়ের তথ্য পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error(
      "Get Sale Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "বিক্রয়ের তথ্য লোড করা যায়নি",
      error: error.message,
    });
  }
};

// ==========================================
// Create Sale
// ==========================================

const createSale = async (req, res) => {
  try {
    const sale =
      await salesService.createSale(
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "বিক্রয় সফলভাবে সম্পন্ন হয়েছে",
      data: sale,
    });
  } catch (error) {
    console.error(
      "Create Sale Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Delete Sale
// ==========================================

const deleteSale = async (req, res) => {
  try {
    const deleted =
      await salesService.deleteSale(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "বিক্রয়ের তথ্য পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "বিক্রয় সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error) {
    console.error(
      "Delete Sale Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Export
// ==========================================

module.exports = {
  getSales,
  getSale,
  createSale,
  deleteSale,
};