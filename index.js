//import required modules

import { log } from "console";
import express from "express";

//the path module has some useful mothods for path/URL manipulation.

import path from "path";

const __dirname = import.meta.dirname;

const app = express(); //create express application
const port = process.env.PORT || "8888"; //either env variable or default 8888


//set up Express to use the "views" folder for the template files
app.set("views", path.join(__dirname, "views"));

//set up Express app to have static file path

app.use(express.static(path.join(__dirname,"public")));

app.set("view engine", "pug"); //set the app to use pug

app.get("/", (request, response) => {
    //response.status(200).send("Fastodigama Backend");
    response.render("index", {title: "Home"});
});

app.get("/about", (request,response)=> {
    response.render("about", { title: "About"});
});

app.get("/articles", (request, response) => {
    response.render("articles", {title: "Articles"});
})

app.get("/categories", (request, response) => {
    response.render("categories", {title: "Categories"});
})

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});

