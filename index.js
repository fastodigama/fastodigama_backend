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

import links from "./components/menuLinks/controller.js";
import articles from "./components/Article/controller.js";

import cors from "cors";
import helmet from "helmet";

// ===== DATABASE CONNECTION =====
connect();

// ===== PATH AND SERVER SETUP =====
const __dirname = import.meta.dirname;
const app = express();
const port = process.env.PORT || "8888";

// ===== MIDDLEWARE CONFIGURATION =====

// IMPORTANT: Remove the default helmet() call — it blocks TinyMCE

app.use(helmet());


// Enable CORS
app.use(
  cors({
    origin: "*",
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
    cookie: {},
  })
);

// ===== API ROUTES =====
app.get("/api/menulinks", links.getMenuLinksApiResponse);
app.get("/api/articles", articles.getArticlesApiResponse);
app.get("/api/article/:id", articles.getArticleByIdApiResponse);

// ===== AUTH MIDDLEWARE =====
app.use("/admin", (req, res, next) => {
  if (req.session.loggedIn) {
    app.locals.user = req.session.user;
    next();
  } else {
    req.session.redirectUrl = req.originalUrl;
    res.redirect("/login");
  }
});

app.use("/user", (req, res, next) => {
  if (req.session.loggedIn) {
    app.locals.user = req.session.user;
    next();
  } else {
    req.session.redirectUrl = req.originalUrl;
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
