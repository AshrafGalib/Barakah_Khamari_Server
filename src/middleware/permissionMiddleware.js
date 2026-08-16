const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

// ======================================================
// Permission Middleware
// ======================================================
//
// Flow:
//
// JWT
//   ↓
// req.user
//   ↓
// Admin? → Full Access
//   ↓
// roleId
//   ↓
// roles collection
//   ↓
// permissions[]
//   ↓
// Allow / Deny
//
// Usage:
//
// router.post(
//   "/",
//   authMiddleware,
//   requirePermission(
//     PERMISSIONS.PRODUCTS_CREATE
//   ),
//   controller.create
// );
//
// ======================================================

const requirePermission = (
  requiredPermission
) => {
  return async (req, res, next) => {
    try {
      // ==================================================
      // 1. Authentication Check
      // ==================================================

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      // ==================================================
      // 2. Admin Full Access
      // ==================================================
      //
      // Admin automatically has every permission.
      // No database permission lookup required.
      //

      if (req.user.role === "admin") {
        return next();
      }

      // ==================================================
      // 3. Validate Permission
      // ==================================================

      if (
        !requiredPermission ||
        typeof requiredPermission !== "string"
      ) {
        console.error(
          "Invalid permission configuration:",
          requiredPermission
        );

        return res.status(500).json({
          success: false,
          message:
            "Invalid permission configuration",
        });
      }

      // ==================================================
      // 4. Validate roleId
      // ==================================================

      if (!req.user.roleId) {
        return res.status(403).json({
          success: false,
          message:
            "আপনার account-এর সাথে কোনো role assigned নেই",
        });
      }

      let roleObjectId;

      try {
        roleObjectId =
          new ObjectId(req.user.roleId);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message:
            "আপনার assigned role ID invalid",
        });
      }

      // ==================================================
      // 5. Database
      // ==================================================

      const db = getDB();

      const roles =
        db.collection("roles");

      // ==================================================
      // 6. Find Assigned Role
      // ==================================================
      //
      // roleId is the primary relationship.
      //

      const role =
        await roles.findOne({
          _id: roleObjectId,
          isActive: true,
        });

      if (!role) {
        return res.status(403).json({
          success: false,
          message:
            "আপনার assigned role invalid অথবা inactive",
        });
      }

      // ==================================================
      // 7. Check Permission
      // ==================================================

      const permissions =
        Array.isArray(
          role.permissions
        )
          ? role.permissions
          : [];

      const hasPermission =
        permissions.includes(
          requiredPermission
        );

      // ==================================================
      // 8. Permission Denied
      // ==================================================

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message:
            "আপনার এই কাজটি করার permission নেই",

          requiredPermission:
            requiredPermission,

          role: role.name,
        });
      }

      // ==================================================
      // 9. Permission Granted
      // ==================================================

      next();
    } catch (error) {
      console.error(
        "Permission Middleware Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Permission verification failed",
      });
    }
  };
};

// ======================================================
// Export
// ======================================================

module.exports = {
  requirePermission,
};