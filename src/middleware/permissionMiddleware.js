const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// ======================================================
// Permission Middleware
// ======================================================
//
// Usage:
//
// 1. Single Permission Check:
// router.post("/", authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_CREATE), controller.create);
//
// 2. Multiple Permissions Check (Default: ANY / OR logic):
// router.get("/", authMiddleware, requirePermission([PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.INVENTORY_VIEW]), controller.getAll);
//
// 3. Strict Multiple Permissions Check (ALL / AND logic):
// router.delete("/", authMiddleware, requirePermission([PERMISSIONS.PRODUCTS_DELETE, PERMISSIONS.REPORTS_VIEW], { requireAll: true }), controller.delete);
//
// ======================================================

const requirePermission = (requiredPermissions, options = { requireAll: false }) => {
  return async (req, res, next) => {
    try {
      // 1. Authentication Check
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // 2. Admin Superuser Bypass
      // req.user.role/roleName check based on your JWT payload structure
      const userRoleName = (req.user.role || req.user.roleName || "").toLowerCase();
      if (userRoleName === "admin") {
        return next();
      }

      // 3. Validate Inputs
      if (!requiredPermissions) {
        console.error("Permission Middleware Error: No permissions specified");
        return res.status(500).json({
          success: false,
          message: "Invalid permission configuration",
        });
      }

      // Normalize requiredPermissions to Array
      const permissionsToCheck = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // 4. Validate Role ID
      const roleId = req.user.roleId;
      if (!roleId || !ObjectId.isValid(roleId)) {
        return res.status(403).json({
          success: false,
          message: "আপনার account-এর সাথে কোনো বৈধ role assigned নেই",
        });
      }

      // 5. Database Fetch with Projection (Performance Optimization)
      const db = getDB();
      const role = await db.collection("roles").findOne(
        {
          _id: new ObjectId(roleId),
          isActive: true,
        },
        {
          projection: {
            name: 1,
            permissions: 1,
            isSystemRole: 1,
          },
        }
      );

      if (!role) {
        return res.status(403).json({
          success: false,
          message: "আপনার assigned role খুঁজে পাওয়া যায়নি অথবা অ্যাকাউন্টটি inactive",
        });
      }

      // 6. System Role or Wildcard (*) Check
      if (role.isSystemRole || (Array.isArray(role.permissions) && role.permissions.includes("*"))) {
        return next();
      }

      const userPermissions = Array.isArray(role.permissions) ? role.permissions : [];
      const userPermissionSet = new Set(userPermissions);

      // 7. Evaluate Permission Match (O(1) lookups)
      let hasAccess = false;

      if (options.requireAll) {
        // Must have ALL requested permissions (AND logic)
        hasAccess = permissionsToCheck.every((permission) => userPermissionSet.has(permission));
      } else {
        // Must have AT LEAST ONE requested permission (OR logic)
        hasAccess = permissionsToCheck.some((permission) => userPermissionSet.has(permission));
      }

      // 8. Access Denied
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "আপনার এই কাজটি করার permission নেই",
          requiredPermissions: permissionsToCheck,
          role: role.name,
        });
      }

      // 9. Access Granted
      return next();
    } catch (error) {
      console.error("Permission Middleware Error:", error);

      return res.status(500).json({
        success: false,
        message: "Permission verification failed",
      });
    }
  };
};

module.exports = {
  requirePermission,
};