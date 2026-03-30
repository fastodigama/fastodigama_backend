const requireAuthorOrAdmin = (req, res, next) => {
  if (!req.session?.loggedIn) {
    if (req.accepts("html")) {
      return res.redirect("/login");
    }

    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  if (!["author", "admin"].includes(req.session.role)) {
    if (req.accepts("html")) {
      return res.status(403).render("common/unauthorized", {
        title: "Not Authorized",
        currentPath: req.path,
      });
    }

    return res.status(403).json({
      success: false,
      message: "Author or admin access required",
    });
  }

  next();
};

export default requireAuthorOrAdmin;
