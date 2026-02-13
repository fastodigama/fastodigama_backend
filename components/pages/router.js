import express from "express";

// ===== PAGES ROUTER =====
// Defines the home page route

const router = express.Router();

// Display the home page
// GET /
router.get("/", async (request, response) =>  {
    // Render the home page view
    response.render("index", { title: "Home",  currentPath: request.path});
});




export default router;