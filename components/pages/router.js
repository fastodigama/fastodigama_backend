import express from "express";

const router = express.Router();


router.get("/", async (request, response) =>  {
    
    response.render("index", { title: "Home",  currentPath: request.path});
});




export default router;