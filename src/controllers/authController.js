const authService = require("../services/authService");

// ======================================================
// Login
// ======================================================

const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // ----------------------------------------------------
    // Validation
    // ----------------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email এবং password দিতে হবে",
      });
    }

    // ----------------------------------------------------
    // Login
    // ----------------------------------------------------

    const result =
      await authService.login(
        email,
        password
      );

    return res.status(200).json({
      success: true,
      message:
        "Login successful",
      data: result,
    });
  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        error.message ||
        "Login করা যায়নি",
    });
  }
};

// ======================================================
// Get Current User
// ======================================================

const getCurrentUser = async (
  req,
  res
) => {
  try {
    // authMiddleware থেকে userId আসবে
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized",
      });
    }

    const user =
      await authService.getCurrentUser(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "User information loaded successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error(
      "Get Current User Error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        error.message ||
        "User information load করা যায়নি",
    });
  }
};

// ======================================================
// Create User
// ======================================================

const createUser = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      password,
      role,
    } = req.body;

    // ----------------------------------------------------
    // Validation
    // ----------------------------------------------------

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email এবং password দিতে হবে",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password কমপক্ষে ৬ characters হতে হবে",
      });
    }

    // ----------------------------------------------------
    // Create User
    // ----------------------------------------------------

    const user =
      await authService.createUser({
        name,
        email,
        password,
        role:
          role || "admin",
      });

    return res.status(201).json({
      success: true,
      message:
        "User successfully created",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error(
      "Create User Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "User create করা যায়নি",
    });
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  login,
  getCurrentUser,
  createUser,
};