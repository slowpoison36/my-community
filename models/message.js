const mongoose = require("mongoose");


const messageSchema = new mongoose.Schema({
    content:{type:String,required:true},
    sender:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    recepient:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    dateSent:{type:Date,default:Date.now},
    isRead:{type:Boolean,default:false},
    messageRead:Date,
    senderDeleted:{type:Boolean,default:false},
    recepientDeleted:{type:Boolean,default:false}
})

module.exports = mongoose.model("Message",messageSchema);