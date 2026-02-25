import express from "express";
import commentController from "./controller.js";

const router = express.Router();

// ===== COMMENT ROUTES =====
// Visitor comments on articles

// POST: Create a new comment on an article
// POST /api/comments
router.post("/", commentController.createComment);

// GET: Get all approved comments for an article
// GET /api/comments/article/:articleId
router.get("/article/:articleId", commentController.getCommentsByArticle);

// GET: Get a single comment by ID
// GET /api/comments/:commentId
router.get("/:commentId", commentController.getCommentById);

// PUT: Like a comment
// PUT /api/comments/:commentId/like
router.put("/:commentId/like", commentController.likeComment);

export default router;
