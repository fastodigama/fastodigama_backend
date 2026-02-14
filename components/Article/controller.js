import mongoose from "mongoose";
import articleModel from "./model.js"
import categoryModel from "../Category/model.js"

// ===== ARTICLE CONTROLLER =====
// Handles all article business logic (Create, Read, Update, Delete)

// GET list of all articles
const getAllArticles = async (request, response) => {
    const categories = await categoryModel.getCategories();
    
    // Get page number from URL (?page=1), default to 1
    const page = parseInt(request.query.page) || 1;
    const itemsPerPage = 10;
    
    // Get selected category for filter
    const selectedCategoryId = request.query.categoryId;
    
    // Get paginated articles (with or without category filter)
    const paginationData = await articleModel.getPaginatedArticles(
        page,
        itemsPerPage,
        selectedCategoryId || null
    );
    
    // Generate array of page numbers for pagination display
    const pageNumbers = [];
    for (let i = 1; i <= paginationData.totalPages; i++) {
        pageNumbers.push(i);
    }
    
    // Render template with pagination data
    response.render("article/article-list", {
        title: "Article List",
        articles: paginationData.articles,
        categories,
        selectedCategoryId,
        currentPage: paginationData.currentPage,
        totalPages: paginationData.totalPages,
        pageNumbers,
        totalArticles: paginationData.totalArticles
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