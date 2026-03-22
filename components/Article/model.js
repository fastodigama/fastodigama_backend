import mongoose from "mongoose";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/r2.js"; // Adjust the path if your folder structure is different
import { getAppTimeZone, getUtcRangeForDateInTimeZone } from "../config/timezone.js";

// Helper to generate slug from title
function generateSlug(title) {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ===== ARTICLE MODEL =====
// Defines the database schema and functions to interact with Articles collection

// Define article structure: title, text content, and link to category
const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    text: { type: String, required: true },
    author: {
      type: String,
      required: true,
      default: "Fadel Matar"
    },
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
    views: { type: Number, default: 0 },
    // Optional embed video field
    embedVideo: { type: String, default: "" },
    // Optional: where to display the video (e.g., 'hero', 'inline')
    embedVideoPosition: { type: String, default: "inline" },
    // Optional FAQs field: array of {question, answer}
    faqs: [
      {
        question: { type: String },
        answer: { type: String }
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

// Get one article by slug
async function getArticleBySlug(slug) {
  return await ArticleModel.findOne({ slug }).populate("categoryId");
}

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

    // Generate slug from title
    let baseSlug = generateSlug(newArticle.title);
    let slug = baseSlug;
    let counter = 1;
    // Ensure slug is unique
    while (await ArticleModel.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    let article = new ArticleModel({
      title: String(newArticle.title),
      slug,
      text: String(newArticle.text),
      categoryId: newArticle.categoryId,
      images: processedImages, // Use the processed images with guaranteed alt tags
      author: newArticle.author && newArticle.author.trim() !== "" ? newArticle.author : "Fadel Matar",
      embedVideo: newArticle.embedVideo || "",
      embedVideoPosition: newArticle.embedVideoPosition || "inline",
      faqs: Array.isArray(newArticle.faqs) ? newArticle.faqs : []
    });

    const result = await article.save();
    console.log("Article saved successfully with alt tags and slug");
    
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

        const hasEmbedVideo = Object.prototype.hasOwnProperty.call(articleData, "embedVideo");
        const hasEmbedVideoPosition = Object.prototype.hasOwnProperty.call(articleData, "embedVideoPosition");

        // Preserve existing values only when the field is omitted entirely.
        // If the edit form submits an empty string for embedVideo, that means
        // the user intentionally cleared the stored video.
        const normalizedEmbedVideo = hasEmbedVideo
            ? String(articleData.embedVideo ?? "").trim()
            : existingArticle.embedVideo || "";
        const normalizedEmbedVideoPosition = hasEmbedVideoPosition
            ? (articleData.embedVideoPosition || "inline")
            : (existingArticle.embedVideoPosition || "inline");

        // 1. Update the Database FIRST
        const result = await ArticleModel.updateOne({ _id: id }, { $set: {
            ...articleData,
            embedVideo: normalizedEmbedVideo,
            embedVideoPosition: normalizedEmbedVideoPosition
        } });

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
    // Fetch the article to get image keys
    const article = await ArticleModel.findById(id);
    if (!article) {
      console.log("Article not found");
      return { deletedCount: 0 };
    }

    // Delete all images from R2
    if (Array.isArray(article.images)) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      for (const img of article.images) {
        if (img.key) {
          try {
            await s3.send(new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: img.key,
            }));
            console.log(`Deleted image from R2: ${img.key}`);
          } catch (err) {
            console.error(`Failed to delete image from R2: ${img.key}`, err);
          }
        }
      }
    }

    // Delete all comments for this article
    const { default: commentModel } = await import("../Comment/model.js");
    await commentModel.deleteCommentsByArticleId(id);

    // Delete all likes for this article
    const likeModel = await import("../Like/model.js");
    await likeModel.deleteLikesByArticleId(id);

    // Remove the article from database
    let result = await ArticleModel.deleteOne({ _id: id });

    if (result.deletedCount === 1) {
      console.log("Article, images, comments, and likes deleted successfully");
    } else {
      console.log("Error deleting the article");
    }

    return result;
  }



// Increment views by 1 and return updated article
async function incrementArticleViewsById(id) {
  return await ArticleModel.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  ).populate("categoryId");
}

// Get count of articles created on a specific date in the app timezone
async function countArticlesByDate(date, timeZone = getAppTimeZone()) {
  const { start, end } = getUtcRangeForDateInTimeZone(date, timeZone);
  return ArticleModel.countDocuments({
    createdAt: { $gte: start, $lt: end }
  });
}

// Get articles created on a specific date in the app timezone
async function getArticlesByDate(date, timeZone = getAppTimeZone()) {
  const { start, end } = getUtcRangeForDateInTimeZone(date, timeZone);
  return ArticleModel.find({
    createdAt: { $gte: start, $lt: end }
  }).sort({ createdAt: -1 });
}

export default {
  getArticles,
  getArticleById,
  getArticleBySlug,
  incrementArticleViewsById,
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
  getByCategoryAndSearchPaginated,
  countArticlesByDate,
  getArticlesByDate
}
