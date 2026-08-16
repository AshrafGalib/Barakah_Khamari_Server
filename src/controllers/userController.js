const bcrypt = require("bcryptjs");

const userService =
  require("../services/userService");
  

// ======================================================
// Helper: Standard Error Response
// ======================================================

const handleError = (
  res,
  error,
  defaultMessage
) => {
  console.error(
    defaultMessage,
    error
  );

  const message =
    error?.message ||
    defaultMessage;

  // Known client errors
  const clientErrors = [
    "User পাওয়া যায়নি",
    "Invalid user ID",
    "Invalid role ID",
    "Assigned role পাওয়া যায়নি অথবা role inactive",
    "Admin role সরাসরি user-এর জন্য assign করা যাবে না",
    "Admin user's role পরিবর্তন করা যাবে না",
    "Admin account deactivate করা যাবে না",
    "Name খালি রাখা যাবে না",
    "Email খালি রাখা যাবে না",
    "Password কমপক্ষে 6 characters হতে হবে",
    "এই email ইতিমধ্যে অন্য একটি account ব্যবহার করছে",
    "এই email দিয়ে ইতিমধ্যে একটি account রয়েছে",
    "User-এর জন্য একটি role নির্বাচন করুন",
    "isActive must be boolean",
    "Update করার মতো কোনো তথ্য পাওয়া যায়নি",
    "Name, email এবং password প্রয়োজন",
  ];

  const isClientError =
    clientErrors.includes(message) ||
    message.startsWith(
      "Invalid user ID"
    ) ||
    message.startsWith(
      "Invalid role ID"
    );

  return res.status(
    isClientError ? 400 : 500
  ).json({
    success: false,
    message,
  });
};

// ======================================================
// Get All Users
// ======================================================
//
// GET /api/users
//
// Optional:
// ?includeInactive=false
//
// Permission:
// users.view
//
// ======================================================

const getUsers = async (
  req,
  res
) => {
  try {
    const includeInactive =
      req.query.includeInactive !==
      "false";

    const users =
      await userService.getUsers({
        includeInactive,
      });

    return res.status(200).json({
      success: true,
      message:
        "Users loaded successfully",
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Users load করতে সমস্যা হয়েছে"
    );
  }
};

// ======================================================
// Get User By ID
// ======================================================
//
// GET /api/users/:id
//
// Permission:
// users.view
//
// ======================================================

const getUserById = async (
  req,
  res
) => {
  try {
    const user =
      await userService.getUserById(
        req.params.id
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
    return handleError(
      res,
      error,
      "User load করতে সমস্যা হয়েছে"
    );
  }
};

// ======================================================
// Create User
// ======================================================
//
// POST /api/users
//
// Body:
//
// {
//   "name": "Shop Manager",
//   "email": "manager@shop.com",
//   "password": "password123",
//   "roleId": "ROLE_OBJECT_ID"
// }
//
// Permission:
// users.create
//
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
      roleId,
    } = req.body;

    // ==================================================
    // Basic Validation
    // ==================================================

    if (
      !name ||
      !email ||
      !password ||
      !roleId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password এবং roleId প্রয়োজন",
      });
    }

    // ==================================================
    // Validate Role
    // ==================================================

    const roleData =
      await userService.validateRoleAssignment({
        roleId,
      });

    // ==================================================
    // Check Password
    // ==================================================

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password কমপক্ষে 6 characters হতে হবে",
      });
    }

    // ==================================================
    // Hash Password
    // ==================================================

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    // ==================================================
    // Access Users Collection
    // ==================================================

    const db =
      require("../config/db").getDB();

    const users =
      db.collection("users");

    // ==================================================
    // Normalize Email
    // ==================================================

    const normalizedEmail =
      email.trim().toLowerCase();

    // ==================================================
    // Check Existing Email
    // ==================================================

    const existingUser =
      await users.findOne({
        email:
          normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "এই email দিয়ে ইতিমধ্যে একটি account রয়েছে",
      });
    }

    // ==================================================
    // Create User
    // ==================================================

    const now =
      new Date();

    const user = {
      name:
        name.trim(),

      email:
        normalizedEmail,

      password:
        hashedPassword,

      role:
        roleData.role,

      roleId:
        roleData.roleId,

      isActive:
        true,

      createdAt:
        now,

      updatedAt:
        now,
    };

    const result =
      await users.insertOne(
        user
      );

    // ==================================================
    // Remove Password
    // ==================================================

    const safeUser =
      await userService.getUserById(
        result.insertedId.toString()
      );

    // ==================================================
    // Response
    // ==================================================

    return res.status(201).json({
      success: true,
      message:
        "User successfully created",
      data: {
        user:
          safeUser,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "User create করতে সমস্যা হয়েছে"
    );
  }
};

// ======================================================
// Update User
// ======================================================
//
// PATCH /api/users/:id
//
// Body:
//
// {
//   "name": "Updated Name",
//   "email": "new@email.com"
// }
//
// Permission:
// users.update
//
// ======================================================

const updateUser = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
    } = req.body;

    const user =
      await userService.updateUser(
        req.params.id,
        {
          name,
          email,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "User successfully updated",
      data: {
        user,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "User update করতে সমস্যা হয়েছে"
    );
  }
};

// ======================================================
// Update User Role
// ======================================================
//
// PATCH /api/users/:id/role
//
// Body:
//
// {
//   "roleId": "ROLE_OBJECT_ID"
// }
//
// Permission:
// users.update
//
// ======================================================

const updateUserRole = async (
  req,
  res
) => {
  try {
    const {
      roleId,
    } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message:
          "roleId প্রয়োজন",
      });
    }

    const user =
      await userService.updateUserRole(
        req.params.id,
        roleId
      );

    return res.status(200).json({
      success: true,
      message:
        "User role successfully updated",
      data: {
        user,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "User role update করতে সমস্যা হয়েছে"
    );
  }
};

// ======================================================
// Update User Status
// ======================================================
//
// PATCH /api/users/:id/status
//
// Body:
//
// {
//   "isActive": false
// }
//
// Permission:
// users.update
//
// ======================================================

const updateUserStatus = async (
  req,
  res
) => {
  try {
    const {
      isActive,
    } = req.body;

    if (
      typeof isActive !==
      "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "isActive must be boolean",
      });
    }

    const user =
      await userService.updateUserStatus(
        req.params.id,
        isActive
      );

    return res.status(200).json({
      success: true,
      message:
        isActive
          ? "User successfully activated"
          : "User successfully deactivated",
      data: {
        user,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "User status update করতে সমস্যা হয়েছে"
    );
  }
};

// ======================================================
// Delete User
// ======================================================
//
// DELETE /api/users/:id
//
// Production behavior:
// Soft delete → isActive = false
//
// Permission:
// users.delete
//
// ======================================================

const deleteUser = async (
  req,
  res
) => {
  try {
    const user =
      await userService.deleteUser(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      message:
        "User successfully deactivated",
      data: {
        user,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "User delete করতে সমস্যা হয়েছে"
    );
  }
};

// ======================================================
// Get Available Roles
// ======================================================
//
// GET /api/users/available-roles
//
// Used by frontend Role dropdown.
//
// Permission:
// users.create
//
// ======================================================

const getAvailableRoles = async (
  req,
  res
) => {
  try {
    const roles =
      await userService.getAvailableRoles();

    return res.status(200).json({
      success: true,
      message:
        "Available roles loaded successfully",
      data: {
        roles,
        count: roles.length,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Available roles load করতে সমস্যা হয়েছে"
    );
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