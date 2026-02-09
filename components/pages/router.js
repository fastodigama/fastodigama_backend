import express from "express";

const router = express.Router();

import model from "../menuLinks/model.js"

router.get("/", async (request, response) =>  {
    let menuLinks = await model.getLinks();
    response.render("index", { title: "Home", links: menuLinks, currentPath: request.path});
});

router.get("/about", async (request,response) => {
   let menuLinks = await model.getLinks();
   response.render("about", {title: "About", links: menuLinks, currentPath: request.path}); 
});


router.get("/articles", async (request,response) => {
     let menuLinks = await model.getLinks();
  response.render("articles",  {title: "Articles", links: menuLinks, currentPath: request.path} );
})

export default router;