// ===== TIKTOK OAUTH CONTROLLER =====
// Handles server-side TikTok OAuth flow (more secure)

import axios from "axios";
import crypto from "crypto";
import readerModel from "./model.js";

// Generate code verifier for PKCE (43-128 characters)
const generateCodeVerifier = () => {
    return crypto.randomBytes(64).toString('hex').substring(0, 128);
};

// Generate code challenge from verifier (SHA256 hex)
const generateCodeChallenge = (verifier) => {
    return crypto.createHash('sha256').update(verifier).digest('hex');
};

// Generate authorization URL
const getAuthUrl = (request, response) => {
    const csrfState = Math.random().toString(36).substring(2);
    request.session.tiktokCsrfState = csrfState;
    
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Store code verifier in session for later use
    request.session.tiktokCodeVerifier = codeVerifier;
    
    const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        scope: 'user.info.profile',
        response_type: 'code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI,
        state: csrfState,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });
    
    const authUrl = `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;
    
    response.json({ authUrl });
};

// Handle OAuth callback (server-side token exchange)
const handleCallback = async (request, response) => {
    try {
        const { code, state } = request.query;
        
        // Verify CSRF state
        if (state !== request.session.tiktokCsrfState) {
            return response.status(400).json({ error: "Invalid state parameter" });
        }
        
        // Get code verifier from session
        const codeVerifier = request.session.tiktokCodeVerifier;
        
        // Clear CSRF state and code verifier
        delete request.session.tiktokCsrfState;
        delete request.session.tiktokCodeVerifier;
        
        if (!codeVerifier) {
            return response.status(400).json({ error: "Missing code verifier" });
        }
        
        // Exchange authorization code for access token
        const tokenResponse = await axios.post(
            'https://open.tiktokapis.com/v2/oauth/token/',
            new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.TIKTOK_REDIRECT_URI,
                code_verifier: codeVerifier,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            }
        );
        
        const { access_token } = tokenResponse.data;
        
        if (!access_token) {
            return response.status(400).json({ error: "Failed to get access token" });
        }
        
        // Get user info from TikTok
        const userResponse = await axios.get(
            'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,bio_description',
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                }
            }
        );
        
        const userData = userResponse.data;
        
        if (!userData.data || !userData.data.user) {
            return response.status(400).json({ error: "Failed to get user info" });
        }
        
        const user = userData.data.user;
        
        // Find or create reader in database
        const reader = await readerModel.findOrCreateReader(
            user.open_id,
            user.display_name,
            user.avatar_url,
            user.bio_description
        );
        
        // Store reader info in session
        request.session.readerLoggedIn = true;
        request.session.readerId = reader._id.toString();
        request.session.tiktokId = reader.tiktokId;
        request.session.displayName = reader.displayName;
        request.session.avatarUrl = reader.avatarUrl;
        
        // Redirect to frontend success page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        response.redirect(`${frontendUrl}/auth/tiktok/success`);
        
    } catch (error) {
        console.error("OAuth callback error:", error.response?.data || error.message);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        response.redirect(`${frontendUrl}/auth/tiktok/error`);
    }
};

// Get current reader info
const getCurrentReader = (request, response) => {
    if (!request.session.readerLoggedIn) {
        return response.status(401).json({ error: "Not logged in" });
    }
    
    response.json({
        id: request.session.readerId,
        tiktokId: request.session.tiktokId,
        displayName: request.session.displayName,
        avatarUrl: request.session.avatarUrl
    });
};

// Logout reader
const logoutReader = (request, response) => {
    request.session.readerLoggedIn = false;
    request.session.readerId = null;
    request.session.tiktokId = null;
    request.session.displayName = null;
    request.session.avatarUrl = null;
    response.json({ success: true });
};

export default {
    getAuthUrl,
    handleCallback,
    getCurrentReader,
    logoutReader
};
