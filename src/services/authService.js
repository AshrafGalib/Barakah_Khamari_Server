const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

// ======================================================
// Configuration
// ======================================================

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing");
}

// ======================================================
// Collections
// ======================================================

const getUsersCollection = () => getDB().collection("users");
const getRolesCollection = () => getDB().collection("roles");

// ======================================================
// Helper: Resolve User Permissions
// ======================================================

const getUserPermissions = async (user) => {
  // System Admin always gets wildcard access
  if (user.role === "admin" || user.role === "super_admin") {
    return ["*"];
  }

  if (!user.roleId) {
    return [];
  }

  let roleObjectId;
  try {
    roleObjectId =
      user.roleId instanceof ObjectId
        ? user.roleId
        : new ObjectId(user.roleId);
  } catch (error) {
    return [];
  }

  const roleDoc = await getRolesCollection().findOne({
    _id: roleObjectId,
    isActive: true,
  });

  return roleDoc && Array.isArray(roleDoc.permissions)
    ? roleDoc.permissions
    : [];
};

// ======================================================
// Generate JWT
// ======================================================

const generateToken = (user, permissions = []) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role || null,
      roleId: user.roleId ? user.roleId.toString() : null,
      permissions: permissions,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

// ======================================================
// Remove Password & Sensitive Data
// ======================================================

const sanitizeUser = (user, permissions = []) => {
  if (!user) return null;

  const { password, ...safeUser } = user;

  return {
    ...safeUser,
    permissions,
  };
};

// ======================================================
// Validate User Role
// ======================================================

const validateUserRole = async ({ role, roleId }) => {
  if (role === "admin") {
    return {
      role: "admin",
      roleId: null,
    };
  }

  if (!roleId) {
    throw new Error("Non-admin user-এর জন্য roleId প্রয়োজন");
  }

  let objectId;
  try {
    objectId = roleId instanceof ObjectId ? roleId : new ObjectId(roleId);
  } catch (error) {
    throw new Error("Invalid role ID");
  }

  const assignedRole = await getRolesCollection().findOne({
    _id: objectId,
    isActive: true,
  });

  if (!assignedRole) {
    throw new Error("Assigned role পাওয়া যায়নি অথবা role inactive");
  }

  if (assignedRole.name === "admin" || assignedRole.isSystemRole === true) {
    if (assignedRole.name === "admin") {
      throw new Error("Admin role এইভাবে assign করা যাবে না");
    }
  }

  return {
    role: assignedRole.name,
    roleId: assignedRole._id,
  };
};

// ======================================================
// Login
// ======================================================

const login = async (email, password) => {
  const users = getUsersCollection();

  const user = await users.findOne({
    email: email.trim().toLowerCase(),
  });

  if (!user) {
    throw new Error("Email অথবা password সঠিক নয়");
  }

  if (user.isActive === false) {
    throw new Error("এই account টি বর্তমানে নিষ্ক্রিয়");
  }

  const passwordMatched = await bcrypt.compare(password, user.password);

  if (!passwordMatched) {
    throw new Error("Email অথবা password সঠিক নয়");
  }

  // Resolve dynamic permissions
  const permissions = await getUserPermissions(user);

  // Generate Token with Permissions
  const token = generateToken(user, permissions);

  return {
    token,
    user: sanitizeUser(user, permissions),
  };
};

// ======================================================
// Get Current User
// ======================================================

const getCurrentUser = async (userId) => {
  const users = getUsersCollection();

  let objectId;
  try {
    objectId = userId instanceof ObjectId ? userId : new ObjectId(userId);
  } catch (error) {
    throw new Error("Invalid user ID");
  }

  const user = await users.findOne({ _id: objectId });

  if (!user) {
    throw new Error("User পাওয়া যায়নি");
  }

  if (user.isActive === false) {
    throw new Error("এই account টি বর্তমানে নিষ্ক্রিয়");
  }

  const permissions = await getUserPermissions(user);

  return sanitizeUser(user, permissions);
};

// ======================================================
// Create User
// ======================================================

const createUser = async ({
  name,
  email,
  password,
  role = "staff",
  roleId = null,
  mustChangePassword = false,
}) => {
  const users = getUsersCollection();

  if (!name || !email || !password) {
    throw new Error("Name, email এবং password প্রয়োজন");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await users.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("এই email দিয়ে ইতিমধ্যে একটি account রয়েছে");
  }

  const validatedRole = await validateUserRole({ role, roleId });

  const hashedPassword = await bcrypt.hash(password, 12);

  const now = new Date();

  const user = {
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: validatedRole.role,
    roleId: validatedRole.roleId,
    isActive: true,
    mustChangePassword: Boolean(mustChangePassword),
    createdAt: now,
    updatedAt: now,
  };

  const result = await users.insertOne(user);

  const createdUser = { ...user, _id: result.insertedId };
  const permissions = await getUserPermissions(createdUser);

  return sanitizeUser(createdUser, permissions);
};

// ======================================================
// Change Password
// ======================================================

const changePassword = async (userId, currentPassword, newPassword) => {
  const users = getUsersCollection();

  let objectId;
  try {
    objectId = userId instanceof ObjectId ? userId : new ObjectId(userId);
  } catch (error) {
    throw new Error("Invalid user ID");
  }

  const user = await users.findOne({ _id: objectId });

  if (!user) {
    throw new Error("User পাওয়া যায়নি");
  }

  const passwordMatched = await bcrypt.compare(currentPassword, user.password);

  if (!passwordMatched) {
    throw new Error("বর্তমান password টি সঠিক নয়");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await users.updateOne(
    { _id: objectId },
    {
      $set: {
        password: hashedPassword,
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    }
  );

  return true;
};

// ======================================================
// Export
// ======================================================

module.exports = {
  login,
  getCurrentUser,
  createUser,
  changePassword,
  generateToken,
  sanitizeUser,
  validateUserRole,
  getUserPermissions,
};