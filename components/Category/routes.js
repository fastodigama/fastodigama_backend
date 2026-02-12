import express from "express";

const router = express.Router();

import categories from "./controller.js"

//GET list all current categories

// /admin/category

router.get("/",categories.getAllCategories);

//GET add form
// /admin/category/add
router.get("/add", categories.AddCategoryForm);

//POST add category
// /admin/category/add/submit
router.post("/add/submit", categories.addNewCategory);

//GET delete category

router.get("/delete", categories.deleteCategory);


export default router;
