import express from "express";

// ===== ARTICLE ROUTES =====
// Defines all URL paths related to articles (/admin/article)

const router = express.Router();

import articles from "./controller.js";

// Display all articles
// GET /admin/article
router.get("/", articles.getAllArticles);

// View a single article in detail
// GET /admin/article/view?articleId=123
router.get("/view", articles.viewArticle);

// Show the form to add a new article
// GET /admin/article/add
router.get("/add", articles.addArticleForm);

// Handle form submission to create new article
// POST /admin/article/add/submit
router.post("/add/submit", articles.addNewArticle);

// Delete an article
// GET /admin/article/delete?articleId=123
router.get("/delete", articles.deleteArticle);

// Show the form to edit an article
// GET /admin/article/edit?articleId=123
router.get("/edit", articles.editArticleForm);

// Handle form submission to update article
// POST /admin/article/edit/submit
router.post("/edit/submit", articles.editArticle);





export default router;
