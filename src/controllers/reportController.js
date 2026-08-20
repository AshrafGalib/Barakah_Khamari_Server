const reportService = require("../services/reportService");

const getReportSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await reportService.generateReportSummary(
      startDate,
      endDate
    );

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Report Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "সার্ভার এরর",
    });
  }
};

module.exports = {
  getReportSummary,
};