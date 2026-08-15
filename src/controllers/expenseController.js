const expenseService = require("../services/expenseService");

// ======================================================
// Get All Expenses
// ======================================================

const getExpenses = async (req, res) => {
  try {
    const expenses =
      await expenseService.getExpenses();

    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error(
      "Get Expenses Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Expense data load করা যায়নি",
      error: error.message,
    });
  }
};

// ======================================================
// Get Single Expense
// ======================================================

const getExpenseById = async (
  req,
  res
) => {
  try {
    const expense =
      await expenseService.getExpenseById(
        req.params.id
      );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message:
          "Expense পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error(
      "Get Expense Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Expense load করা যায়নি",
      error: error.message,
    });
  }
};

// ======================================================
// Create Expense
// ======================================================

const createExpense = async (
  req,
  res
) => {
  try {
    const expense =
      await expenseService.createExpense(
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "Expense সফলভাবে যোগ হয়েছে",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Create Expense Error:",
      error
    );

    res.status(400).json({
      success: false,
      message:
        error.message ||
        "Expense যোগ করা যায়নি",
    });
  }
};

// ======================================================
// Update Expense
// ======================================================

const updateExpense = async (
  req,
  res
) => {
  try {
    const expense =
      await expenseService.updateExpense(
        req.params.id,
        req.body
      );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message:
          "Expense পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Expense সফলভাবে update হয়েছে",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Update Expense Error:",
      error
    );

    res.status(400).json({
      success: false,
      message:
        error.message ||
        "Expense update করা যায়নি",
    });
  }
};

// ======================================================
// Delete Expense
// ======================================================

const deleteExpense = async (
  req,
  res
) => {
  try {
    const deleted =
      await expenseService.deleteExpense(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Expense পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Expense delete হয়েছে",
    });
  } catch (error) {
    console.error(
      "Delete Expense Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Expense delete করা যায়নি",
      error: error.message,
    });
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};