require("dotenv").config();

const app = require("./src/app");
const { connectDB } = require("./src/config/db");

const PORT = process.env.PORT || 5000;

// =====================================
// Local Development
// =====================================

if (process.env.NODE_ENV !== "production") {
  const startServer = async () => {
    try {
      await connectDB();

      app.listen(PORT, () => {
        console.log(
          `Server running on http://localhost:${PORT}`
        );
      });
    } catch (error) {
      console.error(
        "Server failed to start:",
        error
      );
    }
  };

  startServer();
}

// =====================================
// Vercel Serverless Handler
// =====================================

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
      message:
        "Database connection failed",
    });
  }
};

module.exports = handler;