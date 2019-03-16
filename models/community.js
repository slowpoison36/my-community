const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema({
    name:{type:String,required:true},
    location:{type:String,required:true},
    image:{publicId:String, img:String},
    description:String,
    members:[{type:mongoose.Schema.Types.ObjectId,ref:"User"}],
    created:{type:Date,default:Date.now}
})

module.exports = mongoose.model("Community",communitySchema);