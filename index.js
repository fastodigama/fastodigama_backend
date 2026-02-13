// ===== APPLICATION SETUP =====
// This is the main server file for the FASTODIGAMA Admin backend

// Load environment variables from .env file
import "dotenv/config";

// Core modules for web server
import express, { response } from "express";
import sessions from "express-session";
import { connect } from "./dbConnection.js";
import path from "path";

// Route handlers for different features
import adminPageRouter from "./components/menuLinks/router.js";
import pageRouter from "./components/pages/router.js";
import userRouter from "./components/User/routes.js";
import articleRouter from "./components/Article/routes.js"
import categoryRouter from "./components/Category/routes.js";

// Utilities
import { request } from "http";
import links from "./components/menuLinks/controller.js"; // API response for menu links
import cors from "cors"; // Allow cross-origin requests

// ===== DATABASE CONNECTION =====
// Connect to MongoDB immediately when app starts
connect();

// ===== PATH AND SERVER SETUP =====
// Get the current directory path (works with ES modules)
const __dirname = import.meta.dirname;

// Create Express application
const app = express();

// Port: Use environment variable or default to 8888
const port = process.env.PORT || "8888";

// ===== MIDDLEWARE CONFIGURATION =====
// Enable Cross-Origin Resource Sharing (allow requests from any domain)
app.use(
  cors({
    origin: "*",
  }),
);

// Serve Bootstrap framework from node_modules
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist")),
);

// Parse form data (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Parse JSON request bodies
app.use(express.json());

// Configure where template files are located
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, images, JavaScript) from /public folder
app.use(express.static(path.join(__dirname, "public")));

// ===== SESSION CONFIGURATION =====
// Store user session data (who is logged in)
// Access session: request.session.loggedIn, request.session.user
app.use(
  sessions({
    secret: process.env.SESSIONSECRET, // Secret key for encrypting sessions
    name: "MyUniqueSEssID", // Session cookie name
    saveUninitialized: false, // Don't save sessions unless modified
    resave: false, // Don't resave unchanged sessions
    cookie: {}, // Cookie settings
  }),
);

// ===== API ROUTES =====
// Public API: Get all menu links as JSON
app.get("/api/menulinks", links.getMenuLinksApiResponse);

// ===== AUTHENTICATION & AUTHORIZATION MIDDLEWARE =====
// Protect admin pages: require login
// If user is logged in -> allow access
// If not logged in -> store original URL in session then redirect to /login
app.use("/admin", (request, response, next) => {
  if (request.session.loggedIn) {
    // Make user available to all pages
    app.locals.user = request.session.user;
    next(); // Go to next middleware/route handler
  } else {
    // Store where user was trying to go, so after login we can redirect them back
    request.session.redirectUrl = request.originalUrl;
    // Redirect to login page
    response.redirect("/login");
  }
});

// Protect user profile page: require login
app.use("/user", (request, response, next) => {
  // Get user from session and go to next middleware
  if (request.session.loggedIn) {
    app.locals.user = request.session.user;
    next();
  } else {
    // Store where user was trying to go, so after login we can redirect them back
    request.session.redirectUrl = request.originalUrl;
    response.redirect("/login");
  }
});

// Handle logout: clear user data
app.use("/logout", (request, response, next) => {
  // Clear the user variable
  app.locals.user = null;
  next();
});

// ===== TEMPLATE ENGINE =====
// Use Pug for rendering HTML templates
app.set("view engine", "pug");

// ===== ROUTE REGISTRATION =====
// Admin menu links
app.use("/admin/menu", adminPageRouter);

// Admin article management
app.use("/admin/article", articleRouter);

// Admin category management
app.use("/admin/category", categoryRouter);

// Home page (public)
app.use("/", pageRouter);

// Authentication pages: login, register, user profile, logout
app.use("/", userRouter);

// ===== START SERVER =====
// Listen for incoming requests on the specified port
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
