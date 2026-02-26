import express from "express";
import userController from "./controller.js";

const router = express.Router();

// Admin user management routes (all require authentication)
router.get("/admin/users", userController.getAllUsers);
router.get("/admin/users/reset/:id", userController.resetPasswordForm);
router.post("/admin/users/reset/:id", userController.resetPassword);
router.get("/admin/users/edit/:id", userController.editUserForm);
router.post("/admin/users/edit/:id", userController.editUser);
router.get("/admin/users/delete/:id", userController.deleteUser);

export default router;
