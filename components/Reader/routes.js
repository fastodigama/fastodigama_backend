import express from "express";
import readerController from "./controller.js";

const router = express.Router();

// ===== READER ROUTES =====
// TikTok visitor authentication and session management

// POST: Handle TikTok OAuth callback
// Frontend sends TikTok user info here
// POST /api/reader/tiktok-callback
router.post("/tiktok-callback", readerController.tiktokCallback);

// POST: Logout current reader
// GET /api/reader/logout
router.get("/logout", readerController.logoutReader);

// GET: Get current logged-in reader info
// GET /api/reader/me
router.get("/me", readerController.getCurrentReader);

export default router;
