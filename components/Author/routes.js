import express from "express";
import authors, { upload } from "./controller.js";

const router = express.Router();

router.get("/", authors.getAllAuthors);
router.get("/add", authors.addAuthorForm);
router.post("/add/submit", upload.single("photo"), authors.addNewAuthor);
router.get("/edit", authors.editAuthorForm);
router.post("/edit/submit", upload.single("photo"), authors.editAuthor);
router.get("/delete", authors.deleteAuthor);

export default router;
