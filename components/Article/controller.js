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
const articleForm =  (request,response) => {
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

const editArticle = async (request,response) => {
    let result = await articleModel.deleteArticleById(request.query.articleId);
    if(result) {
        response.redirect("/admin/article");

    }else{
        response.render("article/article-list", {
            err:"error deleting article"
        });
    }
}
export default {
    getAllArticles,
    articleForm,
    addArticle,
    editArticle,
    deleteArticle
};;