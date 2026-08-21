const db = require("../config/db");
const PERMISSIONS = require(
  "../config/permissions"
);

const syncPermissions = async () => {
  const connection =
    await db.promise().getConnection();

  try {
    console.log(
      "Synchronizing permissions..."
    );

    await connection.beginTransaction();

    // ================================================
    // 1. SYNC PERMISSION CATALOGUE
    // ================================================

    for (const permission of PERMISSIONS) {
      await connection.execute(
        `INSERT INTO permissions (
            code,
            name,
            description,
            route,
            is_active
         )
         VALUES (?, ?, ?, ?, 1)

         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            route = VALUES(route),
            is_active = 1`,
        [
          permission.code,
          permission.name,
          permission.description || null,
          permission.route || null,
        ]
      );
    }

    // ================================================
    // 2. FIND ADMIN ROLE
    // ================================================

    const [adminRoles] =
      await connection.execute(
        `SELECT id
         FROM roles
         WHERE code = 'admin'
           AND is_active = 1
         LIMIT 1`
      );

    if (adminRoles.length > 0) {
      const adminRoleId =
        adminRoles[0].id;

      // ==============================================
      // 3. ADMIN GETS EVERY ACTIVE PERMISSION
      // ==============================================

      await connection.execute(
        `INSERT IGNORE INTO role_permissions (
            role_id,
            permission_id
         )

         SELECT
            ?,
            p.id

         FROM permissions p

         WHERE p.is_active = 1`,
        [adminRoleId]
      );
    }

    await connection.commit();

    console.log(
      "Permissions synchronized successfully"
    );
  } catch (error) {
    await connection.rollback();

    console.error(
      "Permission synchronization failed:",
      error
    );

    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  syncPermissions,
};