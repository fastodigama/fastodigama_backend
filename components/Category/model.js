import mongoose from "mongoose";

//setup Schema model

const CategorySchema = new mongoose.Schema(
    {
        name: {type: String, required: true},
    }
);

const CategoryModel = mongoose.model("Category", CategorySchema);

async function getCategories() {

    return await CategoryModel.find({});
    
};

async function getCategoryById(id) {
    return await CategoryModel.findById(id);
};

async function initializeCategories() {
    const categoryList = [
        {
            name: "Latest"
        },
        {
            name: "World"
        },
        {
            name: "Cars"
        },
        {
            name: "Wellness"
        }
    ];
    try {
        await CategoryModel.insertMany(categoryList);
        console.log("Categories initialized successfully")
    } catch (error) {
        console.log("Error initializing categories:", error);
    }
};


async function addCategory(newCategory) {
    try {
        let category = new CategoryModel({
            name: String(newCategory.name),
        });
        const result = await category.save();
        console.log("Categpry saved successfully");
        return result;
    } catch (error) {
        console.error("Error saving category", error.message);
        
    }
}

async function updateCategorybyName(oldName, newName) {
    let result = await CategoryModel.updateOne(
        {name: oldName},
        {mame: newName}
    );
    if(result.modifiedCount === 1) {
        console.log("Category name changed successfully");
    }else {
        console.log("Error updating category");
    };

    return result;
    
}

async function deleteCategoryByName(categoryName) {
    let result = await CategoryModel.deleteOne({ name: categoryName});
    if(result.deletedCount === 1){
        console.log("Category Deleted");
    }else{
        console.log("Error Category deletion")
    };

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



