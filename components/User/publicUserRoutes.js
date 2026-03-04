
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
	// Generate PKCE code_verifier (43-128 chars, base64url)
	const codeVerifier = crypto.randomBytes(64).toString('base64url');
	// Generate code_challenge (SHA256, base64url)
	const codeChallenge = crypto
		.createHash('sha256')
		.update(codeVerifier)
		.digest()
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
	// Store state and code_verifier in short-lived cookies (1 minute)
	res.cookie('tiktokCsrfState', csrfState, { maxAge: 60000, httpOnly: true, sameSite: 'lax' });
	res.cookie('tiktokCodeVerifier', codeVerifier, { maxAge: 60000, httpOnly: true, sameSite: 'lax' });
	const params = new URLSearchParams({
		client_key: process.env.TIKTOK_CLIENT_KEY,
		scope: "user.info.basic",
		response_type: "code",
		redirect_uri: process.env.TIKTOK_REDIRECT_URI,
		state: csrfState,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256'
	});
	res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
});

// Step 2: TikTok callback
router.get("/auth/tiktok/callback", async (req, res) => {
	const { code, state } = req.query;
	if (!code) return res.status(400).send("Missing code");
	// Verify CSRF state from cookie
	const csrfCookie = req.cookies.tiktokCsrfState;
	const codeVerifier = req.cookies.tiktokCodeVerifier;
	if (!state || !csrfCookie || state !== csrfCookie || !codeVerifier) {
		return res.status(400).send("Invalid state or PKCE parameter. Possible CSRF or PKCE attack.");
	}
	// Clear state and code_verifier cookies
	res.clearCookie('tiktokCsrfState');
	res.clearCookie('tiktokCodeVerifier');
	try {
		// Exchange code for access token (with PKCE)
		let tokenRes;
		try {
			tokenRes = await axios.post(
				"https://open.tiktokapis.com/v2/oauth/token/",
				new URLSearchParams({
					client_key: process.env.TIKTOK_CLIENT_KEY,
					client_secret: process.env.TIKTOK_CLIENT_SECRET,
					code,
					grant_type: "authorization_code",
					redirect_uri: process.env.TIKTOK_REDIRECT_URI,
					code_verifier: codeVerifier
				}),
				{ headers: { "Content-Type": "application/x-www-form-urlencoded" } }
			);
		} catch (tokenErr) {
			// Log full axios error details
			if (tokenErr.response) {
				console.error("TikTok token exchange error:", tokenErr.response.data);
				return res.status(400).send("TikTok token exchange failed: " + JSON.stringify(tokenErr.response.data));
			} else {
				console.error("TikTok token exchange error:", tokenErr);
				return res.status(400).send("TikTok token exchange failed: " + tokenErr.message);
			}
		}
		// TikTok sometimes returns access_token at root, sometimes under data
		let accessToken = tokenRes.data?.data?.access_token || tokenRes.data?.access_token;
		if (!accessToken) {
			console.error("Token exchange failed (no access_token):", tokenRes.data);
			// Show the full TikTok API error response in the browser for debugging
			return res.status(400).send("TikTok token exchange failed: " + JSON.stringify(tokenRes.data));
		}
		// Get user info
		let userRes, tiktokUser, userDoc;
		try {
			userRes = await axios.get(
				"https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name,avatar_url",
				{ headers: { Authorization: `Bearer ${accessToken}` } }
			);
			tiktokUser = userRes.data.data.user;
		} catch (userErr) {
			console.error("TikTok user info error:", userErr?.response?.data || userErr);
			return res.status(500).send("TikTok user info failed: " + JSON.stringify(userErr?.response?.data || userErr.message));
		}
		try {
			userDoc = await User.findOneAndUpdate(
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
		} catch (dbErr) {
			console.error("DB upsert error:", dbErr);
			return res.status(500).send("DB upsert failed: " + dbErr.message);
		}
		// Set session
		req.session.loggedIn = true;
		req.session.user = userDoc.user;
		req.session.role = userDoc.role;
		// Redirect to frontend user page
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000/user";
		res.redirect(frontendUrl);
	} catch (err) {
		console.error("TikTok OAuth error", err?.response?.data || err);
		res.status(500).send("TikTok login failed");
	}
});

export default router;
