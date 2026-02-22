import mongoose from "mongoose";
import articleModel from "./model.js";
import categoryModel from "../Category/model.js";
import { marked } from "marked";
import multer from "multer";
import { s3 } from "../config/r2.js";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3"; // 🌟 Fixed import!

const upload = multer({
  storage: multer.memoryStorage(), 
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});


// ===== ARTICLE CONTROLLER =====
// Handles all article business logic (Create, Read, Update, Delete)

// Get all Articles and return as JSON (for frontend API)
//THIS FIR FRONTEND ONLY
const getArticlesApiResponse = async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = request.query.search || "";
    const category = request.query.category || "";

    let totalArticles;
    let articles;

    // CASE 1 — Category + Search
    if (category && search) {
      totalArticles = await articleModel.countByCategoryAndSearch(category, search);
      articles = await articleModel.getByCategoryAndSearchPaginated(category, search, skip, limit);
    }
    // CASE 2 — Category only
    else if (category) {
      totalArticles = await articleModel.countByCategory(category);
      articles = await articleModel.getByCategoryPaginated(category, skip, limit);
    }
    // CASE 3 — Search only
    else if (search) {
      totalArticles = await articleModel.countSearchArticles(search);
      articles = await articleModel.searchArticlesPaginated(search, skip, limit);
    }
    // CASE 4 — No filters
    else {
      totalArticles = await articleModel.countArticles();
      articles = await articleModel.getArticlesPaginated(skip, limit);
    }

    const totalPages = Math.ceil(totalArticles / limit);

    // Return JSON instead of rendering HTML
    response.json({
      articles,
      page,
      totalPages,
      totalArticles,
      search,
      category
    });

  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Server Error" });
  }
};



// GET list of all articles // FOR BACKED ONLY
const getAllArticles = async (request, response) => {
  const page = parseInt(request.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const search = request.query.search || "";
  const category = request.query.category || "";

  let totalArticles;
  let articles;

  // CASE 1 — Category + Search
  if (category && search) {
    totalArticles = await articleModel.countByCategoryAndSearch(
      category,
      search,
    );
    articles = await articleModel.getByCategoryAndSearchPaginated(
      category,
      search,
      skip,
      limit,
    );
  }
  // CASE 2 — Category only
  else if (category) {
    totalArticles = await articleModel.countByCategory(category);
    articles = await articleModel.getByCategoryPaginated(category, skip, limit);
  }
  // CASE 3 — Search only
  else if (search) {
    totalArticles = await articleModel.countSearchArticles(search);
    articles = await articleModel.searchArticlesPaginated(search, skip, limit);
  }
  // CASE 4 — No filters
  else {
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
  // Get article ID from URL query (?articleId=123)
  const articleId = request.query.articleId;
  const article = await articleModel.getArticleById(articleId);
  if (!article) {
    // Article not found, redirect to list
    return response.redirect("/admin/article");
  }
  // Load the category name for display
  await article.populate("categoryId");
  const htmlContent = marked(article.text);
  response.render("article/article-view", { title: "view Article", article, htmlContent });
};

// Show the form to add a new article
const addArticleForm = async (request, response) => {
  // Fetch all categories for the dropdown menu
  const categories = await categoryModel.getCategories();
  response.render("article/article-add", { title: "Article Add", categories });
};

// Save a new article to the database

// Save a new article to the database (with images)
const addNewArticle = async (request, response) => {
  try {
    const { title, text, categoryId } = request.body;
    
    // Ensure alt texts are in an array format
    const altTexts = request.body.alt 
      ? (Array.isArray(request.body.alt) ? request.body.alt : [request.body.alt]) 
      : [];

    let images = [];

    if (request.files && request.files.length > 0) {
      // Process images in parallel for speed
      images = await Promise.all(request.files.map(async (file, index) => {
        const projectNameSlug = title.toLowerCase().trim().replace(/\s+/g, "-");
        const fileName = `${projectNameSlug}-${Date.now()}-${index}.webp`;

        // 🌟 SHARP: Resize and Convert
        const buffer = await sharp(file.buffer)
          .resize(1200, null, { withoutEnlargement: true }) // Max 1200px wide
          .webp({ quality: 80 }) // High quality, low file size
          .toBuffer();

        // Manual upload to R2
        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/webp",
        }));

        return {
          url: `${process.env.R2_PUBLIC_URL}/${fileName}`,
          key: fileName,
          alt: altTexts[index] || ""
        };
      }));
    }

    const result = await articleModel.addArticle({ title, text, categoryId, images });
    if (result) return response.redirect("/admin/article");

  } catch (err) {
    console.error("Error adding article with Sharp:", err);
    return response.status(500).send("Failed to process images.");
  }
};

