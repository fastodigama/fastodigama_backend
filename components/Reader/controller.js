// ===== READER CONTROLLER =====
// Handles TikTok visitor authentication and session

import readerModel from "./model.js";

// Handle TikTok login callback
// This is called after TikTok OAuth redirect
const tiktokCallback = async (request, response) => {
    try {
        // In a real app, you'd get this from TikTok's OAuth response
        const { tiktokId, displayName, avatarUrl, bio } = request.body;
        
        // Validate required fields
        if (!tiktokId || !displayName) {
            return response.status(400).json({ 
                error: "Missing required TikTok fields" 
            });
        }
        
        // Find or create the reader
        const reader = await readerModel.findOrCreateReader(
            tiktokId,
            displayName,
            avatarUrl,
            bio
        );
        
        // Store reader info in session
        request.session.readerLoggedIn = true;
        request.session.readerId = reader._id.toString();
        request.session.tiktokId = reader.tiktokId;
        request.session.displayName = reader.displayName;
        
        response.json({
            success: true,
            reader: {
                id: reader._id,
                tiktokId: reader.tiktokId,
                displayName: reader.displayName,
                avatarUrl: reader.avatarUrl
            }
        });
    } catch (error) {
        console.error("TikTok callback error:", error);
        response.status(500).json({ error: "Login failed" });
    }
};

// Logout reader
const logoutReader = (request, response) => {
    request.session.readerLoggedIn = false;
    request.session.readerId = null;
    response.json({ success: true });
};

// Get current reader info
const getCurrentReader = (request, response) => {
    if (!request.session.readerLoggedIn) {
        return response.status(401).json({ error: "Not logged in" });
    }
    
    response.json({
        id: request.session.readerId,
        tiktokId: request.session.tiktokId,
        displayName: request.session.displayName
    });
};

export default {
    tiktokCallback,
    logoutReader,
    getCurrentReader
};
