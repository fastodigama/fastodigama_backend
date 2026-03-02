// ===== COMMENT CONTROLLER =====
// Handles comment CRUD operations for visitors and authenticated users

import commentModel from "./model.js";
import userModel from "../User/model.js";

// POST: Create a new comment
const createComment = async (request, response) => {
    try {
        const { articleId, content, parentId, authorName } = request.body;
        
        // Validate required fields
        if (!articleId || !content) {
            return response.status(400).json({ 
                error: "Missing required fields (articleId, content)" 
            });
        }
        
        // Validate content length (min 2 chars)
        if (content.trim().length < 2) {
            return response.status(400).json({ 
                error: "Comment must be at least 2 characters" 
            });
        }

        // Check if user is authenticated
        let authorId = null;
        let finalAuthorName = "Anonymous";
        
        if (request.session && request.session.loggedIn && request.session.user) {
            // User is authenticated - get their profile and use nickname
            const user = await userModel.getUserByEmail(request.session.user);
            if (user) {
                authorId = user._id;
                finalAuthorName = user.nickname || user.firstName || "Anonymous";
            }
        } else {
            // Anonymous comment - use provided name or default
            finalAuthorName = authorName && authorName.trim() ? authorName.trim() : "Anonymous";
        }
        
        // Create the comment
        const comment = await commentModel.createComment(
            articleId,
            content,
            parentId || null,
            authorId,
            finalAuthorName
        );
        
        response.status(201).json({
            success: true,
            message: "Comment posted",
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

// PUT: Like/unlike a comment (requires authentication)
const likeComment = async (request, response) => {
    try {
        // Check authentication
        if (!request.session || !request.session.loggedIn || !request.session.user) {
            return response.status(401).json({ 
                error: "Authentication required to like comments" 
            });
        }

        const { commentId } = request.params;
        
        // Get user ID from session
        const user = await userModel.getUserByEmail(request.session.user);
        if (!user) {
            return response.status(404).json({ error: "User not found" });
        }
        
        const comment = await commentModel.likeComment(commentId, user._id);
        
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
