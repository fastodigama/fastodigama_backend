import express from "express";

const router = express.Router();

import model from "../menuLinks/model.js"

router.get("/", async (request, response) =>  {
    let menuLinks = await model.getLinks();
    response.render("index", { title: "Home", links: menuLinks, currentPath: request.path});
});




export default router;