// ===== TIKTOK VISITOR CONTROLLER (Master Version) =====
import axios from "axios";
import crypto from "crypto";
import readerModel from "./model.js";

// 1. Redirect user to TikTok
const getAuthUrl = (request, response) => {
    const csrfState = crypto.randomBytes(16).toString("hex");
    request.session.tiktokCsrfState = csrfState;

    request.session.save((err) => {
        if (err) return response.status(500).json({ error: "Session error" });

        const params = new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY,
            scope: "user.info.basic",
            response_type: "code",
            redirect_uri: process.env.TIKTOK_REDIRECT_URI,
            state: csrfState,
        });

        response.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
    });
};

// 2. Handle the redirect back from TikTok
const handleCallback = async (request, response) => {
    const frontendUrl = process.env.FRONTEND_URL || "https://fastodigama.up.railway.app";
    try {
        const { code, state, error } = request.query;

        if (error) return response.redirect(`${frontendUrl}/auth/tiktok/error?error=${error}`);

        // Verify State
        if (!state || state !== request.session.tiktokCsrfState) {
            return response.redirect(`${frontendUrl}/auth/tiktok/error?error=invalid_state`);
        }
        delete request.session.tiktokCsrfState;

        // Exchange code for token
        const tokenRes = await axios.post("https://open.tiktokapis.com/v2/oauth/token/",
            new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: process.env.TIKTOK_REDIRECT_URI,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        // Get User Info
        const userRes = await axios.get("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
            headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
        });

        const user = userRes.data?.data?.user;

        // DB Logic
        const reader = await readerModel.findOrCreateReader(user.open_id, user.display_name, user.avatar_url);

        // Set Session
        request.session.readerLoggedIn = true;
        request.session.readerId = reader._id.toString();
        request.session.displayName = reader.displayName;
        request.session.avatarUrl = reader.avatarUrl;

        request.session.save(() => {
            response.redirect(`${frontendUrl}/auth/tiktok/success`);
        });

    } catch (error) {
        console.error("Auth Error:", error.message);
        response.redirect(`${frontendUrl}/auth/tiktok/error`);
    }
};

// 3. Status Check (For the Frontend Header)
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

// 4. Logout
const logoutReader = (request, response) => {
    request.session.destroy(() => {
        response.clearCookie("FastodigamaSession");
        response.json({ success: true });
    });
};

export default { getAuthUrl, handleCallback, getCurrentReader, logoutReader };
