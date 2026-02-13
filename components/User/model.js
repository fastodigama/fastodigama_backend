import mongoose from "mongoose";
import { scryptSync } from "crypto";

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
    // Encrypt the password using SALT from environment
    let key = scryptSync(pw, process.env.SALT, 64);
    // Search database for user with matching username and encrypted password
    let resault = await User.findOne({
        user: username,
        password: key.toString("base64")
    });

    return (resault) ? true : false;
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
    if(!user){
        // Encrypt password using SALT
        let key = scryptSync(pw, process.env.SALT, 64);
        // Create new user object
        let newUser = new User({
            user: username,
            password: key.toString("base64")
        });

        // Save user to database
        let resault = await newUser.save();
        // Return true if save was successful
        return (resault === newUser) ? true : false;
    }else {
        // Username already taken
        return false;
    }
    
}

export default {
    authenticateUser,
    getUser,
    addUser
};