const { getDB } = require("../config/db");

// ======================================================
// Collections
// ======================================================

const SALES_COLLECTION = "sales";
const PURCHASES_COLLECTION = "purchases";
const PRODUCTS_COLLECTION = "products";
const CUSTOMERS_COLLECTION = "customers";
const EXPENSES_COLLECTION = "expenses";
const CASH_BALANCES_COLLECTION = "cashBalances";

// ======================================================
// Bangladesh Date
// ======================================================

const getBangladeshDateString = (
  date = new Date()
) => {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
};

// ======================================================
// Safe Number
// ======================================================

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

// ======================================================
// Create Bangladesh Date
// ======================================================

const createBangladeshDate = (
  dateString
) => {
  return new Date(
    `${dateString}T12:00:00+06:00`
  );
};

// ======================================================
// Date Range
// ======================================================

const getDateRange = (
  filter = "today",
  customFrom,
  customTo
) => {
  const today =
    getBangladeshDateString();

  // ----------------------------------------------------
  // Today
  // ----------------------------------------------------

  if (filter === "today") {
    return {
      from: today,
      to: today,
    };
  }

  // ----------------------------------------------------
  // Yesterday
  // ----------------------------------------------------

  if (filter === "yesterday") {
    const date =
      createBangladeshDate(today);

    date.setDate(
      date.getDate() - 1
    );

    const result =
      getBangladeshDateString(date);

    return {
      from: result,
      to: result,
    };
  }

  // ----------------------------------------------------
  // Previous 2 Days
  // ----------------------------------------------------

  if (filter === "previous2") {
    const date =
      createBangladeshDate(today);

    date.setDate(
      date.getDate() - 1
    );

    return {
      from:
        getBangladeshDateString(date),

      to: today,
    };
  }

  // ----------------------------------------------------
  // Previous 7 Days
  // ----------------------------------------------------

  if (filter === "previous7") {
    const date =
      createBangladeshDate(today);

    date.setDate(
      date.getDate() - 6
    );

    return {
      from:
        getBangladeshDateString(date),

      to: today,
    };
  }

  // ----------------------------------------------------
  // Previous 30 Days
  // ----------------------------------------------------

  if (filter === "previous30") {
    const date =
      createBangladeshDate(today);

    date.setDate(
      date.getDate() - 29
    );

    return {
      from:
        getBangladeshDateString(date),

      to: today,
    };
  }

  // ----------------------------------------------------
  // Custom
  // ----------------------------------------------------

  if (
    filter === "custom" &&
    customFrom &&
    customTo
  ) {
    return {
      from: customFrom,
      to: customTo,
    };
  }

  // ----------------------------------------------------
  // Default
  // ----------------------------------------------------

  return {
    from: today,
    to: today,
  };
};

// ======================================================
// Mongo Date Range
// ======================================================

const createMongoDateRange = (
  from,
  to
) => {
  return {
    $gte: new Date(
      `${from}T00:00:00+06:00`
    ),

    $lte: new Date(
      `${to}T23:59:59.999+06:00`
    ),
  };
};

// ======================================================
// Previous Bangladesh Date
//
// Example:
// 2026-08-15 → 2026-08-14
// ======================================================

const getPreviousBangladeshDateString = (
  date
) => {
  if (
    !date ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return null;
  }

  const [year, month, day] =
    date.split("-").map(Number);

  const previousDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day - 1
    )
  );

  return previousDate
    .toISOString()
    .slice(0, 10);
};

// ======================================================
// Get Opening Balance Information
//
// IMPORTANT:
//
// Today's opening balance can come from:
//
// 1. Manually entered first-day opening balance
// 2. Previous day's closing balance
//
// Therefore we do NOT simply check whether today's
// cashBalances document exists.
//
// Example:
//
// First day:
// opening = 5000
//
// End of day:
// closing = 6500
//
// Next day:
// opening = 6500
//
// The next day should NOT show the first-time
// opening balance modal again.
// ======================================================

