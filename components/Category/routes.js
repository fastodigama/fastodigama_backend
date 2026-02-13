import express from "express";

// ===== CATEGORY ROUTES =====
// Defines all URL paths related to categories (/admin/category)

const router = express.Router();

import categories from "./controller.js"

// Display all categories
// GET /admin/category
router.get("/", categories.getAllCategories);

// Show the form to add a new category
// GET /admin/category/add
router.get("/add", categories.AddCategoryForm);

// Handle form submission to create new category
// POST /admin/category/add/submit
router.post("/add/submit", categories.addNewCategory);

// Show the category edit form
// GET /admin/category/edit?categoryId=...
router.get("/edit", categories.updateCategoryForm);

// Handle category edit form submission
// POST /admin/category/edit/submit
router.post("/edit/submit", categories.updateCategory);

// Delete a category
// GET /admin/category/delete?categoryName=Latest
router.get("/delete", categories.deleteCategory);


export default router;
