import mongoose from "mongoose";
import { connect } from "../dbConnection.js";
import articleModel, { ArticleModel } from "../components/Article/model.js";
import {
  isArabicTranslationConfigured,
  translateArticleToArabic
} from "../components/Article/translationService.js";

function hasArabicTranslation(article) {
  return Boolean(
    article?.translations?.ar &&
      (article.translations.ar.title ||
        article.translations.ar.text ||
        article.translations.ar.translatedAt)
  );
}

async function translateExistingArticles() {
  if (!isArabicTranslationConfigured()) {
    throw new Error("OPENAI_API_KEY is required before translating existing articles.");
  }

  await connect();

  try {
    const force = process.argv.includes("--force");
    const articles = await ArticleModel.find({}).sort({ createdAt: 1 });

    let translatedCount = 0;
    let skippedCount = 0;

    for (const article of articles) {
      if (!force && hasArabicTranslation(article)) {
        skippedCount += 1;
        console.log(`Skipped "${article.title}" (already translated)`);
        continue;
      }

      const translation = await translateArticleToArabic({
        title: article.title,
        text: article.text,
        faqs: article.faqs || [],
        sources: article.sources || [],
        images: article.images || []
      });

      const arabicSlug = await articleModel.ensureUniqueSlug(
        translation.slug || translation.title || article.title,
        "ar",
        article._id
      );

      await ArticleModel.updateOne(
        { _id: article._id },
        {
          $set: {
            "translations.ar": {
              ...translation,
              slug: arabicSlug
            }
          }
        }
      );

      translatedCount += 1;
      console.log(`Translated "${article.title}"`);
    }

    console.log("");
    console.log("Arabic article translation complete.");
    console.log(`Articles scanned: ${articles.length}`);
    console.log(`Translated: ${translatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

translateExistingArticles().catch((error) => {
  console.error("Arabic article translation failed:", error);
  process.exitCode = 1;
});
