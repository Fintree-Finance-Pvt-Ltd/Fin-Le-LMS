const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const userRole = req.session.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};

module.exports = allowRoles;