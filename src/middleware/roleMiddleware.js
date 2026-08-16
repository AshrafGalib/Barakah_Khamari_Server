// ======================================================
// Role Middleware
// ======================================================
//
// Usage:
//
// router.post(
//   "/",
//   authMiddleware,
//   requireRole("admin"),
//   controller
// );
//
// IMPORTANT:
// Permission-based access control-এর জন্য
// permissionMiddleware.js ব্যবহার করবে.
//
// roleMiddleware.js শুধুমাত্র role-specific
// restriction-এর জন্য ব্যবহার হবে.
// ======================================================

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // ==================================================
      // Authentication Check
      // ==================================================

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      // ==================================================
      // Validate Configuration
      // ==================================================

      if (
        !allowedRoles.length
      ) {
        console.error(
          "No roles configured for requireRole()"
        );

        return res.status(500).json({
          success: false,
          message:
            "Role configuration is invalid",
        });
      }

      // ==================================================
      // Check User Role
      // ==================================================

      if (
        !allowedRoles.includes(
          req.user.role
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "আপনার এই কাজটি করার role permission নেই",
        });
      }

      // ==================================================
      // Role Granted
      // ==================================================

      next();
    } catch (error) {
      console.error(
        "Role Middleware Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Role verification failed",
      });
    }
  };
};

// ======================================================
// Admin Only
// ======================================================

const adminOnly = (
  req,
  res,
  next
) => {
  return requireRole(
    "admin"
  )(
    req,
    res,
    next
  );
};

// ======================================================
// Export
// ======================================================

module.exports = {
  requireRole,
  adminOnly,
};