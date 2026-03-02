import mongoose from "mongoose";

// ===== COMMENT MODEL =====
// Defines the schema for article comments (visitor comments on articles)

const CommentSchema = new mongoose.Schema({
    articleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Article",
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null  // Allow anonymous comments (no author)
    },
    authorName: {
        type: String,
        default: "Anonymous"  // Display name for anonymous comments
    },
    content: {
        type: String,
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null  // null means it's a top-level comment, otherwise it's a reply
    },
    likes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    approved: {
        type: Boolean,
        default: true  // Comments show immediately
    }
});

const Comment = mongoose.model("Comment", CommentSchema);

// ===== DATABASE FUNCTIONS =====

// Create a new comment
// Returns the created comment with author info populated
async function createComment(articleId, content, parentId = null, authorId = null, authorName = "Anonymous") {
    const comment = new Comment({
        articleId,
        author: authorId || null,
        authorName: authorName || "Anonymous",
        content,
        parentId
    });
    
    await comment.save();
    // Populate the author field before returning
    await comment.populate('author');
    return comment;
}

// Get all approved comments for an article (with replies)
// Uses .populate('author') to fetch user info
// Populates likes array with user data (nickname, email, etc.)
async function getCommentsByArticle(articleId) {
    return await Comment.find({
        articleId,
        approved: true,
        parentId: null  // Only get top-level comments
    })
    .populate('author')
    .populate('likes', 'nickname email firstName lastName')
    .sort({ createdAt: -1 });
}

// Get all replies for a comment
async function getCommentReplies(parentCommentId) {
    return await Comment.find({
        parentId: parentCommentId,
        approved: true
    })
    .populate('author')
    .populate('likes', 'nickname email firstName lastName')
    .sort({ createdAt: 1 });
}

// Get a single comment by ID
async function getCommentById(commentId) {
    return await Comment.findById(commentId)
        .populate('author')
        .populate('likes', 'nickname email firstName lastName');
}

// Update comment (admin only)
async function updateComment(commentId, content) {
    return await Comment.findByIdAndUpdate(
        commentId,
        { 
            content,
            updatedAt: Date.now()
        },
        { new: true }
    ).populate('author');
}

// Approve comment (admin only)
async function approveComment(commentId) {
    return await Comment.findByIdAndUpdate(
        commentId,
        { approved: true },
        { new: true }
    ).populate('author');
}

// Delete comment (admin only)
async function deleteComment(commentId) {
    // Also delete all replies to this comment
    await Comment.deleteMany({ parentId: commentId });
    return await Comment.findByIdAndDelete(commentId);
}

// Get all unapproved comments (for admin moderation)
async function getUnapprovedComments() {
    return await Comment.find({ approved: false })
        .populate('author')
        .sort({ createdAt: -1 });
}

// Like/unlike a comment (toggle)
// Returns the updated comment with populated author and likes
async function likeComment(commentId, userId) {
    const comment = await Comment.findById(commentId);
    if (!comment) return null;
    
    // MIGRATION: Convert old Number likes to array (for backward compatibility)
    if (typeof comment.likes === 'number') {
        comment.likes = [];
    }
    
    // Ensure likes is an array
    if (!Array.isArray(comment.likes)) {
        comment.likes = [];
    }
    
    // Check if user already liked
    const userIdStr = userId.toString();
    const alreadyLiked = comment.likes.some(id => id.toString() === userIdStr);
    
    if (alreadyLiked) {
        // Unlike: remove from array
        comment.likes = comment.likes.filter(id => id.toString() !== userIdStr);
    } else {
        // Like: add to array
        comment.likes.push(userId);
    }
    
    await comment.save();
    return await Comment.findById(commentId)
        .populate('author')
        .populate('likes', 'nickname email firstName lastName');
}

// Get comments authored by a specific user
async function getCommentsByAuthor(authorId) {
    return await Comment.find({ author: authorId })
        .populate('author')
        .populate('likes', 'nickname email firstName lastName')
        .populate('articleId', 'title')
        .populate('parentId', 'content authorName')
        .sort({ createdAt: -1 });
}

// Get replies made to comments authored by a specific user
async function getRepliesToUserComments(authorId) {
    const userComments = await Comment.find({ author: authorId }).select('_id');
    const userCommentIds = userComments.map(comment => comment._id);

    if (userCommentIds.length === 0) {
        return [];
    }

    return await Comment.find({
        parentId: { $in: userCommentIds },
        author: { $ne: authorId }
    })
        .populate('author')
        .populate('likes', 'nickname email firstName lastName')
        .populate('articleId', 'title')
        .populate('parentId', 'content authorName')
        .sort({ createdAt: -1 });
}

export default {
    createComment,
    getCommentsByArticle,
    getCommentReplies,
    getCommentById,
    updateComment,
    approveComment,
    deleteComment,
    getUnapprovedComments,
    likeComment,
    getCommentsByAuthor,
    getRepliesToUserComments
};