// Delete an article by ID
const deleteArticle = async (request, response) => {
  // Get article ID from URL query string (?articleId=123)
  let result = await articleModel.deleteArticleById(request.query.articleId);
  if (result) {
    // Success: refresh the article list
    response.redirect("/admin/article");
  } else {
    // Error: show error message on the list page
    response.render("article/article-list", {
      err: "error deleting article",
    });
  }
};

// Show the form to edit an existing article
const editArticleForm = async (request, response) => {
  // Get article ID from URL (?articleId=123)
  const articleId = request.query.articleId;
  if (!articleId) {
    // No ID provided, go back to list
    return response.redirect("/admin/article");
  }

  // Fetch the article to edit
  const editArticle = await articleModel.getArticleById(articleId);
  if (!editArticle) {
    // Article not found, go back to list
    return response.redirect("/admin/article");
  }

  // Get all categories for the dropdown
  const categories = await categoryModel.getCategories();
  response.render("article/article-edit", {
    title: "Article Edit",
    editArticle,
    categories,
  });
};

// Update an article in the database
// Update an article in the database with Sharp optimization
const editArticle = async (request, response) => {
  try {
    const { articleId, title, text, categoryId, existingImageKeys, existingImageAlts } = request.body;
    const updateData = { title, text, categoryId };

    // 1. Fetch the existing article to manage current images
    const existingArticle = await articleModel.getArticleById(articleId);
    let currentImages = existingArticle.images || [];

    // 2. Sync existing captions (handles updates to old image text)
    if (existingImageKeys) {
      const keys = Array.isArray(existingImageKeys) ? existingImageKeys : [existingImageKeys];
      const alts = Array.isArray(existingImageAlts) ? existingImageAlts : [existingImageAlts];

      currentImages = currentImages.map(img => {
        const index = keys.indexOf(img.key);
        // If the key is found, update the alt text; otherwise keep it as is
        if (index !== -1) {
          return { ...img.toObject(), alt: alts[index] };
        }
        return img;
      });
    }

    // 3. Process NEW images with Sharp (WebP + Resize)
    let newImages = [];
    if (request.files && request.files.length > 0) {
      const newAltTexts = request.body.alt 
        ? (Array.isArray(request.body.alt) ? request.body.alt : [request.body.alt]) 
        : [];

      // Process in parallel for better performance on Railway
      newImages = await Promise.all(request.files.map(async (file, index) => {
        const projectNameSlug = title.toLowerCase().trim().replace(/\s+/g, "-");
        const fileName = `${projectNameSlug}-${Date.now()}-${index}.webp`;

        // 🌟 SHARP: Convert to WebP and limit width to 1200px
        const buffer = await sharp(file.buffer)
          .resize(1200, null, { withoutEnlargement: true }) 
          .webp({ quality: 80 }) 
          .toBuffer();

        // Upload to R2
        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType: "image/webp",
        }));

        return {
          url: `${process.env.R2_PUBLIC_URL}/${fileName}`,
          key: fileName,
          alt: newAltTexts[index] || ""
        };
      }));
    }

    // 4. Merge updated existing images with brand new optimized images
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

    // Get the article
    const article = await articleModel.getArticleById(articleId);
    
    if (!article) {
      return response.status(404).json({ error: "Article not found" });
    }

    // Filter out the image to delete
    const updatedImages = article.images.filter(img => img.key !== imageKey);

    console.log(`🗑️  Deleting image ${imageKey} from article ${articleId}`);
    console.log(`📊 Images before: ${article.images.length}, after: ${updatedImages.length}`);

    // Update the article
    const result = await articleModel.editArticlebyId(articleId, {
      images: updatedImages
    });

    if (result) {
      // Optionally delete from R2 as well
      // You can add R2 deletion here if needed
      // await s3.deleteObject({ Bucket: process.env.R2_BUCKET_NAME, Key: imageKey });
      
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
