const supplierService = require("../services/supplierService");

// =====================================
// সব Supplier
// =====================================

const getSuppliers = async (req, res) => {
  try {
    const suppliers =
      await supplierService.getSuppliers();

    res.status(200).json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("Get Suppliers Error:", error);

    res.status(500).json({
      success: false,
      message:
        "সরবরাহকারীর তালিকা লোড করা যায়নি",
      error: error.message,
    });
  }
};

// =====================================
// একটি Supplier
// =====================================

const getSupplier = async (req, res) => {
  try {
    const supplier =
      await supplierService.getSupplierById(
        req.params.id
      );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message:
          "সরবরাহকারী পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error(
      "Get Supplier Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "সরবরাহকারীর তথ্য লোড করা যায়নি",
      error: error.message,
    });
  }
};

// =====================================
// Supplier তৈরি
// =====================================

const createSupplier = async (
  req,
  res
) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "সরবরাহকারী/খামারের নাম আবশ্যক",
      });
    }

    const supplier =
      await supplierService.createSupplier(
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "সরবরাহকারী সফলভাবে যোগ হয়েছে",
      data: supplier,
    });
  } catch (error) {
    console.error(
      "Create Supplier Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Supplier Update
// =====================================

const updateSupplier = async (
  req,
  res
) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "সরবরাহকারী/খামারের নাম আবশ্যক",
      });
    }

    const supplier =
      await supplierService.updateSupplier(
        req.params.id,
        req.body
      );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message:
          "সরবরাহকারী পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "সরবরাহকারীর তথ্য সফলভাবে পরিবর্তন হয়েছে",
      data: supplier,
    });
  } catch (error) {
    console.error(
      "Update Supplier Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Supplier Delete
// =====================================

const deleteSupplier = async (
  req,
  res
) => {
  try {
    const deleted =
      await supplierService.deleteSupplier(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "সরবরাহকারী পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "সরবরাহকারী সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error) {
    console.error(
      "Delete Supplier Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Supplier Due Summary
// =====================================

const getSupplierDue = async (
  req,
  res
) => {
  try {
    const due =
      await supplierService.getSupplierDue(
        req.params.id
      );

    if (!due) {
      return res.status(404).json({
        success: false,
        message:
          "সরবরাহকারী পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      data: due,
    });
  } catch (error) {
    console.error(
      "Get Supplier Due Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "সরবরাহকারীর Due load করা যায়নি",
      error: error.message,
    });
  }
};

// =====================================
// Supplier Due Payment
// =====================================

const paySupplierDue = async (
  req,
  res
) => {
  try {
    const {
      amount,
      paymentMethod,
      date,
      notes,
    } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount দিতে হবে",
      });
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "সঠিক payment amount দিতে হবে",
      });
    }

    const payment =
      await supplierService.paySupplierDue({
        supplierId:
          req.params.id,

        amount:
          numericAmount,

        paymentMethod,

        date,

        notes,
      });

    res.status(201).json({
      success: true,
      message:
        "Supplier Due সফলভাবে পরিশোধ করা হয়েছে",
      data: payment,
    });
  } catch (error) {
    console.error(
      "Pay Supplier Due Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Supplier Payment History
// =====================================

const getSupplierPaymentHistory =
  async (req, res) => {
    try {
      const payments =
        await supplierService.getSupplierPaymentHistory(
          req.params.id
        );

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error(
        "Get Supplier Payment History Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Supplier payment history load করা যায়নি",
        error: error.message,
      });
    }
  };

// =====================================
// Export
// =====================================

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,

  getSupplierDue,
  paySupplierDue,
  getSupplierPaymentHistory,
};