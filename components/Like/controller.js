import {
  likeArticle as likeArticleModel,
  unlikeArticle as unlikeArticleModel,
  getLikedArticlesByUser as getLikedArticlesByUserModel,
  getUsersWhoLikedArticle as getUsersWhoLikedArticleModel
} from "./model.js";

// Like an article
export const likeArticle = async (req, res) => {
  const { userId, articleId } = req.body;
  if (!userId || !articleId) {
    return res.status(400).json({ message: "Missing userId or articleId" });
  }
  try {
    await likeArticleModel(userId, articleId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Unlike an article
export const unlikeArticle = async (req, res) => {
  const { userId, articleId } = req.body;
  if (!userId || !articleId) {
    return res.status(400).json({ message: "Missing userId or articleId" });
  }
  try {
    await unlikeArticleModel(userId, articleId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all articles liked by a user
export const getLikedArticlesByUser = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }
  try {
    const likes = await getLikedArticlesByUserModel(userId);
    res.json({ articles: likes.map(like => like.articleId) });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all users who liked an article
export const getUsersWhoLikedArticle = async (req, res) => {
  const { articleId } = req.params;
  if (!articleId) {
    return res.status(400).json({ message: "Missing articleId" });
  }
  try {
    const likes = await getUsersWhoLikedArticleModel(articleId);
    res.json({ users: likes.map(like => like.userId) });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
