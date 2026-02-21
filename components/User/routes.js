import express, { Router } from "express";

// ===== USER ROUTES =====
// Defines all URL paths related to user authentication (/user, /login, /register, /logout)

const router = express.Router();

import userController from "./controller.js"

// Show user profile page (protected route - requires login)
// GET /user
router.get("/user", userController.getUser);

// Show login form
// GET /login
router.get("/login", userController.loginForm);

// Handle login form submission
// POST /login
router.post("/login", userController.login);

// Show registration form
// GET /register
router.get("/register", userController.registerForm);

// Handle registration form submission
// POST /register
router.post("/register", userController.register);

// Logout: destroy session
// GET /logout
router.get("/logout", userController.logout);

// Admin: Show all users
// GET /admin/users
router.get("/admin/users", userController.getAllUsers);

// Admin: Show password reset form
// GET /admin/users/reset?username=...
router.get("/admin/users/reset", userController.resetPasswordForm);

// Admin: Handle password reset
// POST /admin/users/reset
router.post("/admin/users/reset", userController.resetPassword);

// Admin: Show edit user form
// GET /admin/users/edit?username=...
router.get("/admin/users/edit", userController.editUserForm);

// Admin: Handle user edit
// POST /admin/users/edit
router.post("/admin/users/edit", userController.editUser);

// Admin: Delete user
// GET /admin/users/delete?username=...
router.get("/admin/users/delete", userController.deleteUser);

export default router;

