const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const {
  updateExpenses,
  getBangladeshDateString,
} = require("./cashBalanceService");

const EXPENSE_COLLECTION = "expenses";

// ======================================================
// Helper: Number
// ======================================================

const toNumber = (value, defaultValue = 0) => {
  if (
    value === "" ||
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error("Numeric value সঠিক নয়");
  }

  return number;
};

// ======================================================
// Helper: Expense Date
// ======================================================

const parseExpenseDate = (value) => {
  if (!value) {
    return new Date();
  }

  // YYYY-MM-DD
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const [year, month, day] =
      value.split("-").map(Number);

    const date = new Date(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0
    );

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        "Expense Date সঠিক নয়"
      );
    }

    return date;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Expense Date সঠিক নয়"
    );
  }

  return date;
};

// ======================================================
// Helper: Bangladesh Expense Date
//
// Expense Date থেকে YYYY-MM-DD বের করবে
// Asia/Dhaka timezone অনুযায়ী
// ======================================================

const getExpenseBalanceDate = (date) => {
  return getBangladeshDateString(date);
};

// ======================================================
// Get All Expenses
// ======================================================

const getExpenses = async () => {
  const db = getDB();

  return await db
    .collection(EXPENSE_COLLECTION)
    .find({})
    .sort({
      expenseDate: -1,
      createdAt: -1,
    })
    .toArray();
};

// ======================================================
// Get Single Expense
// ======================================================

const getExpenseById = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  return await db
    .collection(EXPENSE_COLLECTION)
    .findOne({
      _id: new ObjectId(id),
    });
};

// ======================================================
// Create Expense
// ======================================================

const createExpense = async (expenseData) => {
  const db = getDB();

  const {
    title,
    category,
    amount,
    expenseDate,
    notes,
  } = expenseData;

  // ====================================================
  // Title
  // ====================================================

  const finalTitle =
    title?.trim() || "";

  if (!finalTitle) {
    throw new Error(
      "Expense Title দিতে হবে"
    );
  }

  // ====================================================
  // Category
  // ====================================================

  const finalCategory =
    category?.trim() || "অন্যান্য";

  // ====================================================
  // Amount
  // ====================================================

  const finalAmount =
    toNumber(amount);

  if (finalAmount <= 0) {
    throw new Error(
      "Expense Amount 0-এর বেশি হতে হবে"
    );
  }

  // ====================================================
  // Expense Date
  // ====================================================

  const finalExpenseDate =
    parseExpenseDate(expenseDate);

  const balanceDate =
    getExpenseBalanceDate(
      finalExpenseDate
    );

  // ====================================================
  // Notes
  // ====================================================

  const finalNotes =
    notes?.trim() || "";

  // ====================================================
  // Document
  // ====================================================

  const now = new Date();

  const finalAmountNumber =
    Number(
      finalAmount.toFixed(2)
    );

  const expense = {
    title: finalTitle,

    category: finalCategory,

    amount: finalAmountNumber,

    expenseDate:
      finalExpenseDate,

    notes: finalNotes,

    createdAt: now,

    updatedAt: now,
  };

  // ====================================================
  // Insert Expense
  // ====================================================

  const result =
    await db
      .collection(EXPENSE_COLLECTION)
      .insertOne(expense);

  // ====================================================
  // Update Cash Balance
  //
  // Expense = Cash Outflow
  //
  // cashBalances.expenses += amount
  // closingBalance -= amount
  // ====================================================

  try {
    await updateExpenses(
      balanceDate,
      finalAmountNumber
    );
  } catch (error) {
    // Expense insert rollback
    await db
      .collection(EXPENSE_COLLECTION)
      .deleteOne({
        _id: result.insertedId,
      });

    throw error;
  }

  return {
    _id: result.insertedId,
    ...expense,
  };
};

// ======================================================
// Update Expense
// ======================================================

