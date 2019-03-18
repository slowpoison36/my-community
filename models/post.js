const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    title:{type:String,required:true},
    description:{type:String,required:true,minlength:20},
    tag:{type:mongoose.Schema.Types.ObjectId,ref:"Tag"},
    owner:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    comments:[{type:mongoose.Schema.Types.ObjectId,ref:"Comment"}],
    created:{type:Date,default:Date.now},
    readBy:[]
})



module.exports = mongoose.model("Post",postSchema);