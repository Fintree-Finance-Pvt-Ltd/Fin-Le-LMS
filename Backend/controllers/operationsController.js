const getOperationsDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Operations dashboard data",
      role: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error("Operations dashboard error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getOperationsDashboard,
};