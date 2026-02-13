import menuLinksModel from "./model.js";

// ===== MENU LINKS CONTROLLER =====
// Handles menu links API responses

// Get all menu links and return as JSON (for frontend API)
const getMenuLinksApiResponse = async (request, response) => {
    // Fetch all menu links from database
    let links = await menuLinksModel.getLinks();
    // Return as JSON for frontend consumption
    response.json(links)
}

export default {
    getMenuLinksApiResponse,
}