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
    return await MenuLink.find({}); //return an array for find all
    
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

async function addMenuLink(linkWeight, linkName,linkPath) {

    let newLink = new MenuLink(
        {
            weight: parseInt(linkWeight),
            name: String(linkName),
            path: String(linkPath)
        }
    );

    await newLink.save(); //save the new link to the db
    
}

//Function to update a Link
async function updateMenuLink(id, weight, name, path) {
    await MenuLink.updateOne(
        {_id:id},
        {
            $set: {
                weight,
                name,
                path
            }
        
        }
    )
    
}

//Function to delete a Link

async function deleteMenuLink(id) {
        await MenuLink.deleteOne({ _id: id});
}

export default {
    getLinks,
    initializeMenuLinks,
    addMenuLink,
    updateMenuLink,
    deleteMenuLink
}
