const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");
const { PERMISSIONS } = require("../constants/permissionConstants");

// ======================================================
// Constants
// ======================================================

const ROLES_COLLECTION = "roles";

const SYSTEM_ROLES = ["admin"];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// ======================================================
// Collection
// ======================================================

const getRolesCollection = () => {
  const db = getDB();

  return db.collection(ROLES_COLLECTION);
};

// ======================================================
// Helpers
// ======================================================

const normalizeRoleName = (name) => {
  if (
    typeof name !== "string" ||
    !name.trim()
  ) {
    throw new Error(
      "Role name is required"
    );
  }

  return name.trim().toLowerCase();
};

// ======================================================
// Validate Permissions
// ======================================================

const validatePermissions = (
  permissions = []
) => {
  if (!Array.isArray(permissions)) {
    throw new Error(
      "Permissions must be an array"
    );
  }

  const uniquePermissions = [
    ...new Set(permissions),
  ];

  const invalidPermissions =
    uniquePermissions.filter(
      (permission) =>
        !ALL_PERMISSIONS.includes(
          permission
        )
    );

  if (
    invalidPermissions.length > 0
  ) {
    throw new Error(
      `Invalid permission(s): ${invalidPermissions.join(
        ", "
      )}`
    );
  }

  return uniquePermissions;
};

// ======================================================
// Sanitize Role
// ======================================================

