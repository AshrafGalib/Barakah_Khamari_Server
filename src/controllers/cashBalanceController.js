const cashBalanceService =
  require("../services/cashBalanceService");

// ======================================================
// Get Today's Balance
// ======================================================

const getTodayBalance = async (
  req,
  res
) => {
  try {
    const balance =
      await cashBalanceService
        .getTodayBalance();

    return res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error(
      "Get Today Cash Balance Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "আজকের cash balance load করা যায়নি",
      error: error.message,
    });
  }
};

// ======================================================
// Get Opening Balance Status
//
// Dashboard first load-এর সময় এটা call করবে.
//
// First ever:
// needsOpeningBalance = true
//
// Existing day:
// needsOpeningBalance = false
//
// New day:
// previous closing automatically carry forward
// needsOpeningBalance = false
// ======================================================

const getOpeningBalanceStatus = async (
  req,
  res
) => {
  try {
    const date =
      req.query.date ||
      cashBalanceService
        .getBangladeshDateString();

    const status =
      await cashBalanceService
        .getOpeningBalanceStatus(
          date
        );

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error(
      "Get Opening Balance Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Opening balance status load করা যায়নি",
      error: error.message,
    });
  }
};

// ======================================================
// Get Daily Balance
// ======================================================

const getDailyBalance = async (
  req,
  res
) => {
  try {
    const { date } =
      req.params;

    if (!date) {
      return res.status(400).json({
        success: false,
        message:
          "Date দিতে হবে",
      });
    }

    const balance =
      await cashBalanceService
        .getDailyBalance(
          date
        );

    return res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error(
      "Get Daily Cash Balance Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Cash balance load করা যায়নি",
      error: error.message,
    });
  }
};

// ======================================================
// Set Opening Balance
// ======================================================

const setOpeningBalance = async (
  req,
  res
) => {
  try {
    const {
      date,
      openingBalance,
    } = req.body;

    if (
      openingBalance ===
        undefined ||
      openingBalance === null ||
      openingBalance === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Opening balance দিতে হবে",
      });
    }

    const numericOpeningBalance =
      Number(openingBalance);

    if (
      !Number.isFinite(
        numericOpeningBalance
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "সঠিক opening balance দিতে হবে",
      });
    }

    if (
      numericOpeningBalance < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Opening balance negative হতে পারবে না",
      });
    }

    const balance =
      await cashBalanceService
        .setOpeningBalance({
          date,
          openingBalance:
            numericOpeningBalance,
        });

    return res.status(200).json({
      success: true,
      message:
        "Opening balance সফলভাবে সংরক্ষণ করা হয়েছে",
      data: balance,
    });
  } catch (error) {
    console.error(
      "Set Opening Balance Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Opening balance save করা যায়নি",
      error: error.message,
    });
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getTodayBalance,

  getOpeningBalanceStatus,

  getDailyBalance,

  setOpeningBalance,
};