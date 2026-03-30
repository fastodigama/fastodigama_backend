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

import requireAdmin from "./components/User/requireAdmin.js";
import requireAuthorOrAdmin from "./components/User/requireAuthorOrAdmin.js";
import articleRouter from "./components/Article/routes.js";
import authorRouter from "./components/Author/routes.js";
import categoryRouter from "./components/Category/routes.js";
import commentRouter from "./components/Comment/routes.js";
import consentRouter from "./components/Consent/routes.js";
import likeRouter from "./components/Like/routes.js";
import pollRouter from "./components/Poll/routes.js";

import articles from "./components/Article/controller.js";
import authors from "./components/Author/controller.js";
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
app.set("trust proxy", true);

const isProduction = process.env.NODE_ENV === "production";

// ===== REDIS SESSION STORE =====
let sessionStore = undefined;

if (process.env.REDIS_URL) {
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        keepAlive: 5000,
        reconnectStrategy: (retries) => Math.min(retries * 250, 5000),
      },
    });
    redisClient.on("error", (err) => console.error("Redis Client Error:", err));
    await redisClient.connect();
    sessionStore = new RedisStore({
      client: redisClient,
      disableTouch: true,
    });
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

app.use((req, res, next) => {
  app.locals.user = req.session?.loggedIn ? req.session.user : null;
  app.locals.role = req.session?.loggedIn ? (req.session.role || null) : null;
  next();
});

// ===== API ROUTES =====
app.get("/rss.xml", articles.getRssFeed);
app.get("/atom.xml", articles.getAtomFeed);
app.get("/api/articles", articles.getArticlesApiResponse);
// app.get("/api/article/:id", articles.getArticleByIdApiResponse);
app.get("/api/article/:slug", articles.getArticleBySlugApiResponse);
app.get("/api/authors", authors.getAuthorsApiResponse);
// Like/unlike endpoints
app.post("/api/article/:slug/like", articles.likeArticleApi);
app.post("/api/article/:slug/unlike", articles.unlikeArticleApi);
app.get("/api/categories", categories.getCategoriesApiResponse);
app.get("/api/category/:id", categories.getCategoryByIdApiResponse);
// New: fetch category by slug (name)
app.get("/api/category/slug/:slug", categories.getCategoryBySlugApiResponse);
app.get("/api/categories/sorted", categories.getCategoriesSortedByOrder);

// ===== VISITOR ROUTES =====
app.use("/api/comments", commentRouter);
app.use("/api/consent", consentRouter);
app.use("/api/like", likeRouter);
app.use("/api/poll", pollRouter);

// ===== AUTH MIDDLEWARE =====
app.use("/admin", (req, res, next) => {
  if (!req.session.loggedIn) {
    if (req.method === "GET") {
      req.session.redirectUrl = req.originalUrl;
    } else {
      req.session.redirectUrl = req.get("referer") || "/admin/article";
    }
    return res.redirect("/login");
  }

  if (!["admin", "author"].includes(req.session.role)) {
    return res.status(403).render("common/unauthorized", {
      title: "Not Authorized",
      currentPath: req.path,
    });
  }

  next();
});

app.use("/user", (req, res, next) => {
  if (req.session.loggedIn) {
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
  next();
});

// ===== ROUTES =====
app.use("/admin/article", requireAuthorOrAdmin, articleRouter);
app.use("/admin/author", requireAdmin, authorRouter);
app.use("/admin/category", requireAdmin, categoryRouter);
app.use("/admin/poll", requireAdmin, pollRouter);

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
