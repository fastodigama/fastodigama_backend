import multer from "multer";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import authorModel, { normalizeSlug } from "./model.js";
import { s3 } from "../config/r2.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const buildAuthorPhoto = async (file, authorName) => {
  if (!file) return undefined;

  const fileName = `author-${normalizeSlug(authorName) || "profile"}-${Date.now()}.webp`;
  const buffer = await sharp(file.buffer)
    .resize(600, 600, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_PROFILE_BUCKET_NAME || process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: "image/webp"
    })
  );

  const baseUrl = process.env.PROFILE_IMAGE_BASE || process.env.ARTICLE_IMAGE_BASE || "";

  return {
    url: baseUrl ? `${baseUrl}/${encodeURIComponent(fileName)}` : fileName,
    key: fileName,
    alt: String(authorName || "").trim()
  };
};

const getAllAuthors = async (request, response) => {
  const authors = await authorModel.getAuthors();
  response.render("author/author-list", {
    title: "Author List",
    authors,
    info: request.query.info || "",
    currentPath: request.originalUrl.split("?")[0]
  });
};

const addAuthorForm = (request, response) => {
  return response.redirect("/admin/author?info=Author%20profiles%20are%20created%20automatically%20when%20an%20admin%20assigns%20the%20author%20role%20to%20a%20user.");
};

const addNewAuthor = async (request, response) => {
  return response.redirect("/admin/author?info=Author%20profiles%20are%20created%20automatically%20from%20author-role%20users.");
};

const editAuthorForm = async (request, response) => {
  const author = await authorModel.getAuthorById(request.query.authorId);
  if (!author) {
    return response.redirect("/admin/author");
  }

  response.render("author/author-edit", {
    title: "Author Edit",
    author,
    formData: null,
    currentPath: request.originalUrl.split("?")[0]
  });
};

const editAuthor = async (request, response) => {
  try {
    const author = await authorModel.getAuthorById(request.body.authorId);
    if (!author) {
      return response.redirect("/admin/author");
    }

    const photo = request.file
      ? await buildAuthorPhoto(request.file, request.body.name)
      : undefined;

    const result = await authorModel.updateAuthorById(request.body.authorId, {
      ...request.body,
      photo,
      isActive: request.body.isActive === "on"
    });

    if (result) {
      return response.redirect("/admin/author");
    }

    return response.render("author/author-edit", {
      err: "Error updating author",
      author,
      formData: request.body,
      currentPath: request.originalUrl.split("?")[0]
    });
  } catch (error) {
    console.error("Error updating author:", error);
    const author = await authorModel.getAuthorById(request.body.authorId);
    return response.render("author/author-edit", {
      err: "Failed to update author",
      author,
      formData: request.body,
      currentPath: request.originalUrl.split("?")[0]
    });
  }
};

const deleteAuthor = async (request, response) => {
  await authorModel.deleteAuthorById(request.query.authorId);
  return response.redirect("/admin/author");
};

const getAuthorsApiResponse = async (request, response) => {
  try {
    const authors = await authorModel.getActiveAuthors();
    response.json({ authors });
  } catch (error) {
    console.error("Error fetching authors API:", error);
    response.status(500).json({ message: "Server Error fetching authors" });
  }
};

export { upload };
export default {
  getAllAuthors,
  addAuthorForm,
  addNewAuthor,
  editAuthorForm,
  editAuthor,
  deleteAuthor,
  getAuthorsApiResponse
};
