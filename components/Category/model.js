import mongoose from "mongoose";

function generateSlug(value) {
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ===== CATEGORY MODEL =====
// Defines the database schema and functions to interact with Categories collection

// Define category structure: just a name
const CategorySchema = new mongoose.Schema(
    {
        name: {type: String, required: true},
        slug: {type: String, required: true, unique: true, index: true},
        order: {type: Number, default: 0},
        translations: {
            ar: {
                name: { type: String, default: "" },
                slug: { type: String, default: "" }
            }
        }
    }
);

// Pre-save hook to auto-generate slug from name if not provided
CategorySchema.pre('validate', function(next) {
    if (!this.slug && this.name) {
        this.slug = generateSlug(this.name);
    }
    next();
});

// Create the Category model for database operations
const CategoryModel = mongoose.model("Category", CategorySchema);

async function ensureUniqueCategorySlug(baseValue, locale = "en", excludeId = null) {
    const baseSlug = generateSlug(baseValue) || `category-${Date.now()}`;
    const slugPath = locale === "ar" ? "translations.ar.slug" : "slug";
    let slug = baseSlug;
    let counter = 1;

    while (
        await CategoryModel.exists({
            [slugPath]: slug,
            ...(excludeId ? { _id: { $ne: excludeId } } : {})
        })
    ) {
        slug = `${baseSlug}-${counter++}`;
    }

    return slug;
}

// ===== DATABASE FUNCTIONS =====
// Get one category by slug (case-insensitive)
async function getCategoryBySlug(slug, locale = "en") {
    const slugPath = locale === "ar" ? "translations.ar.slug" : "slug";
    return await CategoryModel.findOne({ [slugPath]: { $regex: new RegExp(`^${slug}$`, 'i') } });
};
// Get all categories sorted by order
async function getCategoriesSortedByOrder() {
    return await CategoryModel.find({}).sort({ order: 1 });
};

// Get all categories from database
async function getCategories() {
    return await CategoryModel.find({});
};

// Get one category by ID
async function getCategoryById(id) {
    return await CategoryModel.findById(id);
};
// Add sample categories to database on first run
async function initializeCategories() {
    const categoryList = [
        { name: "Home" },
        { name: "Love" },
        { name: "Mind" },
        { name: "Wealth" },
        { name: "Future" }
    ];
    try {
        // Insert all sample categories
        await CategoryModel.insertMany(categoryList);
        console.log("Categories initialized successfully")
    } catch (error) {
        console.log("Error initializing categories:", error);
    }
}

// Save a new category to database
async function addCategory(newCategory) {
    try {
        const slug = await ensureUniqueCategorySlug(newCategory.name, "en");
        const arabicSlug = newCategory.translations?.ar?.name
            ? await ensureUniqueCategorySlug(newCategory.translations.ar.slug || newCategory.translations.ar.name, "ar")
            : "";
        // Create new category object with form data
        let category = new CategoryModel({
            name: String(newCategory.name),
            slug,
            translations: newCategory.translations?.ar
                ? {
                    ar: {
                        name: String(newCategory.translations.ar.name || ""),
                        slug: arabicSlug
                    }
                }
                : undefined
        });
        // Save to database
        const result = await category.save();
        console.log("Category saved successfully");
        return result;
    } catch (error) {
        console.error("Error saving category", error.message);
        return null; // Return null if error
    }
}

// Update a category name by finding it with its ID
// Parameters: id (MongoDB _id), newName (new category name)

async function updateCategoryById(id, newName) {
    // Find the category by ID and update the name and order fields
    let updateObj = {
        name: newName,
        slug: await ensureUniqueCategorySlug(newName, "en", id)
    };
    if (arguments.length > 2) {
        updateObj.order = arguments[2];
    }
    if (arguments.length > 3 && arguments[3]) {
        updateObj["translations"] = {
            ar: {
                name: String(arguments[3].name || ""),
                slug: await ensureUniqueCategorySlug(arguments[3].slug || arguments[3].name, "ar", id)
            }
        };
    }
    let result = await CategoryModel.findByIdAndUpdate(id, updateObj);
    if (result){
        console.log("Category updated successfully");
    }else{
        console.error("error updating category");
    }
    return result;
}

// Delete a category by name
async function deleteCategoryByName(categoryName) {
    // Remove the category from database
    let result = await CategoryModel.deleteOne({ name: categoryName});
    if(result.deletedCount === 1){
        console.log("Category Deleted");
    }else{
        console.log("Error Category deletion");
    }

    return result;
}

export {
    CategoryModel
};
export default {
    getCategories,
    getCategoryById,
    getCategoryBySlug,
    initializeCategories,
    addCategory,
    updateCategoryById,
    deleteCategoryByName,
    getCategoriesSortedByOrder,
    ensureUniqueCategorySlug
}



