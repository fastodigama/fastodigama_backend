import mongoose from "mongoose";
import categoryModel from "./model.js";

//controller function to GET all Categories

const getAllCategories = async (request,response) => {
    let categoryList = await categoryModel.getCategories();

    if(!categoryList.length) {
        await categoryModel.initializeCategories();
        categoryList = await categoryModel.getCategories();
    }
    response.render("category/category-list", {title: "Category List", categories: categoryList});

};

//controller function for GET add category page
const AddCategoryForm = (request, response) => {
    response.render("category/category-add");
};

//controller function to POST category

const addNewCategory = async (request, response) => {
    let result = await categoryModel.addCategory(request.body.name);
    if(result) {
        response.redirect("/admin/category");
    }else {
        response.render("category/category-add", {err: "error adding category"});
    }
};

//DELETE

const deleteCategory = async (request, response) => {
    let result = await categoryModel.deleteCategoryByName(request.query.categoryName);
    if(result) {
        response.redirect("/admin/category");

    }else{
        response.render("article/category-list", {
            err:"error deleting category"
        });
    }
};

export default {
    getAllCategories,
    addNewCategory,
    AddCategoryForm,
    deleteCategory
}