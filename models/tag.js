const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema({
    posts:[{type:mongoose.Schema.Types.ObjectId,ref:"Post"}],
    name:{type:String,required:true},
    image:{type:String,required:true}
});

module.exports= mongoose.model("Tag",tagSchema);

