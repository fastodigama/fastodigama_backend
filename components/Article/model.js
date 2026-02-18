import mongoose from "mongoose";

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
    // Create new article object with form data
    let article = new ArticleModel({
      title: String(newArticle.title),
      text: String(newArticle.text),
      categoryId: newArticle.categoryId
    });
    // Save to database
    const result = await article.save();
    console.log("Article saved successfully");
    
    return result;
  } catch (error) {
    console.error("Error saving article:", error.message);
    return null; // Return null if error
  }
}

// Update an article by ID
async function editArticlebyId(id, articleData) {
    // Find article by ID and update with new data
    const result = await ArticleModel.updateOne(
        {_id:id},
        { $set: articleData }
    );
    if(result.modifiedCount === 1){
        console.log("Article modified successfully");
    }else{
        console.log("Error updating the article");
    }

    return result;
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
