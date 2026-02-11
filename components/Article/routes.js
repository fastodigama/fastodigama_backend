import express from "express";

const router = express.Router();

import articles from "./controller.js";

// GET list
// /admin/article
router.get("/", articles.getAllArticles);

//GET add form
// /admin/article/add
router.get("/add", articles.addArticleForm);

// POST add article
// /admin/article/add/submit
router.post("/add/submit", articles.addArticle);

// GET delete article
router.get("/delete", articles.deleteArticle);

//GET Edit form
// /admin/article/edit

router.get("/edit", articles.editArticleForm);

// POST Edit article
// /admin/article/edit/submit
router.post("/edit/submit", articles.editArticle);





export default router;
