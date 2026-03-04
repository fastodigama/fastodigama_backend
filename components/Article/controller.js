// Like an article
const likeArticleApi = async (request, response) => {
  try {
    const articleId = request.params.id;
    // You should get userId from session or request body; here we use request.body.userId for demo
    const userId = request.body.userId;
    if (!userId) return response.status(400).json({ message: "Missing userId" });
    const article = await articleModel.getArticleById(articleId);
    if (!article) return response.status(404).json({ message: "Article not found" });
    if (!article.likes) article.likes = [];
    if (!article.likes.map(id => id.toString()).includes(userId)) {
      article.likes.push(userId);
      await article.save();
    }
    response.json({ likes: article.likes.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error" });
  }
};

// Unlike an article
const unlikeArticleApi = async (request, response) => {
  try {
    const articleId = request.params.id;
    const userId = request.body.userId;
    if (!userId) return response.status(400).json({ message: "Missing userId" });
    const article = await articleModel.getArticleById(articleId);
    if (!article) return response.status(404).json({ message: "Article not found" });
    if (!article.likes) article.likes = [];
    const before = article.likes.length;
    article.likes = article.likes.filter(id => id.toString() !== userId);
    if (article.likes.length !== before) {
      await article.save();
    }
    response.json({ likes: article.likes.length });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error" });
  }
};
import mongoose from "mongoose";
import articleModel from "./model.js";
import categoryModel from "../Category/model.js";
import commentModel from "../Comment/model.js";
import { marked } from "marked";
import multer from "multer";
import { s3 } from "../config/r2.js";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const upload = multer({
  storage: multer.memoryStorage(), 
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});


// ===== ARTICLE CONTROLLER =====

// Get all Articles and return as JSON (for frontend API)
const getArticlesApiResponse = async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = request.query.search || "";
    const category = request.query.category || "";

    let totalArticles;
    let articles;

    if (category && search) {
      totalArticles = await articleModel.countByCategoryAndSearch(category, search);
      articles = await articleModel.getByCategoryAndSearchPaginated(category, search, skip, limit);
    } else if (category) {
      totalArticles = await articleModel.countByCategory(category);
      articles = await articleModel.getByCategoryPaginated(category, skip, limit);
    } else if (search) {
      totalArticles = await articleModel.countSearchArticles(search);
      articles = await articleModel.searchArticlesPaginated(search, skip, limit);
    } else {
      totalArticles = await articleModel.countArticles();
      articles = await articleModel.getArticlesPaginated(skip, limit);
    }

    const totalPages = Math.ceil(totalArticles / limit);

    // Ensure all image URLs use CDN domain
    // Count comments for each article
    const commentModel = (await import("../Comment/model.js")).default;
    const mappedArticles = await Promise.all(articles.map(async article => {
      let commentsCount = 0;
      try {
        commentsCount = await commentModel.getCommentsByArticle(article._id).then(comments => comments.length);
      } catch (e) {}
      if (Array.isArray(article.images)) {
        article.images = article.images.map(img => {
          let filename = img.key || img.url || img;
          if (filename.startsWith('http')) {
            filename = filename.split('/').pop();
          }
          return {
            ...img,
            url: `${process.env.ARTICLE_IMAGE_BASE}/${filename}`
          };
        });
      }
      return {
        ...article.toObject ? article.toObject() : article,
        views: article.views || 0,
        commentsCount,
        likes: Array.isArray(article.likes) ? article.likes.length : 0
      };
    }));
    response.json({ articles: mappedArticles, page, totalPages, totalArticles, search, category });

  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error" });
  }
};


