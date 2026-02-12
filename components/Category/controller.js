import mongoose from "mongoose";
import categoryModel from "./model.js";

//controller function to GET all Categories

const getAllCategories = async (request,response) => {
    let categoryList = await categoryModel.getCategories();

    if(!categoryList.length) {
        await categoryModel.initializeCategories();
        categoryList = await categoryModel.getCategories();
    }
    response.render("category/category-list", {title: "Category List"});

}

export default {
    getAllCategories,
    
}