import mongoose from "mongoose";
import articleModel from "./model.js";
import categoryModel from "../Category/model.js";
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

    response.json({ articles, page, totalPages, totalArticles, search, category });

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
    const article = await articleModel.getArticleById(id);

    if (!article) {
      return response.status(404).json({message: "Article not found"});
    }
    
    response.json({article});
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error"})
  }
}

// Display a single article in detail view
const viewArticle = async (request, response) => {
  const articleId = request.query.articleId;
  const article = await articleModel.getArticleById(articleId);
  if (!article) {
    return response.redirect("/admin/article");
  }
  await article.populate("categoryId");
  const htmlContent = marked(article.text);
  response.render("article/article-view", { title: "view Article", article, htmlContent });
};

// Show the form to add a new article
const addArticleForm = async (request, response) => {
  const categories = await categoryModel.getCategories();
  response.render("article/article-add", { title: "Article Add", categories });
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
  getArticlesApiResponse,
  getArticleByIdApiResponse,
};