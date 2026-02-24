// ===== TIKTOK OAUTH CONTROLLER (Fixed for Web & Redis) =====
import axios from "axios";
import crypto from "crypto";
import readerModel from "./model.js";

// ==============================
// STEP 1: Generate Auth URL
// ==============================
const getAuthUrl = (request, response) => {
    // Generate state and save it to Redis-backed session
    const csrfState = crypto.randomBytes(16).toString("hex");
    request.session.tiktokCsrfState = csrfState;

    // Explicitly save the session to Redis before redirecting
    // This ensures the state is there when the user returns
    request.session.save((err) => {
        if (err) {
            console.error("Session save error:", err);
            return response.status(500).json({ error: "Could not initialize session" });
        }

        const params = new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY,
            scope: "user.info.basic", 
            response_type: "code",
            redirect_uri: process.env.TIKTOK_REDIRECT_URI, // Must be the BACKEND callback URL
            state: csrfState,
        });

        const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

        // REDIRECT directly so the cookie is established on fastoadmin
        response.redirect(authUrl);
    });
};

// ==============================
// STEP 2: Handle Callback
// ==============================
const handleCallback = async (request, response) => {
    const frontendUrl = process.env.FRONTEND_URL || "https://fastodigama.up.railway.app";
    
    try {
        const { code, state, error } = request.query;

        // Handle TikTok Errors
        if (error) {
            return response.redirect(`${frontendUrl}/auth/tiktok/error?error=${error}`);
        }

        // 1. Verify CSRF State (Now pulled from Redis)
        if (!state || state !== request.session.tiktokCsrfState) {
            console.error("State Mismatch!", { 
                received: state, 
                expected: request.session.tiktokCsrfState 
            });
            return response.redirect(`${frontendUrl}/auth/tiktok/error?error=invalid_state`);
        }

        // 2. Clean up
        delete request.session.tiktokCsrfState;

        // 3. Exchange code for access token
        const tokenResponse = await axios.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: process.env.TIKTOK_REDIRECT_URI,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const { access_token } = tokenResponse.data;

        // 4. Get User Info
        const userResponse = await axios.get(
            "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
            { headers: { Authorization: `Bearer ${access_token}` } }
        );

        const user = userResponse.data?.data?.user;

        // 5. Database Logic
        const reader = await readerModel.findOrCreateReader(
            user.open_id,
            user.display_name,
            user.avatar_url
        );

        // 6. Set Local Session (This will be shared via Redis)
        request.session.readerLoggedIn = true;
        request.session.readerId = reader._id.toString();
        request.session.displayName = reader.displayName;
        request.session.avatarUrl = reader.avatarUrl;

        // Save session before redirecting back to Frontend
        request.session.save(() => {
            response.redirect(`${frontendUrl}/auth/tiktok/success`);
        });

    } catch (error) {
        console.error("TikTok OAuth Error:", error.response?.data || error.message);
        response.redirect(`${frontendUrl}/auth/tiktok/error`);
    }
};

// ==============================
// Helper Methods (Same as before)
// ==============================
const getCurrentReader = (request, response) => {
    if (!request.session.readerLoggedIn) {
        return response.status(401).json({ error: "Not logged in" });
    }
    response.json({
        id: request.session.readerId,
        displayName: request.session.displayName,
        avatarUrl: request.session.avatarUrl,
    });
};

const logoutReader = (request, response) => {
    request.session.destroy(() => {
        response.clearCookie("FastodigamaSession"); // Matches your session 'name'
        response.json({ success: true });
    });
};

export default { getAuthUrl, handleCallback, getCurrentReader, logoutReader };