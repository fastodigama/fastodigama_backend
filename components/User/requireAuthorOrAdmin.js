const requireAuthorOrAdmin = (req, res, next) => {
  if (!req.session?.loggedIn) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  if (!["author", "admin"].includes(req.session.role)) {
    return res.status(403).json({
      success: false,
      message: "Author or admin access required",
    });
  }

  next();
};

export default requireAuthorOrAdmin;
