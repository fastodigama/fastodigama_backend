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
        required: true // Disallow anonymous comments
    },
    authorName: {
        type: String,
        required: true, // Always require authorName
        default: "Deleted User" // Default for anonymized/deleted users
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
    likeEvents: {
        type: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
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
// Delete all comments for an article
async function deleteCommentsByArticleId(articleId) {
    await Comment.deleteMany({ articleId });
}

// Create a new comment
// Returns the created comment with author info populated
async function createComment(articleId, content, parentId = null, authorId = null, authorName = "Anonymous") {
    const comment = new Comment({
        articleId,
        author: authorId,
        authorName: authorName,
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
        comment.likeEvents.push({
            user: userId,
            createdAt: new Date()
        });
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
        .populate('articleId', 'title slug')
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
        .populate('articleId', 'title slug')
        .populate('parentId', 'content authorName')
        .sort({ createdAt: -1 });
}

async function getUnreadRepliesToUserComments(authorId, lastSeenAt = null) {
    const userComments = await Comment.find({ author: authorId }).select('_id');
    const userCommentIds = userComments.map(comment => comment._id);

    if (userCommentIds.length === 0) {
        return [];
    }

    const query = {
        parentId: { $in: userCommentIds },
        author: { $ne: authorId }
    };

    if (lastSeenAt) {
        query.createdAt = { $gt: lastSeenAt };
    }

    return await Comment.find(query)
        .populate('author')
        .populate('likes', 'nickname email firstName lastName')
        .populate('articleId', 'title slug')
        .populate('parentId', 'content authorName')
        .sort({ createdAt: -1 });
}

async function getLikesToUserComments(authorId, lastSeenAt = null) {
    const userComments = await Comment.find({ author: authorId })
        .populate('articleId', 'title')
        .populate('parentId', 'content authorName');

    const notifications = [];

    for (const comment of userComments) {
        if (!Array.isArray(comment.likeEvents) || comment.likeEvents.length === 0) {
            continue;
        }

        const filteredEvents = comment.likeEvents.filter(event => {
            const isSelfLike = event.user && event.user.toString() === authorId.toString();
            const isUnreadByTime = !lastSeenAt || event.createdAt > lastSeenAt;
            return !isSelfLike && isUnreadByTime;
        });

        if (filteredEvents.length === 0) {
            continue;
        }

        const likerIds = [...new Set(filteredEvents.map(event => event.user.toString()))];
        const likerDocs = await mongoose.model('User').find({ _id: { $in: likerIds } });

        const likerMap = new Map(likerDocs.map(liker => [liker._id.toString(), liker]));

        filteredEvents.forEach(event => {
            const liker = likerMap.get(event.user.toString());
            notifications.push({
                _id: `${comment._id}-${event.user}-${event.createdAt.getTime()}`,
                commentId: comment._id,
                articleId: comment.articleId,
                parentId: comment.parentId || null,
                commentContent: comment.content,
                authorName: comment.authorName,
                likedAt: event.createdAt,
                user: liker || null
            });
        });
    }

    notifications.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));
    return notifications;
}

// ===== GDPR FUNCTIONS =====

// Get all comments by a user (for GDPR data export)
async function getCommentsByUser(userId) {
    return await Comment.find({ author: userId })
        .sort({ createdAt: -1 })
        .lean();
}

// Anonymize user's comments (for GDPR account deletion)
// Sets author to null and authorName to "Deleted User"
async function anonymizeUserComments(userId) {
    const result = await Comment.updateMany(
        { author: userId },
        { 
            $set: { 
                author: null,
                authorName: "Deleted User"
            }
        }
    );
    return result.modifiedCount;
}

export default {
    deleteCommentsByArticleId,
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
    getRepliesToUserComments,
    getUnreadRepliesToUserComments,
    getLikesToUserComments,
    getCommentsByUser,
    anonymizeUserComments
};
