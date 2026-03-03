
import express from "express";
import * as userController from "./controller.js";
import crypto from "crypto";
import axios from "axios";
import User from "./model.js";

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

// TikTok OAuth routes
// Step 1: Redirect to TikTok with CSRF state in cookie (TikTok recommended)
router.get("/auth/tiktok", (req, res) => {
	// Generate a secure random CSRF state token (30 bytes, base64url)
	const csrfState = crypto.randomBytes(30).toString('base64url');
	// Store state in a short-lived cookie (1 minute)
	res.cookie('tiktokCsrfState', csrfState, { maxAge: 60000, httpOnly: true, sameSite: 'lax' });
	const params = new URLSearchParams({
		client_key: process.env.TIKTOK_CLIENT_KEY,
		scope: "user.info.basic",
		response_type: "code",
		redirect_uri: process.env.TIKTOK_REDIRECT_URI,
		state: csrfState
	});
	res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
});

// Step 2: TikTok callback
router.get("/auth/tiktok/callback", async (req, res) => {
	const { code, state } = req.query;
	if (!code) return res.status(400).send("Missing code");
	// Verify CSRF state from cookie
	const csrfCookie = req.cookies.tiktokCsrfState;
	if (!state || !csrfCookie || state !== csrfCookie) {
		return res.status(400).send("Invalid state parameter. Possible CSRF attack.");
	}
	// Clear state cookie
	res.clearCookie('tiktokCsrfState');
	try {
		// Exchange code for access token
		const tokenRes = await axios.post(
			"https://open.tiktokapis.com/v2/oauth/token/",
			new URLSearchParams({
				client_key: process.env.TIKTOK_CLIENT_KEY,
				client_secret: process.env.TIKTOK_CLIENT_SECRET,
				code,
				grant_type: "authorization_code",
				redirect_uri: process.env.TIKTOK_REDIRECT_URI
			}),
			{ headers: { "Content-Type": "application/x-www-form-urlencoded" } }
		);
		const accessToken = tokenRes.data.data.access_token;
		// Get user info
		const userRes = await axios.get(
			"https://open.tiktokapis.com/v2/user/info/",
			{ headers: { Authorization: `Bearer ${accessToken}` } }
		);
		const tiktokUser = userRes.data.data.user;
		// Upsert user in DB
		const userDoc = await User.findOneAndUpdate(
			{ oauthProvider: "tiktok", oauthId: tiktokUser.open_id },
			{
				oauthProvider: "tiktok",
				oauthId: tiktokUser.open_id,
				nickname: tiktokUser.display_name || tiktokUser.username,
				oauthAvatar: tiktokUser.avatar_url,
				// Optionally set user field to tiktok_openid for uniqueness
				user: `tiktok_${tiktokUser.open_id}`
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);
		// Set session
		req.session.loggedIn = true;
		req.session.user = userDoc.user;
		req.session.role = userDoc.role;
		res.redirect("/user");
	} catch (err) {
		console.error("TikTok OAuth error", err?.response?.data || err);
		res.status(500).send("TikTok login failed");
	}
});

export default router;
