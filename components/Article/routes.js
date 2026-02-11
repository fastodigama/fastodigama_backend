import express from "express";

const router = express.Router();

import articles from "./controller.js";

// GET list
// /admin/article
router.get("/", articles.getAllArticles);

//GET add form
// /admin/article/add
router.get("/add", articles.articleForm);

// POST add article
// /admin/article/add/submit
router.post("/add/submit", articles.addArticle);

router.get("/delete", articles.deleteArticle);



export default router;
