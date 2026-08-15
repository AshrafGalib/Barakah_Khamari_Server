
const customerService = require("../services/customerService");

// ======================================================
// Get All Customers
// ======================================================

const getCustomers = async (req, res) => {
  try {
    const customers =
      await customerService.getCustomers();

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error(
      "Get Customers Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Customers load করা যায়নি",
    });
  }
};

// ======================================================
// Get Customer By ID
// ======================================================

const getCustomerById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const customer =
      await customerService.getCustomerById(
        id
      );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer পাওয়া যায়নি",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error(
      "Get Customer By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Customer load করা যায়নি",
    });
  }
};

// ======================================================
// Create Customer
// ======================================================

const createCustomer = async (
  req,
  res
) => {
  try {
    const customer =
      await customerService.createCustomer(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        "Customer তৈরি হয়েছে",
      data: customer,
    });
  } catch (error) {
    console.error(
      "Create Customer Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Customer তৈরি করা যায়নি",
    });
  }
};

// ======================================================
// Update Customer
// ======================================================

const updateCustomer = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const customer =
      await customerService.updateCustomer(
        id,
        req.body
      );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer পাওয়া যায়নি",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Customer update হয়েছে",
      data: customer,
    });
  } catch (error) {
    console.error(
      "Update Customer Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Customer update করা যায়নি",
    });
  }
};

// ======================================================
// Pay Customer Due
// ======================================================
//
// Customer page থেকে Due Payment করলে:
//
// Customer:
// paidAmount ↑
// dueAmount ↓
//
// Sales:
// paidAmount ↑
// dueAmount ↓
//
// Cash Balance:
// cashSales ↑
//
// Dashboard:
// Sales paid/due automatically update
//
// ======================================================

const payCustomerDue = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // ==============================================
    // Support both:
    //
    // { amount: 500 }
    //
    // and
    //
    // { paymentAmount: 500 }
    // ==============================================

    const amount =
      req.body?.amount ??
      req.body?.paymentAmount;

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

    const paymentAmount =
      Number(amount);

    if (
      !Number.isFinite(
        paymentAmount
      ) ||
      paymentAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "সঠিক Payment amount দিতে হবে",
      });
    }

    // ==============================================
    // Call Service
    // ==============================================

    const customer =
      await customerService.payCustomerDue(
        id,
        {
          amount:
            paymentAmount,
        }
      );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer পাওয়া যায়নি",
      });
    }

    // ==============================================
    // Success
    // ==============================================

    return res.status(200).json({
      success: true,
      message:
        "Customer Due Payment সফল হয়েছে",
      data: customer,
    });
  } catch (error) {
    console.error(
      "Pay Customer Due Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Customer Due Payment করা যায়নি",
    });
  }
};

// ======================================================
// Delete Customer
// ======================================================

const deleteCustomer = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const deleted =
      await customerService.deleteCustomer(
        id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Customer পাওয়া যায়নি",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Customer delete হয়েছে",
    });
  } catch (error) {
    console.error(
      "Delete Customer Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Customer delete করা যায়নি",
    });
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  payCustomerDue,
  deleteCustomer,
};