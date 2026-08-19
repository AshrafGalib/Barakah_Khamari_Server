const userService = require("../services/userService");

// ======================================================
// Helper: Standard Error Response Mapping
// ======================================================
const handleError = (res, error, defaultMessage) => {
  console.error(`${defaultMessage}:`, error);

  const message = error?.message || defaultMessage;

  let statusCode = 400;

  if (message.includes("পাওয়া যায়নি") || message.includes("not found")) {
    statusCode = 404;
  } else if (
    message.includes("পরিবর্তন করা যাবে না") ||
    message.includes("deactivate করা যাবে না") ||
    message.includes("সরাসরি user-এর জন্য assign করা যাবে না")
  ) {
    statusCode = 403;
  } else if (
    message.includes("ইতিমধ্যে") ||
    message.includes("already exists")
  ) {
    statusCode = 409;
  } else if (
    !message.includes("Invalid") &&
    !message.includes("প্রয়োজন") &&
    !message.includes("কমপক্ষে")
  ) {
    statusCode = 500;
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

// ======================================================
// Get All Users
// ======================================================
const getUsers = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive !== "false";

    const users = await userService.getUsers({ includeInactive });

    return res.status(200).json({
      success: true,
      message: "Users loaded successfully",
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    return handleError(res, error, "Users load করতে সমস্যা হয়েছে");
  }
};

// ======================================================
// Get User By ID
// ======================================================
const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "User information loaded successfully",
      data: { user },
    });
  } catch (error) {
    return handleError(res, error, "User load করতে সমস্যা হয়েছে");
  }
};

// ======================================================
// Create User
// ======================================================
const createUser = async (req, res) => {
  try {
    const { name, email, password, roleId } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password এবং roleId প্রয়োজন",
      });
    }

    const createdUser = await userService.createUser({
      name,
      email,
      password,
      roleId,
    });

    return res.status(201).json({
      success: true,
      message: "User successfully created",
      data: { user: createdUser },
    });
  } catch (error) {
    return handleError(res, error, "User create করতে সমস্যা হয়েছে");
  }
};

// ======================================================
// Update User Basic Info
// ======================================================
const updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await userService.updateUser(req.params.id, { name, email });

    return res.status(200).json({
      success: true,
      message: "User successfully updated",
      data: { user },
    });
  } catch (error) {
    return handleError(res, error, "User update করতে সমস্যা হয়েছে");
  }
};

// ======================================================
// Update User Role
// ======================================================
const updateUserRole = async (req, res) => {
  try {
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: "roleId প্রয়োজন",
      });
    }

    const user = await userService.updateUserRole(req.params.id, roleId);

    return res.status(200).json({
      success: true,
      message: "User role successfully updated",
      data: { user },
    });
  } catch (error) {
    return handleError(res, error, "User role update করতে সমস্যা হয়েছে");
  }
};

// ======================================================
// Update User Status
// ======================================================
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean",
      });
    }

    const user = await userService.updateUserStatus(req.params.id, isActive);

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User successfully activated"
        : "User successfully deactivated",
      data: { user },
    });
  } catch (error) {
    return handleError(res, error, "User status update করতে সমস্যা হয়েছে");
  }
};

// ======================================================
// Delete User (Soft Delete)
// ======================================================
const deleteUser = async (req, res) => {
  try {
    const user = await userService.deleteUser(req.params.id);

    return res.status(200).json({
      success: true,
      message: "User successfully deactivated",
      data: { user },
    });
  } catch (error) {
    return handleError(res, error, "User delete করতে সমস্যা হয়েছে");
  }
};

// ======================================================
// Get Available Roles
// ======================================================
const getAvailableRoles = async (req, res) => {
  try {
    const roles = await userService.getAvailableRoles();

    return res.status(200).json({
      success: true,
      message: "Available roles loaded successfully",
      data: {
        roles,
        count: roles.length,
      },
    });
  } catch (error) {
    return handleError(res, error, "Available roles load করতে সমস্যা হয়েছে");
  }
};

// ======================================================
// Export
// ======================================================
module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAvailableRoles,
};