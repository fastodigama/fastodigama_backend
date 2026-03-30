const requireAdmin = (req, res, next) => {
  if (!req.session?.loggedIn) {
    if (req.accepts("html")) {
      return res.redirect("/login");
    }

    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  if (req.session.role !== "admin") {
    if (req.accepts("html")) {
      return res.status(403).render("common/unauthorized", {
        title: "Not Authorized",
        currentPath: req.path,
      });
    }

    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

export default requireAdmin;