// GET list of all articles // FOR BACKEND ONLY
const getAllArticles = async (request, response) => {
  const page = parseInt(request.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const search = request.query.search || "";
  const category = request.query.category || "";

  let totalArticles;
  let articles;

  if (category && search) {
    totalArticles = await articleModel.countByCategoryAndSearch(category, search);
    articles = await articleModel.getByCategoryAndSearchPaginated(category, search, skip, limit);
  } else if (category) {
    totalArticles = await articleModel.countByCategory(category);
    articles = await articleModel.getByCategoryPaginated(category, skip, limit);
  } else if (search) {
    totalArticles = await articleModel.countSearchArticles(search);
    articles = await articleModel.searchArticlesPaginated(search, skip, limit);
  } else {
    totalArticles = await articleModel.countArticles();
    articles = await articleModel.getArticlesPaginated(skip, limit);
  }

  const totalPages = Math.ceil(totalArticles / limit);
  const categories = await categoryModel.getCategories();

  response.render("article/article-list", {
    title: "Article List",
    articles,
    categories,
    currentPath: request.originalUrl.split('?')[0],
    currentPage: page,
    totalPages,
    totalArticles,
    search,
    category,
  });
};

// Get single article by ID
const getArticleByIdApiResponse = async (request, response) => {
  try {
    const id = request.params.id;
    // Increment views atomically and return the updated document
    const article = await articleModel.incrementArticleViewsById(id);
    if (!article) {
      return response.status(404).json({message: "Article not found"});
    }
    // Count comments for this article
    const commentModel = (await import("../Comment/model.js")).default;
    let commentsCount = 0;
    try {
      commentsCount = await commentModel.getCommentsByArticle(article._id).then(comments => comments.length);
    } catch (e) {}
    // Ensure all image URLs use CDN domain
    if (article && Array.isArray(article.images)) {
      article.images = article.images.map(img => {
        let filename = img.key || img.url || img;
        if (filename.startsWith('http')) {
          filename = filename.split('/').pop();
        }
        return {
          ...img,
          url: `${process.env.ARTICLE_IMAGE_BASE}/${filename}`
        };
      });
    }
    response.json({
      article: {
        ...article.toObject ? article.toObject() : article,
        views: article.views || 0,
        commentsCount,
        likes: Array.isArray(article.likes) ? article.likes.length : 0
      }
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error"})
  }
}

// Display a single article in detail view
const buildNestedCommentsForArticleView = async (parentCommentId) => {
  const replies = await commentModel.getCommentReplies(parentCommentId);

  return Promise.all(
    replies.map(async (reply) => ({
      ...(reply.toObject ? reply.toObject() : reply),
      replies: await buildNestedCommentsForArticleView(reply._id),
    }))
  );
};

const viewArticle = async (request, response) => {
  const articleId = request.query.articleId;
  const article = await articleModel.getArticleById(articleId);
  if (!article) {
    return response.redirect("/admin/article");
  }
  await article.populate("categoryId");
  const htmlContent = marked(article.text);
  
  // Fetch comments with unlimited nested replies for this article
  const topLevelComments = await commentModel.getCommentsByArticle(articleId);
  const comments = await Promise.all(
    topLevelComments.map(async (comment) => ({
      ...(comment.toObject ? comment.toObject() : comment),
      replies: await buildNestedCommentsForArticleView(comment._id),
    }))
  );
  
  response.render("article/article-view", { 
    title: "view Article", 
    article, 
    htmlContent, 
    comments,
    currentPath: request.originalUrl.split('?')[0] 
  });
};

// Show the form to add a new article
const addArticleForm = async (request, response) => {
  const categories = await categoryModel.getCategories();
  response.render("article/article-add", { title: "Article Add", categories, currentPath: request.originalUrl.split('?')[0] });
};


// 🌟 UPDATED: Save a new article to the database (with author)
const addNewArticle = async (request, response) => {
  try {
    // Extracted author from req.body
    const { title, text, categoryId, author } = request.body; 
    
    const altTexts = request.body.alt 
      ? (Array.isArray(request.body.alt) ? request.body.alt : [request.body.alt]) 
      : [];

    let images = [];

    if (request.files && request.files.length > 0) {
      images = await Promise.all(request.files.map(async (file, index) => {
        const projectNameSlug = title.toLowerCase().trim().replace(/\s+/g, "-");
        const fileName = `${projectNameSlug}-${Date.now()}-${index}.webp`;

        const buffer = await sharp(file.buffer)
          .resize(1200, null, { withoutEnlargement: true }) 
          .webp({ quality: 80 }) 
          .toBuffer();

        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/webp",
        }));

        return {
          url: `${process.env.ARTICLE_IMAGE_BASE}/${fileName}`,
          key: fileName,
          alt: altTexts[index] || ""
        };
      }));
    }

    // Added author to the payload sent to the model
    const result = await articleModel.addArticle({ title, text, categoryId, author, images });
    if (result) return response.redirect("/admin/article");

  } catch (err) {
    console.error("Error adding article with Sharp:", err);
    return response.status(500).send("Failed to process images.");
  }
};

// Delete an article by ID
const deleteArticle = async (request, response) => {
  let result = await articleModel.deleteArticleById(request.query.articleId);
  if (result) {
    response.redirect("/admin/article");
  } else {
    response.render("article/article-list", {
      err: "error deleting article",
    });
  }
};

