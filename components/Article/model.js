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
  return await ArticleModel.findById(id);
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


// Add sample articles to database on first run
async function initializeArticles() {
  const articleList = [
    {
      title: "Getting Started with Node.js",
      text: "Learn the fundamentals of Node.js and how to build scalable server-side applications. This guide covers npm, modules, and async programming.",
      categoryId: "65c8f1234567890abcdef001",
    },
    {
      title: "MongoDB Best Practices",
      text: "Discover the best practices for working with MongoDB including schema design, indexing, and query optimization for better performance.",
      categoryId: "65c8f1234567890abcdef002",
    },
  ];

  try {
    await ArticleModel.insertMany(articleList);
    console.log("Articles initialized successfully");
  } catch (error) {
    console.error("Error initializing articles:", error);
  }
}

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
    initializeArticles,
    addArticle,
    editArticlebyId,
    deleteArticleById,
    countArticles,
    getArticlesPaginated,
    countSearchArticles,
    searchArticlesPaginated
}
