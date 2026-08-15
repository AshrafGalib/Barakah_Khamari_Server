const { getDB } = require("../config/db");

const CASH_BALANCES_COLLECTION = "cashBalances";

// ======================================================
// Bangladesh Date
// ======================================================

const getBangladeshDateString = (
  date = new Date()
) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

// ======================================================
// Previous Bangladesh Date
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
// Safe Number
// ======================================================

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

// ======================================================
// Get Previous Closing Balance
// ======================================================

const getPreviousClosingBalance = async (
  date,
  session = null
) => {
  const db = getDB();

  const previousDate =
    getPreviousBangladeshDateString(
      date
    );

  if (!previousDate) {
    return 0;
  }

  const previousBalance =
    await db
      .collection(
        CASH_BALANCES_COLLECTION
      )
      .findOne(
        {
          date: previousDate,
        },
        session
          ? { session }
          : {}
      );

  if (!previousBalance) {
    return 0;
  }

  return toNumber(
    previousBalance.closingBalance
  );
};

// ======================================================
// Get Latest Previous Balance
//
// Used when one or more dates were skipped.
// Example:
//
// Aug 13 closing = 10,000
// Aug 14 no record
// Aug 15 opens
//
// Aug 15 opening should still come from Aug 13.
// ======================================================

const getLatestPreviousClosingBalance = async (
  date,
  session = null
) => {
  const db = getDB();

  const balance =
    await db
      .collection(
        CASH_BALANCES_COLLECTION
      )
      .find(
        {
          date: {
            $lt: date,
          },
        },
        session
          ? { session }
          : {}
      )
      .sort({
        date: -1,
      })
      .limit(1)
      .next();

  if (!balance) {
    return null;
  }

  return toNumber(
    balance.closingBalance
  );
};

// ======================================================
// Get Daily Balance
//
// IMPORTANT:
// If today's document does not exist:
//
// 1. Check previous/latest closing
// 2. Automatically create today's balance
// 3. Opening = previous closing
//
// This prevents the opening modal from appearing
// again on every new Dashboard load.
// ======================================================

const getDailyBalance = async (
  date,
  session = null
) => {
  const db = getDB();

  const collection =
    db.collection(
      CASH_BALANCES_COLLECTION
    );

  // ----------------------------------------------------
  // Existing Day
  // ----------------------------------------------------

  const existing =
    await collection.findOne(
      {
        date,
      },
      session
        ? { session }
        : {}
    );

  if (existing) {
    return existing;
  }

  // ----------------------------------------------------
  // Find previous closing
  // ----------------------------------------------------

  const previousClosingBalance =
    await getLatestPreviousClosingBalance(
      date,
      session
    );

  // ----------------------------------------------------
  // First-ever day
  //
  // Do NOT automatically create 0 here.
  // Dashboard will ask user for opening balance.
  // ----------------------------------------------------

  if (previousClosingBalance === null) {
    return {
      date,
      openingBalance: 0,
      cashSales: 0,
      cashPurchases: 0,
      expenses: 0,
      closingBalance: 0,
      openingBalanceSet: false,
    };
  }

  // ----------------------------------------------------
  // New day after an existing day
  //
  // Automatically carry forward previous closing.
  // ----------------------------------------------------

  const now = new Date();

  const newBalance = {
    date,

    openingBalance:
      previousClosingBalance,

    cashSales: 0,

    cashPurchases: 0,

    expenses: 0,

    closingBalance:
      previousClosingBalance,

    openingBalanceSet: true,

    createdAt: now,

    updatedAt: now,
  };

  await collection.insertOne(
    newBalance,
    session
      ? { session }
      : {}
  );

  return newBalance;
};

// ======================================================
// Check Opening Balance Status
//
// FIRST EVER:
// No cashBalances document exists
// => needsOpeningBalance = true
//
// EXISTING TODAY:
// => false
//
// NEW DAY:
// Previous day exists
// => automatically creates today's balance
// => false
// ======================================================

