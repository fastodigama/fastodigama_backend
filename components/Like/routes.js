import express from "express";
import { likeArticle, unlikeArticle, getLikedArticlesByUser, getUsersWhoLikedArticle } from "./controller.js";

const router = express.Router();

// Like an article
router.post("/like", likeArticle);

// Unlike an article
router.post("/unlike", unlikeArticle);

// Get all articles liked by a user
router.get("/user/:userId", getLikedArticlesByUser);

// Get all users who liked an article
router.get("/article/:articleId", getUsersWhoLikedArticle);

export default router;
