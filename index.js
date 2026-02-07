//import required modules

import express from "express";


//the path module has some useful mothods for path/URL manipulation.

import path from "path";

import adminPageRouter from "./modules/menuLinks/router.js";
import pageRouter from "./modules/pages/router.js"

//to retrieve the absolute path of the current folder
const __dirname = import.meta.dirname;



const app = express(); //create express application
const port = process.env.PORT || "8888"; //either env variable or default 8888

app.use(express.urlencoded({extended:true}));
app.use(express.json());

//set up Express to use the "views" folder for the template files
app.set("views", path.join(__dirname, "views"));

//set up Express app to have static file path

app.use(express.static(path.join(__dirname,"public")));

app.set("view engine", "pug"); //set the app to use pug

app.use("/admin/menu", adminPageRouter);
app.use("/", pageRouter)

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});

