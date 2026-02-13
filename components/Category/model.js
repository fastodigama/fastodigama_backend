import mongoose from "mongoose";

// ===== CATEGORY MODEL =====
// Defines the database schema and functions to interact with Categories collection

// Define category structure: just a name
const CategorySchema = new mongoose.Schema(
    {
        name: {type: String, required: true},
    }
);

// Create the Category model for database operations
const CategoryModel = mongoose.model("Category", CategorySchema);

// ===== DATABASE FUNCTIONS =====

// Get all categories from database
async function getCategories() {
    return await CategoryModel.find({});
};

// Get one category by ID
async function getCategoryById(id) {
    return await CategoryModel.findById(id);
};
// Add sample categories to database on first run
async function initializeCategories() {
    const categoryList = [
        { name: "Latest" },
        { name: "World" },
        { name: "Cars" },
        { name: "Wellness" }
    ];
    try {
        // Insert all sample categories
        await CategoryModel.insertMany(categoryList);
        console.log("Categories initialized successfully")
    } catch (error) {
        console.log("Error initializing categories:", error);
    }
}

// Save a new category to database
async function addCategory(newCategory) {
    try {
        // Create new category object with form data
        let category = new CategoryModel({
            name: String(newCategory.name),
        });
        // Save to database
        const result = await category.save();
        console.log("Category saved successfully");
        return result;
    } catch (error) {
        console.error("Error saving category", error.message);
        return null; // Return null if error
    }
}

// Update a category name (not used yet but available)
async function updateCategorybyName(oldName, newName) {
    // Find category by old name and update with new name
    let result = await CategoryModel.updateOne(
        {name: oldName},
        {name: newName}
    );
    if(result.modifiedCount === 1) {
        console.log("Category name changed successfully");
    } else {
        console.log("Error updating category");
    }

    return result;
}

// Delete a category by name
async function deleteCategoryByName(categoryName) {
    // Remove the category from database
    let result = await CategoryModel.deleteOne({ name: categoryName});
    if(result.deletedCount === 1){
        console.log("Category Deleted");
    }else{
        console.log("Error Category deletion");
    }

    return result;
}

export default {
    getCategories,
    getCategoryById,
    initializeCategories,
    addCategory,
    updateCategorybyName,
    deleteCategoryByName
}



