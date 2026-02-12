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

export default {
    getCategories,
    getCategoryById,
    initializeCategories
}



