const { getDB } = require("../config/db");

const SALE_COLLECTION = "sales";
const PURCHASE_COLLECTION = "purchases";
const EXPENSE_COLLECTION = "expenses";
const CUSTOMER_DUE_PAYMENTS = "customerDuePayments";

const buildDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate || endDate) {
    filter.$gte = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(0);
    filter.$lte = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();
  }
  return Object.keys(filter).length > 0 ? filter : null;
};

/**
 * Sales Summary & Accurate Profit Calculation
 */
const getSalesSummary = async (db, dateFilter) => {
  const matchStage = dateFilter ? { saleDate: dateFilter } : {};

  const result = await db.collection(SALE_COLLECTION).aggregate([
    { $match: matchStage },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        categoryName: {
          $toLower: {
            $concat: [
              { $ifNull: ["$items.categoryName", ""] },
              " ",
              { $ifNull: ["$items.productName", ""] },
              " ",
              { $ifNull: ["$productInfo.categoryName", ""] }
            ]
          }
        },
        unit: "$items.unit",
        quantity: { $ifNull: ["$items.quantity", 0] },
        weight: { $ifNull: ["$items.weight", 0] },
        totalAmount: { $ifNull: ["$items.totalAmount", 0] },
        buyingPrice: { $ifNull: ["$productInfo.buyingPrice", 0] },
      },
    },
    {
      $addFields: {
        // পোল্ট্রির জন্য (Weight * BuyingPrice), অন্যদের জন্য (Quantity * BuyingPrice)
        costAmount: {
          $cond: [
            { $eq: ["$unit", "কেজি + পিস"] },
            { $multiply: ["$weight", "$buyingPrice"] },
            { $multiply: ["$quantity", "$buyingPrice"] },
          ],
        },
      },
    },
    {
      $addFields: {
        profit: { $subtract: ["$totalAmount", "$costAmount"] },
      },
    },
    {
      $group: {
        _id: null,
        allItems: {
          $push: {
            categoryName: "$categoryName",
            unit: "$unit",
            quantity: "$quantity",
            weight: "$weight",
            totalAmount: "$totalAmount",
            profit: "$profit",
          },
        },
      },
    },
  ]).toArray();

  const salesSummary = {
    chicken: { quantity: 0, totalAmount: 0, profit: 0 },
    egg: { quantity: 0, totalAmount: 0, profit: 0 },
    spice: { quantity: 0, totalAmount: 0, profit: 0 },
  };

  if (!result.length) return salesSummary;

  result[0].allItems.forEach((item) => {
    const cat = item.categoryName;
    const qty = item.unit === "কেজি + পিস" ? item.weight : item.quantity;
    
    let targetKey = "spice";

    // চিকেন/পোল্ট্রি সনাক্তকরণ
    if (cat.includes("chicken") || cat.includes("murgi") || cat.includes("মুরগি") || cat.includes("poultry") || cat.includes("broiler")) {
      targetKey = "chicken";
    } 
    // ডিম সনাক্তকরণ
    else if (cat.includes("egg") || cat.includes("dim") || cat.includes("ডিম")) {
      targetKey = "egg";
    }

    salesSummary[targetKey].quantity += qty;
    salesSummary[targetKey].totalAmount += item.totalAmount;
    salesSummary[targetKey].profit += item.profit;
  });

  // ২ দশমিক স্থান পর্যন্ত রাউন্ড সংখ্যা নিশ্চিতকরণ
  Object.keys(salesSummary).forEach((key) => {
    salesSummary[key].quantity = Number(salesSummary[key].quantity.toFixed(2));
    salesSummary[key].totalAmount = Number(salesSummary[key].totalAmount.toFixed(2));
    salesSummary[key].profit = Number(salesSummary[key].profit.toFixed(2));
  });

  return salesSummary;
};

/**
 * Purchases Summary
 */
const getPurchaseSummary = async (db, dateFilter) => {
  const matchStage = dateFilter ? { purchaseDate: dateFilter } : {};

  const result = await db.collection(PURCHASE_COLLECTION).aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$totalAmount" },
        items: {
          $push: {
            productName: "$productName",
            quantity: "$quantity",
            weight: "$weight",
            pieces: "$pieces",
            unit: "$unit",
            totalAmount: "$totalAmount",
          },
        },
      },
    },
  ]).toArray();

  if (!result.length) return { totalAmount: 0, items: [] };

  return {
    totalAmount: Number(result[0].totalAmount.toFixed(2)),
    items: result[0].items,
  };
};

/**
 * Customer Due Collections
 */
const getDuePaymentsSummary = async (db, dateFilter) => {
  const matchStage = dateFilter ? { paymentDate: dateFilter } : {};

  const result = await db.collection(CUSTOMER_DUE_PAYMENTS).aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCollected: { $sum: "$paymentAmount" },
      },
    },
  ]).toArray();

  return result.length > 0 ? Number(result[0].totalCollected.toFixed(2)) : 0;
};

/**
 * Expenses Summary
 */
const getExpenseSummary = async (db, dateFilter) => {
  const matchStage = dateFilter ? { expenseDate: dateFilter } : {};

  const result = await db.collection(EXPENSE_COLLECTION).aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalExpense: { $sum: "$amount" },
      },
    },
  ]).toArray();

  return result.length > 0 ? Number(result[0].totalExpense.toFixed(2)) : 0;
};

/**
 * Main Controller Function
 */
const generateReportSummary = async (startDate, endDate) => {
  const db = getDB();
  const dateFilter = buildDateFilter(startDate, endDate);

  const [sales, purchases, duePaymentsCollected, totalExpense] = await Promise.all([
    getSalesSummary(db, dateFilter),
    getPurchaseSummary(db, dateFilter),
    getDuePaymentsSummary(db, dateFilter),
    getExpenseSummary(db, dateFilter),
  ]);

  return {
    sales,
    purchases,
    duePaymentsCollected,
    totalExpense,
  };
};

module.exports = {
  generateReportSummary,
};