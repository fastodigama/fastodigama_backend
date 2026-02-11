//import required modules
import "dotenv/config";
import express, { response } from "express";
import sessions from "express-session";
import { connect } from "./dbConnection.js";
//the path module has some useful mothods for path/URL manipulation.

import path from "path";

import adminPageRouter from "./components/menuLinks/router.js";
import pageRouter from "./components/pages/router.js";
import userRouter from "./components/User/routes.js";
import articleRouter from "./components/Article/routes.js"
import { request } from "http";
import links from "./components/menuLinks/controller.js"; //import the api response function for the menu links
import cors from "cors";

//connect to DB immediatly
connect();

//to retrieve the absolute path of the current folder
const __dirname = import.meta.dirname;

const app = express(); //create express application
const port = process.env.PORT || "8888"; //either env variable or default 8888

//allow requests from all domains (need it to deploy API)

app.use(
  cors({
    origin: "*",
  }),
);

//add bootstrap
app.use(
  "/bootstrap",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist")),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//set up Express to use the "views" folder for the template files
app.set("views", path.join(__dirname, "views"));

//set up Express app to have static file path

app.use(express.static(path.join(__dirname, "public")));

//setup app to use sessions
//T access a session variable, you just need to access request.session.<variable_name>
app.use(
  sessions({
    secret: process.env.SESSIONSECRET,
    name: "MyUniqueSEssID",
    saveUninitialized: false,
    resave: false,
    cookie: {},
  }),
);

// Menu links API endpoint
app.get("/api/menulinks", links.getMenuLinksApiResponse);

//setup middleware function to check if user logged in for user path

//fo admin pages

app.use("/admin", (request, response, next) => {
  if (request.session.loggedIn) {
    app.locals.user = request.session.user;
    next();
  } else {
    response.redirect("/login");
  }
});

//for authentication pages
app.use("/user", (request, response, next) => {
  //get user from session and go to next middleware finction
  if (request.session.loggedIn) {
    app.locals.user = request.session.user;
    next();
  } else {
    response.redirect("/login");
  }
});

app.use("/logout", (request, response, next) => {
  //reset local variable "username"
  app.locals.user = null;
  next();
});

app.set("view engine", "pug"); //set the app to use pug

app.use("/admin/menu", adminPageRouter);
app.use("/admin/article", articleRouter);
app.use("/", pageRouter);
app.use("/", userRouter);


app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
