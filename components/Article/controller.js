import mongoose from "mongoose";
import articleModel from "./model.js"
import categoryModel from "../Category/model.js"

// ===== ARTICLE CONTROLLER =====
// Handles all article business logic (Create, Read, Update, Delete)

// GET list of all articles
const getAllArticles = async (request, response) => {
    const categories = await categoryModel.getCategories();
    let articleList = await articleModel.getArticles();

    // Category filter: check if user selected a specific category from dropdown
   const selectedCategoryId = request.query.categoryId; // Gets categoryId from URL (?categoryId=123)
   
   // Only filter if a category was selected (empty string = show all)
   if(selectedCategoryId) {
    // Keep only articles that match the selected category
    // .filter() creates a new array with only matching items
    articleList = articleList.filter(article =>
        article.categoryId && article.categoryId._id.toString() === selectedCategoryId
    );
   }
   // If no category selected, articleList remains unchanged (shows all articles)
    response.render("article/article-list", 
        {title: "Article List",
              articles: articleList,       // Filtered or all articles
               categories,                  // All categories for dropdown
               selectedCategoryId           // Which category is selected (for dropdown highlight)
            });
    
}

// Display a single article in detail view
const viewArticle = async (request, response) => {
    // Get article ID from URL query (?articleId=123)
    const articleId = request.query.articleId;
    const article = await articleModel.getArticleById(articleId);
    if(!article){
        // Article not found, redirect to list
        return response.redirect("/admin/article");
    }
    // Load the category name for display
    await article.populate('categoryId');
    response.render("article/article-view", { title: "view Article", article })
}

// Show the form to add a new article
const addArticleForm = async (request, response) => {
    // Fetch all categories for the dropdown menu
    const categories = await categoryModel.getCategories();
    response.render("article/article-add", {title: "Article Add",categories});
};

// Save a new article to the database
const addNewArticle = async (request, response) => {
    // Get the form data: title, article text, and category
    const { title, text, categoryId } = request.body;

    // Try to save the article
    let result = await articleModel.addArticle({ title, text, categoryId });

    if (result) {
        // Success: go back to article list
        response.redirect("/admin/article");
    } else {
        // Error: show form again with error message and categories dropdown
        const categories = await categoryModel.getCategories();
        response.render("article/article-add", {
            err: "error adding article",
            categories,
            formData: { title, text }
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
            err: "error deleting article"
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
    response.render("article/article-edit", { title: "Article Edit", editArticle, categories });
};

// Update an article in the database
const editArticle = async (req, res) => {
    // Get the form data
    const { articleId, title, text, categoryId } = req.body;

    // Update the article with new values
    const result = await articleModel.editArticlebyId(articleId, {
        title,
        text,
        categoryId
    });

    // Success: go back to list, Error: show error on list
    return result
        ? res.redirect("/admin/article")
        : res.render("article/article-list", { err: "Error updating article" });
};

export default {
    getAllArticles,
    viewArticle,
    addArticleForm,
    addNewArticle,
    editArticleForm,
    editArticle,
    deleteArticle
};