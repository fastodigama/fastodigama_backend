import express, { request, response } from "express";
import mongoose from "mongoose";

const router = express.Router();

import model from "./model.js";

//MENU Link admin Pages

router.get("/", async (request, response) => {
  let menuLinks = await model.getLinks();
  if (!menuLinks.length) {
    await model.initializeMenuLinks();
    menuLinks = await model.getLinks();
  }
  response.render("menu/menu-list", {
    title: "Administer menu links",
    links: menuLinks,
  });
});

//CREATE route

router.get("/add", async (request, response) => {
  let menuLinks = await model.getLinks();
  response.render("menu/menu-add", { title: "Add menu link", links: menuLinks });
});

//Add form submission
router.post("/add/submit", async (request, response) => {
  let newLink = {
    weight: parseInt(request.body.weight),
    name: request.body.name,
    path: request.body.path,
  };
  await model.addMenuLink(newLink);
  response.redirect("/admin/menu");
});

//EDIT
router.get("/edit", async (request, response) => {
  if (request.query.linkId) {
    let linkToEdit = await model.getSingleLink(request.query.linkId);
    let links = await model.getLinks();
    response.render("menu/menu-edit", {
      title: "Edit menu link",
      links: links,
      editLink: linkToEdit,
    });
  } else {
    response.redirect("/admin/menu");
  }
});

//Edit Form submission
router.post("/edit/submit", async (request, response) => {
  let idFilter = { _id: new mongoose.Types.ObjectId(request.body.linkId) };
  let link = {
    weight: Number(request.body.weight),
    path: request.body.path,
    name: request.body.name,
  };

  await model.updateMenuLink(idFilter, link);
  response.redirect("/admin/menu");
});

//DELETE

router.get("/delete", async (request, response) => {
  await model.deleteMenuLink(request.query.linkId);
  response.redirect("/admin/menu");
});


export default router;
