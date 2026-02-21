import mongoose from "mongoose";
import articleModel from "./model.js";
import categoryModel from "../Category/model.js";
import { marked } from "marked";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { s3 } from "../config/r2.js";

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.R2_BUCKET_NAME,
    // Remove ACL - R2 doesn't support it like S3
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (request, file, cb) {
      const projectNameSlug = request.body.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");

      const fileExtension = path.extname(file.originalname);
      const newFileName = `${projectNameSlug}-${Date.now()}${fileExtension}`;

      console.log("📁 Uploading file:", newFileName);
      cb(null, newFileName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
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

    // 🌟 THE FIX: Force 'alt' into an array so we can loop through it reliably
    const altTexts = request.body.alt 
      ? (Array.isArray(request.body.alt) ? request.body.alt : [request.body.alt]) 
      : [];

    // Build images array, matching the file index to the alt string index
    const images = request.files?.map((file, index) => ({
      url: `${process.env.R2_PUBLIC_URL}/${file.key}`,   // Cloudflare public URL
      key: file.key,        // needed if you want to delete later
      alt: altTexts[index] || "" // Grab the matching caption for this specific photo
    })) || [];

    console.log("🖼️  Generated images with captions:", images);

    // Save article
    const result = await articleModel.addArticle({
      title,
      text,
      categoryId,
      images
    });

    if (result) {
      return response.redirect("/admin/article");
    }

    // If saving failed
    const categories = await categoryModel.getCategories();
    return response.render("article/article-add", {
      err: "error adding article",
      categories,
      formData: { title, text }
    });

  } catch (err) {
    console.error("Error in addNewArticle:", err);
    const categories = await categoryModel.getCategories();
    return response.render("article/article-add", {
      err: "Unexpected error",
      categories,
      formData: request.body
    });
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
const editArticle = async (request, response) => {
  try {
    const { articleId, title, text, categoryId, existingImageKeys, existingImageAlts } = request.body;

    const updateData = {
      title,
      text,
      categoryId,
    };

    // 1. Fetch the existing article from DB
    const existingArticle = await articleModel.getArticleById(articleId);
    let currentImages = existingArticle.images || [];

    // 2. 🌟 UPDATE EXISTING CAPTIONS
    if (existingImageKeys) {
      // Force them into arrays so we can loop safely
      const keys = Array.isArray(existingImageKeys) ? existingImageKeys : [existingImageKeys];
      const alts = Array.isArray(existingImageAlts) ? existingImageAlts : [existingImageAlts];

      // Map through the existing images and update their alt tags if they match the keys
      currentImages = currentImages.map(img => {
        const index = keys.indexOf(img.key);
        if (index !== -1) {
          return { ...img.toObject(), alt: alts[index] }; // Update the alt text!
        }
        return img;
      });
    }

    // 3. IF NEW IMAGES WERE UPLOADED, ADD THEM
    let newImages = [];
    if (request.files && request.files.length > 0) {
      const newAltTexts = request.body.alt 
        ? (Array.isArray(request.body.alt) ? request.body.alt : [request.body.alt]) 
        : [];

      newImages = request.files.map((file, index) => ({
        url: `${process.env.R2_PUBLIC_URL}/${file.key}`,
        key: file.key,
        alt: newAltTexts[index] || ""
      }));
    }

    // Combine updated existing images with brand new ones
    updateData.images = [...currentImages, ...newImages];

    // Save to database
    const result = await articleModel.editArticlebyId(articleId, updateData);

    if (result) {
      return response.redirect("/admin/article");
    }

    return response.render("article/article-list", { err: "Error updating article" });
    
  } catch (error) {
    console.error("Error editing article:", error);
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