// Show the form to edit an existing article
const editArticleForm = async (request, response) => {
  const articleId = request.query.articleId;
  if (!articleId) {
    return response.redirect("/admin/article");
  }

  const editArticle = await articleModel.getArticleById(articleId);
  if (!editArticle) {
    return response.redirect("/admin/article");
  }

  const categories = await categoryModel.getCategories();
  response.render("article/article-edit", {
    title: "Article Edit",
    editArticle,
    categories,
    currentPath: request.originalUrl.split('?')[0],
  });
};


// 🌟 UPDATED: Update an article in the database (with author)
const editArticle = async (request, response) => {
  try {
    // Extracted author from req.body
    const { articleId, title, text, categoryId, author, existingImageKeys, existingImageAlts } = request.body;
    
    // Added author to the update payload
    const updateData = { title, text, categoryId, author };

    const existingArticle = await articleModel.getArticleById(articleId);
    let currentImages = existingArticle.images || [];

    if (existingImageKeys) {
      const keys = Array.isArray(existingImageKeys) ? existingImageKeys : [existingImageKeys];
      const alts = Array.isArray(existingImageAlts) ? existingImageAlts : [existingImageAlts];

      currentImages = currentImages.map(img => {
        const index = keys.indexOf(img.key);
        if (index !== -1) {
          return { ...img.toObject(), alt: alts[index] };
        }
        return img;
      });
    }

    let newImages = [];
    if (request.files && request.files.length > 0) {
      const newAltTexts = request.body.alt 
        ? (Array.isArray(request.body.alt) ? request.body.alt : [request.body.alt]) 
        : [];

      newImages = await Promise.all(request.files.map(async (file, index) => {
        const projectNameSlug = title.toLowerCase().trim().replace(/\s+/g, "-");
        const fileName = `${projectNameSlug}-${Date.now()}-${index}.webp`;

        const buffer = await sharp(file.buffer)
          .resize(1200, null, { withoutEnlargement: true }) 
          .webp({ quality: 80 }) 
          .toBuffer();

        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/webp",
        }));

        return {
          url: `${process.env.ARTICLE_IMAGE_BASE}/${fileName}`,
          key: fileName,
          alt: newAltTexts[index] || ""
        };
      }));
    }

    updateData.images = [...currentImages, ...newImages];

    const result = await articleModel.editArticlebyId(articleId, updateData);

    if (result) {
      return response.redirect("/admin/article");
    }

    return response.render("article/article-list", { err: "Error updating article" });
    
  } catch (error) {
    console.error("Error editing article with Sharp:", error);
    return response.render("article/article-list", { err: "Unexpected error updating article" });
  }
};

// Delete an image from an article
const deleteImage = async (request, response) => {
  try {
    const { articleId, imageKey } = request.body;

    if (!articleId || !imageKey) {
      return response.status(400).json({ error: "Article ID and image key are required" });
    }

    const article = await articleModel.getArticleById(articleId);
    
    if (!article) {
      return response.status(404).json({ error: "Article not found" });
    }


    // Delete image from R2
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: imageKey,
        })
      );
    } catch (deleteErr) {
      console.error("R2 image deletion error:", deleteErr);
      // Continue with DB update even if image deletion fails
    }

    const updatedImages = article.images.filter(img => img.key !== imageKey);

    const result = await articleModel.editArticlebyId(articleId, {
      images: updatedImages
    });

    if (result) {
      return response.json({ 
        success: true, 
        message: "Image deleted successfully"
      });
    }

    return response.status(500).json({ error: "Failed to delete image" });

  } catch (error) {
    console.error("Error deleting image:", error);
    return response.status(500).json({ error: "Server error deleting image" });
  }
};

// Delete a comment from article view (admin only)
const deleteCommentFromArticle = async (request, response) => {
  const { commentId, articleId } = request.query;
  
  try {
    await commentModel.deleteComment(commentId);
    // Redirect back to the article view
    response.redirect(`/admin/article/view?articleId=${articleId}`);
  } catch (error) {
    console.error("Error deleting comment:", error);
    response.redirect(`/admin/article/view?articleId=${articleId}`);
  }
};

export { upload };
export default {
  getAllArticles,
  viewArticle,
  addArticleForm,
  addNewArticle,
  editArticleForm,
  editArticle,
  deleteArticle,
  deleteImage,
  deleteCommentFromArticle,
  getArticlesApiResponse,
  getArticleByIdApiResponse,
  likeArticleApi,
  unlikeArticleApi,
};