const getOpeningBalanceStatus = async (
  date,
  session = null
) => {
  const db = getDB();

  const collection =
    db.collection(
      CASH_BALANCES_COLLECTION
    );

  // ----------------------------------------------------
  // Check today's document
  // ----------------------------------------------------

  const todayBalance =
    await collection.findOne(
      {
        date,
      },
      session
        ? { session }
        : {}
    );

  if (todayBalance) {
    return {
      date,

      openingBalanceSet: true,

      needsOpeningBalance: false,

      openingBalance:
        toNumber(
          todayBalance.openingBalance
        ),

      closingBalance:
        toNumber(
          todayBalance.closingBalance
        ),
    };
  }

  // ----------------------------------------------------
  // Check whether ANY previous cash balance exists
  // ----------------------------------------------------

  const previousBalance =
    await collection
      .find(
        {
          date: {
            $lt: date,
          },
        },
        session
          ? { session }
          : {}
      )
      .sort({
        date: -1,
      })
      .limit(1)
      .next();

  // ----------------------------------------------------
  // FIRST EVER DAY
  // ----------------------------------------------------

  if (!previousBalance) {
    return {
      date,

      openingBalanceSet: false,

      needsOpeningBalance: true,

      openingBalance: 0,

      closingBalance: 0,
    };
  }

  // ----------------------------------------------------
  // NEW DAY
  //
  // Automatically carry forward previous closing.
  // ----------------------------------------------------

  const previousClosing =
    toNumber(
      previousBalance.closingBalance
    );

  const now = new Date();

  const newBalance = {
    date,

    openingBalance:
      previousClosing,

    cashSales: 0,

    cashPurchases: 0,

    expenses: 0,

    closingBalance:
      previousClosing,

    openingBalanceSet: true,

    createdAt: now,

    updatedAt: now,
  };

  await collection.insertOne(
    newBalance,
    session
      ? { session }
      : {}
  );

  return {
    date,

    openingBalanceSet: true,

    needsOpeningBalance: false,

    openingBalance:
      previousClosing,

    closingBalance:
      previousClosing,
  };
};

// ======================================================
// Set Opening Balance
// ======================================================

const setOpeningBalance = async (
  options = {}
) => {
  const db = getDB();

  const date =
    options.date ||
    getBangladeshDateString();

  const openingBalance =
    toNumber(
      options.openingBalance
    );

  if (openingBalance < 0) {
    throw new Error(
      "Opening balance negative হতে পারবে না"
    );
  }

  const session =
    options.session || null;

  const collection =
    db.collection(
      CASH_BALANCES_COLLECTION
    );

  // ----------------------------------------------------
  // Check existing day
  // ----------------------------------------------------

  const existing =
    await collection.findOne(
      {
        date,
      },
      session
        ? { session }
        : {}
    );

  // ----------------------------------------------------
  // If existing day has already been explicitly set,
  // do NOT overwrite it accidentally.
  // ----------------------------------------------------

  if (
    existing &&
    existing.openingBalanceSet === true
  ) {
    return existing;
  }

  const cashSales =
    toNumber(
      existing?.cashSales
    );

  const cashPurchases =
    toNumber(
      existing?.cashPurchases
    );

  const expenses =
    toNumber(
      existing?.expenses
    );

  const closingBalance =
    openingBalance +
    cashSales -
    cashPurchases -
    expenses;

  const now = new Date();

  await collection.updateOne(
    {
      date,
    },
    {
      $set: {
        date,

        openingBalance,

        closingBalance,

        openingBalanceSet: true,

        updatedAt: now,
      },

      $setOnInsert: {
        cashSales: 0,

        cashPurchases: 0,

        expenses: 0,

        createdAt: now,
      },
    },
    {
      upsert: true,

      ...(session && {
        session,
      }),
    }
  );

  return collection.findOne(
    {
      date,
    },
    session
      ? { session }
      : {}
  );
};

// ======================================================
// Update Cash Sales
// ======================================================

const updateCashSales = async (
  date,
  amount,
  session = null
) => {
  const db = getDB();

  const cashAmount =
    toNumber(amount);

  if (cashAmount === 0) {
    return getDailyBalance(
      date,
      session
    );
  }

  const existing =
    await getDailyBalance(
      date,
      session
    );

  const openingBalance =
    toNumber(
      existing.openingBalance
    );

  const oldCashSales =
    toNumber(
      existing.cashSales
    );

  const cashPurchases =
    toNumber(
      existing.cashPurchases
    );

  const expenses =
    toNumber(
      existing.expenses
    );

  const newCashSales =
    oldCashSales +
    cashAmount;

  const closingBalance =
    openingBalance +
    newCashSales -
    cashPurchases -
    expenses;

  await db
    .collection(
      CASH_BALANCES_COLLECTION
    )
    .updateOne(
      {
        date,
      },
      {
        $set: {
          date,

          cashSales:
            newCashSales,

          closingBalance,

          openingBalanceSet: true,

          updatedAt:
            new Date(),
        },

        $setOnInsert: {
          openingBalance:
            openingBalance,

          cashPurchases: 0,

          expenses: 0,

          createdAt:
            new Date(),
        },
      },
      {
        upsert: true,

        ...(session && {
          session,
        }),
      }
    );

  return getDailyBalance(
    date,
    session
  );
};

