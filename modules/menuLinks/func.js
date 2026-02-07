import dbUrl from "../dbConnection.js"

//connect to db
import mongoose from "mongoose";

await mongoose.connect(dbUrl);

//setup schema and model
const MenuLinksSchema = new mongoose.Schema({
    weight:{type: Number, required: true },
    name: {type: String, required:true},
    path: {type: String, required:true}

});

const MenuLink = mongoose.model("MenuLink", MenuLinksSchema);



//MONGODB FUNCTIONS

//get all links from menuLink collection
async function getLinks() {
    return await MenuLink.find({}).sort({ weight: 1}); //return an array for find all
    
}


//Function to initialize the Links collection with some data

async function initializeMenuLinks() {

    let links = [ 
        {
        weight: 1,
        name:"Home",
        path:"/"
        },
        {
        weight:2,
        name:"Articles Admin",
        path:"/articles"
        }
    ];

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

//Function to update a Link
async function updateMenuLink(id,linkData) {
    await MenuLink.updateOne(
        {_id:id},
        { $set: linkData }
    );
}


//get single link to update

async function getSingleLink(id) {
 return await MenuLink.findById(id);
}

//Function to delete a Link

async function deleteMenuLink(id) {
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
