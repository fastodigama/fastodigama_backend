import express from "express";
import { apiLogConsent, apiGetConsents, apiGetConsentsForUser } from "./controller.js";

const router = express.Router();

// ===== CONSENT ROUTES =====
// GDPR consent tracking and management

// POST: Log a consent record
// POST /api/consent
// Body: { consentType: "analytics" | "marketing" | "all", granted: true/false }
router.post("/", apiLogConsent);

// GET: Get current user's consent history
// GET /api/consent
router.get("/", apiGetConsents);

// GET: Get consent history for any user (admin only)
// GET /api/admin/consent/:userId
router.get("/admin/:userId", apiGetConsentsForUser);

export default router;
