import express from "express";

const router = express.Router();

import categories from "./controller.js"

//GET list all current categories

// /admin/category

router.get("/",categories.getAllCategories);


export default router;
