const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema({
    communityId:{type:mongoose.Schema.ObjectId, ref:"Community"},
    posts:[{type:mongoose.Schema.Types.ObjectId,ref:"Post"}],
    name:{type:String,required:true},
    image:{type:String,required:true}
});

module.exports= mongoose.model("Tag",tagSchema);

