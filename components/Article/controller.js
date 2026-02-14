import mongoose from "mongoose";
import articleModel from "./model.js"
import categoryModel from "../Category/model.js"

// ===== ARTICLE CONTROLLER =====
// Handles all article business logic (Create, Read, Update, Delete)

// Get all Articles and return as JSON (for frontend API)

const getArticlesApiResponse = async (request, response) => {
        // Fetch all articles from database
        let articles = await articleModel.getArticles();
         // Return as JSON for frontend consumption
        response.json(articles);
}


// GET list of all articles
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
    const categories = await categoryModel.getCategories();

    response.render("article/article-list", {
        title: "Article List",
        articles,
        categories,
        currentPage: page,
        totalPages,
        totalArticles,
        search,
        category
    });
};



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
    deleteArticle,
    getArticlesApiResponse
};