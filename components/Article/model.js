import mongoose from "mongoose";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/r2.js"; // Adjust the path if your folder structure is different

// ===== ARTICLE MODEL =====
// Defines the database schema and functions to interact with Articles collection

// Define article structure: title, text content, and link to category
const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    text: { type: String, required: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // Array of objects to handle multiple images per article
    images: [
      {
        url: { 
          type: String, 
          required: true 
        }, // The .r2.dev URL or your future domain link
        key: { 
          type: String, 
          required: true 
        }, // The R2 'Object Key' needed if you want to delete the image later
        alt: { 
          type: String, 
          default: "" 
        }, // Essential for SEO and accessibility
      }
    ],
  },
  { timestamps: true },
);
// Create the Article model for database operations
const ArticleModel = mongoose.model("Article", ArticleSchema);

// ===== DATABASE FUNCTIONS =====

// Get all articles with their category information
async function getArticles() {
  // .populate("categoryId") = fetch category name instead of just ID
  return await ArticleModel.find({}).populate("categoryId").sort({ createdAt: -1});
};

// Get one article by ID
async function getArticleById(id) {
  return await ArticleModel.findById(id).populate("categoryId");
};

// Count all Articles
const countArticles = () => {
  return ArticleModel.countDocuments();
}

// Get paginated articles
const getArticlesPaginated = (skip, limit) => {
  return ArticleModel.find()
      .populate("categoryId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
}

// Count search results
const countSearchArticles = (search) => {
    return ArticleModel.countDocuments({
        $or: [
            { title: { $regex: search, $options: "i" } },
            { text: { $regex: search, $options: "i" } }
        ]
    });
};

// Get paginated search results
const searchArticlesPaginated = (search, skip, limit) => {
    return ArticleModel.find({
        $or: [
            { title: { $regex: search, $options: "i" } },
            { text: { $regex: search, $options: "i" } }
        ]
    })
    .populate("categoryId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};
// Count by category only
const countByCategory = (categoryId) => {
    return ArticleModel.countDocuments({ categoryId });
};

// Get paginated articles by category
const getByCategoryPaginated = (categoryId, skip, limit) => {
    return ArticleModel.find({ categoryId })
        .populate("categoryId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Count by category + search
const countByCategoryAndSearch = (categoryId, search) => {
    return ArticleModel.countDocuments({
        categoryId,
        $or: [
            { title: { $regex: search, $options: "i" } },
            { text: { $regex: search, $options: "i" } }
        ]
    });
};

// Get paginated articles by category + search
const getByCategoryAndSearchPaginated = (categoryId, search, skip, limit) => {
    return ArticleModel.find({
        categoryId,
        $or: [
            { title: { $regex: search, $options: "i" } },
            { text: { $regex: search, $options: "i" } }
        ]
    })
    .populate("categoryId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};





async function addArticle(newArticle) {
  try {
    // Process images to ensure they have an 'alt' tag
    // If no alt is provided by the user, we use the article title
    const processedImages = (newArticle.images || []).map(img => ({
      url: img.url,
      key: img.key,
      alt: img.alt && img.alt.trim() !== "" ? img.alt : String(newArticle.title)
    }));

    let article = new ArticleModel({
      title: String(newArticle.title),
      text: String(newArticle.text),
      categoryId: newArticle.categoryId,
      images: processedImages // Use the processed images with guaranteed alt tags
    });

    const result = await article.save();
    console.log("Article saved successfully with alt tags");
    
    return result;
  } catch (error) {
    console.error("Error saving article:", error.message);
    return null;
  }
}

// Update an article by ID


async function editArticlebyId(id, articleData) {
    try {
        const existingArticle = await ArticleModel.findById(id);
        if (!existingArticle) return null;

        let keysToDelete = [];

        if (articleData.images && Array.isArray(articleData.images)) {
            const newKeys = articleData.images.map(img => img.key);
            
            // Just identify the keys for now, don't delete yet
            keysToDelete = existingArticle.images
                .filter(img => !newKeys.includes(img.key))
                .map(img => img.key);

            // Apply the Alt Tag logic
            articleData.images = articleData.images.map(img => ({
                url: img.url,
                key: img.key,
                alt: img.alt && img.alt.trim() !== "" ? img.alt : String(articleData.title || existingArticle.title)
            }));
        }

        // 1. Update the Database FIRST
        const result = await ArticleModel.updateOne({ _id: id }, { $set: articleData });

        // 2. ONLY if the database update worked, clean up R2
        if (result.modifiedCount === 1 && keysToDelete.length > 0) {
            for (const key of keysToDelete) {
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: key,
                }));
                console.log(`Cleanup: Deleted orphaned image ${key}`);
            }
        }

        return result;
    } catch (error) {
        console.error("Critical Update Error:", error.message);
        throw error;
    }
}

// Delete an article by ID
async function deleteArticleById(id) {
    // Remove the article from database
    let result = await ArticleModel.deleteOne({_id: id});

    if(result.deletedCount === 1) {
        console.log("Article deleted successfully");
    }else{
        console.log("Error deleting the article");
    }

    return result;
}



export default {
    getArticles,
    getArticleById,
    
    addArticle,
    editArticlebyId,
    deleteArticleById,
    countArticles,
    getArticlesPaginated,
    countSearchArticles,
    searchArticlesPaginated,
    countByCategory,
    getByCategoryPaginated,
    countByCategoryAndSearch,
    getByCategoryAndSearchPaginated
}
