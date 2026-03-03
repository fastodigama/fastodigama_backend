import mongoose from "mongoose";

// ===== CONSENT MODEL & SCHEMA =====
// Logs user consent for GDPR compliance
// Stores when user gave consent for analytics, marketing, etc.

const ConsentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    consentType: {
        type: String,
        enum: ["analytics", "marketing", "all"],
        required: true
    },
    granted: {
        type: Boolean,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    ipAddress: {
        type: String,
        required: false
    },
    userAgent: {
        type: String,
        required: false
    }
});

// Create index for efficient querying by user
ConsentSchema.index({ userId: 1, timestamp: -1 });

const Consent = mongoose.model("Consent", ConsentSchema);

// ===== CONSENT FUNCTIONS =====

// Log a new consent record
async function logConsent(userId, consentType, granted, ipAddress, userAgent) {
    const consent = new Consent({
        userId,
        consentType,
        granted,
        ipAddress,
        userAgent,
        timestamp: new Date()
    });
    
    const result = await consent.save();
    return result ? result : false;
}

// Get all consent records for a user
async function getConsentsByUserId(userId) {
    return await Consent.find({ userId })
        .sort({ timestamp: -1 })
        .lean();
}

// Get latest consent for a specific type
async function getLatestConsent(userId, consentType) {
    return await Consent.findOne({ userId, consentType })
        .sort({ timestamp: -1 })
        .lean();
}

// Delete all consent records for a user (for GDPR deletion)
async function deleteConsentsByUserId(userId) {
    const result = await Consent.deleteMany({ userId });
    return result.deletedCount;
}

export default {
    logConsent,
    getConsentsByUserId,
    getLatestConsent,
    deleteConsentsByUserId
};
