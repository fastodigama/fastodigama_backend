import mongoose from "mongoose";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/r2.js";

const normalizeSlug = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const AuthorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
      default: null
    },
    slug: { type: String, unique: true, index: true },
    bio: { type: String, default: "" },
    photo: {
      url: { type: String, default: "" },
      key: { type: String, default: "" },
      alt: { type: String, default: "" }
    },
    jobTitle: { type: String, default: "" },
    email: { type: String, default: "", trim: true },
    socialLinks: {
      website: { type: String, default: "" },
      twitter: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      instagram: { type: String, default: "" }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

AuthorSchema.pre("validate", async function() {
  if (!this.slug && this.name) {
    const baseSlug = normalizeSlug(this.name);
    const fallbackBase = baseSlug || "author";
    let slug = baseSlug || `author-${Date.now()}`;
    let counter = 1;

    while (await AuthorModel.exists({ slug, _id: { $ne: this._id } })) {
      slug = `${fallbackBase}-${counter++}`;
    }

    this.slug = slug;
  }
});

const AuthorModel = mongoose.model("Author", AuthorSchema);

async function getAuthors() {
  return AuthorModel.find({}).sort({ name: 1 });
}

async function getActiveAuthors() {
  return AuthorModel.find({ isActive: true }).sort({ name: 1 });
}

async function getAuthorById(id) {
  return AuthorModel.findById(id);
}

async function getAuthorByUserId(userId) {
  return AuthorModel.findOne({ userId });
}

async function getAuthorByEmail(email) {
  return AuthorModel.findOne({
    email: String(email || "").trim().toLowerCase()
  });
}

async function getAuthorByUserIdOrEmail(user) {
  if (!user) return null;

  return (
    (user._id ? await getAuthorByUserId(user._id) : null) ||
    (user.user ? await getAuthorByEmail(user.user) : null)
  );
}

async function ensureAuthorProfileForUser(user) {
  if (!user) return null;

  const normalizedEmail = String(user.user || "").trim().toLowerCase();
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.nickname ||
    normalizedEmail ||
    "Author";

  let author =
    await AuthorModel.findOne({ userId: user._id }) ||
    await AuthorModel.findOne({ email: normalizedEmail });

  const syncedPhoto =
    user.profilePicture && String(user.profilePicture).trim()
      ? {
          url: String(user.profilePicture).startsWith("http://") || String(user.profilePicture).startsWith("https://")
            ? String(user.profilePicture).trim()
            : `${process.env.PROFILE_IMAGE_BASE}/${encodeURIComponent(String(user.profilePicture).trim())}`,
          key:
            String(user.profilePicture).startsWith("http://") || String(user.profilePicture).startsWith("https://")
              ? ""
              : String(user.profilePicture).trim(),
          alt: displayName
        }
      : null;

  if (author) {
    author.userId = user._id;
    author.name = author.name || displayName;
    author.email = normalizedEmail;
    author.isActive = true;
    if (!author.photo?.url && syncedPhoto) {
      author.photo = syncedPhoto;
    }
    await author.save();
    return author;
  }

  author = new AuthorModel({
    userId: user._id,
    name: displayName,
    email: normalizedEmail,
    photo: syncedPhoto || undefined,
    isActive: true
  });

  return await author.save();
}

async function addAuthor(authorData) {
  try {
    const author = new AuthorModel({
      name: String(authorData.name || "").trim(),
      userId: authorData.userId || null,
      bio: String(authorData.bio || "").trim(),
      photo: authorData.photo || undefined,
      jobTitle: String(authorData.jobTitle || "").trim(),
      email: String(authorData.email || "").trim().toLowerCase(),
      socialLinks: {
        website: String(authorData.website || "").trim(),
        twitter: String(authorData.twitter || "").trim(),
        linkedin: String(authorData.linkedin || "").trim(),
        instagram: String(authorData.instagram || "").trim()
      },
      isActive: Boolean(authorData.isActive)
    });

    return await author.save();
  } catch (error) {
    console.error("Error saving author:", error.message);
    return null;
  }
}

async function updateAuthorById(id, authorData) {
  try {
    const existingAuthor = await AuthorModel.findById(id);
    if (!existingAuthor) return null;

    const nextPhoto = authorData.photo || existingAuthor.photo;

    if (
      authorData.photo &&
      existingAuthor.photo?.key &&
      existingAuthor.photo.key !== authorData.photo.key
    ) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_PROFILE_BUCKET_NAME || process.env.R2_BUCKET_NAME,
            Key: existingAuthor.photo.key
          })
        );
      } catch (error) {
        console.error("Error deleting old author photo:", error.message);
      }
    }

    const updatedAuthor = await AuthorModel.findByIdAndUpdate(
      id,
      {
        name: String(authorData.name || "").trim(),
        userId: authorData.userId || existingAuthor.userId || null,
        bio: String(authorData.bio || "").trim(),
        photo: nextPhoto,
        jobTitle: String(authorData.jobTitle || "").trim(),
        email: String(authorData.email || "").trim().toLowerCase(),
        socialLinks: {
          website: String(authorData.website || "").trim(),
          twitter: String(authorData.twitter || "").trim(),
          linkedin: String(authorData.linkedin || "").trim(),
          instagram: String(authorData.instagram || "").trim()
        },
        isActive: Boolean(authorData.isActive)
      },
      { new: true, runValidators: true }
    );

    if (updatedAuthor?.userId && authorData.photo) {
      const { User } = await import("../User/model.js");
      await User.updateOne(
        { _id: updatedAuthor.userId },
        {
          profilePicture: authorData.photo.key || authorData.photo.url || ""
        }
      );
    }

    return updatedAuthor;
  } catch (error) {
    console.error("Error updating author:", error.message);
    return null;
  }
}

async function deleteAuthorById(id) {
  const author = await AuthorModel.findById(id);
  if (!author) return { deletedCount: 0 };

  const { ArticleModel } = await import("../Article/model.js");
  await ArticleModel.updateMany(
    { authorId: id },
    {
      $set: {
        authorId: null,
        author: String(author.name || "").trim()
      }
    }
  );

  if (author.photo?.key) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_PROFILE_BUCKET_NAME || process.env.R2_BUCKET_NAME,
          Key: author.photo.key
        })
      );
    } catch (error) {
      console.error("Error deleting author photo:", error.message);
    }
  }

  if (author.userId) {
    const { User } = await import("../User/model.js");
    await User.deleteOne({ _id: author.userId });
  }

  return AuthorModel.deleteOne({ _id: id });
}

export { AuthorModel, normalizeSlug };
export default {
  getAuthors,
  getActiveAuthors,
  getAuthorById,
  getAuthorByUserId,
  getAuthorByEmail,
  getAuthorByUserIdOrEmail,
  ensureAuthorProfileForUser,
  addAuthor,
  updateAuthorById,
  deleteAuthorById
};
