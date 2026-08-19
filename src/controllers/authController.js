const authService = require("../services/authService");

// ======================================================
// Helper: Standardized Error Handler
// ======================================================

const handleError = (res, error, defaultMessage) => {
  console.error(`${defaultMessage}:`, error);

  const message = error?.message || defaultMessage;
  let statusCode = 400;

  if (
    message.includes("সঠিক নয়") ||
    message.includes("Invalid") ||
    message.includes("নিষ্ক্রিয়")
  ) {
    statusCode = 401;
  } else if (
    message.includes("পাওয়া যায়নি") ||
    message.includes("not found")
  ) {
    statusCode = 404;
  } else if (
    message.includes("ইতিমধ্যে") ||
    message.includes("already exists")
  ) {
    statusCode = 409;
  } else if (
    !message.includes("প্রয়োজন") &&
    !message.includes("কমপক্ষে") &&
    !message.includes("নয়")
  ) {
    statusCode = 500;
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

// ======================================================
// Login
// ======================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email এবং password দিতে হবে",
      });
    }

    const result = await authService.login(email, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    return handleError(res, error, "Login করা যায়নি");
  }
};

// ======================================================
// Get Current User
// ======================================================

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await authService.getCurrentUser(userId);

    return res.status(200).json({
      success: true,
      message: "User information loaded successfully",
      data: { user },
    });
  } catch (error) {
    return handleError(res, error, "User information load করা যায়নি");
  }
};

// ======================================================
// Create User
// ======================================================

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, roleId, mustChangePassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email এবং password দিতে হবে",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password কমপক্ষে ৬ characters হতে হবে",
      });
    }

    const user = await authService.createUser({
      name,
      email,
      password,
      role: role || "staff",
      roleId,
      mustChangePassword,
    });

    return res.status(201).json({
      success: true,
      message: "User successfully created",
      data: { user },
    });
  } catch (error) {
    return handleError(res, error, "User create করা যায়নি");
  }
};

// ======================================================
// Change Password
// ======================================================

const changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "বর্তমান ও নতুন password উভয়ই প্রয়োজন",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "নতুন password কমপক্ষে ৬ characters হতে হবে",
      });
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password successfully changed",
    });
  } catch (error) {
    return handleError(res, error, "Password পরিবর্তন করা যায়নি");
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  login,
  getCurrentUser,
  createUser,
  changePassword,
};