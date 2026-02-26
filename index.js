// ===== APPLICATION SETUP =====
// FASTODIGAMA Admin backend

import "dotenv/config";
import express from "express";
import sessions from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { connect } from "./dbConnection.js";
import path from "path";

import adminPageRouter from "./components/menuLinks/router.js";
import pageRouter from "./components/pages/router.js";
import userRouter from "./components/User/routes.js";
import articleRouter from "./components/Article/routes.js";
import categoryRouter from "./components/Category/routes.js";
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

// ===== SECURITY: HELMET =====
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
          "https://pub-976d69c685624aa29841caa3ebec5909.r2.dev",
          "https:",
        ],
        connectSrc: [
          "'self'",
          "https://fastoadmin.up.railway.app",   // backend
          "https://fastodigama.up.railway.app",  // frontend
          "https://fastodigama.com"
        ],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }),
);

// ===== CORS CONFIG =====
const allowedOrigins = [
  "http://localhost:3000",
  "http://192.168.2.103:3000",
  "https://fastodigama.up.railway.app",
  "https://fastodigama.com",
  "https://fastoadmin.up.railway.app"
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

// ===== STATIC FILES =====
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist")),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "public")));

// ===== SESSION CONFIG =====
app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";

let sessionStore = undefined;

if (process.env.REDIS_URL) {
  try {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => console.error("Redis Client Error:", err));
    await redisClient.connect();
    sessionStore = new RedisStore({ client: redisClient });
    console.log("✓ Redis session store connected");
  } catch (error) {
    console.warn("⚠ Redis connection failed, using MemoryStore:", error.message);
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
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

// ======================================================
// ⭐ IMPORTANT: API ROUTES MUST COME BEFORE AUTH MIDDLEWARE
// ======================================================

// Public API routes
app.use("/api/comments", commentRouter);

// User routes (includes /api/login and /api/logout)
app.use("/", userRouter);

// ======================================================
// ⭐ ADMIN + USER AUTH MIDDLEWARE (backend only)
// ======================================================

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

// ======================================================
// ⭐ ADMIN PANEL ROUTES
// ======================================================
app.use("/admin/menu", adminPageRouter);
app.use("/admin/article", articleRouter);
app.use("/admin/category", categoryRouter);

// ======================================================
// ⭐ FRONTEND PAGES
// ======================================================
app.use("/", pageRouter);

// ===== START SERVER =====
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
