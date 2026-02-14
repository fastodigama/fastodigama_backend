import userModel from "./model.js";

// ===== USER CONTROLLER =====
// Handles user authentication (login, register, logout)

// Show the user profile page (only for logged-in users)
const getUser = async (request, response) => {
  // Display user account page
  response.render("user/user", { currentPath: request.path, title: "My Account" });
};

// Show the login form
const loginForm = async (request, response) => {
  // Display login page
  response.render("user/login", { currentPath: request.path , title: "Login"});
};

// Handle login form submission
const login = async (request, response) => {
  // Check if username and password are correct
  let authStatus = await userModel.authenticateUser(
    request.body.u,
    request.body.pw,
  );

  if (authStatus) {
    // Login successful: store user in session
    request.session.loggedIn = true;
    request.session.user = request.body.u;
    
    // Redirect back to where user was trying to go, or to /user if no previous page
    const redirectUrl = request.session.redirectUrl || "/user";
    delete request.session.redirectUrl; // Clear the stored URL after using it
    response.redirect(redirectUrl);
  } else {
    // Login failed: show error message on login form
    response.render("user/login", { err: "user not found", currentPath: request.path });
  }
};

// Handle logout (destroy session)
const logout = async (request, response) => {
  // Clear the session and redirect to home
  request.session.destroy();
  response.redirect("/");
};

// Show the registration form
const registerForm = async (request, response) => {
  response.render("user/register", { currentPath: request.path });
};

// Handle registration form submission
const register = async (request, response) => {
  // Try to create a new user account
  let result = await userModel.addUser(request.body.u, request.body.pw);
  if (result) {
    // Success: redirect to login page
    response.redirect("/login");
  } else {
    // Error: username already exists, show error
    response.render("user/register", {
      err: "User already exists with that username",
      currentPath: request.path,
    });
  }
};

// Show all users (admin only)
const getAllUsers = async (request, response) => {
  let users = await userModel.getAllUsers();
  response.render("user/users-list", { 
    title: "Manage Users", 
    users, 
    currentPath: request.path 
  });
};

// Show password reset form (admin only)
const resetPasswordForm = async (request, response) => {
  const username = request.query.username;
  if (!username) {
    return response.redirect("/admin/users");
  }
  
  let user = await userModel.getUser(username);
  if (!user) {
    return response.redirect("/admin/users");
  }
  
  response.render("user/reset-password", { 
    title: "Reset Password", 
    username,
    currentPath: request.path 
  });
};

// Handle password reset (admin only)
const resetPassword = async (request, response) => {
  const { username, newPassword, confirmPassword } = request.body;
  
  // Validate passwords match
  if (newPassword !== confirmPassword) {
    return response.render("user/reset-password", {
      err: "Passwords do not match",
      username,
      title: "Reset Password"
    });
  }
  
  // Validate password length
  if (newPassword.length < 4) {
    return response.render("user/reset-password", {
      err: "Password must be at least 4 characters",
      username,
      title: "Reset Password"
    });
  }
  
  // Reset the password
  let result = await userModel.resetPassword(username, newPassword);
  
  if (result) {
    // Success: redirect to users list
    response.redirect("/admin/users");
  } else {
    // Error: show error message
    response.render("user/reset-password", {
      err: "Error resetting password",
      username,
      title: "Reset Password"
    });
  }
};

export default {
  getUser,
  loginForm,
  login,
  register,
  registerForm,
  logout,
  getAllUsers,
  resetPasswordForm,
  resetPassword,
};
