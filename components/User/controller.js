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
  /* console.log("Login attempt:", request.body); // Log incoming data */

  let authStatus = await userModel.authenticateUser(
    request.body.u,
    request.body.pw,
  );

/*   console.log("Authentication result:", authStatus); // Log result
 */
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
  const { u, pw, firstName, lastName } = request.body;

  // ===== SERVER-SIDE VALIDATION =====
  if (!firstName || firstName.trim().length === 0) {
    return response.render("user/register", { err: "First name is required" });
  }

  if (!lastName || lastName.trim().length === 0) {
    return response.render("user/register", { err: "Last name is required" });
  }

  if (!u || u.trim().length === 0) {
    return response.render("user/register", { err: "Email is required" });
  }

  // Basic email format check
  if (!/^\S+@\S+\.\S+$/.test(u)) {
    return response.render("user/register", { err: "Invalid email format" });
  }

  if (!pw || pw.length < 8) {
    return response.render("user/register", { err: "Password must be at least 8 characters" });
  }

  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
    return response.render("user/register", { err: "Password must contain letters and numbers" });
  }

  // ===== CREATE USER =====
  let result = await userModel.addUser(u, pw, firstName, lastName);

  if (result) {
    response.redirect("/login");
  } else {
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
  const userId = request.params.id;
  if (!userId) {
    return response.redirect("/admin/users");
  }
  let user = await userModel.getUserById(userId);
  if (!user) {
    return response.redirect("/admin/users");
  }
  response.render("user/reset-password", {
    title: "Reset Password",
    user,
    currentPath: request.path
  });
};

// Handle password reset (admin only)
const resetPassword = async (request, response) => {
  const userId = request.params.id;
  const { newPassword, confirmPassword } = request.body;
  // Validate passwords match
  if (newPassword !== confirmPassword) {
    let user = await userModel.getUserById(userId);
    return response.render("user/reset-password", {
      err: "Passwords do not match",
      user,
      title: "Reset Password"
    });
  }
  // Validate password length
  if (newPassword.length < 4) {
    let user = await userModel.getUserById(userId);
    return response.render("user/reset-password", {
      err: "Password must be at least 4 characters",
      user,
      title: "Reset Password"
    });
  }
  // Reset the password
  let result = await userModel.resetPasswordById(userId, newPassword);
  if (result) {
    response.redirect("/admin/users");
  } else {
    let user = await userModel.getUserById(userId);
    response.render("user/reset-password", {
      err: "Error resetting password",
      user,
      title: "Reset Password"
    });
  }
};

// Show edit user form (admin only)
const editUserForm = async (request, response) => {
  const userId = request.params.id;
  if (!userId) {
    return response.redirect("/admin/users");
  }
  let user = await userModel.getUserById(userId);
  if (!user) {
    return response.redirect("/admin/users");
  }
  response.render("user/user-edit", {
    title: "Edit User",
    user,
    currentPath: request.path
  });
};

// Handle user edit (admin only)
const editUser = async (request, response) => {
  const userId = request.params.id;
  const { newUsername, firstName, lastName } = request.body;
  // Validate new username
  if (!newUsername || newUsername.trim().length === 0) {
    let user = await userModel.getUserById(userId);
    return response.render("user/user-edit", {
      err: "Username cannot be empty",
      user,
      title: "Edit User"
    });
  }
  // Update the user
  let result = await userModel.updateUserById(userId, newUsername, firstName, lastName);
  if (result) {
    response.redirect("/admin/users");
  } else {
    let user = await userModel.getUserById(userId);
    response.render("user/user-edit", {
      err: "Username already exists or user not found",
      user,
      title: "Edit User"
    });
  }
};

// Delete user (admin only)
const deleteUser = async (request, response) => {
  const userId = request.params.id;
  if (!userId) {
    return response.redirect("/admin/users");
  }
  let result = await userModel.deleteUserById(userId);
  response.redirect("/admin/users");
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
  editUserForm,
  editUser,
  deleteUser,
};
