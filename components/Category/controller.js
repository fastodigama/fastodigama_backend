import mongoose from "mongoose";
import categoryModel from "./model.js";

// ===== CATEGORY CONTROLLER =====
// Handles all category business logic (Create, Read, Update, Delete)

// Get and display all categories
const getAllCategories = async (request,response) => {
    // Fetch all categories from database
    let categoryList = await categoryModel.getCategories();

    // If no categories exist, create sample ones first
    if(!categoryList.length) {
        await categoryModel.initializeCategories();
        categoryList = await categoryModel.getCategories();
    }
    // Show the categories list page
    response.render("category/category-list", {title: "Category List", categories: categoryList});

};

// Show the form to add a new category
const AddCategoryForm = (request, response) => {
    response.render("category/category-add");
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
    response.render("category/category-edit", {oldCategoryId});
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
    deleteCategory
}