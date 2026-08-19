require("dotenv").config();
const { connectDB, getDB } = require("../config/db");
const PERMISSIONS = require("../constants/permissionConstants");

// ======================================================
// System Roles & Permissions Definition
// ======================================================
const INITIAL_ROLES = [
  {
    name: "Super Admin",
    slug: "super_admin",
    description: "System full access with all permissions",
    isSystemRole: true,
    isActive: true,
    permissions: ["*"], // Wildcard permission for total access
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Manager with access to view, create, and update resources",
    isSystemRole: false,
    isActive: true,
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      // আপনার সিস্টেমে অন্য যেসব পারমিশন আছে তা এখানে যুক্ত করতে পারেন
    ],
  },
  {
    name: "Staff",
    slug: "staff",
    description: "Basic operational staff access",
    isSystemRole: false,
    isActive: true,
    permissions: [
      PERMISSIONS.USERS_VIEW,
    ],
  },
];

// ======================================================
// Seed Script Logic
// ======================================================
const seedRoles = async () => {
  try {
    console.log("Connecting to Database...");
    await connectDB();
    const db = getDB();
    const rolesCollection = db.collection("roles");

    console.log("Seeding system roles...");

    for (const roleData of INITIAL_ROLES) {
      const now = new Date();

      // Upsert: তৈরি না থাকলে ক্রিয়েট করবে, থাকলে পারমিশন আপডেট করবে
      await rolesCollection.updateOne(
        { slug: roleData.slug },
        {
          $set: {
            name: roleData.name,
            description: roleData.description,
            isSystemRole: roleData.isSystemRole,
            isActive: roleData.isActive,
            permissions: roleData.permissions,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      );

      console.log(`✅ Role seeded/updated: ${roleData.name}`);
    }

    console.log("\n🎉 Roles seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedRoles();