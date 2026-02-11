import mongoose from "mongoose";
import articleModel from "./model.js"

//controller function to GET article page

const getAllArticles = async (request, response) => {
    let articleList = await articleModel.getArticles();
    // if there is nothing in the Article collection , initialize with some content

    if(!articleList.length) {
        await articleModel.initializeArticles();
        articleList = await articleModel.getArticles();
    }
    response.render("article/article-list", {title: "Article List",  articles: articleList});
    
}

//controller function for GET add article page
const addArticleForm =  (request,response) => {
    response.render("article/article-add");
}

//controller function to POST article

const addArticle = async (request, response) => {
    let result = await articleModel.addArticle(request.body);
    if(result) {
        response.redirect("/admin/article");

    }else{
        response.render("article/article-add", {
            err:"error adding article"
        });
    }
};

//DELETE 

const deleteArticle = async (request, response) => {
    let result = await articleModel.deleteArticleById(request.query.articleId);
    if(result) {
        response.redirect("/admin/article");

    }else{
        response.render("article/article-list", {
            err:"error deleting article"
        });
    }
};

//Edit article

const editArticleForm = async (request, response) => {
    const articleId = request.query.articleId;
    if (!articleId) {
        return response.redirect("/admin/article");
    }

    const editArticle = await articleModel.getArticleById(articleId);
    if (!editArticle) {
        return response.redirect("/admin/article");
    }

    response.render("article/article-edit", { editArticle });
};

const editArticle = async (request, response) => {
    const articleId = request.body.articleId;
    const updateData = {
        title: request.body.title,
        text: request.body.text,
    };
    const categoryId = (request.body.category || "").trim();
    if (categoryId) {
        if (!mongoose.isValidObjectId(categoryId)) {
            return response.render("article/article-edit", {
                editArticle: { _id: articleId, ...updateData, category: request.body.category },
                err: "Invalid category id"
            });
        }
        updateData.categoryId = categoryId;
    }
    const result = await articleModel.editArticleTitlebyId(articleId, updateData);
    if (result) {
        response.redirect("/admin/article");

    } else {
        response.render("article/article-list", {
            err: "error updating article"
        });
    }
};
export default {
    getAllArticles,
    addArticleForm,
    addArticle,
    editArticleForm,
    editArticle,
    deleteArticle
};;