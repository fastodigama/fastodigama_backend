// Update user's profile picture by user ID
// Returns true if successful, false if user not found
async function updateProfilePicture(userId, fileName) {
    let result = await User.updateOne(
        { _id: userId },
        { profilePicture: fileName }
    );
    return result.modifiedCount === 1;
}
// Find a user by ID
// Returns the user object if found, false if not found
async function getUserById(id) {
    let result = await User.findById(id);
    return result ? result : false;
}

// Update user information by ID (admin only)
// Returns true if successful, false if user not found or username taken
async function updateUserById(id, newUsername, firstName, lastName, newNickname) {
    // Normalize email to lowercase
    newUsername = newUsername.toLowerCase();
    // Check if new username or nickname already exists (only if changing)
    let user = await User.findById(id);
    if (!user) return false;
    if (user.user !== newUsername) {
        let existingUser = await User.findOne({ user: newUsername });
        if (existingUser) return false;
    }
    if (newNickname && user.nickname !== newNickname) {
        let existingNickname = await User.findOne({ nickname: newNickname });
        if (existingNickname) return false;
    }
    let result = await User.updateOne(
        { _id: id },
        { user: newUsername, firstName, lastName, ...(newNickname && { nickname: newNickname }) }
    );
    return result.modifiedCount === 1;
}

// Delete a user by ID (admin only)
// Returns true if successful, false if user not found
async function deleteUserById(id) {
    let result = await User.deleteOne({ _id: id });
    return result.deletedCount === 1;
}

// Reset a user's password by ID (admin only)
// Returns true if successful, false if user not found
async function resetPasswordById(id, newPassword) {
    let hashedPassword = await bcrypt.hash(newPassword, 10);
    let result = await User.updateOne(
        { _id: id },
        { password: hashedPassword }
    );
    return result.modifiedCount === 1;
}
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ===== USER MODEL & SCHEMA =====
// Define user structure: username and encrypted password
const UserSchema = new mongoose.Schema({
    user: { type: String, unique: true, sparse: true }, // email or username
    password: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    nickname: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["user", "editor", "admin"], default: "user" },
    profilePicture: { type: String, default: '' },
    lastRepliesSeenAt: { type: Date, default: null },
    lastLikesSeenAt: { type: Date, default: null }
});

// Create the User model for database operations
const User = mongoose.model("User", UserSchema);

// Export the real Mongoose model for direct DB operations
// Export User as both default and named for compatibility
export {
    User,
    authenticateUser,
    getUser,
    addUser,
    deleteUser,
    deleteUserById,
    updateUser,
    getAllUsers,
    resetPassword,
    getUserByEmail,
    findOrCreateGoogleUser,
    syncGoogleProfilePicture,
    updateProfilePicture,
    getUserById,
    updateUserById,
    resetPasswordById,
    markRepliesSeen,
    markLikesSeen
};

export default {
    User,
    authenticateUser,
    getUser,
    addUser,
    deleteUser,
    deleteUserById,
    updateUser,
    getAllUsers,
    resetPassword,
    getUserByEmail,
    findOrCreateGoogleUser,
    syncGoogleProfilePicture,
    updateProfilePicture,
    getUserById,
    updateUserById,
    resetPasswordById,
    markRepliesSeen,
    markLikesSeen
};

// ===== ENSURE INDEXES =====
// Call this function on app startup to ensure unique indexes exist
async function ensureIndexes() {
    try {
        await User.collection.createIndex({ user: 1 }, { unique: true });
        await User.collection.createIndex({ nickname: 1 }, { unique: true, sparse: true });
        console.log('✅ User indexes ensured');
    } catch (error) {
        console.error('Error creating user indexes:', error);
    }
}

// ===== DATABASE FUNCTIONS =====

// Check if username and password combination exists in database
// Returns true if user found and password matches, false otherwise
async function authenticateUser(username, pw) {
    // Find the user by username (normalized to lowercase)
    let user = await User.findOne({ user: username.toLowerCase() });
    
    // If user doesn't exist, return false
    if (!user) return false;
    if (!user.password) return false;
    
    // Compare the provided password with the stored hashed password
    // bcrypt.compare() returns true if passwords match, false otherwise
    let isPasswordValid = await bcrypt.compare(pw, user.password);
    
    return isPasswordValid;
};

// Find a user by username
// Returns the user object if found, false if not found
async function getUser(username) {
    // Search database for user by username (normalized to lowercase)
    let resault = await User.findOne({user: username.toLowerCase()});
    return (resault) ? resault : false;
}

