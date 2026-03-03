import consentModel from "./model.js";

// ==============================
// API: Log Consent
// ==============================
// POST /api/consent
// Body: { consentType: "analytics" | "marketing" | "all", granted: true/false }
const apiLogConsent = async (req, res) => {
    if (!req.session.loggedIn || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: "Not authenticated" 
        });
    }

    const { consentType, granted } = req.body;
    
    if (!consentType || typeof granted !== "boolean") {
        return res.status(400).json({ 
            success: false, 
            message: "Missing or invalid fields (consentType, granted required)" 
        });
    }

    if (!["analytics", "marketing", "all"].includes(consentType)) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid consentType. Must be 'analytics', 'marketing', or 'all'" 
        });
    }

    try {
        // Get user ID from session
        const userModel = (await import("../User/model.js")).default;
        const user = await userModel.getUserByEmail(req.session.user);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        // Get IP address and user agent
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get("user-agent");

        const consent = await consentModel.logConsent(
            user._id,
            consentType,
            granted,
            ipAddress,
            userAgent
        );

        if (consent) {
            res.json({ 
                success: true, 
                message: "Consent logged",
                consent: {
                    consentType: consent.consentType,
                    granted: consent.granted,
                    timestamp: consent.timestamp
                }
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: "Failed to log consent" 
            });
        }
    } catch (err) {
        console.error("LOG CONSENT ERROR:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
};

// ==============================
// API: Get User's Consent History
// ==============================
// GET /api/consent
const apiGetConsents = async (req, res) => {
    if (!req.session.loggedIn || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: "Not authenticated" 
        });
    }

    try {
        // Get user ID from session
        const userModel = (await import("../User/model.js")).default;
        const user = await userModel.getUserByEmail(req.session.user);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        const consents = await consentModel.getConsentsByUserId(user._id);

        res.json({ 
            success: true, 
            consents: consents.map(c => ({
                consentType: c.consentType,
                granted: c.granted,
                timestamp: c.timestamp,
                ipAddress: c.ipAddress,
                userAgent: c.userAgent
            }))
        });
    } catch (err) {
        console.error("GET CONSENTS ERROR:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
};

// ==============================
// ADMIN: Get Consent History for Any User
// ==============================
// GET /api/admin/consent/:userId
const apiGetConsentsForUser = async (req, res) => {
    if (!req.session.loggedIn || req.session.role !== "admin") {
        return res.status(403).json({ 
            success: false, 
            message: "Admin access required" 
        });
    }

    try {
        const userId = req.params.userId;
        const consents = await consentModel.getConsentsByUserId(userId);

        res.json({ 
            success: true, 
            consents: consents.map(c => ({
                consentType: c.consentType,
                granted: c.granted,
                timestamp: c.timestamp,
                ipAddress: c.ipAddress,
                userAgent: c.userAgent
            }))
        });
    } catch (err) {
        console.error("GET CONSENTS FOR USER ERROR:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
};

export {
    apiLogConsent,
    apiGetConsents,
    apiGetConsentsForUser
};
