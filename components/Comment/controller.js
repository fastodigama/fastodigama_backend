// ===== COMMENT CONTROLLER =====
// Handles comment CRUD operations for visitors and authenticated users

import commentModel from "./model.js";
import userModel from "../User/model.js";

// Helper function to transform comment with full R2 URL for profile pictures
const transformCommentWithFullURL = (comment) => {
    const commentObj = comment.toObject ? comment.toObject() : comment;
    
    // Transform author profile picture if present
    if (commentObj.author && commentObj.author.profilePicture) {
        if (!commentObj.author.profilePicture.startsWith('http')) {
            commentObj.author.profilePicture = `${process.env.PROFILE_IMAGE_BASE}/${commentObj.author.profilePicture}`;
        }
    }
    
    // Transform likes array profile pictures if present
    if (commentObj.likes && Array.isArray(commentObj.likes)) {
        commentObj.likes = commentObj.likes.map(user => {
            if (user.profilePicture && !user.profilePicture.startsWith('http')) {
                return {
                    ...user,
                    profilePicture: `${process.env.PROFILE_IMAGE_BASE}/${user.profilePicture}`
                };
            }
            return user;
        });
    }
    
    return commentObj;
};

const buildNestedReplies = async (parentCommentId) => {
    const replies = await commentModel.getCommentReplies(parentCommentId);

    return Promise.all(
        replies.map(async (reply) => ({
            ...transformCommentWithFullURL(reply),
            replies: await buildNestedReplies(reply._id)
        }))
    );
};

const getAuthenticatedUserFromSession = async (request) => {
    if (!request.session || !request.session.loggedIn || !request.session.user) {
        return null;
    }

    return await userModel.getUserByEmail(request.session.user);
};

const transformLikeNotificationWithFullURL = (notification) => {
    const notificationObj = notification.toObject ? notification.toObject() : notification;

    if (notificationObj.user && notificationObj.user.profilePicture) {
        if (!notificationObj.user.profilePicture.startsWith('http')) {
            notificationObj.user.profilePicture = `${process.env.PROFILE_IMAGE_BASE}/${notificationObj.user.profilePicture}`;
        }
    }

    return notificationObj;
};

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

        const isAuthenticated = Boolean(
            request.session && request.session.loggedIn && request.session.user
        );

        // Replies (including reply-to-reply) require authentication
        if (parentId && !isAuthenticated) {
            return response.status(401).json({
                error: "Authentication required to reply to comments"
            });
        }

        // Check if user is authenticated
        let authorId = null;
        let finalAuthorName = "Anonymous";
        
        if (isAuthenticated) {
            // User is authenticated - get their profile and use nickname
            const user = await userModel.getUserByEmail(request.session.user);
            if (user) {
                authorId = user._id;
                finalAuthorName = user.nickname || user.firstName || "Anonymous";
            } else if (parentId) {
                return response.status(401).json({
                    error: "Authentication required to reply to comments"
                });
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
            comment: transformCommentWithFullURL(comment)
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
        
        // For each comment, get all nested replies (unlimited depth)
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                return {
                    ...transformCommentWithFullURL(comment),
                    replies: await buildNestedReplies(comment._id)
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
            comment: transformCommentWithFullURL(comment)
        });
    } catch (error) {
        console.error("Get comment error:", error);
        response.status(500).json({ error: "Failed to fetch comment" });
    }
};

