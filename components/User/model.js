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
    user: { type: String, unique: true },
    nickname: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["user", "editor", "admin"], default: "user" },
    password: String,
    firstName: String,
    lastName: String,
    profilePicture: { type: String, default: '' } // URL or path to profile picture
});

// Create the User model for database operations
const User = mongoose.model("User", UserSchema);

// ===== DATABASE FUNCTIONS =====

// Check if username and password combination exists in database
// Returns true if user found and password matches, false otherwise
async function authenticateUser(username, pw) {
    // Find the user by username
    let user = await User.findOne({ user: username });
    
    // If user doesn't exist, return false
    if (!user) return false;
    
    // Compare the provided password with the stored hashed password
    // bcrypt.compare() returns true if passwords match, false otherwise
    let isPasswordValid = await bcrypt.compare(pw, user.password);
    
    return isPasswordValid;
};

// Find a user by username
// Returns the user object if found, false if not found
async function getUser(username) {
    // Search database for user by username
    let resault = await User.findOne({user: username});
    return (resault) ? resault : false;
}

// Create a new user account
// Returns true if successful, false if user already exists
async function addUser(username, pw, f_Name, l_name, nick_name) {
    // Check if username already exists
    let user = await getUser(username);
    console.log(user);
    if (!user) {
        // Hash the password using bcryptjs (generates salt automatically)
        // The number 10 is the "cost factor" - higher = slower but more secure (10 is recommended)
        let hashedPassword = await bcrypt.hash(pw, 10);
        
        // Create new user object
        let newUser = new User({
            user: username,
            password: hashedPassword,
            firstName: f_Name,
            lastName: l_name,
            nickname:nick_name
        });

        // Save user to database
        let resault = await newUser.save();
        // Return true if save was successful
        return (resault === newUser) ? true : false;
    } else {
        // Username already taken
        return false;
    }
}

// Delete a user from database (admin only)
// Returns true if successful, false if user not found
async function deleteUser(username) {
    // Delete the user from database
    let result = await User.deleteOne({ user: username });
    
    // Return true if one user was deleted, false if no user found
    return result.deletedCount === 1;
}

// Update user information (admin only)
// Returns true if successful, false if user not found
async function updateUser(username, newUsername) {
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
    
    // Update the user's password in database
    let result = await User.updateOne(
        { user: username },
        { password: hashedPassword }
    );
    
    // Return true if one user was updated, false if no user found
    return result.modifiedCount === 1;
}

//GET User firstname, last name after login
const getUserByEmail = async (email) => {
    return await User.findOne({user: email});
};

export default {
    authenticateUser,
    getUser,
    getUserById,
    addUser,
    getAllUsers,
    resetPassword,
    resetPasswordById,
    deleteUser,
    deleteUserById,
    updateUser,
    updateUserById,
    getUserByEmail
    ,updateProfilePicture
};

