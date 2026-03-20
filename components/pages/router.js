import express from "express";
import { getAppTimeZone, getCurrentDateInTimeZone } from "../config/timezone.js";

// ===== PAGES ROUTER =====
// Defines the home page route

const router = express.Router();

// Display the home page
// GET /
router.get("/", async (request, response) =>  {
    const appTimezone = getAppTimeZone();

    // Render the home page view
    response.render("index", {
        title: "Home",
        currentPath: request.path,
        appTimezone,
        currentDateInTimeZone: getCurrentDateInTimeZone(appTimezone)
    });
});




export default router;
