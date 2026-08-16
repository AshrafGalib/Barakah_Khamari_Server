const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

// ======================================================
// Configuration
// ======================================================

const JWT_SECRET =
  process.env.JWT_SECRET;

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is missing"
  );
}

// ======================================================
// Collection
// ======================================================

const getUsersCollection = () => {
  const db = getDB();

  return db.collection("users");
};

// ======================================================
// Roles Collection
// ======================================================

const getRolesCollection = () => {
  const db = getDB();

  return db.collection("roles");
};

// ======================================================
// Generate JWT
// ======================================================

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),

      role: user.role || null,

      roleId: user.roleId
        ? user.roleId.toString()
        : null,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

// ======================================================
// Remove Password
// ======================================================

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const {
    password,
    ...safeUser
  } = user;

  return safeUser;
};

// ======================================================
// Validate Role
// ======================================================

const validateUserRole = async ({
  role,
  roleId,
}) => {
  // ==================================================
  // Admin
  // ==================================================
  //
  // Admin is a protected system role.
  // Admin does not require roleId.
  //

  if (role === "admin") {
    return {
      role: "admin",
      roleId: null,
    };
  }

  // ==================================================
  // Non-admin must have roleId
  // ==================================================

  if (!roleId) {
    throw new Error(
      "Non-admin user-এর জন্য roleId প্রয়োজন"
    );
  }

  // ==================================================
  // Validate ObjectId
  // ==================================================

  let objectId;

  try {
    objectId =
      new ObjectId(roleId);
  } catch (error) {
    throw new Error(
      "Invalid role ID"
    );
  }

  // ==================================================
  // Find Active Role
  // ==================================================

  const roles =
    getRolesCollection();

  const assignedRole =
    await roles.findOne({
      _id: objectId,
      isActive: true,
    });

  if (!assignedRole) {
    throw new Error(
      "Assigned role পাওয়া যায়নি অথবা role inactive"
    );
  }

  // ==================================================
  // Prevent assigning system admin role
  // ==================================================

  if (
    assignedRole.name === "admin" ||
    assignedRole.isSystemRole === true &&
    assignedRole.name === "admin"
  ) {
    throw new Error(
      "Admin role এইভাবে assign করা যাবে না"
    );
  }

  return {
    role: assignedRole.name,
    roleId: assignedRole._id,
  };
};

// ======================================================
// Login
// ======================================================

const login = async (
  email,
  password
) => {
  const users =
    getUsersCollection();

  // ==================================================
  // Find User
  // ==================================================

  const user =
    await users.findOne({
      email:
        email.trim().toLowerCase(),
    });

  if (!user) {
    throw new Error(
      "Email অথবা password সঠিক নয়"
    );
  }

  // ==================================================
  // Active Check
  // ==================================================

  if (user.isActive === false) {
    throw new Error(
      "এই account টি বর্তমানে নিষ্ক্রিয়"
    );
  }

  // ==================================================
  // Password Check
  // ==================================================

  const passwordMatched =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!passwordMatched) {
    throw new Error(
      "Email অথবা password সঠিক নয়"
    );
  }

  // ==================================================
  // Generate Token
  // ==================================================

  const token =
    generateToken(user);

  // ==================================================
  // Return
  // ==================================================

  return {
    token,

    user: sanitizeUser(
      user
    ),
  };
};

// ======================================================
// Get Current User
// ======================================================

const getCurrentUser = async (
  userId
) => {
  const users =
    getUsersCollection();

  // ==================================================
  // Validate User ID
  // ==================================================

  let objectId;

  try {
    objectId =
      new ObjectId(userId);
  } catch (error) {
    throw new Error(
      "Invalid user ID"
    );
  }

  // ==================================================
  // Find User
  // ==================================================

  const user =
    await users.findOne({
      _id: objectId,
    });

  if (!user) {
    throw new Error(
      "User পাওয়া যায়নি"
    );
  }

  // ==================================================
  // Active Check
  // ==================================================

  if (user.isActive === false) {
    throw new Error(
      "এই account টি বর্তমানে নিষ্ক্রিয়"
    );
  }

  // ==================================================
  // Return Safe User
  // ==================================================

  return sanitizeUser(
    user
  );
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
}) => {
  const users =
    getUsersCollection();

  // ==================================================
  // Basic Validation
  // ==================================================

  if (
    !name ||
    !email ||
    !password
  ) {
    throw new Error(
      "Name, email এবং password প্রয়োজন"
    );
  }

  // ==================================================
  // Normalize Email
  // ==================================================

  const normalizedEmail =
    email.trim().toLowerCase();

  // ==================================================
  // Check Existing User
  // ==================================================

  const existingUser =
    await users.findOne({
      email: normalizedEmail,
    });

  if (existingUser) {
    throw new Error(
      "এই email দিয়ে ইতিমধ্যে একটি account রয়েছে"
    );
  }

  // ==================================================
  // Validate Role
  // ==================================================

  const validatedRole =
    await validateUserRole({
      role,
      roleId,
    });

  // ==================================================
  // Hash Password
  // ==================================================

  const hashedPassword =
    await bcrypt.hash(
      password,
      12
    );

  // ==================================================
  // Create User
  // ==================================================

  const now =
    new Date();

  const user = {
    name: name.trim(),

    email: normalizedEmail,

    password:
      hashedPassword,

    role:
      validatedRole.role,

    roleId:
      validatedRole.roleId,

    isActive: true,

    createdAt: now,

    updatedAt: now,
  };

  // ==================================================
  // Insert User
  // ==================================================

  const result =
    await users.insertOne(
      user
    );

  // ==================================================
  // Return Safe User
  // ==================================================

  return sanitizeUser({
    ...user,

    _id:
      result.insertedId,
  });
};

// ======================================================
// Export
// ======================================================

module.exports = {
  login,
  getCurrentUser,
  createUser,
  generateToken,
  sanitizeUser,
  validateUserRole,
};