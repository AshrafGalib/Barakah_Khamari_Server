const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

// ======================================================
// Collections
// ======================================================

const getUsersCollection = () => {
  return getDB().collection("users");
};

const getRolesCollection = () => {
  return getDB().collection("roles");
};

// ======================================================
// Helpers
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
// Validate ObjectId
// ======================================================

const toObjectId = (id, fieldName = "ID") => {
  try {
    return new ObjectId(id);
  } catch (error) {
    throw new Error(
      `Invalid ${fieldName}`
    );
  }
};

// ======================================================
// Find Active Role
// ======================================================

const getActiveRole = async (roleId) => {
  const roles =
    getRolesCollection();

  const objectId =
    toObjectId(
      roleId,
      "role ID"
    );

  const role =
    await roles.findOne({
      _id: objectId,
      isActive: true,
    });

  if (!role) {
    throw new Error(
      "Assigned role পাওয়া যায়নি অথবা role inactive"
    );
  }

  // Admin role should never be assigned
  // through normal user management.
  if (role.name === "admin") {
    throw new Error(
      "Admin role সরাসরি user-এর জন্য assign করা যাবে না"
    );
  }

  return role;
};

// ======================================================
// Validate Role Assignment
// ======================================================

const validateRoleAssignment = async ({
  roleId,
}) => {
  if (!roleId) {
    throw new Error(
      "roleId প্রয়োজন"
    );
  }

  const role =
    await getActiveRole(
      roleId
    );

  return {
    role:
      role.name,

    roleId:
      role._id,
  };
};

// ======================================================
// Get All Users
// ======================================================

