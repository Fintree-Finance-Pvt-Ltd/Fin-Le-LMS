const getCreditDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Credit dashboard data",
      role: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error("Credit dashboard error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getCreditDashboard,
};