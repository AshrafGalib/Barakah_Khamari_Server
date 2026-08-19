const roleService = require("../services/roleService");

// ======================================================
// Helper for Error Response Status Mapping
// ======================================================
const getErrorStatusCode = (message = "") => {
  if (message.includes("পাওয়া যায়নি") || message.includes("not found")) {
    return 404;
  }
  if (message.includes("cannot be modified") || message.includes("cannot be deleted") || message.includes("reserved")) {
    return 403;
  }
  if (message.includes("ইতিমধ্যে রয়েছে") || message.includes("already exists")) {
    return 409; // Conflict
  }
  return 400; // Bad Request
};

// ======================================================
// Create Role
// ======================================================
const createRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Role name is required",
      });
    }

    if (permissions !== undefined && !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Permissions must be an array",
      });
    }

    const role = await roleService.createRole({
      name,
      displayName,
      description,
      permissions,
    });

    return res.status(201).json({
      success: true,
      message: "Role successfully created",
      data: { role },
    });
  } catch (error) {
    console.error("Create Role Error:", error);
    const statusCode = getErrorStatusCode(error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Role create করা যায়নি",
    });
  }
};

// ======================================================
// Get All Roles
// ======================================================
const getAllRoles = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";

    const roles = await roleService.getAllRoles({ includeInactive });

    return res.status(200).json({
      success: true,
      message: "Roles loaded successfully",
      data: {
        roles,
        count: roles.length,
      },
    });
  } catch (error) {
    console.error("Get All Roles Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Roles load করা যায়নি",
    });
  }
};

// ======================================================
// Get Role By ID
// ======================================================
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await roleService.getRoleById(id);

    return res.status(200).json({
      success: true,
      message: "Role information loaded successfully",
      data: { role },
    });
  } catch (error) {
    console.error("Get Role By ID Error:", error);
    const statusCode = getErrorStatusCode(error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Role load করা যায়নি",
    });
  }
};

// ======================================================
// Update Role
// ======================================================
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, description, permissions, isActive } = req.body;

    if (permissions !== undefined && !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Permissions must be an array",
      });
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean",
      });
    }

    const role = await roleService.updateRole(id, {
      displayName,
      description,
      permissions,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: "Role successfully updated",
      data: { role },
    });
  } catch (error) {
    console.error("Update Role Error:", error);
    const statusCode = getErrorStatusCode(error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Role update করা যায়নি",
    });
  }
};

// ======================================================
// Delete Role
// ======================================================
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await roleService.deleteRole(id);

    return res.status(200).json({
      success: true,
      message: result.message || "Role successfully deleted",
    });
  } catch (error) {
    console.error("Delete Role Error:", error);
    const statusCode = getErrorStatusCode(error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Role delete করা যায়নি",
    });
  }
};

// ======================================================
// Get Available Permissions
// ======================================================
const getAvailablePermissions = async (req, res) => {
  try {
    const permissions = roleService.getAvailablePermissions();

    return res.status(200).json({
      success: true,
      message: "Permissions loaded successfully",
      data: {
        permissions,
        count: permissions.length,
      },
    });
  } catch (error) {
    console.error("Get Permissions Error:", error);

    return res.status(500).json({
      success: false,
      message: "Permissions load করা যায়নি",
    });
  }
};

// ======================================================
// Get Role Permissions
// ======================================================
const getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;

    const permissions = await roleService.getRolePermissions(id);

    return res.status(200).json({
      success: true,
      message: "Role permissions loaded successfully",
      data: {
        permissions,
        count: permissions.length,
      },
    });
  } catch (error) {
    console.error("Get Role Permissions Error:", error);
    const statusCode = getErrorStatusCode(error.message);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Role permissions load করা যায়নি",
    });
  }
};

// ======================================================
// Export
// ======================================================
module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  getAvailablePermissions,
  getRolePermissions,
};