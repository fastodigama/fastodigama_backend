import mongoose from "mongoose";
import { scryptSync } from "crypto";

const UserSchema = new mongoose.Schema({
    user: String,
    password: String
});

const User = mongoose.model("User", UserSchema);

//Function to match a user and hashed pw in the DB
//Returns true if user match is found or false

async function authenticateUser(username, pw) {
    let key = scryptSync(pw, process.env.SALT, 64);
    //check for existing user with matching hashed password
    let resault = await User.findOne({
        user: username,
        password: key.toString("base64")
    });

    return (resault) ? true : false;
};

// Function to return user by username, return false if not found in collection

async function getUser(username) {
        //check if username exist
        let resault = await User.findOne({user: username});

        return (resault) ? resault : false;
}

//ADD USER

async function addUser(username, pw) {

    //add user if username doesn't exist
    let user = await getUser(username);
    console.log(user);
    if(!user){
        let key = scryptSync (pw, process.env.SALT, 64);
        let newUser = new User({
            user: username,
            password: key.toString("base64")
        });

        let resault = await newUser.save(); // save user to DB

        return (resault === newUser) ? true : false; //if the resault is equal to the newUser i created return true
    }else {
        return false;
    }
    
}

export default {
    authenticateUser,
    getUser,
    addUser
};