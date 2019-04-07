const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true, minlength: 20 },
    postPic: { publicId: String, img: String },
    tag: { type: mongoose.Schema.Types.ObjectId, ref: "Tag" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    communityId: { type: mongoose.Schema.ObjectId, ref: "Community" },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    created: { type: Date, default: Date.now },
    featured: Boolean,
    readBy: []
})



module.exports = mongoose.model("Post", postSchema);