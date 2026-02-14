import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ===== USER MODEL =====
// Defines the database schema and functions to manage user accounts

// Define user structure: username and encrypted password
const UserSchema = new mongoose.Schema({
    user: String,
    password: String
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
async function addUser(username, pw) {
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
            password: hashedPassword
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

export default {
    authenticateUser,
    getUser,
    addUser
};