import mongoose from "mongoose";

const LikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: "Article", required: true },
  createdAt: { type: Date, default: Date.now }
});

LikeSchema.index({ userId: 1, articleId: 1 }, { unique: true }); // Prevent duplicate likes

const Like = mongoose.model("Like", LikeSchema);

// Add a like
async function likeArticle(userId, articleId) {
  return await Like.findOneAndUpdate(
    { userId, articleId },
    { $setOnInsert: { userId, articleId } },
    { upsert: true, new: true }
  );
}

// Remove a like
async function unlikeArticle(userId, articleId) {
  return await Like.deleteOne({ userId, articleId });
}

// Check if user liked article
async function isArticleLikedByUser(userId, articleId) {
  return await Like.exists({ userId, articleId });
}

// Get all articles liked by a user
async function getLikedArticlesByUser(userId) {
  return await Like.find({ userId }).populate("articleId");
}

// Get all users who liked an article
async function getUsersWhoLikedArticle(articleId) {
  return await Like.find({ articleId }).populate("userId");
}

// Count likes for an article
async function countLikesForArticle(articleId) {
  return await Like.countDocuments({ articleId });
}

// Delete all likes by a user
// Delete all likes for an article
async function deleteLikesByArticleId(articleId) {
  return await Like.deleteMany({ articleId });
}
async function deleteManyByUserId(userId) {
  return await Like.deleteMany({ userId });
}

export default {
  likeArticle,
  unlikeArticle,
  isArticleLikedByUser,
  getLikedArticlesByUser,
  getUsersWhoLikedArticle,
  countLikesForArticle,
  deleteManyByUserId,
  deleteLikesByArticleId
};
