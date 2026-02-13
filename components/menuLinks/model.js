import mongoose from "mongoose";

// ===== MENU LINKS MODEL =====
// Defines the database schema and functions to manage navigation menu links

// Define menu link structure: weight (order), name (display text), path (URL)
const MenuLinksSchema = new mongoose.Schema({
    weight:{type: Number, required: true },  // Order in menu (lower = first)
    name: {type: String, required:true},      // Display text
    path: {type: String, required:true}       // URL path
});

// Create the MenuLink model for database operations
const MenuLink = mongoose.model("MenuLink", MenuLinksSchema);

// ===== DATABASE FUNCTIONS =====

// Get all menu links sorted by weight (order)
async function getLinks() {
    // .sort({ weight: 1 }) = sort from lowest to highest weight
    return await MenuLink.find({}).sort({ weight: 1});
    
}


// Add sample menu links to database on first run
async function initializeMenuLinks() {
    const links = [ 
        { weight: 1, name:"Home", path:"/" },
        { weight: 2, name:"Articles Admin", path:"/articles" }
    ];
    // Insert all sample links
    await MenuLink.insertMany(links);
    
}

//function to add a new link
async function addMenuLink(newLink) {
    let link = new MenuLink({
        weight: Number(newLink.weight),
        name: String(newLink.name),
        path: String(newLink.path)
    });

    await link.save();
}

// Update a menu link by ID
async function updateMenuLink(id, linkData) {
    // Find link by ID and update with new data
    await MenuLink.updateOne(
        {_id:id},
        { $set: linkData }
    );
}

// Get one menu link by ID
async function getSingleLink(id) {
 return await MenuLink.findById(id);
}

// Delete a menu link by ID
async function deleteMenuLink(id) {
    // Remove the link from database
    await MenuLink.deleteOne({ _id: id});
}

export default {
    getLinks,
    getSingleLink,
    initializeMenuLinks,
    addMenuLink,
    updateMenuLink,
    deleteMenuLink
}
