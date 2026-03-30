import mongoose from "mongoose";
import { connect } from "../dbConnection.js";
import { AuthorModel } from "../components/Author/model.js";
import { ArticleModel } from "../components/Article/model.js";

const normalizeName = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");

async function migrateArticleAuthors() {
  await connect();

  try {
    const authors = await AuthorModel.find({}, { _id: 1, name: 1 }).lean();
    const authorBuckets = new Map();

    for (const author of authors) {
      const key = normalizeName(author.name);
      if (!key) continue;

      const existing = authorBuckets.get(key) || [];
      existing.push(author);
      authorBuckets.set(key, existing);
    }

    const articles = await ArticleModel.find(
      {
        $or: [{ authorId: null }, { authorId: { $exists: false } }],
        author: { $exists: true, $ne: "" }
      },
      { _id: 1, title: 1, author: 1 }
    ).lean();

    let linkedCount = 0;
    let ambiguousCount = 0;
    let unmatchedCount = 0;

    for (const article of articles) {
      const normalizedAuthor = normalizeName(article.author);
      const matches = authorBuckets.get(normalizedAuthor) || [];

      if (matches.length === 1) {
        await ArticleModel.updateOne(
          { _id: article._id },
          { $set: { authorId: matches[0]._id, author: matches[0].name } }
        );
        linkedCount += 1;
        console.log(`Linked "${article.title}" -> ${matches[0].name}`);
        continue;
      }

      if (matches.length > 1) {
        ambiguousCount += 1;
        console.log(`Ambiguous author match for "${article.title}" (${article.author})`);
        continue;
      }

      unmatchedCount += 1;
      console.log(`No author match for "${article.title}" (${article.author})`);
    }

    console.log("");
    console.log("Article author migration complete.");
    console.log(`Authors available: ${authors.length}`);
    console.log(`Articles scanned: ${articles.length}`);
    console.log(`Linked: ${linkedCount}`);
    console.log(`Ambiguous: ${ambiguousCount}`);
    console.log(`Unmatched: ${unmatchedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

migrateArticleAuthors().catch((error) => {
  console.error("Article author migration failed:", error);
  process.exitCode = 1;
});
