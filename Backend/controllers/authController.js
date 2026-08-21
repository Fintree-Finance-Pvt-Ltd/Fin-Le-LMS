const db = require("../config/db");
const bcrypt = require("bcrypt");
const ROLES = require("../constants/roles");


// ======================================================
// REGISTER
// ======================================================

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // 2. Normalize values
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return res.status(400).json({
        message: "Valid name and email are required",
      });
    }

    // 3. Check if email already exists
    const [existingUsers] = await db
      .promise()
      .execute(
        `SELECT id
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [cleanEmail]
      );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // 4. Get default USER role
    const [roles] = await db
      .promise()
      .execute(
        `SELECT id, code, name
         FROM roles
         WHERE code = ?
           AND is_active = 1
         LIMIT 1`,
        [ROLES.USER]
      );

    if (roles.length === 0) {
      console.error("Default user role not found");

      return res.status(500).json({
        message: "Default user role is not configured",
      });
    }

    const defaultRole = roles[0];

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // 6. Insert user with role_id
    const [result] = await db
      .promise()
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
          defaultRole.id,
        ]
      );

    // 7. Send response
    return res.status(201).json({
      message: "User registered successfully",

      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        role: defaultRole.code,
        role_name: defaultRole.name,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// ======================================================
// LOGIN
// ======================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // 2. Find user + role
    const [users] = await db
      .promise()
      .execute(
        `SELECT
          u.id,
          u.name,
          u.email,
          u.password,
          u.is_active,
          u.role_id,

          r.code AS role,
          r.name AS role_name

        FROM users u

        INNER JOIN roles r
          ON u.role_id = r.id

        WHERE u.email = ?
          AND r.is_active = 1

        LIMIT 1`,
        [cleanEmail]
      );

    // 3. User doesn't exist
    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // 4. Check account status
    if (!user.is_active) {
      return res.status(403).json({
        message: "Your account is inactive",
      });
    }

    // 5. Compare password
    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 6. Regenerate session
    req.session.regenerate((err) => {
      if (err) {
        console.error(
          "Session regeneration error:",
          err
        );

        return res.status(500).json({
          message: "Internal server error",
        });
      }

      // Store important authentication data
      req.session.userId = user.id;
      req.session.roleId = user.role_id;
      req.session.role = user.role;

      // 7. Save session
      req.session.save((err) => {
        if (err) {
          console.error(
            "Session save error:",
            err
          );

          return res.status(500).json({
            message: "Internal server error",
          });
        }

        return res.status(200).json({
          message: "Login successful",

          user: {
            id: user.id,
            name: user.name,
            email: user.email,

            role_id: user.role_id,
            role: user.role,
            role_name: user.role_name,

            is_active: user.is_active,
          },
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// ======================================================
// GET CURRENT USER
// ======================================================

// ======================================================
// GET CURRENT USER
// ======================================================

const getMe = async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    // ==================================================
    // 1. GET USER + ROLE
    // ==================================================

    const [users] = await db
      .promise()
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

         WHERE u.id = ?
           AND u.is_active = 1
           AND r.is_active = 1

         LIMIT 1`,
        [userId]
      );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found or inactive",
      });
    }

    const user = users[0];

    // ==================================================
    // 2. GET ROLE PERMISSIONS
    // ==================================================

    const [rolePermissions] = await db
      .promise()
      .execute(
        `SELECT
            p.id,
            p.code,
            p.name,
            p.route

         FROM role_permissions rp

         INNER JOIN permissions p
           ON p.id = rp.permission_id

         WHERE rp.role_id = ?
           AND p.is_active = 1`,
        [user.role_id]
      );

    // ==================================================
    // 3. GET USER-SPECIFIC PERMISSION OVERRIDES
    // ==================================================

    const [userPermissions] = await db
      .promise()
      .execute(
        `SELECT
            p.id,
            p.code,
            p.name,
            p.route,
            up.is_allowed

         FROM user_permissions up

         INNER JOIN permissions p
           ON p.id = up.permission_id

         WHERE up.user_id = ?
           AND p.is_active = 1`,
        [userId]
      );

    // ==================================================
    // 4. BUILD EFFECTIVE PERMISSIONS
    // ==================================================

    const permissionMap = new Map();

    // First add normal role permissions
    for (const permission of rolePermissions) {
      permissionMap.set(
        permission.code,
        permission
      );
    }

    // User-specific permissions override role permissions
    for (const permission of userPermissions) {
      if (Number(permission.is_allowed) === 1) {
        permissionMap.set(
          permission.code,
          {
            id: permission.id,
            code: permission.code,
            name: permission.name,
            route: permission.route,
          }
        );
      } else {
        // Explicit user-level deny
        permissionMap.delete(
          permission.code
        );
      }
    }

    const effectivePermissions =
      Array.from(permissionMap.values());

    // Simple array used by frontend
    const permissionCodes =
      effectivePermissions.map(
        (permission) => permission.code
      );

    // ==================================================
    // 5. RESPONSE
    // ==================================================

    return res.status(200).json({
      user: {
        ...user,

        permissions: permissionCodes,

        permission_details:
          effectivePermissions,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// ======================================================
// LOGOUT
// ======================================================

const logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        message: "Could not logout",
      });
    }

    res.clearCookie("connect.sid", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  });
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  register,
  login,
  getMe,
  logout,
};