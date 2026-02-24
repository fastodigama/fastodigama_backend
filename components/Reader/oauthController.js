// ===== TIKTOK OAUTH CONTROLLER (Fixed for Web) =====
import axios from "axios";
import crypto from "crypto";
import readerModel from "./model.js";

// ==============================
// STEP 1: Generate Auth URL
// ==============================
const getAuthUrl = (request, response) => {
    // Generate a secure random state for CSRF protection
    const csrfState = crypto.randomBytes(16).toString("hex");
    
    // Store in session (Better than a cookie for server-side verification)
    request.session.tiktokCsrfState = csrfState;

    const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        // Match the comma-separated format from docs
        scope: "user.info.basic", 
        response_type: "code",
        redirect_uri: process.env.TIKTOK_REDIRECT_URI,
        state: csrfState,
    });

    // Added trailing slash after 'authorize' to match documentation exactly
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

    response.json({ authUrl });
};

// ==============================
// STEP 2: Handle Callback
// ==============================
const handleCallback = async (request, response) => {
    try {
        const { code, state, error, error_description } = request.query;
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        // Handle TikTok Errors (e.g., user denied permission)
        if (error) {
            return response.redirect(`${frontendUrl}/auth/tiktok/error?error=${error}`);
        }

        // 1. Verify CSRF State
        if (!state || state !== request.session.tiktokCsrfState) {
            return response.status(400).json({ error: "Invalid state parameter" });
        }

        // 2. Clean up session state immediately after use
        delete request.session.tiktokCsrfState;

        if (!code) {
            return response.status(400).json({ error: "Missing authorization code" });
        }

        // 3. Exchange code for access token
        // Documentation uses application/x-www-form-urlencoded
        const tokenResponse = await axios.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: process.env.TIKTOK_REDIRECT_URI,
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );

        const { access_token, open_id } = tokenResponse.data;

        if (!access_token) {
            return response.status(400).json({ error: "Failed to get access token" });
        }

        // 4. Get user info (Using the V2 User Info endpoint)
        const userResponse = await axios.get(
            "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
            {
                headers: { Authorization: `Bearer ${access_token}` },
            }
        );

        const user = userResponse.data?.data?.user;

        if (!user) {
            throw new Error("User data not found in TikTok response");
        }

        // 5. Database Logic
        const reader = await readerModel.findOrCreateReader(
            user.open_id,
            user.display_name,
            user.avatar_url
        );

        // 6. Set Local Session
        request.session.readerLoggedIn = true;
        request.session.readerId = reader._id.toString();
        request.session.tiktokId = reader.tiktokId;
        request.session.displayName = reader.displayName;
        request.session.avatarUrl = reader.avatarUrl;

        response.redirect(`${frontendUrl}/auth/tiktok/success`);

    } catch (error) {
        console.error("TikTok OAuth Error:", error.response?.data || error.message);
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

export default { getAuthUrl, handleCallback, getCurrentReader, logoutReader };