// ===== APPLICATION SETUP =====
// This is the main server file for the FASTODIGAMA Admin backend

import "dotenv/config";
import express from "express";
import sessions from "express-session";
import { connect } from "./dbConnection.js";
import path from "path";

import adminPageRouter from "./components/menuLinks/router.js";
import pageRouter from "./components/pages/router.js";
import userRouter from "./components/User/routes.js";
import articleRouter from "./components/Article/routes.js";
import categoryRouter from "./components/Category/routes.js";
import readerRouter from "./components/Reader/routes.js";
import commentRouter from "./components/Comment/routes.js";

import links from "./components/menuLinks/controller.js";
import articles from "./components/Article/controller.js";
import categories from "./components/Category/controller.js";

import cors from "cors";
import helmet from "helmet";

// ===== DATABASE CONNECTION =====
connect();

// ===== PATH AND SERVER SETUP =====
const __dirname = import.meta.dirname;
const app = express();
const port = process.env.PORT || "8888";

// ===== MIDDLEWARE CONFIGURATION =====

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://pub-976d69c685624aa29841caa3ebec5909.r2.dev", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));


// Enable CORS with credentials for TikTok OAuth
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // For development - be more restrictive in production
      }
    },
    credentials: true, // Allow cookies for session management
  })
);

// Serve Bootstrap
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist"))
);

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Views
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Static files
app.use(express.static(path.join(__dirname, "public")));

// ===== SESSION CONFIGURATION =====
app.use(
  sessions({
    secret: process.env.SESSIONSECRET,
    name: "MyUniqueSEssID",
    saveUninitialized: false,
    resave: false,
    cookie: {
      httpOnly: true, // Prevent XSS attacks
      secure: false, // Set to true only with HTTPS in production
      sameSite: 'lax', // CSRF protection - 'lax' allows same-site navigation
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

// ===== API ROUTES =====
app.get("/api/menulinks", links.getMenuLinksApiResponse);
app.get("/api/articles", articles.getArticlesApiResponse);
app.get("/api/article/:id", articles.getArticleByIdApiResponse);
app.get("/api/categories", categories.getCategoriesApiResponse );
app.get("/api/category/:id", categories.getCategoryByIdApiResponse);

// ===== VISITOR ROUTES =====
app.use("/api/reader", readerRouter);
app.use("/api/comments", commentRouter);

// ===== AUTH MIDDLEWARE =====
app.use("/admin", (req, res, next) => {
  if (req.session.loggedIn) {
    app.locals.user = req.session.user;
    next();
  } else {
    if (req.method === "GET") {
      req.session.redirectUrl = req.originalUrl;
    } else {
      req.session.redirectUrl = req.get("referer") || "/admin/article";
    }
    res.redirect("/login");
  }
});

app.use("/user", (req, res, next) => {
  if (req.session.loggedIn) {
    app.locals.user = req.session.user;
    next();
  } else {
    if (req.method === "GET") {
      req.session.redirectUrl = req.originalUrl;
    } else {
      req.session.redirectUrl = req.get("referer") || "/user";
    }
    res.redirect("/login");
  }
});

app.use("/logout", (req, res, next) => {
  app.locals.user = null;
  next();
});

// ===== ROUTES =====
app.use("/admin/menu", adminPageRouter);
app.use("/admin/article", articleRouter);
app.use("/admin/category", categoryRouter);
app.use("/", pageRouter);
app.use("/", userRouter);

// ===== START SERVER =====
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
