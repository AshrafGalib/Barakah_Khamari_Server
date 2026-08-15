const dashboardService =
  require("../services/dashboardService");

const cashBalanceService =
  require("../services/cashBalanceService");

// ======================================================
// Get Dashboard
// ======================================================

const getDashboard = async (
  req,
  res
) => {
  try {
    const {
      range,
      filter,
      fromDate,
      toDate,
    } = req.query;

    // --------------------------------------------------
    // Support both:
    // ?range=today
    // ?filter=today
    // --------------------------------------------------

    const selectedFilter =
      range ||
      filter ||
      "today";

    const dashboard =
      await dashboardService.getDashboard({
        filter:
          selectedFilter,
        fromDate,
        toDate,
      });

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error(
      "Get Dashboard Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Dashboard data load করা যায়নি",
      error:
        error.message,
    });
  }
};

// ======================================================
// Check Opening Balance Status
//
// Used by Dashboard frontend.
//
// If today's opening balance has not been set,
// frontend will show the Opening Balance modal.
// ======================================================

const getOpeningBalanceStatus =
  async (req, res) => {
    try {
      const today =
        cashBalanceService.getBangladeshDateString();

      const hasOpeningBalance =
        await cashBalanceService.hasOpeningBalance(
          today
        );

      return res.status(200).json({
        success: true,

        data: {
          date: today,

          needsOpeningBalance:
            !hasOpeningBalance,
        },
      });
    } catch (error) {
      console.error(
        "Get Opening Balance Status Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Opening Balance status load করা যায়নি",

        error:
          error.message,
      });
    }
  };

// ======================================================
// Set Opening Balance
//
// Used only when the user enters the opening balance
// from the Dashboard first-time modal.
// ======================================================

const setOpeningBalance =
  async (req, res) => {
    try {
      const {
        openingBalance,
      } = req.body;

      // ------------------------------------------------
      // Basic Validation
      // ------------------------------------------------

      if (
        openingBalance ===
          undefined ||
        openingBalance ===
          null ||
        openingBalance === ""
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Opening Balance দিতে হবে",
        });
      }

      const amount =
        Number(openingBalance);

      if (
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Opening Balance সঠিক হতে হবে",
        });
      }

      // ------------------------------------------------
      // Bangladesh Today
      // ------------------------------------------------

      const today =
        cashBalanceService.getBangladeshDateString();

      // ------------------------------------------------
      // IMPORTANT
      //
      // First-time opening balance only.
      //
      // যদি আজকের opening balance already exist করে,
      // তাহলে সেটাকে আবার overwrite করতে দেওয়া হবে না।
      // ------------------------------------------------

      const alreadySet =
        await cashBalanceService.hasOpeningBalance(
          today
        );

      if (alreadySet) {
        return res.status(409).json({
          success: false,

          message:
            "আজকের Opening Balance ইতিমধ্যে সেট করা হয়েছে",
        });
      }

      // ------------------------------------------------
      // Save Opening Balance
      // ------------------------------------------------

      const balance =
        await cashBalanceService.setOpeningBalance({
          date: today,

          openingBalance:
            Number(
              amount.toFixed(2)
            ),
        });

      return res.status(200).json({
        success: true,

        message:
          "Opening Balance সফলভাবে সেট হয়েছে",

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
          "Opening Balance save করা যায়নি",

        error:
          error.message,
      });
    }
  };

// ======================================================
// Export
// ======================================================

module.exports = {
  getDashboard,

  getOpeningBalanceStatus,

  setOpeningBalance,
};