// ======================================================
// Customer Due Payment = CASH IN
// ======================================================

const updateCashDuePayments = async (
  date,
  amount,
  session = null
) => {
  const paymentAmount =
    toNumber(amount);

  if (paymentAmount <= 0) {
    return getDailyBalance(
      date,
      session
    );
  }

  return updateCashSales(
    date,
    paymentAmount,
    session
  );
};

// ======================================================
// Update Cash Purchases
// ======================================================

const updateCashPurchases = async (
  date,
  amount,
  session = null
) => {
  const db = getDB();

  const purchaseAmount =
    toNumber(amount);

  if (purchaseAmount === 0) {
    return getDailyBalance(
      date,
      session
    );
  }

  const existing =
    await getDailyBalance(
      date,
      session
    );

  const openingBalance =
    toNumber(
      existing.openingBalance
    );

  const cashSales =
    toNumber(
      existing.cashSales
    );

  const oldCashPurchases =
    toNumber(
      existing.cashPurchases
    );

  const expenses =
    toNumber(
      existing.expenses
    );

  const newCashPurchases =
    oldCashPurchases +
    purchaseAmount;

  const closingBalance =
    openingBalance +
    cashSales -
    newCashPurchases -
    expenses;

  await db
    .collection(
      CASH_BALANCES_COLLECTION
    )
    .updateOne(
      {
        date,
      },
      {
        $set: {
          date,

          cashPurchases:
            newCashPurchases,

          closingBalance,

          openingBalanceSet: true,

          updatedAt:
            new Date(),
        },

        $setOnInsert: {
          openingBalance:
            openingBalance,

          cashSales: 0,

          expenses: 0,

          createdAt:
            new Date(),
        },
      },
      {
        upsert: true,

        ...(session && {
          session,
        }),
      }
    );

  return getDailyBalance(
    date,
    session
  );
};

// ======================================================
// Update Expenses
// ======================================================

const updateExpenses = async (
  date,
  amount,
  session = null
) => {
  const db = getDB();

  const expenseAmount =
    toNumber(amount);

  if (expenseAmount === 0) {
    return getDailyBalance(
      date,
      session
    );
  }

  const existing =
    await getDailyBalance(
      date,
      session
    );

  const openingBalance =
    toNumber(
      existing.openingBalance
    );

  const cashSales =
    toNumber(
      existing.cashSales
    );

  const cashPurchases =
    toNumber(
      existing.cashPurchases
    );

  const oldExpenses =
    toNumber(
      existing.expenses
    );

  const newExpenses =
    oldExpenses +
    expenseAmount;

  const closingBalance =
    openingBalance +
    cashSales -
    cashPurchases -
    newExpenses;

  await db
    .collection(
      CASH_BALANCES_COLLECTION
    )
    .updateOne(
      {
        date,
      },
      {
        $set: {
          date,

          expenses:
            newExpenses,

          closingBalance,

          openingBalanceSet: true,

          updatedAt:
            new Date(),
        },

        $setOnInsert: {
          openingBalance:
            openingBalance,

          cashSales: 0,

          cashPurchases: 0,

          createdAt:
            new Date(),
        },
      },
      {
        upsert: true,

        ...(session && {
          session,
        }),
      }
    );

  return getDailyBalance(
    date,
    session
  );
};

// ======================================================
// Get Today Balance
// ======================================================

const getTodayBalance = async (
  session = null
) => {
  const today =
    getBangladeshDateString();

  return getDailyBalance(
    today,
    session
  );
};

// ======================================================
// Get Balance Between Dates
// ======================================================

const getBalancesBetweenDates = async (
  fromDate,
  toDate,
  session = null
) => {
  const db = getDB();

  return db
    .collection(
      CASH_BALANCES_COLLECTION
    )
    .find(
      {
        date: {
          $gte: fromDate,
          $lte: toDate,
        },
      },
      session
        ? { session }
        : {}
    )
    .sort({
      date: 1,
    })
    .toArray();
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getBangladeshDateString,

  getPreviousBangladeshDateString,

  getPreviousClosingBalance,

  getLatestPreviousClosingBalance,

  getDailyBalance,

  getOpeningBalanceStatus,

  setOpeningBalance,

  updateCashSales,

  updateCashDuePayments,

  updateCashPurchases,

  updateExpenses,

  getTodayBalance,

  getBalancesBetweenDates,
};