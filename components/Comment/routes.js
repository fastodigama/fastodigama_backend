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

// GET: Get current user's comment history
// GET /api/comments/me
router.get("/me", commentController.getMyComments);

// GET: Get replies from others to current user's comments
// GET /api/comments/replies-to-me
router.get("/replies-to-me", commentController.getRepliesToMe);

// POST: Mark replies notifications as seen
// POST /api/comments/replies-to-me/mark-seen
router.post("/replies-to-me/mark-seen", commentController.markRepliesSeen);

// GET: Get likes from others on current user's comments
// GET /api/comments/likes-to-me
router.get("/likes-to-me", commentController.getLikesToMe);

// POST: Mark likes notifications as seen
// POST /api/comments/likes-to-me/mark-seen
router.post("/likes-to-me/mark-seen", commentController.markLikesSeen);

// GET: Get a single comment by ID
// GET /api/comments/:commentId
router.get("/:commentId", commentController.getCommentById);

// PUT: Like a comment
// PUT /api/comments/:commentId/like
router.put("/:commentId/like", commentController.likeComment);

// PUT: Update a comment (only author can edit)
// PUT /api/comments/:commentId
router.put("/:commentId", commentController.updateComment);

// DELETE: Delete a comment (author or admin can delete)
// DELETE /api/comments/:commentId
router.delete("/:commentId", commentController.deleteComment);

export default router;
