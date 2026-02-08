import express, { Router } from "express";

const router = express.Router();



import userController from "./controller.js"

// /user
router.get("/user", userController.getUser);

// /login
router.get("/login", userController.loginForm);

//login form submit
router.post("/login", userController.login);

// /register
router.get("/register", userController.registerForm);

//register form submit 

router.post("/register", userController.register);

// /user/logout
router.get("/logout", userController.logout);

export default router;

