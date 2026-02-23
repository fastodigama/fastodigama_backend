import express from "express";
import readerController from "./controller.js";
import oauthController from "./oauthController.js";

const router = express.Router();

// ===== READER ROUTES =====
// TikTok visitor authentication and session management

// ===== SERVER-SIDE OAUTH (Recommended for Production) =====

// GET: Get TikTok authorization URL
// GET /api/reader/auth/tiktok
router.get("/auth/tiktok", oauthController.getAuthUrl);

// GET: Handle TikTok OAuth callback (server-side)
// TikTok redirects here with authorization code
// GET /api/reader/auth/tiktok/callback
router.get("/auth/tiktok/callback", oauthController.handleCallback);

// ===== CLIENT-SIDE OAUTH (For Testing/Simple Integration) =====

// POST: Handle TikTok OAuth callback
// Frontend sends TikTok user info here
// POST /api/reader/tiktok-callback
router.post("/tiktok-callback", readerController.tiktokCallback);

// ===== SHARED ROUTES =====

// GET: Logout current reader
// GET /api/reader/logout
router.get("/logout", oauthController.logoutReader);

// GET: Get current logged-in reader info
// GET /api/reader/me
router.get("/me", oauthController.getCurrentReader);

export default router;
