const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { PERMISSIONS } = require("../constants/permissionConstants");

// ======================================================
// Constants & Lookups
// ======================================================

const ROLES_COLLECTION = "roles";
const USERS_COLLECTION = "users";
const SYSTEM_ROLES = ["admin"];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);
// Fast O(1) lookup set for validation
const ALL_PERMISSIONS_SET = new Set(ALL_PERMISSIONS);

// ======================================================
// Collection Helper
// ======================================================

const getRolesCollection = () => getDB().collection(ROLES_COLLECTION);

// ======================================================
// Helpers & Data Sanitization
// ======================================================

const parseObjectId = (id, label = "role ID") => {
  if (!id || !ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
  return new ObjectId(id);
};

const normalizeRoleName = (name) => {
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Role name is required");
  }
  return name.trim().toLowerCase();
};

const validatePermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) {
    throw new Error("Permissions must be an array");
  }

  const uniquePermissions = [...new Set(permissions)];
  const invalidPermissions = uniquePermissions.filter(
    (permission) => !ALL_PERMISSIONS_SET.has(permission)
  );

  if (invalidPermissions.length > 0) {
    throw new Error(`Invalid permission(s): ${invalidPermissions.join(", ")}`);
  }

  return uniquePermissions;
};

const sanitizeRole = (role) => {
  if (!role) return null;

  return {
    _id: role._id,
    name: role.name,
    displayName: role.displayName || role.name,
    description: role.description || "",
    permissions: role.permissions || [],
    isSystemRole: Boolean(role.isSystemRole),
    isActive: role.isActive !== false,
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
  const roles = getRolesCollection();
  const normalizedName = normalizeRoleName(name);

  if (SYSTEM_ROLES.includes(normalizedName)) {
    throw new Error("This role name is reserved by the system");
  }

  const validPermissions = validatePermissions(permissions);

  const existingRole = await roles.findOne({ name: normalizedName });
  if (existingRole) {
    throw new Error("এই নামে একটি role ইতিমধ্যে রয়েছে");
  }

  const now = new Date();
  const role = {
    name: normalizedName,
    displayName:
      typeof displayName === "string" && displayName.trim()
        ? displayName.trim()
        : normalizedName,
    description:
      typeof description === "string" ? description.trim() : "",
    permissions: validPermissions,
    isSystemRole: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await roles.insertOne(role);

  return sanitizeRole({
    ...role,
    _id: result.insertedId,
  });
};

// ======================================================
// Get All Roles
// ======================================================

const getAllRoles = async ({ includeInactive = false } = {}) => {
  const roles = getRolesCollection();
  const filter = includeInactive ? {} : { isActive: true };

  const result = await roles
    .find(filter)
    .sort({ isSystemRole: -1, name: 1 })
    .toArray();

  return result.map(sanitizeRole);
};

// ======================================================
// Get Role By ID
// ======================================================

const getRoleById = async (roleId) => {
  const roles = getRolesCollection();
  const objectId = parseObjectId(roleId);

  const role = await roles.findOne({ _id: objectId });
  if (!role) {
    throw new Error("Role পাওয়া যায়নি");
  }

  return sanitizeRole(role);
};

// ======================================================
// Update Role
// ======================================================

const updateRole = async (
  roleId,
  { displayName, description, permissions, isActive }
) => {
  const roles = getRolesCollection();
  const objectId = parseObjectId(roleId);

  const existingRole = await roles.findOne({ _id: objectId });
  if (!existingRole) {
    throw new Error("Role পাওয়া যায়নি");
  }

  if (existingRole.isSystemRole) {
    throw new Error("System role cannot be modified");
  }

  const updateData = {};

  if (displayName !== undefined) {
    if (typeof displayName !== "string" || !displayName.trim()) {
      throw new Error("Display name is required");
    }
    updateData.displayName = displayName.trim();
  }

  if (description !== undefined) {
    updateData.description =
      typeof description === "string" ? description.trim() : "";
  }

  if (permissions !== undefined) {
    updateData.permissions = validatePermissions(permissions);
  }

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      throw new Error("isActive must be a boolean");
    }
    updateData.isActive = isActive;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No changes provided");
  }

  updateData.updatedAt = new Date();

  // Atomic Update and Return in single MongoDB call
  const result = await roles.findOneAndUpdate(
    { _id: objectId },
    { $set: updateData },
    { returnDocument: "after" }
  );

  return sanitizeRole(result);
};

// ======================================================
// Delete Role
// ======================================================

const deleteRole = async (roleId) => {
  const roles = getRolesCollection();
  const objectId = parseObjectId(roleId);

  const role = await roles.findOne({ _id: objectId });
  if (!role) {
    throw new Error("Role পাওয়া যায়নি");
  }

  if (role.isSystemRole) {
    throw new Error("System role cannot be deleted");
  }

  // Check if assigned to any user
  const db = getDB();
  const assignedUsersCount = await db
    .collection(USERS_COLLECTION)
    .countDocuments({ roleId: objectId });

  if (assignedUsersCount > 0) {
    throw new Error(
      "এই role বর্তমানে user-এর সাথে assigned রয়েছে। আগে users-দের অন্য role দিন।"
    );
  }

  await roles.deleteOne({ _id: objectId });

  return {
    success: true,
    message: "Role successfully deleted",
  };
};

// ======================================================
// Permission Helpers
// ======================================================

const getAvailablePermissions = () => ALL_PERMISSIONS;

const getRolePermissions = async (roleId) => {
  const role = await getRoleById(roleId);
  return role.permissions;
};

const hasPermission = async (roleId, permission) => {
  const roles = getRolesCollection();
  const objectId = parseObjectId(roleId);

  // Performance Optimization: Projection (Only fetching required fields)
  const role = await roles.findOne(
    { _id: objectId },
    { projection: { permissions: 1, isSystemRole: 1, name: 1 } }
  );

  if (!role) return false;

  if (role.isSystemRole || role.name === "admin") {
    return true;
  }

  return Array.isArray(role.permissions) && role.permissions.includes(permission);
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