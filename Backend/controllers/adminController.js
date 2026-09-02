const db = require("../config/db");
const bcrypt = require("bcrypt");

const getAdminDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Admin dashboard data",
      role: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ======================================================
// CREATE USER BY ADMIN
// ======================================================

const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role_id,
    } = req.body;

    // ==================================================
    // 1. VALIDATE REQUIRED FIELDS
    // ==================================================

    if (
      !name ||
      !email ||
      !password ||
      !role_id
    ) {
      return res.status(400).json({
        message:
          "Name, email, password and role are required",
      });
    }

    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const selectedRoleId =
      Number(role_id);

    if (
      !cleanName ||
      !cleanEmail ||
      !Number.isInteger(selectedRoleId) ||
      selectedRoleId <= 0
    ) {
      return res.status(400).json({
        message:
          "Invalid user details or role",
      });
    }

    // ==================================================
    // 2. CHECK EMAIL ALREADY EXISTS
    // ==================================================

    const [existingUsers] = await db
      .execute(
        `SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [cleanEmail]
      );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message:
          "Email is already registered",
      });
    }

    // ==================================================
    // 3. VALIDATE SELECTED ROLE
    // ==================================================

    const [roles] = await db
      .execute(
        `SELECT
            id,
            code,
            name
         FROM roles
         WHERE id = ?
           AND is_active = 1
         LIMIT 1`,
        [selectedRoleId]
      );

    if (roles.length === 0) {
      return res.status(400).json({
        message:
          "Invalid or inactive role",
      });
    }

    const selectedRole =
      roles[0];

    // ==================================================
    // 4. HASH PASSWORD
    // ==================================================

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    // ==================================================
    // 5. CREATE USER
    // ==================================================

    const [result] = await db
      .execute(
        `INSERT INTO users (
            name,
            email,
            password,
            role_id
         )
         VALUES (?, ?, ?, ?)`,
        [
          cleanName,
          cleanEmail,
          hashedPassword,
          selectedRole.id,
        ]
      );

    // ==================================================
    // 6. RESPONSE
    // ==================================================

    return res.status(201).json({
      message:
        "User created successfully",

      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,

        role_id:
          selectedRole.id,

        role:
          selectedRole.code,

        role_name:
          selectedRole.name,
      },
    });
  } catch (error) {
    console.error(
      "Create user error:",
      error
    );

    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
};

// ======================================================
// GET ACTIVE ROLES
// ======================================================

const getRoles = async (req, res) => {
  try {
    const [roles] = await db
      .execute(
        `SELECT
            id,
            code,
            name,
            description
         FROM roles
         WHERE is_active = 1
         ORDER BY name`
      );

    return res.status(200).json({
      roles,
    });
  } catch (error) {
    console.error("Get roles error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

//GET USERS

const getUsers = async (req, res) => {
  try {
    const [users] = await db
      .execute(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.is_active,
            u.created_at,
            u.role_id,

            r.code AS role,
            r.name AS role_name

         FROM users u

         INNER JOIN roles r
           ON r.id = u.role_id

         ORDER BY u.created_at DESC`
      );

    return res.status(200).json({
      users,
    });
  } catch (error) {
    console.error(
      "Get users error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

//GET PERMISSIONS

const getPermissions = async (
  req,
  res
) => {
  try {
    const [permissions] = await db
      .execute(
        `SELECT
            id,
            code,
            name,
            description,
            route

         FROM permissions

         WHERE is_active = 1

         ORDER BY id`
      );

    return res.status(200).json({
      permissions,
    });
  } catch (error) {
    console.error(
      "Get permissions error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// USRSPERMISSION
const getUserPermissions = async (
  req,
  res
) => {
  try {
    const userId =
      Number(req.params.id);

    if (!userId) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const [users] = await db
      .execute(
        `SELECT
            u.id,
            u.role_id,
            r.code AS role,
            r.name AS role_name

         FROM users u

         INNER JOIN roles r
           ON r.id = u.role_id

         WHERE u.id = ?

         LIMIT 1`,
        [userId]
      );

    if (!users.length) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const currentUser = users[0];

    const [rolePermissions] =
      await db
        .execute(
          `SELECT
              p.id,
              p.code,
              p.name,
              p.description,
              p.route

           FROM role_permissions rp

           INNER JOIN permissions p
             ON p.id =
                rp.permission_id

           WHERE rp.role_id = ?
             AND p.is_active = 1`,
          [currentUser.role_id]
        );

    const [userPermissions] =
      await db
        .execute(
          `SELECT
              p.id,
              p.code,
              p.name,
              p.description,
              p.route,
              up.is_allowed

           FROM user_permissions up

           INNER JOIN permissions p
             ON p.id =
                up.permission_id

           WHERE up.user_id = ?
             AND p.is_active = 1`,
          [userId]
        );

    const permissionMap =
      new Map();

    for (
      const permission
      of rolePermissions
    ) {
      permissionMap.set(
        permission.id,
        permission
      );
    }

    for (
      const permission
      of userPermissions
    ) {
      if (
        Number(
          permission.is_allowed
        ) === 1
      ) {
        permissionMap.set(
          permission.id,
          permission
        );
      } else {
        permissionMap.delete(
          permission.id
        );
      }
    }

    return res.status(200).json({
      user: currentUser,

      role_permissions:
        rolePermissions,

      user_permissions:
        userPermissions,

      effective_permissions:
        Array.from(
          permissionMap.values()
        ),
    });
  } catch (error) {
    console.error(
      "Get user permissions error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ======================================================
// UPDATE USER PERMISSIONS
// ======================================================

const updateUserPermissions = async (req, res) => {
  const connection =
    await db.getConnection();

  try {
    const userId = Number(req.params.id);

    const {
      permission_ids,
    } = req.body;

    // ==================================================
    // 1. VALIDATION
    // ==================================================

    if (!userId) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({
        message:
          "permission_ids must be an array",
      });
    }

    // Convert to numbers and remove duplicates
    const selectedPermissionIds = [
      ...new Set(
        permission_ids.map(Number)
      ),
    ];

    if (
      selectedPermissionIds.some(
        (id) => !Number.isInteger(id)
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid permission ID supplied",
      });
    }

    // ==================================================
    // 2. START TRANSACTION
    // ==================================================

    await connection.beginTransaction();

    // ==================================================
    // 3. FIND TARGET USER
    // ==================================================

    const [users] =
      await connection.execute(
        `SELECT
            id,
            role_id,
            is_active
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [userId]
      );

    if (users.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "User not found",
      });
    }

    const targetUser = users[0];

    // ==================================================
    // 4. GET ALL ACTIVE PERMISSIONS
    // ==================================================

    const [allPermissions] =
      await connection.execute(
        `SELECT
            id
         FROM permissions
         WHERE is_active = 1`
      );

    const validPermissionIds =
      allPermissions.map(
        (permission) =>
          Number(permission.id)
      );

    // ==================================================
    // 5. CHECK THAT PROVIDED IDS ARE VALID
    // ==================================================

    const invalidPermissionIds =
      selectedPermissionIds.filter(
        (id) =>
          !validPermissionIds.includes(id)
      );

    if (invalidPermissionIds.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "One or more permission IDs are invalid",
        invalid_permission_ids:
          invalidPermissionIds,
      });
    }

    // ==================================================
    // 6. GET DEFAULT ROLE PERMISSIONS
    // ==================================================

    const [rolePermissions] =
      await connection.execute(
        `SELECT
            permission_id
         FROM role_permissions
         WHERE role_id = ?`,
        [targetUser.role_id]
      );

    const rolePermissionIds =
      rolePermissions.map(
        (permission) =>
          Number(
            permission.permission_id
          )
      );

    // ==================================================
    // 7. DELETE OLD USER OVERRIDES
    // ==================================================

    await connection.execute(
      `DELETE FROM user_permissions
       WHERE user_id = ?`,
      [userId]
    );

    // ==================================================
    // 8. CREATE ONLY REQUIRED OVERRIDES
    // ==================================================

    for (
      const permissionId
      of validPermissionIds
    ) {
      const roleAllows =
        rolePermissionIds.includes(
          permissionId
        );

      const adminSelected =
        selectedPermissionIds.includes(
          permissionId
        );

      /*
        CASE 1:
        Role already allows it
        Admin also selected it

        => no user_permissions row needed


        CASE 2:
        Role doesn't allow it
        Admin didn't select it

        => no user_permissions row needed
      */

      if (roleAllows === adminSelected) {
        continue;
      }

      /*
        CASE 3:
        Role doesn't allow
        but Admin selected

        => ADD permission
        is_allowed = 1


        CASE 4:
        Role allows
        but Admin unchecked

        => DENY permission
        is_allowed = 0
      */

      await connection.execute(
        `INSERT INTO user_permissions (
            user_id,
            permission_id,
            is_allowed,
            created_by
         )
         VALUES (?, ?, ?, ?)`,
        [
          userId,
          permissionId,
          adminSelected ? 1 : 0,
          req.session.userId,
        ]
      );
    }

    // ==================================================
    // 9. COMMIT
    // ==================================================

    await connection.commit();

    return res.status(200).json({
      message:
        "User permissions updated successfully",
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(
        "Permission rollback error:",
        rollbackError
      );
    }

    console.error(
      "Update user permissions error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAdminDashboard,
  createUser,
  getRoles,
  getUserPermissions,
  getUsers,
  getPermissions,
  updateUserPermissions,
};
