import express from "express";
import readerController from "./controller.js";

const router = express.Router();

// ===== READER ROUTES =====
// TikTok visitor authentication and session management

// GET: Get TikTok authorization URL
router.get("/auth/tiktok", readerController.getAuthUrl);

// GET: Handle TikTok OAuth callback (server-side)
router.get("/auth/tiktok/callback", readerController.handleCallback);

// GET: Logout current reader
router.get("/logout", readerController.logoutReader);

// GET: Get current logged-in reader info
router.get("/me", readerController.getCurrentReader);

export default router;
