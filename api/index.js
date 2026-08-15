require("dotenv").config();

const app = require("../src/app");
const { connectDB } = require("../src/config/db");

const handler = async (req, res) => {
  try {
    await connectDB();

    return app(req, res);
  } catch (error) {
    console.error(
      "Server initialization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
};

module.exports = handler;