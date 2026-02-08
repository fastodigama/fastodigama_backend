import userModel from "./model.js";

const getUser = async (request, response) => {
  //console.log(request.session);
  //check for user session variable and render user page
  response.render("user/user");
};

//controller function for GET login page
const loginForm = async (request, response) => {
  //render login page
  response.render("user/login");
};

//controller function for POST login form

const login = async (request, response) => {
  //authenticate user and redirect to /user

  let authStatus = await userModel.authenticateUser(
    request.body.u,
    request.body.pw,
  );

  if (authStatus) {
    //if authenticated, set session variables
    //redirect to /user
    request.session.loggedIn = true;
    request.session.user = request.body.u;
    //redirect to /user
    response.redirect("/user");
  } else {
    //if not authenticated, re-render login form with error message

    response.render("user/login", { err: "user not found" });
  }
};

//controller function for GET logout path

const logout = async (request, response) => {
  //destroy session and redirect to home

  request.session.destroy();
  response.redirect("/");
};

//controller function for GET register page

const registerForm = async (request, response) => {
  response.render("user/register");
};

//controller function for POST register form

const register = async (request, response) => {
  //get values from form and create new user
  let result = await userModel.addUser(request.body.u, request.body.pw);
  if (result) {
    //means sucessfully added the user
    response.redirect("/login");
  } else {
    response.render("user/register", {
      err: "User already exists with that username",
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
};
