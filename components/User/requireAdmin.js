const requireAdmin = (req, res, next) => {
  if (!req.session?.loggedIn) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  if (req.session.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

export default requireAdmin;
