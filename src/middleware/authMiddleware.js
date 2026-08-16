const jwt = require("jsonwebtoken");

// ======================================================
// JWT Configuration
// ======================================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is missing"
  );
}

// ======================================================
// Authentication Middleware
// ======================================================

const authMiddleware = (req, res, next) => {
  try {
    // ==================================================
    // 1. Get Authorization Header
    // ==================================================

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token পাওয়া যায়নি",
      });
    }

    // ==================================================
    // 2. Check Bearer Token
    // ==================================================

    const parts =
      authHeader.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication format",
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token পাওয়া যায়নি",
      });
    }

    // ==================================================
    // 3. Verify JWT
    // ==================================================

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    // ==================================================
    // 4. Validate Required JWT Data
    // ==================================================

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    // ==================================================
    // 5. Attach User Information
    // ==================================================
    //
    // Admin:
    // role = admin
    // roleId = null
    //
    // Manager/Staff:
    // role = manager/staff
    // roleId = assigned role ObjectId
    //

    req.user = {
      userId: decoded.userId,
      role: decoded.role || null,
      roleId: decoded.roleId || null,
    };

    // ==================================================
    // 6. Continue
    // ==================================================

    next();
  } catch (error) {
    console.error(
      "Authentication Error:",
      error
    );

    // ==================================================
    // Token Expired
    // ==================================================

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token-এর মেয়াদ শেষ হয়েছে",
      });
    }

    // ==================================================
    // Invalid JWT
    // ==================================================

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    // ==================================================
    // General Authentication Error
    // ==================================================

    return res.status(401).json({
      success: false,
      message:
        "Authentication failed",
    });
  }
};

// ======================================================
// Export
// ======================================================

module.exports = authMiddleware;