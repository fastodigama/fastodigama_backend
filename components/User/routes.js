// This file is now empty. All user routes have been split into publicUserRoutes.js and adminUserRoutes.js.
// You may safely remove this file if not needed.

export default {};
router.post("/api/login", userController.apiLogin);

//frontend logout
router.post("/api/logout", userController.apiLogout);

export default router;

