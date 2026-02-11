import mongoose from "mongoose";

//setup Schema and model

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
// Compile the schema into a model to perform CRUD operations on the "articles" collection
const ArticleModel = mongoose.model("Article", ArticleSchema);

//MONGODB FUNCTIONS

//Get all articles from the article collection

async function getArticles() {
  return await ArticleModel.find({}); // return array for find all
}

//Initialize Articles collection with some initial data

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
    let article = new ArticleModel({
      title: String(newArticle.title),
      text: String(newArticle.text),
      categoryId: new mongoose.Types.ObjectId(newArticle.articleCategoryId)
    });
    const result = await article.save();
    console.log("Article saved successfully");
    console.log(result);
    return result;
  } catch (error) {
    console.error("Error saving article:", error.message);
    return null;
  }

}
async function updateArticleTitlebyId(id, articleData) {
    const result = await ArticleModel.updateOne(
        {_id:id},
        { $set: articleData }
    );
    if(result.modifiedCount === 1){
        console.log("Article title modified successfully");
    }else{
        console.log("Error updating the title");
    }

    return result;
}

async function deleteArticleById(id) {
    let result = await ArticleModel.deleteOne({_id: id});

    if(result.deletedCount === 1) {
    console.log("Article title delete successfully");
    }else{
        console.log("Error deleting the title");
    }

    return result;
    
}

export default {
    getArticles,
    initializeArticles,
    addArticle,
    updateArticleTitlebyId,
    deleteArticleById
}
