
import express from "express";
import * as userController from "./controller.js";
import crypto from "crypto";
import axios from "axios";
import { User } from "./model.js";

const router = express.Router();

// Public user routes
router.get("/user", userController.getUser);
router.get("/login", userController.loginForm);
router.post("/login", userController.login);
router.get("/register", userController.registerForm);
router.post("/register", userController.register);
router.get("/logout", userController.logout);



// API: Upload user profile picture (authenticated users only)
router.post("/api/user/profile-picture", userController.uploadProfilePicture);

// API: Update user firstname and lastname (authenticated users only)
router.post("/api/user/profile", userController.apiUpdateUserProfile);

// GDPR API: Export user data (Right to Portability)
router.get("/api/user/export", userController.apiExportUserData);

// GDPR API: Delete user account (Right to be Forgotten)
router.delete("/api/user/account", userController.apiDeleteUserAccount);

router.post("/api/login", userController.apiLogin);

// API: Get current user info as JSON (for frontend session check)
router.get("/api/user", userController.apiGetUser);
router.post("/api/logout", userController.apiLogout);


export default router;
