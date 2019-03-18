const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    description:{type:String,required:true,minlength:5},
    user:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    post:{type:mongoose.Schema.Types.ObjectId,ref:"Post"},
    commentedOn:{type:Date,default:Date.now}
})

module.exports = mongoose.model("Comment",commentSchema);