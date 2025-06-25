const mongoose = require("mongoose");


const searchSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        unque: true
    },
    content: {
        type: String,
        required: true
    }
}, {timestamps: true});

searchSchema.index({content: 'text'}); // for searching
searchSchema.index({createdAt: -1}); // for sorting by latest   

const Search = mongoose.model("Search", searchSchema);

module.exports = Search;