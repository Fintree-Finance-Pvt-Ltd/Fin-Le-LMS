const db = require("../config/db");

const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      // ================================================
      // 1. AUTHENTICATION
      // ================================================

      if (!req.session?.userId) {
        return res.status(401).json({
          message: "Not authenticated",
        });
      }

      const userId = req.session.userId;

      // ================================================
      // 2. GET USER + ROLE
      // ================================================

      const [users] = await db
        .execute(
          `SELECT
              u.id,
              u.role_id,
              u.is_active,

              r.code AS role,
              r.is_active AS role_is_active

           FROM users u

           INNER JOIN roles r
             ON r.id = u.role_id

           WHERE u.id = ?

           LIMIT 1`,
          [userId]
        );

      if (users.length === 0) {
        return res.status(401).json({
          message:
            "User not found or inactive",
        });
      }

      const user = users[0];

      if (!user.is_active) {
        return res.status(403).json({
          message:
            "Your account is inactive",
        });
      }

      if (!user.role_is_active) {
        return res.status(403).json({
          message:
            "Your role is inactive",
        });
      }

      // ================================================
      // 3. ADMIN ALWAYS HAS FULL ACCESS
      // ================================================

      if (user.role === "admin") {
        return next();
      }

      // ================================================
      // 4. CHECK USER-SPECIFIC OVERRIDE FIRST
      // ================================================

      const [userPermissions] =
        await db
          .execute(
            `SELECT
                up.is_allowed

             FROM user_permissions up

             INNER JOIN permissions p
               ON p.id = up.permission_id

             WHERE up.user_id = ?
               AND p.code = ?
               AND p.is_active = 1

             LIMIT 1`,
            [
              userId,
              permissionCode,
            ]
          );

      if (userPermissions.length > 0) {
        if (
          Number(
            userPermissions[0].is_allowed
          ) === 1
        ) {
          return next();
        }

        return res.status(403).json({
          message:
            "You do not have permission to access this resource",
        });
      }

      // ================================================
      // 5. CHECK ROLE DEFAULT PERMISSION
      // ================================================

      const [rolePermissions] =
        await db
          .execute(
            `SELECT
                rp.id

             FROM role_permissions rp

             INNER JOIN permissions p
               ON p.id = rp.permission_id

             WHERE rp.role_id = ?
               AND p.code = ?
               AND p.is_active = 1

             LIMIT 1`,
            [
              user.role_id,
              permissionCode,
            ]
          );

      if (rolePermissions.length === 0) {
        return res.status(403).json({
          message:
            "You do not have permission to access this resource",
        });
      }

      return next();
    } catch (error) {
      console.error(
        "Permission middleware error:",
        error
      );

      return res.status(500).json({
        message:
          "Internal server error",
      });
    }
  };
};

module.exports = requirePermission;