// Create a new user account
// Returns true if successful, false if user already exists
async function addUser(username, pw, f_Name, l_name, nick_name) {
    try {
        // Normalize email to lowercase
        username = username.toLowerCase();
        // Check if username already exists
        let user = await getUser(username);
        if (user) {
            // Username already taken
            return false;
        }
        
        // Check if nickname already exists (if provided)
        if (nick_name) {
            let existingNickname = await User.findOne({ nickname: nick_name });
            if (existingNickname) {
                return false;
            }
        }
        
        // Hash the password using bcryptjs (generates salt automatically)
        // The number 10 is the "cost factor" - higher = slower but more secure (10 is recommended)
        let hashedPassword = await bcrypt.hash(pw, 10);
        
        // Create new user object
        let newUser = new User({
            user: username,
            password: hashedPassword,
            firstName: f_Name,
            lastName: l_name,
            nickname: nick_name
        });

        // Save user to database
        let result = await newUser.save();
        // Return true if save was successful
        return result ? true : false;
    } catch (error) {
        // Handle duplicate key errors from MongoDB
        if (error.code === 11000) {
            console.error('Duplicate key error:', error.keyPattern);
            return false;
        }
        console.error('Error adding user:', error);
        return false;
    }
}

// Delete a user from database (admin only)
// Returns true if successful, false if user not found
async function deleteUser(username) {
    // Delete the user from database (normalized to lowercase)
    let result = await User.deleteOne({ user: username.toLowerCase() });
    
    // Return true if one user was deleted, false if no user found
    return result.deletedCount === 1;
}

// Update user information (admin only)
// Returns true if successful, false if user not found
async function updateUser(username, newUsername) {
    // Normalize emails to lowercase
    username = username.toLowerCase();
    newUsername = newUsername.toLowerCase();
    // Check if new username already exists (only if changing the username)
    if (newUsername !== username) {
        let existingUser = await getUser(newUsername);
        if (existingUser) {
            return false; // New username already taken
        }
    }
    
    // Update the user's username in database
    let result = await User.updateOne(
        { user: username },
        { user: newUsername }
    );
    
    // Return true if one user was updated, false if no user found
    return result.modifiedCount === 1;
}
// Get all users
// Returns an array of all users (password hashes are not exposed)
async function getAllUsers() {
    let users = await User.find({}, { password: 0 }); // Exclude password field from result
    return users;
}

// Reset a user's password (admin only)
// Returns true if successful, false if user not found
async function resetPassword(username, newPassword) {
    // Hash the new password
    let hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password in database (normalized to lowercase)
    let result = await User.updateOne(
        { user: username.toLowerCase() },
        { password: hashedPassword }
    );
    
    // Return true if one user was updated, false if no user found
    return result.modifiedCount === 1;
}


//GET User firstname, last name after login
async function getUserByEmail(email) {
    return await User.findOne({user: email.toLowerCase()});
}

function slugifyNicknamePart(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .trim();
}

async function generateUniqueNickname(firstName, lastName, email) {
    const emailPrefix = String(email || "").split("@")[0];
    const base =
        slugifyNicknamePart(`${firstName}${lastName}`) ||
        slugifyNicknamePart(emailPrefix) ||
        `user${Date.now()}`;

    let candidate = base.slice(0, 24) || `user${Date.now()}`;
    let suffix = 0;

    while (await User.findOne({ nickname: candidate })) {
        suffix += 1;
        const suffixText = String(suffix);
        const trimmedBase = base.slice(0, Math.max(1, 24 - suffixText.length));
        candidate = `${trimmedBase}${suffixText}`;
    }

    return candidate;
}

async function findOrCreateGoogleUser({ email, firstName, lastName }) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ user: normalizedEmail });
    if (existingUser) {
        return existingUser;
    }

    const nickname = await generateUniqueNickname(firstName, lastName, normalizedEmail);
    const newUser = new User({
        user: normalizedEmail,
        firstName,
        lastName,
        nickname,
        role: "user",
    });

    return await newUser.save();
}

function isValidExternalProfilePicture(value) {
    if (!value || typeof value !== "string") {
        return false;
    }

    try {
        const parsed = new URL(value.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

function shouldRefreshFromGoogle(profilePicture) {
    if (!profilePicture || String(profilePicture).trim() === "") {
        return true;
    }

    const normalized = String(profilePicture).trim();
    if (!isValidExternalProfilePicture(normalized)) {
        return true;
    }

    return normalized.includes("googleusercontent.com");
}

async function syncGoogleProfilePicture(user, googlePhotoUrl) {
    if (!user || !isValidExternalProfilePicture(googlePhotoUrl)) {
        return user;
    }

    if (!shouldRefreshFromGoogle(user.profilePicture)) {
        return user;
    }

    user.profilePicture = googlePhotoUrl.trim();
    await user.save();
    return user;
}

async function markRepliesSeen(userId) {
    let result = await User.updateOne(
        { _id: userId },
        { lastRepliesSeenAt: new Date() }
    );
    return result.modifiedCount === 1;
}

async function markLikesSeen(userId) {
    let result = await User.updateOne(
        { _id: userId },
        { lastLikesSeenAt: new Date() }
    );
    return result.modifiedCount === 1;
}

// (No default export of utility functions, only the real User model)

