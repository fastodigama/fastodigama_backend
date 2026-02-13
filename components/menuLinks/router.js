import express, { request, response } from "express";
import mongoose from "mongoose";

// ===== MENU LINKS ROUTER =====
// Defines all URL paths for managing menu links (/admin/menu)

const router = express.Router();
import links from "./controller.js";
import model from "./model.js";

// Display all menu links
// GET /admin/menu
router.get("/", async (request, response) => {
  // Fetch all menu links
  let menuLinks = await model.getLinks();
  // If no links exist, create sample ones first
  if (!menuLinks.length) {
    await model.initializeMenuLinks();
    menuLinks = await model.getLinks();
  }
  // Show menu links list page
  response.render("menu/menu-list", {
    title: "MENU LINKS",
    links: menuLinks,
    currentPath: request.originalUrl 
  });
});

// Show the form to add a new menu link
// GET /admin/menu/add
router.get("/add", async (request, response) => {
  response.render("menu/menu-add", { title: "Add menu link", currentPath: request.originalUrl  });
});

// Handle form submission to create new menu link
// POST /admin/menu/add/submit
router.post("/add/submit", async (request, response) => {
  // Get form data and convert weight to number
  let newLink = {
    weight: parseInt(request.body.weight),
    name: request.body.name,
    path: request.body.path,
  };
  // Save the new link
  await model.addMenuLink(newLink);
  // Redirect back to menu list
  response.redirect("/admin/menu");
});

// Show the form to edit a menu link
// GET /admin/menu/edit?linkId=123
router.get("/edit", async (request, response) => {
  if (request.query.linkId) {
    // Fetch the link to edit and all links for display
    let linkToEdit = await model.getSingleLink(request.query.linkId);
    let links = await model.getLinks();
    // Show edit form with current data
    response.render("menu/menu-edit", {
      title: "Edit menu link",
      links: links,
      editLink: linkToEdit,
      currentPath: request.originalUrl 
    });
  } else {
    // No ID provided, go back to list
    response.redirect("/admin/menu");
  }
});

// Handle form submission to update menu link
// POST /admin/menu/edit/submit
router.post("/edit/submit", async (request, response) => {
  // Convert ID to MongoDB ObjectId format
  let idFilter = { _id: new mongoose.Types.ObjectId(request.body.linkId) };
  // Prepare updated link data
  let link = {
    weight: Number(request.body.weight),
    path: request.body.path,
    name: request.body.name,
  };
  // Update the link in database
  await model.updateMenuLink(idFilter, link);
  // Redirect back to menu list
  response.redirect("/admin/menu");
});

// Delete a menu link
// GET /admin/menu/delete?linkId=123
router.get("/delete", async (request, response) => {
  // Remove the link from database
  await model.deleteMenuLink(request.query.linkId);
  // Refresh the menu list
  response.redirect("/admin/menu");
});




export default router;
