// ===== COMMENT CONTROLLER =====
// Handles comment CRUD operations for visitors

import commentModel from "./model.js";
import readerModel from "../Reader/model.js";

// POST: Create a new comment
const createComment = async (request, response) => {
    try {
        const { articleId, content, parentId } = request.body;
        
        // Validate required fields
        if (!articleId || !content) {
            return response.status(400).json({ 
                error: "Missing required fields" 
            });
        }
        
        // Check if reader is logged in
        if (!request.session.readerLoggedIn) {
            return response.status(401).json({ 
                error: "Must be logged in to comment" 
            });
        }
        
        // Create the comment
        const comment = await commentModel.createComment(
            articleId,
            request.session.readerId,
            content,
            parentId || null
        );
        
        response.status(201).json({
            success: true,
            message: "Comment submitted for moderation",
            comment: comment
        });
    } catch (error) {
        console.error("Create comment error:", error);
        response.status(500).json({ error: "Failed to create comment" });
    }
};

// GET: Get all approved comments for an article
// Populates author info (TikTok name and avatar)
const getCommentsByArticle = async (request, response) => {
    try {
        const { articleId } = request.params;
        
        // Get top-level comments with author info
        const comments = await commentModel.getCommentsByArticle(articleId);
        
        // For each comment, get its replies
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const replies = await commentModel.getCommentReplies(comment._id);
                return {
                    ...comment.toObject(),
                    replies: replies
                };
            })
        );
        
        response.json({
            success: true,
            comments: commentsWithReplies
        });
    } catch (error) {
        console.error("Get comments error:", error);
        response.status(500).json({ error: "Failed to fetch comments" });
    }
};

// GET: Get a single comment by ID
const getCommentById = async (request, response) => {
    try {
        const { commentId } = request.params;
        const comment = await commentModel.getCommentById(commentId);
        
        if (!comment) {
            return response.status(404).json({ error: "Comment not found" });
        }
        
        response.json({
            success: true,
            comment: comment
        });
    } catch (error) {
        console.error("Get comment error:", error);
        response.status(500).json({ error: "Failed to fetch comment" });
    }
};

// PUT: Like a comment
const likeComment = async (request, response) => {
    try {
        const { commentId } = request.params;
        const comment = await commentModel.likeComment(commentId);
        
        if (!comment) {
            return response.status(404).json({ error: "Comment not found" });
        }
        
        response.json({
            success: true,
            comment: comment
        });
    } catch (error) {
        console.error("Like comment error:", error);
        response.status(500).json({ error: "Failed to like comment" });
    }
};

export default {
    createComment,
    getCommentsByArticle,
    getCommentById,
    likeComment
};
