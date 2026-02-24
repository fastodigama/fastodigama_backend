// ===== TIKTOK OAUTH CONTROLLER =====
// Handles server-side TikTok OAuth flow (secure PKCE + CSRF)

import axios from "axios";
import crypto from "crypto";
import readerModel from "./model.js";

// ==============================
// PKCE HELPERS
// ==============================

// Generate code verifier (43–128 chars)
const generateCodeVerifier = () => {
    return crypto.randomBytes(64).toString("base64url");
};

// Generate code challenge (Base64URL SHA256)
const generateCodeChallenge = (verifier) => {
    const hash = crypto
        .createHash("sha256")
        .update(verifier)
        .digest();

    return hash
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
};

// ==============================
// STEP 1: Generate Auth URL
// ==============================
const getAuthUrl = (request, response) => {
    const csrfState = crypto.randomBytes(16).toString("hex");
    request.session.tiktokCsrfState = csrfState;

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    request.session.tiktokCodeVerifier = codeVerifier;

    const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        scope: "user.info.basic,user.info.profile",
        response_type: "code",
        redirect_uri: process.env.TIKTOK_REDIRECT_URI,
        state: csrfState,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });

    const authUrl = `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;

    response.json({ authUrl });
};

// ==============================
// STEP 2: Handle Callback
// ==============================
const handleCallback = async (request, response) => {
    try {
        const { code, state, error, error_description } = request.query;

        console.log("=== TikTok Callback Debug ===");
        console.log("Code:", code);
        console.log("State:", state);
        console.log("Error:", error);
        console.log("Error Description:", error_description);
        console.log("Session State:", request.session.tiktokCsrfState);
        console.log("============================");

        if (error) {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            return response.redirect(
                `${frontendUrl}/auth/tiktok/error?error=${error}`
            );
        }

        if (!code) {
            return response.status(400).json({ error: "Missing authorization code" });
        }

        if (state !== request.session.tiktokCsrfState) {
            return response.status(400).json({ error: "Invalid state parameter" });
        }

        const codeVerifier = request.session.tiktokCodeVerifier;

        delete request.session.tiktokCsrfState;
        delete request.session.tiktokCodeVerifier;

        if (!codeVerifier) {
            return response.status(400).json({ error: "Missing code verifier" });
        }

        // ==============================
        // Exchange code for access token
        // ==============================
        const tokenResponse = await axios.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: process.env.TIKTOK_REDIRECT_URI,
                code_verifier: codeVerifier,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token } = tokenResponse.data;

        if (!access_token) {
            return response.status(400).json({ error: "Failed to get access token" });
        }

        // ==============================
        // Get user info
        // ==============================
        const userResponse = await axios.get(
            "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,bio_description",
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );

        const user = userResponse.data?.data?.user;

        if (!user) {
            return response.status(400).json({ error: "Failed to get user info" });
        }

        // ==============================
        // Find or create user
        // ==============================
        const reader = await readerModel.findOrCreateReader(
            user.open_id,
            user.display_name,
            user.avatar_url,
            user.bio_description
        );

        // ==============================
        // Save session
        // ==============================
        request.session.readerLoggedIn = true;
        request.session.readerId = reader._id.toString();
        request.session.tiktokId = reader.tiktokId;
        request.session.displayName = reader.displayName;
        request.session.avatarUrl = reader.avatarUrl;

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        response.redirect(`${frontendUrl}/auth/tiktok/success`);
    } catch (error) {
        console.error("OAuth callback error:", error.response?.data || error.message);

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        response.redirect(`${frontendUrl}/auth/tiktok/error`);
    }
};

// ==============================
// Get current reader
// ==============================
const getCurrentReader = (request, response) => {
    if (!request.session.readerLoggedIn) {
        return response.status(401).json({ error: "Not logged in" });
    }

    response.json({
        id: request.session.readerId,
        tiktokId: request.session.tiktokId,
        displayName: request.session.displayName,
        avatarUrl: request.session.avatarUrl,
    });
};

// ==============================
// Logout
// ==============================
const logoutReader = (request, response) => {
    request.session.destroy(() => {
        response.json({ success: true });
    });
};

export default {
    getAuthUrl,
    handleCallback,
    getCurrentReader,
    logoutReader,
};