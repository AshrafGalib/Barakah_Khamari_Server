const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const { getDB } = require("../config/db");

// ======================================================
// Collections Helpers
// ======================================================
const getUsersCollection = () => getDB().collection("users");
const getRolesCollection = () => getDB().collection("roles");

// ======================================================
// ObjectId Validator Helper
// ======================================================
const parseObjectId = (id, fieldName = "ID") => {
  if (!id || !ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return new ObjectId(id);
};

// ======================================================
// Find & Validate Active Role
// ======================================================
const getActiveRole = async (roleId) => {
  const roles = getRolesCollection();
  const objectId = parseObjectId(roleId, "role ID");

  const role = await roles.findOne(
    { _id: objectId, isActive: true },
    { projection: { name: 1, displayName: 1, isSystemRole: 1 } }
  );

  if (!role) {
    throw new Error("Assigned role পাওয়া যায়নি অথবা role inactive");
  }

  // Restrict direct assignment of Super Admin via general user setup
  if (role.name === "admin") {
    throw new Error("Admin role সরাসরি user-এর জন্য assign করা যাবে না");
  }

  return role;
};

// ======================================================
// Validate Role Assignment
// ======================================================
const validateRoleAssignment = async ({ roleId }) => {
  if (!roleId) {
    throw new Error("roleId প্রয়োজন");
  }

  const role = await getActiveRole(roleId);

  return {
    role: role.name,
    roleId: role._id,
  };
};

// ======================================================
// Get All Users (with Role Details via Aggregation)
// ======================================================
const getUsers = async ({ includeInactive = true } = {}) => {
  const users = getUsersCollection();
  const matchStage = includeInactive ? {} : { isActive: true };

  const userList = await users
    .aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "roleDetails",
        },
      },
      {
        $unwind: {
          path: "$roleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          password: 0,
          "roleDetails.permissions": 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ])
    .toArray();

  return userList;
};

// ======================================================
// Get User By ID
// ======================================================
const getUserById = async (userId) => {
  const users = getUsersCollection();
  const objectId = parseObjectId(userId, "user ID");

  const user = await users.findOne(
    { _id: objectId },
    { projection: { password: 0 } }
  );

  if (!user) {
    throw new Error("User পাওয়া যায়নি");
  }

  return user;
};

// ======================================================
// Create Managed User
// ======================================================
const createUser = async ({ name, email, password, roleId }) => {
  const users = getUsersCollection();

  if (!name || !email || !password) {
    throw new Error("Name, email এবং password প্রয়োজন");
  }

  if (!roleId) {
    throw new Error("User-এর জন্য একটি role নির্বাচন করুন");
  }

  const cleanName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!cleanName) {
    throw new Error("Name খালি রাখা যাবে না");
  }

  if (password.length < 6) {
    throw new Error("Password কমপক্ষে 6 characters হতে হবে");
  }

  // Check Existing Email
  const existingUser = await users.findOne(
    { email: normalizedEmail },
    { projection: { _id: 1 } }
  );

  if (existingUser) {
    throw new Error("এই email দিয়ে ইতিমধ্যে একটি account রয়েছে");
  }

  // Validate Role
  const assignedRole = await validateRoleAssignment({ roleId });

  // Password Hashing
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = {
    name: cleanName,
    email: normalizedEmail,
    password: hashedPassword,
    role: assignedRole.role,
    roleId: assignedRole.roleId,
    isActive: true,
    mustChangePassword: true, // Useful for first-time staff login
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await users.insertOne(newUser);

  // Return user without password
  const { password: _, ...createdUser } = newUser;
  return { _id: result.insertedId, ...createdUser };
};

// ======================================================
// Update User Basic Info
// ======================================================
const updateUser = async (userId, { name, email }) => {
  const users = getUsersCollection();
  const objectId = parseObjectId(userId, "user ID");

  const updateData = {};

  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (!cleanName) throw new Error("Name খালি রাখা যাবে না");
    updateData.name = cleanName;
  }

  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) throw new Error("Email খালি রাখা যাবে না");

    const emailExists = await users.findOne(
      { email: normalizedEmail, _id: { $ne: objectId } },
      { projection: { _id: 1 } }
    );

    if (emailExists) {
      throw new Error("এই email ইতিমধ্যে অন্য একটি account ব্যবহার করছে");
    }

    updateData.email = normalizedEmail;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("Update করার মতো কোনো তথ্য পাওয়া যায়নি");
  }

  updateData.updatedAt = new Date();

  const result = await users.findOneAndUpdate(
    { _id: objectId },
    { $set: updateData },
    { returnDocument: "after", projection: { password: 0 } }
  );

  if (!result || !result.value) {
    throw new Error("User পাওয়া যায়নি");
  }

  return result.value;
};

// ======================================================
// Update User Role
// ======================================================
const updateUserRole = async (userId, roleId) => {
  const users = getUsersCollection();
  const objectId = parseObjectId(userId, "user ID");

  const user = await users.findOne(
    { _id: objectId },
    { projection: { role: 1 } }
  );

  if (!user) {
    throw new Error("User পাওয়া যায়নি");
  }

  if (user.role === "admin") {
    throw new Error("Admin user's role পরিবর্তন করা যাবে না");
  }

  const assignedRole = await validateRoleAssignment({ roleId });

  const result = await users.findOneAndUpdate(
    { _id: objectId },
    {
      $set: {
        role: assignedRole.role,
        roleId: assignedRole.roleId,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after", projection: { password: 0 } }
  );

  return result.value;
};

// ======================================================
// Update User Status (Activate/Deactivate)
// ======================================================
const updateUserStatus = async (userId, isActive) => {
  const users = getUsersCollection();
  const objectId = parseObjectId(userId, "user ID");

  const user = await users.findOne(
    { _id: objectId },
    { projection: { role: 1 } }
  );

  if (!user) {
    throw new Error("User পাওয়া যায়নি");
  }

  if (user.role === "admin") {
    throw new Error("Admin account deactivate করা যাবে না");
  }

  if (typeof isActive !== "boolean") {
    throw new Error("isActive must be boolean");
  }

  const result = await users.findOneAndUpdate(
    { _id: objectId },
    { $set: { isActive, updatedAt: new Date() } },
    { returnDocument: "after", projection: { password: 0 } }
  );

  return result.value;
};

// ======================================================
// Delete User (Soft Delete via Deactivation)
// ======================================================
const deleteUser = async (userId) => {
  return updateUserStatus(userId, false);
};

// ======================================================
// Get Available Roles for Dropdown Selection
// ======================================================
const getAvailableRoles = async () => {
  const roles = getRolesCollection();

  return roles
    .find({
      isActive: true,
      name: { $ne: "admin" },
    })
    .project({
      name: 1,
      displayName: 1,
      description: 1,
      permissions: 1,
      isSystemRole: 1,
    })
    .sort({ displayName: 1 })
    .toArray();
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
  validateRoleAssignment,
};