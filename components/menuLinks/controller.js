import menuLinksModel from "./model.js";

const getMenuLinksApiResponse = async (request, response) => {

    let links = await menuLinksModel.getLinks();
    response.json(links)
}

export default {
    getMenuLinksApiResponse,
}