const sanitizeRole = (role) => {
  if (!role) {
    return null;
  }

  return {
    _id: role._id,
    name: role.name,
    displayName: role.displayName,
    description:
      role.description || "",
    permissions:
      role.permissions || [],
    isSystemRole:
      role.isSystemRole === true,
    isActive:
      role.isActive !== false,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
};

// ======================================================
// Create Role
// ======================================================

const createRole = async ({
  name,
  displayName,
  description = "",
  permissions = [],
}) => {
  const roles =
    getRolesCollection();

  const normalizedName =
    normalizeRoleName(name);

  // ----------------------------------------------------
  // Prevent reserved system role
  // ----------------------------------------------------

  if (
    SYSTEM_ROLES.includes(
      normalizedName
    )
  ) {
    throw new Error(
      "This role name is reserved by the system"
    );
  }

  // ----------------------------------------------------
  // Validate permissions
  // ----------------------------------------------------

  const validPermissions =
    validatePermissions(
      permissions
    );

  // ----------------------------------------------------
  // Check duplicate role
  // ----------------------------------------------------

  const existingRole =
    await roles.findOne({
      name: normalizedName,
    });

  if (existingRole) {
    throw new Error(
      "এই নামে একটি role ইতিমধ্যে রয়েছে"
    );
  }

  // ----------------------------------------------------
  // Create role
  // ----------------------------------------------------

  const now = new Date();

  const role = {
    name: normalizedName,

    displayName:
      typeof displayName === "string" &&
      displayName.trim()
        ? displayName.trim()
        : normalizedName,

    description:
      typeof description === "string"
        ? description.trim()
        : "",

    permissions:
      validPermissions,

    isSystemRole: false,

    isActive: true,

    createdAt: now,

    updatedAt: now,
  };

  const result =
    await roles.insertOne(role);

  return sanitizeRole({
    ...role,
    _id: result.insertedId,
  });
};

// ======================================================
// Get All Roles
// ======================================================

const getAllRoles = async ({
  includeInactive = false,
} = {}) => {
  const roles =
    getRolesCollection();

  const filter = {};

  if (!includeInactive) {
    filter.isActive = true;
  }

  const result =
    await roles
      .find(filter)
      .sort({
        isSystemRole: -1,
        name: 1,
      })
      .toArray();

  return result.map(
    sanitizeRole
  );
};

// ======================================================
// Get Role By ID
// ======================================================

const getRoleById = async (
  roleId
) => {
  const roles =
    getRolesCollection();

  let objectId;

  try {
    objectId =
      new ObjectId(roleId);
  } catch (error) {
    throw new Error(
      "Invalid role ID"
    );
  }

  const role =
    await roles.findOne({
      _id: objectId,
    });

  if (!role) {
    throw new Error(
      "Role পাওয়া যায়নি"
    );
  }

  return sanitizeRole(role);
};

// ======================================================
// Update Role
// ======================================================

const updateRole = async (
  roleId,
  {
    displayName,
    description,
    permissions,
    isActive,
  }
) => {
  const roles =
    getRolesCollection();

  let objectId;

  try {
    objectId =
      new ObjectId(roleId);
  } catch (error) {
    throw new Error(
      "Invalid role ID"
    );
  }

  const existingRole =
    await roles.findOne({
      _id: objectId,
    });

  if (!existingRole) {
    throw new Error(
      "Role পাওয়া যায়নি"
    );
  }

  // ----------------------------------------------------
  // System role protection
  // ----------------------------------------------------

  if (
    existingRole.isSystemRole === true
  ) {
    throw new Error(
      "System role cannot be modified"
    );
  }

  // ----------------------------------------------------
  // Build update
  // ----------------------------------------------------

  const updateData = {};

  if (
    displayName !== undefined
  ) {
    if (
      typeof displayName !==
        "string" ||
      !displayName.trim()
    ) {
      throw new Error(
        "Display name is required"
      );
    }

    updateData.displayName =
      displayName.trim();
  }

  if (
    description !== undefined
  ) {
    updateData.description =
      typeof description ===
        "string"
        ? description.trim()
        : "";
  }

  if (
    permissions !== undefined
  ) {
    updateData.permissions =
      validatePermissions(
        permissions
      );
  }

  if (
    isActive !== undefined
  ) {
    if (
      typeof isActive !==
      "boolean"
    ) {
      throw new Error(
        "isActive must be boolean"
      );
    }

    updateData.isActive =
      isActive;
  }

  if (
    Object.keys(updateData)
      .length === 0
  ) {
    throw new Error(
      "No changes provided"
    );
  }

  updateData.updatedAt =
    new Date();

  await roles.updateOne(
    {
      _id: objectId,
    },
    {
      $set: updateData,
    }
  );

  const updatedRole =
    await roles.findOne({
      _id: objectId,
    });

  return sanitizeRole(
    updatedRole
  );
};

// ======================================================
// Delete Role
// ======================================================

const deleteRole = async (
  roleId
) => {
  const roles =
    getRolesCollection();

  let objectId;

  try {
    objectId =
      new ObjectId(roleId);
  } catch (error) {
    throw new Error(
      "Invalid role ID"
    );
  }

  const role =
    await roles.findOne({
      _id: objectId,
    });

  if (!role) {
    throw new Error(
      "Role পাওয়া যায়নি"
    );
  }

  // ----------------------------------------------------
  // Protect system role
  // ----------------------------------------------------

  if (
    role.isSystemRole === true
  ) {
    throw new Error(
      "System role cannot be deleted"
    );
  }

  // ----------------------------------------------------
  // Check assigned users
  // ----------------------------------------------------

  const db = getDB();

  const assignedUsers =
    await db
      .collection("users")
      .countDocuments({
        roleId: objectId,
      });

  if (assignedUsers > 0) {
    throw new Error(
      "এই role বর্তমানে user-এর সাথে assigned রয়েছে। আগে users-দের অন্য role দিন।"
    );
  }

  // ----------------------------------------------------
  // Delete
  // ----------------------------------------------------

  await roles.deleteOne({
    _id: objectId,
  });

  return {
    success: true,
    message:
      "Role successfully deleted",
  };
};

// ======================================================
// Get Permissions
// ======================================================

const getAvailablePermissions =
  () => {
    return ALL_PERMISSIONS;
  };

// ======================================================
// Get Role Permissions
// ======================================================

const getRolePermissions =
  async (roleId) => {
    const role =
      await getRoleById(roleId);

    return role.permissions;
  };

// ======================================================
// Check Permission
// ======================================================

const hasPermission = async (
  roleId,
  permission
) => {
  const role =
    await getRoleById(roleId);

  // Admin/system role
  if (
    role.isSystemRole === true ||
    role.name === "admin"
  ) {
    return true;
  }

  return role.permissions.includes(
    permission
  );
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
  hasPermission,
  validatePermissions,
  sanitizeRole,
};