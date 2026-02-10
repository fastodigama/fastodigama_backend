

import menuLinksModel from "./model.js";

//For API endpoint 
const getMenuLinksApiResponse = async (request, response) => {

    let links = await menuLinksModel.getLinks();
    response.json(links)
}

export default {
    getMenuLinksApiResponse,
}