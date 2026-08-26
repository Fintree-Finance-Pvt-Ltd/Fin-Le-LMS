const requireAuth = (req, res, next) => {
  console.log("\n========== AUTH DEBUG ==========");
  console.log("URL:", req.originalUrl);
  console.log("Session ID:", req.sessionID);
  console.log("Session:", req.session);
  console.log("Session userId:", req.session?.userId);
  console.log("Session roleId:", req.session?.roleId);
  console.log("Cookie header:", req.headers.cookie);
  console.log("================================\n");
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  next();
};

module.exports = requireAuth;