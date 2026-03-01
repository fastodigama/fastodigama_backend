import mongoose from "mongoose";
import categoryModel from "./model.js";

// ===== CATEGORY CONTROLLER =====
// Handles all category business logic (Create, Read, Update, Delete)

// 🌟 NEW: Get all Categories and return as JSON (FOR FRONTEND API)
const getCategoriesApiResponse = async (request, response) => {
    try {
        const categoryList = await categoryModel.getCategories();
        // Return as a JSON object so Next.js can parse it cleanly
        response.json({ categories: categoryList });
    } catch (error) {
        console.error("Error fetching categories API:", error);
        response.status(500).json({ message: "Server Error fetching categories" });
    }
};

const getCategoryByIdApiResponse = async (request, response) => {
  try {
    const { id } = request.params;
    const category = await categoryModel.getCategoryById(id); // You'll need this method
    
    if (!category) {
      return response.status(404).json({ message: "Category not found" });
    }
    
    response.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    response.status(500).json({ message: "Server Error fetching category" });
  }
};

// Get and display all categories (FOR ADMIN DASHBOARD)
const getAllCategories = async (request, response) => {
    // Fetch all categories from database
    let categoryList = await categoryModel.getCategories();

    // If no categories exist, create sample ones first
    if(!categoryList.length) {
        await categoryModel.initializeCategories();
        categoryList = await categoryModel.getCategories();
    }
    // Show the categories list page
    response.render("category/category-list", {title: "Category List", categories: categoryList, currentPath: request.originalUrl.split('?')[0]});
};

// Show the form to add a new category
const AddCategoryForm = (request, response) => {
    response.render("category/category-add", {currentPath: request.originalUrl.split('?')[0]});
};

// Save a new category to the database
const addNewCategory = async (request, response) => {
    // Try to add the category
    let result = await categoryModel.addCategory(request.body);
    if(result) {
        // Success: go back to category list
        response.redirect("/admin/category");
    }else {
        // Error: show error message on the form
        response.render("category/category-add", {err: "error adding category"});
    }
};

// Show the edit form for an existing category
const updateCategoryForm = async (request, response) => {
    // Get the category ID from URL query (?categoryId=...)
    const oldCategoryId = await categoryModel.getCategoryById(request.query.categoryId);
    // Display the edit form with the current category data
    response.render("category/category-edit", {oldCategoryId, currentPath: request.originalUrl.split('?')[0]});
};

// Handle the edit form submission to update category name
const updateCategory = async (request, response) => {
    // Send the category ID and new name to the database
    let result = await categoryModel.updateCategoryById(request.body.categoryId, request.body.name);
        if(result){
            // Success: go back to category list
            response.redirect("/admin/category")
        } else {
            // Error: show error message on edit form
            response.render("category/category-edit", {err: "error updating category"});
        }
}

// Delete a category by name
const deleteCategory = async (request, response) => {
    // Get category name from URL query string (?categoryName=Latest)
    let result = await categoryModel.deleteCategoryByName(request.query.categoryName);
    if(result) {
        // Success: refresh the category list
        response.redirect("/admin/category");
    }else{
        // Error: show error message on the list page
        response.render("category/category-list", {
            err: "error deleting category"
        });
    }
};

export default {
    getAllCategories,
    addNewCategory,
    AddCategoryForm,
    updateCategory,
    updateCategoryForm,
    deleteCategory,
    getCategoriesApiResponse,
    getCategoryByIdApiResponse 
}