import mongoose from "mongoose";
import { connect } from "../dbConnection.js";
import categoryModel, { CategoryModel } from "../components/Category/model.js";
import {
  isArabicCategoryTranslationConfigured,
  translateCategoryToArabic
} from "../components/Category/translationService.js";

async function translateExistingCategories() {
  if (!isArabicCategoryTranslationConfigured()) {
    throw new Error("OPENAI_API_KEY is required before translating existing categories.");
  }

  await connect();

  try {
    const force = process.argv.includes("--force");
    const categories = await CategoryModel.find({}).sort({ order: 1, name: 1 });

    let translatedCount = 0;
    let skippedCount = 0;

    for (const category of categories) {
      if (!force && category?.translations?.ar?.name && category?.translations?.ar?.slug) {
        skippedCount += 1;
        console.log(`Skipped "${category.name}" (already translated)`);
        continue;
      }

      const translation = await translateCategoryToArabic(category.name);
      const arabicSlug = await categoryModel.ensureUniqueCategorySlug(
        translation.slug || translation.name || category.name,
        "ar",
        category._id
      );

      await CategoryModel.updateOne(
        { _id: category._id },
        {
          $set: {
            "translations.ar.name": translation.name,
            "translations.ar.slug": arabicSlug
          }
        }
      );

      translatedCount += 1;
      console.log(`Translated "${category.name}"`);
    }

    console.log("");
    console.log("Arabic category translation complete.");
    console.log(`Categories scanned: ${categories.length}`);
    console.log(`Translated: ${translatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

translateExistingCategories().catch((error) => {
  console.error("Arabic category translation failed:", error);
  process.exitCode = 1;
});
