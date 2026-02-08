import express from "express";

const router = express.Router();

import model from "../menuLinks/model.js"

router.get("/", async (request, response) =>  {
    let menuLinks = await model.getLinks();
    response.render("index", { title: "Home", links: menuLinks});
});

router.get("/about", async (request,response) => {
   let menuLinks = await model.getLinks();
   response.render("about", {title: "About", links: menuLinks}); 
});


router.get("/articles", async (request,response) => {
     let menuLinks = await model.getLinks();
  response.render("articles",  {title: "Articles", links: menuLinks} );
})

export default router;