const getOpeningBalanceInfo = async (
  db,
  date
) => {
  const balance =
    await db
      .collection(
        CASH_BALANCES_COLLECTION
      )
      .findOne({
        date,
      });

  // ----------------------------------------------------
  // Current day's balance does not exist
  // ----------------------------------------------------

  if (!balance) {
    const previousDate =
      getPreviousBangladeshDateString(
        date
      );

    // --------------------------------------------------
    // Check previous day's balance
    // --------------------------------------------------

    if (previousDate) {
      const previousBalance =
        await db
          .collection(
            CASH_BALANCES_COLLECTION
          )
          .findOne({
            date: previousDate,
          });

      if (previousBalance) {
        return {
          openingBalance: toNumber(
            previousBalance.closingBalance
          ),

          openingBalanceSet: true,

          openingBalanceSource:
            "previousDayClosing",
        };
      }
    }

    // --------------------------------------------------
    // First ever opening balance
    // --------------------------------------------------

    return {
      openingBalance: 0,

      openingBalanceSet: false,

      openingBalanceSource:
        "firstTime",
    };
  }

  // ----------------------------------------------------
  // Current day's balance exists
  // ----------------------------------------------------

  const openingBalance =
    toNumber(
      balance.openingBalance
    );

  // ----------------------------------------------------
  // Check previous day
  // ----------------------------------------------------

  const previousDate =
    getPreviousBangladeshDateString(
      date
    );

  let previousBalance = null;

  if (previousDate) {
    previousBalance =
      await db
        .collection(
          CASH_BALANCES_COLLECTION
        )
        .findOne({
          date: previousDate,
        });
  }

  // ----------------------------------------------------
  // If previous day exists, today's opening balance
  // is automatically carried forward.
  // ----------------------------------------------------

  if (previousBalance) {
    return {
      openingBalance,

      openingBalanceSet: true,

      openingBalanceSource:
        "previousDayClosing",
    };
  }

  // ----------------------------------------------------
  // No previous day
  //
  // Therefore this is the first cash-balance day.
  //
  // If openingBalance > 0, it was manually entered.
  // ----------------------------------------------------

  if (openingBalance > 0) {
    return {
      openingBalance,

      openingBalanceSet: true,

      openingBalanceSource:
        "manual",
    };
  }

  // ----------------------------------------------------
  // No previous day + zero opening balance
  //
  // Treat as first-time setup.
  // ----------------------------------------------------

  return {
    openingBalance: 0,

    openingBalanceSet: false,

    openingBalanceSource:
      "firstTime",
  };
};

// ======================================================
// SALES SUMMARY
// ======================================================

