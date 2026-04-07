import mongoose from "mongoose";
import { connect } from "../dbConnection.js";
import articleModel, { ArticleModel } from "../components/Article/model.js";

async function fillMissingArabicArticleSlugs() {
  await connect();

  try {
    const articles = await ArticleModel.find({
      "translations.ar.title": { $exists: true, $ne: "" },
      $or: [
        { "translations.ar.slug": { $exists: false } },
        { "translations.ar.slug": "" }
      ]
    }).sort({ createdAt: 1 });

    let updatedCount = 0;

    for (const article of articles) {
      const arabicTitle = article?.translations?.ar?.title;
      if (!arabicTitle) {
        continue;
      }

      const arabicSlug = await articleModel.ensureUniqueSlug(
        arabicTitle,
        "ar",
        article._id
      );

      await ArticleModel.updateOne(
        { _id: article._id },
        { $set: { "translations.ar.slug": arabicSlug } }
      );

      updatedCount += 1;
      console.log(`Updated Arabic slug for "${article.title}" -> ${arabicSlug}`);
    }

    console.log("");
    console.log("Arabic article slug fill complete.");
    console.log(`Articles updated: ${updatedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

fillMissingArabicArticleSlugs().catch((error) => {
  console.error("Failed to fill missing Arabic article slugs:", error);
  process.exitCode = 1;
});