// GET: Current user's own comments and replies
const getMyComments = async (request, response) => {
    try {
        const user = await getAuthenticatedUserFromSession(request);
        if (!user) {
            return response.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const comments = await commentModel.getCommentsByAuthor(user._id);

        response.json({
            success: true,
            comments: comments.map(comment => transformCommentWithFullURL(comment))
        });
    } catch (error) {
        console.error("Get my comments error:", error);
        response.status(500).json({ error: "Failed to fetch your comments" });
    }
};

// GET: Replies from others to current user's comments
const getRepliesToMe = async (request, response) => {
    try {
        const user = await getAuthenticatedUserFromSession(request);
        if (!user) {
            return response.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const replies = await commentModel.getRepliesToUserComments(user._id);
        const unreadReplies = await commentModel.getUnreadRepliesToUserComments(
            user._id,
            user.lastRepliesSeenAt || null
        );

        response.json({
            success: true,
            replies: replies.map(reply => transformCommentWithFullURL(reply)),
            unreadCount: unreadReplies.length
        });
    } catch (error) {
        console.error("Get replies to me error:", error);
        response.status(500).json({ error: "Failed to fetch replies to your comments" });
    }
};

// POST: Mark replies notifications as seen
const markRepliesSeen = async (request, response) => {
    try {
        const user = await getAuthenticatedUserFromSession(request);
        if (!user) {
            return response.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        await userModel.markRepliesSeen(user._id);
        response.json({ success: true });
    } catch (error) {
        console.error("Mark replies seen error:", error);
        response.status(500).json({ error: "Failed to mark replies as seen" });
    }
};

// GET: Likes from others on current user's comments
const getLikesToMe = async (request, response) => {
    try {
        const user = await getAuthenticatedUserFromSession(request);
        if (!user) {
            return response.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const likes = await commentModel.getLikesToUserComments(user._id, null);
        const unreadLikes = await commentModel.getLikesToUserComments(
            user._id,
            user.lastLikesSeenAt || null
        );

        response.json({
            success: true,
            likes: likes.map(like => transformLikeNotificationWithFullURL(like)),
            unreadCount: unreadLikes.length
        });
    } catch (error) {
        console.error("Get likes to me error:", error);
        response.status(500).json({ error: "Failed to fetch likes to your comments" });
    }
};

// POST: Mark likes notifications as seen
const markLikesSeen = async (request, response) => {
    try {
        const user = await getAuthenticatedUserFromSession(request);
        if (!user) {
            return response.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        await userModel.markLikesSeen(user._id);
        response.json({ success: true });
    } catch (error) {
        console.error("Mark likes seen error:", error);
        response.status(500).json({ error: "Failed to mark likes as seen" });
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
            comment: transformCommentWithFullURL(comment)
        });
    } catch (error) {
        console.error("Like comment error:", error);
        response.status(500).json({ error: "Failed to like comment" });
    }
};

// PUT: Update a comment (only author can edit their own comment)
const updateComment = async (request, response) => {
    try {
        // Check authentication
        if (!request.session || !request.session.loggedIn || !request.session.user) {
            return response.status(401).json({ 
                error: "Authentication required to update comments" 
            });
        }

        const { commentId } = request.params;
        const { content } = request.body;

        if (!content || content.trim().length < 2) {
            return response.status(400).json({ 
                error: "Comment must be at least 2 characters" 
            });
        }

        // Get user from session
        const user = await userModel.getUserByEmail(request.session.user);
        if (!user) {
            return response.status(404).json({ error: "User not found" });
        }

        // Get the comment to check ownership
        const existingComment = await commentModel.getCommentById(commentId);
        if (!existingComment) {
            return response.status(404).json({ error: "Comment not found" });
        }

        // Check if user is the author (only author can edit)
        if (!existingComment.author || existingComment.author._id.toString() !== user._id.toString()) {
            return response.status(403).json({ 
                error: "You can only edit your own comments" 
            });
        }

        // Update the comment
        const updatedComment = await commentModel.updateComment(commentId, content.trim());
        
        response.json({
            success: true,
            comment: transformCommentWithFullURL(updatedComment)
        });
    } catch (error) {
        console.error("Update comment error:", error);
        response.status(500).json({ error: "Failed to update comment" });
    }
};

// DELETE: Delete a comment (author or admin can delete)
const deleteComment = async (request, response) => {
    try {
        // Check authentication
        if (!request.session || !request.session.loggedIn || !request.session.user) {
            return response.status(401).json({ 
                error: "Authentication required to delete comments" 
            });
        }

        const { commentId } = request.params;

        // Get user from session
        const user = await userModel.getUserByEmail(request.session.user);
        if (!user) {
            return response.status(404).json({ error: "User not found" });
        }

        // Get the comment to check ownership
        const existingComment = await commentModel.getCommentById(commentId);
        if (!existingComment) {
            return response.status(404).json({ error: "Comment not found" });
        }

        // Check permissions: author can delete their own, admin can delete any
        const isAuthor = existingComment.author && 
                        existingComment.author._id.toString() === user._id.toString();
        const isAdmin = user.role === "admin";

        if (!isAuthor && !isAdmin) {
            return response.status(403).json({ 
                error: "You can only delete your own comments" 
            });
        }

        // Delete the comment
        await commentModel.deleteComment(commentId);
        
        response.json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        console.error("Delete comment error:", error);
        response.status(500).json({ error: "Failed to delete comment" });
    }
};

export default {
    createComment,
    getCommentsByArticle,
    getCommentById,
    getMyComments,
    getRepliesToMe,
    markRepliesSeen,
    getLikesToMe,
    markLikesSeen,
    likeComment,
    updateComment,
    deleteComment
};
