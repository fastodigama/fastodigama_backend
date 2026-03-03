// ===== APPLICATION SETUP =====
// This is the main server file for the FASTODIGAMA Admin backend

import "dotenv/config";
import express from "express";
import sessions from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { connect } from "./dbConnection.js";
import path from "path";

import pageRouter from "./components/pages/router.js";
import publicUserRoutes from "./components/User/publicUserRoutes.js";
import adminUserRoutes from "./components/User/adminUserRoutes.js";

// Debug TikTok OAuth env variables
console.log("TikTok Redirect:", process.env.TIKTOK_REDIRECT_URI);
console.log("TikTok Client Key:", process.env.TIKTOK_CLIENT_KEY);

// TikTok OAuth CSP override middleware (must run before helmet)
const tiktokCsp = (req, res, next) => {
  // Only apply to TikTok OAuth endpoints
  if (
    req.path === "/auth/tiktok" ||
    req.path === "/auth/tiktok/callback"
  ) {
    // Remove any existing CSP headers (including report-only)
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("Content-Security-Policy-Report-Only");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.tiktokcdn.com https://*.ttwstatic.com https://sf-security.ibytedtos.com https://*.arkoselabs.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: blob: https://*.tiktokcdn.com https://*.ttwstatic.com https://sf-security.ibytedtos.com https://*.arkoselabs.com; " +
        "frame-src 'self' https://*.tiktok.com https://*.ttwstatic.com https://*.tiktokcdn.com https://*.arkoselabs.com; " +
        "connect-src 'self' https://*.tiktok.com https://*.tiktokcdn.com https://*.ttwstatic.com https://sf-security.ibytedtos.com https://*.arkoselabs.com; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "object-src 'none'; " +
        "media-src 'self';"
    );
  }
  next();
};
import requireAdmin from "./components/User/requireAdmin.js";
import articleRouter from "./components/Article/routes.js";
import categoryRouter from "./components/Category/routes.js";
import commentRouter from "./components/Comment/routes.js";
import consentRouter from "./components/Consent/routes.js";

import articles from "./components/Article/controller.js";
import categories from "./components/Category/controller.js";


import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

// ===== DATABASE CONNECTION =====
connect();

// ===== PATH AND SERVER SETUP =====
const __dirname = import.meta.dirname;
const app = express();
const port = process.env.PORT || "8888";


// ===== CSP OVERRIDE FOR TIKTOK OAUTH ROUTES =====
// This must run before helmet
app.use(tiktokCsp);

// ===== MIDDLEWARE CONFIGURATION =====

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://articles.fastodigama.com",
          "https://images.fastodigama.com",
          "https:",
        ],
        // FIXED: allow frontend + backend
        connectSrc: [
          "'self'",
          "https://fastodigama.com",
          "https://www.fastodigama.com",
          "https://admin.fastodigama.com",
          "https://api.fastodigama.com",
          
        ],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }),
);

// ===== CORS FIXED =====

const allowedOrigins = [
  "http://localhost:3000",

  "https://fastodigama.com",
  "https://www.fastodigama.com",
  "https://admin.fastodigama.com",
  "https://api.fastodigama.com",

];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }),
);

// Serve Bootstrap
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist")),
);


// Body parsers
app.use(express.urlencoded({ extended: true }));
// FIX: JSON parser must come BEFORE routes
app.use(express.json());

// Cookie parser (for TikTok OAuth CSRF state)
app.use(cookieParser());

// Views
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Static files
app.use(express.static(path.join(__dirname, "public")));

// ===== SESSION CONFIGURATION =====
app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";

// ===== REDIS SESSION STORE =====
let sessionStore = undefined;

if (process.env.REDIS_URL) {
  try {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => console.error("Redis Client Error:", err));
    await redisClient.connect();
    sessionStore = new RedisStore({ client: redisClient });
    console.log("✓ Redis session store connected");
  } catch (error) {
    console.warn(
      "⚠ Redis connection failed, using MemoryStore:",
      error.message,
    );
  }
} else {
  console.warn("⚠ REDIS_URL not set, using MemoryStore");
}

app.use(
  sessions({
    store: sessionStore,
    secret: process.env.SESSIONSECRET,
    name: "FastodigamaSession",
    saveUninitialized: false,
    resave: false,
    proxy: isProduction,
    cookie: {
      httpOnly: true,
      secure: isProduction, // ✅ only true on https
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

// ===== API ROUTES =====
app.get("/api/articles", articles.getArticlesApiResponse);
app.get("/api/article/:id", articles.getArticleByIdApiResponse);
app.get("/api/categories", categories.getCategoriesApiResponse);
app.get("/api/category/:id", categories.getCategoryByIdApiResponse);

// ===== VISITOR ROUTES =====
app.use("/api/comments", commentRouter);
app.use("/api/consent", consentRouter);

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
app.use("/admin/article", requireAdmin, articleRouter);
app.use("/admin/category", requireAdmin, categoryRouter);

// Mount public user routes (login, register, api login, etc.)
app.use("/", publicUserRoutes);

// Mount page routes (public pages)
app.use("/", pageRouter);

// Mount admin user routes after auth middleware (protects all /admin/users/*)
app.use("/", adminUserRoutes);

// ===== START SERVER =====
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
