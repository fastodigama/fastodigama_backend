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

export default router;

