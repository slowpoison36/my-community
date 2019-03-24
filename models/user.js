const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");

const userSchema = new mongoose.Schema({
    name:{type:String,lowercase:true,unique:true},
    email:{type:String,lowercase:true,unique:true,required:true},
    password:{type:String,minlength:5},
    phone:{type:String,default:"NA"},
    profession:{type:String,default:"Unknown"},
    gender:String,
    picture:String,
    intro:String,
    isVerified:Boolean,
    tokenString:String,
    tokenExpiration:Date,
    lastActive:Date,
    community:{type:mongoose.Schema.Types.ObjectId,ref:"Community"},
    posts:[{type:mongoose.Schema.Types.ObjectId,ref:"Post"}],
    created:{type:Date,default:Date.now}
})

userSchema.pre("save", function(next){
    var user = this;
    if(!user.isModified('password')) return next();
    bcrypt.hash(user.password, null, null,(err, hash) => {
        if(err) return next(err);
        user.password = hash;
        next();
    })
})

userSchema.methods.comparePassword = function (password){
    return bcrypt.compareSync(password, this.password);
}

module.exports = mongoose.model("User",userSchema);