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
        ref: "Reader",
        required: true
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
        type: Number,
        default: 0
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
        default: false  // Comments need admin approval before showing
    }
});

const Comment = mongoose.model("Comment", CommentSchema);

// ===== DATABASE FUNCTIONS =====

// Create a new comment
// Returns the created comment with author info populated
async function createComment(articleId, authorId, content, parentId = null) {
    const comment = new Comment({
        articleId,
        author: authorId,
        content,
        parentId
    });
    
    await comment.save();
    // Populate the author field before returning
    await comment.populate('author');
    return comment;
}

// Get all approved comments for an article (with replies)
// Uses .populate('author') to fetch TikTok visitor info
async function getCommentsByArticle(articleId) {
    return await Comment.find({
        articleId,
        approved: true,
        parentId: null  // Only get top-level comments
    })
    .populate('author')
    .sort({ createdAt: -1 });
}

// Get all replies for a comment
async function getCommentReplies(parentCommentId) {
    return await Comment.find({
        parentId: parentCommentId,
        approved: true
    })
    .populate('author')
    .sort({ createdAt: 1 });
}

// Get a single comment by ID
async function getCommentById(commentId) {
    return await Comment.findById(commentId).populate('author');
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

// Like a comment
async function likeComment(commentId) {
    return await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likes: 1 } },
        { new: true }
    ).populate('author');
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
    likeComment
};