const getSalesSummary = async (
  db,
  mongoDateRange
) => {
  const result =
    await db
      .collection(
        SALES_COLLECTION
      )
      .aggregate([
        {
          $match: {
            saleDate:
              mongoDateRange,
          },
        },

        {
          $group: {
            _id: null,

            totalSales: {
              $sum: {
                $convert: {
                  input:
                    "$totalAmount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },

            totalPaid: {
              $sum: {
                $convert: {
                  input:
                    "$paidAmount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },

            totalDue: {
              $sum: {
                $convert: {
                  input:
                    "$dueAmount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },

            totalTransactions: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

  return {
    totalSales: toNumber(
      result[0]?.totalSales
    ),

    totalPaid: toNumber(
      result[0]?.totalPaid
    ),

    totalDue: toNumber(
      result[0]?.totalDue
    ),

    totalTransactions:
      toNumber(
        result[0]?.totalTransactions
      ),
  };
};

// ======================================================
// CHICKEN SOLD
// ======================================================

const getChickenSold = async (
  db,
  mongoDateRange
) => {
  const result =
    await db
      .collection(
        SALES_COLLECTION
      )
      .aggregate([
        {
          $match: {
            saleDate:
              mongoDateRange,
          },
        },

        {
          $unwind: "$items",
        },

        {
          $match: {
            "items.pieces": {
              $exists: true,
              $ne: null,
            },
          },
        },

        {
          $group: {
            _id: null,

            totalChickenPieces: {
              $sum: {
                $convert: {
                  input:
                    "$items.pieces",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },

            totalChickenWeight: {
              $sum: {
                $convert: {
                  input:
                    "$items.weight",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },
          },
        },
      ])
      .toArray();

  return {
    totalChickenPieces:
      toNumber(
        result[0]
          ?.totalChickenPieces
      ),

    totalChickenWeight:
      toNumber(
        result[0]
          ?.totalChickenWeight
      ),
  };
};

// ======================================================
// PURCHASE SUMMARY
// ======================================================

const getPurchaseSummary = async (
  db,
  mongoDateRange
) => {
  const result =
    await db
      .collection(
        PURCHASES_COLLECTION
      )
      .aggregate([
        {
          $match: {
            purchaseDate:
              mongoDateRange,
          },
        },

        {
          $group: {
            _id: null,

            totalPurchase: {
              $sum: {
                $convert: {
                  input:
                    "$totalAmount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },

            totalPaid: {
              $sum: {
                $convert: {
                  input:
                    "$paidAmount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },

            totalDue: {
              $sum: {
                $convert: {
                  input:
                    "$dueAmount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },

            totalTransactions: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

  return {
    totalPurchase: toNumber(
      result[0]?.totalPurchase
    ),

    totalPurchasePaid:
      toNumber(
        result[0]?.totalPaid
      ),

    totalPurchaseDue:
      toNumber(
        result[0]?.totalDue
      ),

    totalPurchaseTransactions:
      toNumber(
        result[0]
          ?.totalTransactions
      ),
  };
};

// ======================================================
// EXPENSE SUMMARY
// ======================================================

const getExpenseSummary = async (
  db,
  mongoDateRange
) => {
  const result =
    await db
      .collection(
        EXPENSES_COLLECTION
      )
      .aggregate([
        {
          $match: {
            expenseDate:
              mongoDateRange,
          },
        },

        {
          $group: {
            _id: null,

            totalExpense: {
              $sum: {
                $convert: {
                  input:
                    "$amount",
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
            },

            totalTransactions: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

  return {
    totalExpense: toNumber(
      result[0]?.totalExpense
    ),

    totalExpenseTransactions:
      toNumber(
        result[0]
          ?.totalTransactions
      ),
  };
};

// ======================================================
// SALES LAST 30 DAYS
// ======================================================

const getSalesLast30Days = async (
  db
) => {
  const today =
    getBangladeshDateString();

  const startDate =
    createBangladeshDate(today);

  startDate.setDate(
    startDate.getDate() - 29
  );

  const fromDate =
    getBangladeshDateString(
      startDate
    );

  const mongoRange =
    createMongoDateRange(
      fromDate,
      today
    );

  const result =
    await db
      .collection(
        SALES_COLLECTION
      )
      .aggregate([
        {
          $match: {
            saleDate:
              mongoRange,
          },
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  "%Y-%m-%d",

                date:
                  "$saleDate",

                timezone:
                  "Asia/Dhaka",
              },
            },

            sales: {
              $sum: {
                $convert: {
                  input:
                    "$totalAmount",

                  to: "double",

                  onError: 0,

                  onNull: 0,
                },
              },
            },

            paid: {
              $sum: {
                $convert: {
                  input:
                    "$paidAmount",

                  to: "double",

                  onError: 0,

                  onNull: 0,
                },
              },
            },

            due: {
              $sum: {
                $convert: {
                  input:
                    "$dueAmount",

                  to: "double",

                  onError: 0,

                  onNull: 0,
                },
              },
            },

            transactions: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray();

  const resultMap =
    new Map();

  result.forEach((item) => {
    resultMap.set(
      item._id,
      {
        date: item._id,

        sales: Number(
          toNumber(
            item.sales
          ).toFixed(2)
        ),

        paid: Number(
          toNumber(
            item.paid
          ).toFixed(2)
        ),

        due: Number(
          toNumber(
            item.due
          ).toFixed(2)
        ),

        transactions:
          toNumber(
            item.transactions
          ),
      }
    );
  });

  const salesLast30Days = [];

  for (
    let i = 0;
    i < 30;
    i++
  ) {
    const date =
      createBangladeshDate(
        fromDate
      );

    date.setDate(
      date.getDate() + i
    );

    const dateString =
      getBangladeshDateString(
        date
      );

    salesLast30Days.push(
      resultMap.get(
        dateString
      ) || {
        date: dateString,
        sales: 0,
        paid: 0,
        due: 0,
        transactions: 0,
      }
    );
  }

  return salesLast30Days;
};

// ======================================================
// CASH FLOW SUMMARY
// ======================================================
//
// Customer due payment is real cash inflow.
//
// cashBalances.cashSales includes:
//
// 1. Normal cash sale
// 2. Customer due payment
//
// ======================================================

const getCashFlowSummary = async (
  db,
  dateRange
) => {
  const result =
    await db
      .collection(
        CASH_BALANCES_COLLECTION
      )
      .aggregate([
        {
          $match: {
            date: {
              $gte:
                dateRange.from,

              $lte:
                dateRange.to,
            },
          },
        },

        {
          $group: {
            _id: null,

            // ------------------------------------------
            // Cash In
            // ------------------------------------------

            cashIn: {
              $sum: {
                $convert: {
                  input:
                    "$cashSales",

                  to: "double",

                  onError: 0,

                  onNull: 0,
                },
              },
            },

            // ------------------------------------------
            // Cash Purchases
            // ------------------------------------------

            cashPurchases: {
              $sum: {
                $convert: {
                  input:
                    "$cashPurchases",

                  to: "double",

                  onError: 0,

                  onNull: 0,
                },
              },
            },

            // ------------------------------------------
            // Expenses
            // ------------------------------------------

            expenses: {
              $sum: {
                $convert: {
                  input:
                    "$expenses",

                  to: "double",

                  onError: 0,

                  onNull: 0,
                },
              },
            },
          },
        },
      ])
      .toArray();

  return {
    cashIn: toNumber(
      result[0]?.cashIn
    ),

    cashPurchases:
      toNumber(
        result[0]
          ?.cashPurchases
      ),

    expenses: toNumber(
      result[0]?.expenses
    ),
  };
};

// ======================================================
// CUSTOMER SUMMARY
// ======================================================

const getCustomerSummary = async (
  db
) => {
  const totalCustomers =
    await db
      .collection(
        CUSTOMERS_COLLECTION
      )
      .countDocuments();

  const dueResult =
    await db
      .collection(
        CUSTOMERS_COLLECTION
      )
      .aggregate([
        {
          $group: {
            _id: null,

            totalDue: {
              $sum: {
                $convert: {
                  input:
                    "$dueAmount",

                  to: "double",

                  onError: 0,

                  onNull: 0,
                },
              },
            },
          },
        },
      ])
      .toArray();

  return {
    totalCustomers,

    totalCustomerDue:
      toNumber(
        dueResult[0]
          ?.totalDue
      ),
  };
};

// ======================================================
// CHICKEN STOCK
// ======================================================

const getChickenStock = async (
  db
) => {
  return db
    .collection(
      PRODUCTS_COLLECTION
    )
    .find({
      unit: "কেজি + পিস",
    })
    .project({
      name: 1,
      stockPieces: 1,
      totalWeight: 1,
      unit: 1,
    })
    .sort({
      name: 1,
    })
    .toArray();
};

// ======================================================
// RECENT SALES
// ======================================================

const getRecentSales = async (
  db
) => {
  return db
    .collection(
      SALES_COLLECTION
    )
    .find({})
    .sort({
      saleDate: -1,
      createdAt: -1,
    })
    .limit(5)
    .toArray();
};

// ======================================================
// RECENT PURCHASES
// ======================================================

const getRecentPurchases =
  async (db) => {
    return db
      .collection(
        PURCHASES_COLLECTION
      )
      .find({})
      .sort({
        purchaseDate: -1,
        createdAt: -1,
      })
      .limit(5)
      .toArray();
  };

// ======================================================
// RECENT EXPENSES
// ======================================================

const getRecentExpenses =
  async (db) => {
    return db
      .collection(
        EXPENSES_COLLECTION
      )
      .find({})
      .sort({
        expenseDate: -1,
        createdAt: -1,
      })
      .limit(5)
      .toArray();
  };

// ======================================================
// GET DASHBOARD
// ======================================================

const getDashboard = async (
  options = {}
) => {
  const db = getDB();

  const {
    filter = "today",
    fromDate,
    toDate,
  } = options;

  // ====================================================
  // Date Range
  // ====================================================

  const dateRange =
    getDateRange(
      filter,
      fromDate,
      toDate
    );

  const mongoDateRange =
    createMongoDateRange(
      dateRange.from,
      dateRange.to
    );

  // ====================================================
  // Parallel Queries
  // ====================================================

  const [
    sales,
    chickenSold,
    purchases,
    expenses,
    customerSummary,
    chickenStock,
    recentSales,
    recentPurchases,
    recentExpenses,
    salesLast30Days,
    cashFlow,
  ] = await Promise.all([
    getSalesSummary(
      db,
      mongoDateRange
    ),

    getChickenSold(
      db,
      mongoDateRange
    ),

    getPurchaseSummary(
      db,
      mongoDateRange
    ),

    getExpenseSummary(
      db,
      mongoDateRange
    ),

    getCustomerSummary(
      db
    ),

    getChickenStock(
      db
    ),

    getRecentSales(
      db
    ),

    getRecentPurchases(
      db
    ),

    getRecentExpenses(
      db
    ),

    getSalesLast30Days(
      db
    ),

    // Cash flow reads from cashBalances
    // so due payments are included.

    getCashFlowSummary(
      db,
      dateRange
    ),
  ]);

  // ====================================================
  // Opening Balance
  // ====================================================

  let openingBalance = 0;

  let openingBalanceSet =
    true;

  let openingBalanceSource =
    "notApplicable";

  // ----------------------------------------------------
  // Opening balance is relevant for a single day.
  // ----------------------------------------------------

  if (
    dateRange.from ===
    dateRange.to
  ) {
    const openingInfo =
      await getOpeningBalanceInfo(
        db,
        dateRange.from
      );

    openingBalance =
      openingInfo.openingBalance;

    openingBalanceSet =
      openingInfo.openingBalanceSet;

    openingBalanceSource =
      openingInfo.openingBalanceSource;
  }

  // ====================================================
  // Cash Flow
  // ====================================================

  const cashIn =
    cashFlow.cashIn;

  const cashOut =
    cashFlow.cashPurchases +
    cashFlow.expenses;

  const netCashFlow =
    cashIn - cashOut;

  const closingCash =
    openingBalance +
    netCashFlow;

  // ====================================================
  // Return Dashboard
  // ====================================================

  return {
    // --------------------------------------------------
    // Date
    // --------------------------------------------------

    filter,

    fromDate:
      dateRange.from,

    toDate:
      dateRange.to,

    // --------------------------------------------------
    // Sales
    // --------------------------------------------------

    totalSales:
      Number(
        sales.totalSales.toFixed(2)
      ),

    totalPaid:
      Number(
        sales.totalPaid.toFixed(2)
      ),

    totalInvoiceDue:
      Number(
        sales.totalDue.toFixed(2)
      ),

    totalSalesTransactions:
      sales.totalTransactions,

    // --------------------------------------------------
    // Purchases
    // --------------------------------------------------

    totalPurchase:
      Number(
        purchases.totalPurchase.toFixed(
          2
        )
      ),

    totalPurchasePaid:
      Number(
        purchases.totalPurchasePaid.toFixed(
          2
        )
      ),

    totalPurchaseDue:
      Number(
        purchases.totalPurchaseDue.toFixed(
          2
        )
      ),

    totalPurchaseTransactions:
      purchases.totalPurchaseTransactions,

    // --------------------------------------------------
    // Expenses
    // --------------------------------------------------

    totalExpense:
      Number(
        expenses.totalExpense.toFixed(
          2
        )
      ),

    totalExpenseTransactions:
      expenses.totalExpenseTransactions,

    // --------------------------------------------------
    // CASH
    // --------------------------------------------------

    openingBalance:
      Number(
        openingBalance.toFixed(2)
      ),

    // --------------------------------------------------
    // IMPORTANT:
    //
    // Frontend will use this field to decide whether
    // first-time Opening Balance modal should appear.
    //
    // true  = opening balance already configured
    // false = first-time opening balance required
    // --------------------------------------------------

    openingBalanceSet,

    // --------------------------------------------------
    // Useful for debugging / frontend state
    // --------------------------------------------------

    openingBalanceSource,

    // --------------------------------------------------
    // Cash In
    //
    // Includes:
    //
    // 1. Normal cash sales
    // 2. Customer due payments
    //
    // because both are stored in
    // cashBalances.cashSales.
    // --------------------------------------------------

    cashIn:
      Number(
        cashIn.toFixed(2)
      ),

    // --------------------------------------------------
    // Cash Out
    //
    // Includes:
    //
    // 1. Cash purchases
    // 2. Expenses
    // --------------------------------------------------

    cashOut:
      Number(
        cashOut.toFixed(2)
      ),

    // --------------------------------------------------
    // Net Cash Flow
    // --------------------------------------------------

    netCashFlow:
      Number(
        netCashFlow.toFixed(2)
      ),

    // --------------------------------------------------
    // Closing Cash
    // --------------------------------------------------

    closingCash:
      Number(
        closingCash.toFixed(2)
      ),

    // --------------------------------------------------
    // Current Cash Balance
    // --------------------------------------------------

    currentCashBalance:
      Number(
        closingCash.toFixed(2)
      ),

    // --------------------------------------------------
    // Chicken
    // --------------------------------------------------

    totalChickenPieces:
      Number(
        chickenSold.totalChickenPieces
      ),

    totalChickenWeight:
      Number(
        chickenSold.totalChickenWeight.toFixed(
          2
        )
      ),

    // --------------------------------------------------
    // Customers
    // --------------------------------------------------

    totalCustomers:
      customerSummary.totalCustomers,

    totalCustomerDue:
      Number(
        customerSummary.totalCustomerDue.toFixed(
          2
        )
      ),

    // --------------------------------------------------
    // Chicken Stock
    // --------------------------------------------------

    chickenStock,

    // --------------------------------------------------
    // Sales Last 30 Days
    // --------------------------------------------------

    salesLast30Days,

    // --------------------------------------------------
    // Recent
    // --------------------------------------------------

    recentSales,

    recentPurchases,

    recentExpenses,
  };
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getDashboard,
};