const updateExpense = async (
  id,
  expenseData
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  // ====================================================
  // Existing Expense
  // ====================================================

  const existingExpense =
    await db
      .collection(EXPENSE_COLLECTION)
      .findOne({
        _id: new ObjectId(id),
      });

  if (!existingExpense) {
    return null;
  }

  // ====================================================
  // Data
  // ====================================================

  const {
    title,
    category,
    amount,
    expenseDate,
    notes,
  } = expenseData;

  // ====================================================
  // Title
  // ====================================================

  const finalTitle =
    title?.trim() || "";

  if (!finalTitle) {
    throw new Error(
      "Expense Title দিতে হবে"
    );
  }

  // ====================================================
  // Category
  // ====================================================

  const finalCategory =
    category?.trim() || "অন্যান্য";

  // ====================================================
  // Amount
  // ====================================================

  const finalAmount =
    toNumber(amount);

  if (finalAmount <= 0) {
    throw new Error(
      "Expense Amount 0-এর বেশি হতে হবে"
    );
  }

  const finalAmountNumber =
    Number(
      finalAmount.toFixed(2)
    );

  // ====================================================
  // Date
  // ====================================================

  const finalExpenseDate =
    parseExpenseDate(expenseDate);

  // ====================================================
  // Old Expense Information
  // ====================================================

  const oldAmount =
    toNumber(
      existingExpense.amount
    );

  const oldExpenseDate =
    parseExpenseDate(
      existingExpense.expenseDate
    );

  const oldBalanceDate =
    getExpenseBalanceDate(
      oldExpenseDate
    );

  const newBalanceDate =
    getExpenseBalanceDate(
      finalExpenseDate
    );

  // ====================================================
  // Update Expense Document
  // ====================================================

  await db
    .collection(EXPENSE_COLLECTION)
    .updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          title: finalTitle,

          category:
            finalCategory,

          amount:
            finalAmountNumber,

          expenseDate:
            finalExpenseDate,

          notes:
            notes?.trim() || "",

          updatedAt:
            new Date(),
        },
      }
    );

  // ====================================================
  // Update Cash Balance
  // ====================================================

  try {
    // ==================================================
    // Same Date
    //
    // Example:
    //
    // Old = 500
    // New = 700
    //
    // Difference = +200
    //
    // Cash expense increases by 200
    // ==================================================

    if (
      oldBalanceDate ===
      newBalanceDate
    ) {
      const difference =
        finalAmountNumber -
        oldAmount;

      if (difference !== 0) {
        await updateExpenses(
          newBalanceDate,
          difference
        );
      }
    }

    // ==================================================
    // Date Changed
    //
    // Old date থেকে old expense remove
    // New date-এ new expense add
    // ==================================================

    else {
      // Old date-এর expense ফেরত
      await updateExpenses(
        oldBalanceDate,
        -oldAmount
      );

      // New date-এ নতুন expense
      await updateExpenses(
        newBalanceDate,
        finalAmountNumber
      );
    }
  } catch (error) {
    // ==================================================
    // Cash Balance update failed
    //
    // Expense document rollback
    // ==================================================

    await db
      .collection(EXPENSE_COLLECTION)
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            title:
              existingExpense.title,

            category:
              existingExpense.category,

            amount:
              existingExpense.amount,

            expenseDate:
              existingExpense.expenseDate,

            notes:
              existingExpense.notes || "",

            updatedAt:
              new Date(),
          },
        }
      );

    throw error;
  }

  return await getExpenseById(id);
};

// ======================================================
// Delete Expense
// ======================================================

const deleteExpense = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  // ====================================================
  // Find Existing Expense
  // ====================================================

  const existingExpense =
    await db
      .collection(EXPENSE_COLLECTION)
      .findOne({
        _id: new ObjectId(id),
      });

  if (!existingExpense) {
    return null;
  }

  // ====================================================
  // Existing Amount
  // ====================================================

  const oldAmount =
    toNumber(
      existingExpense.amount
    );

  // ====================================================
  // Existing Expense Date
  // ====================================================

  const oldExpenseDate =
    parseExpenseDate(
      existingExpense.expenseDate
    );

  const balanceDate =
    getExpenseBalanceDate(
      oldExpenseDate
    );

  // ====================================================
  // Delete Expense
  // ====================================================

  const result =
    await db
      .collection(EXPENSE_COLLECTION)
      .deleteOne({
        _id: new ObjectId(id),
      });

  if (result.deletedCount === 0) {
    return null;
  }

  // ====================================================
  // Restore Cash Balance
  //
  // Deleted expense means cash should increase back
  // ====================================================

  try {
    if (oldAmount !== 0) {
      await updateExpenses(
        balanceDate,
        -oldAmount
      );
    }
  } catch (error) {
    // ==================================================
    // Cash Balance update failed
    //
    // Restore expense document
    // ==================================================

    await db
      .collection(EXPENSE_COLLECTION)
      .insertOne(existingExpense);

    throw error;
  }

  return true;
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