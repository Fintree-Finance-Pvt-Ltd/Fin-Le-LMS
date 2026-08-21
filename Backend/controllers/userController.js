const getUserDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      message: "User dashboard data",
      role: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error("User dashboard error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getUserDashboard,
};