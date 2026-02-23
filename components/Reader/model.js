import mongoose from "mongoose";

// ===== READER MODEL =====
// Defines the schema for TikTok visitors (separate from Admin Users)

const ReaderSchema = new mongoose.Schema({
    tiktokId: {
        type: String,
        unique: true,
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    avatarUrl: {
        type: String,
        default: null
    },
    bio: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Reader = mongoose.model("Reader", ReaderSchema);

// ===== DATABASE FUNCTIONS =====

// Find or create a reader by TikTok ID
// Returns the reader object
async function findOrCreateReader(tiktokId, displayName, avatarUrl, bio = "") {
    let reader = await Reader.findOne({ tiktokId });
    
    if (!reader) {
        // Create new reader if doesn't exist
        reader = new Reader({
            tiktokId,
            displayName,
            avatarUrl,
            bio
        });
        await reader.save();
    } else {
        // Update existing reader's info if changed
        reader.displayName = displayName;
        reader.avatarUrl = avatarUrl;
        reader.bio = bio;
        await reader.save();
    }
    
    return reader;
}

// Get a reader by ID
async function getReaderById(readerId) {
    return await Reader.findById(readerId);
}

// Get a reader by TikTok ID
async function getReaderByTiktokId(tiktokId) {
    return await Reader.findOne({ tiktokId });
}

// Get all readers
async function getAllReaders() {
    return await Reader.find({});
}

export default {
    findOrCreateReader,
    getReaderById,
    getReaderByTiktokId,
    getAllReaders
};
