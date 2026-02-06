//import required modules

import { log } from "console";
import express from "express";


//the path module has some useful mothods for path/URL manipulation.

import path from "path";

import db from "./modules/menuLinks/func.js"

const __dirname = import.meta.dirname;

const app = express(); //create express application
const port = process.env.PORT || "8888"; //either env variable or default 8888


//set up Express to use the "views" folder for the template files
app.set("views", path.join(__dirname, "views"));

//set up Express app to have static file path

app.use(express.static(path.join(__dirname,"public")));

app.set("view engine", "pug"); //set the app to use pug

app.get("/", async (request, response) => {
    let menuLinks = await db.getLinks();
    if(!menuLinks.length) {
        await db.initializeMenuLinks();
        menuLinks = await db.getLinks();
    }
    response.render("index", {title: "Home" , links: menuLinks});
});

app.get("/add", async (request,response)=> {
    await db.addMenuLink(3,"Articles","/articles");
    response.redirect("/");
});

app.get("/update", async (request, response) => {
    await db.updateMenuLink("69867188b22a89c8bf468c80",1,"Home2","/");
    response.redirect("/");
})

app.get("/delete", async (request, response) => {
    await db.deleteMenuLink("6986720bb22a89c8bf468c89");
    response.redirect("/");
})

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});