const getUsers = async ({
  includeInactive = true,
} = {}) => {
  const users =
    getUsersCollection();

  const filter = {};

  if (!includeInactive) {
    filter.isActive = true;
  }

  const userList =
    await users
      .find(filter)
      .project({
        password: 0,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

  return userList;
};

// ======================================================
// Get User By ID
// ======================================================

const getUserById = async (
  userId
) => {
  const users =
    getUsersCollection();

  const objectId =
    toObjectId(
      userId,
      "user ID"
    );

  const user =
    await users.findOne(
      {
        _id: objectId,
      },
      {
        projection: {
          password: 0,
        },
      }
    );

  if (!user) {
    throw new Error(
      "User পাওয়া যায়নি"
    );
  }

  return user;
};

// ======================================================
// Create Managed User
// ======================================================

const createUser = async ({
  name,
  email,
  password,
  roleId,
}) => {
  const users =
    getUsersCollection();

  // ==================================================
  // Validation
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

  if (!roleId) {
    throw new Error(
      "User-এর জন্য একটি role নির্বাচন করুন"
    );
  }

  const cleanName =
    name.trim();

  const normalizedEmail =
    email.trim().toLowerCase();

  if (!cleanName) {
    throw new Error(
      "Name খালি রাখা যাবে না"
    );
  }

  if (password.length < 6) {
    throw new Error(
      "Password কমপক্ষে 6 characters হতে হবে"
    );
  }

  // ==================================================
  // Check Existing Email
  // ==================================================

  const existingUser =
    await users.findOne({
      email:
        normalizedEmail,
    });

  if (existingUser) {
    throw new Error(
      "এই email দিয়ে ইতিমধ্যে একটি account রয়েছে"
    );
  }

  // ==================================================
  // Validate Role
  // ==================================================

  const assignedRole =
    await validateRoleAssignment({
      roleId,
    });

  // ==================================================
  // IMPORTANT
  // ==================================================
  //
  // Password hashing should be handled by authService.
  // We don't duplicate bcrypt logic here.
  //
  // This service returns validated user data
  // to the controller/auth layer.
  //
  // ==================================================

  return {
    name: cleanName,

    email:
      normalizedEmail,

    password,

    role:
      assignedRole.role,

    roleId:
      assignedRole.roleId,

    isActive: true,
  };
};

// ======================================================
// Update User
// ======================================================

const updateUser = async (
  userId,
  {
    name,
    email,
  }
) => {
  const users =
    getUsersCollection();

  const objectId =
    toObjectId(
      userId,
      "user ID"
    );

  const user =
    await users.findOne({
      _id: objectId,
    });

  if (!user) {
    throw new Error(
      "User পাওয়া যায়নি"
    );
  }

  const updateData = {};

  // ==================================================
  // Name
  // ==================================================

  if (
    name !== undefined
  ) {
    const cleanName =
      String(name).trim();

    if (!cleanName) {
      throw new Error(
        "Name খালি রাখা যাবে না"
      );
    }

    updateData.name =
      cleanName;
  }

  // ==================================================
  // Email
  // ==================================================

  if (
    email !== undefined
  ) {
    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      throw new Error(
        "Email খালি রাখা যাবে না"
      );
    }

    const emailExists =
      await users.findOne({
        email:
          normalizedEmail,

        _id: {
          $ne: objectId,
        },
      });

    if (emailExists) {
      throw new Error(
        "এই email ইতিমধ্যে অন্য একটি account ব্যবহার করছে"
      );
    }

    updateData.email =
      normalizedEmail;
  }

  // ==================================================
  // Nothing To Update
  // ==================================================

  if (
    Object.keys(updateData)
      .length === 0
  ) {
    throw new Error(
      "Update করার মতো কোনো তথ্য পাওয়া যায়নি"
    );
  }

  updateData.updatedAt =
    new Date();

  // ==================================================
  // Update
  // ==================================================

  await users.updateOne(
    {
      _id: objectId,
    },
    {
      $set: updateData,
    }
  );

  return getUserById(
    userId
  );
};

// ======================================================
// Update User Role
// ======================================================

const updateUserRole = async (
  userId,
  roleId
) => {
  const users =
    getUsersCollection();

  const objectId =
    toObjectId(
      userId,
      "user ID"
    );

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
  // Never modify Admin's role
  // ==================================================

  if (
    user.role === "admin"
  ) {
    throw new Error(
      "Admin user's role পরিবর্তন করা যাবে না"
    );
  }

  // ==================================================
  // Validate New Role
  // ==================================================

  const assignedRole =
    await validateRoleAssignment({
      roleId,
    });

  // ==================================================
  // Update
  // ==================================================

  await users.updateOne(
    {
      _id: objectId,
    },
    {
      $set: {
        role:
          assignedRole.role,

        roleId:
          assignedRole.roleId,

        updatedAt:
          new Date(),
      },
    }
  );

  return getUserById(
    userId
  );
};

// ======================================================
// Update User Status
// ======================================================

const updateUserStatus = async (
  userId,
  isActive
) => {
  const users =
    getUsersCollection();

  const objectId =
    toObjectId(
      userId,
      "user ID"
    );

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
  // Admin Protection
  // ==================================================

  if (
    user.role === "admin"
  ) {
    throw new Error(
      "Admin account deactivate করা যাবে না"
    );
  }

  if (
    typeof isActive !==
    "boolean"
  ) {
    throw new Error(
      "isActive must be boolean"
    );
  }

  await users.updateOne(
    {
      _id: objectId,
    },
    {
      $set: {
        isActive,

        updatedAt:
          new Date(),
      },
    }
  );

  return getUserById(
    userId
  );
};

// ======================================================
// Delete User
// ======================================================
//
// Production recommendation:
// Instead of permanently deleting users,
// deactivate them.
//
// ======================================================

const deleteUser = async (
  userId
) => {
  return updateUserStatus(
    userId,
    false
  );
};

// ======================================================
// Get Available Roles
// ======================================================

const getAvailableRoles = async () => {
  const roles =
    getRolesCollection();

  return roles
    .find({
      isActive: true,

      name: {
        $ne: "admin",
      },
    })
    .project({
      name: 1,
      displayName: 1,
      description: 1,
      permissions: 1,
      isSystemRole: 1,
    })
    .sort({
      displayName: 1,
    })
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