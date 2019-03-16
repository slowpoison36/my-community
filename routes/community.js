
const router = require("express").Router();
const validator = require("express-validator/check");
const Community = require("../models/community");
const authCheck = require("../middleware/index");

const multer = require("multer");
const cloudinary = require("cloudinary");
const cloudinaryStorage = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.cloudinary_api_key,
    api_secret: process.env.cloudinary_api_secret
})

const storage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: "community",
    allowedFormats: ["jpg", "png"],
    transformation: [{ width: 500, height: 500, crop: "limit" }]
});
const parser = multer({ storage: storage });


router.post('/create', 
[validator.check("name,location").withMessage("This is required field"),
 validator.body("image").custom((value,{req})=>{
     const type = ['jpg','png','jpeg']
      type.forEach(kind=> {
          if(!value.endsWith(kind)){
               throw new Error("File format not supported");
          }
      })
 })
]
, [authCheck,parser.single("image")], (req, res, next) => {
    const result = validator.validationResult(req);
    if(!result.isEmpty()) {
         return res.status(422).json({err:result.array()});
    }
    const community = new Community();
    community.name = req.body.name;
    community.location = req.body.location;
    community.description = req.body.description;
    community.image.publicId = req.file.public_id
    community.image.img = req.file.url
    community.members.push(req.decoded.user._id);
    
    community.save((err,savedCommunity)=>{
        if(!err){
            res.status(201).json({success:true,community:savedCommunity});
        }
    })
})

router.get('/all-community',(req,res,next)=>{
    Community.find({}).select("name").then(community=>{
        if(community){
             res.status(200).json({success:true,community:community})
        }
    }).catch(err=>{
         res.status(400).json({message:"No community available"})
    })
})

router.get('/my-community/:name',authCheck,(req,res,next)=>{
    Community.findOne({name:req.params.name})
        .populate("members")
        .then(community=>{
            if(community){
                res.status(200).json({success:true,community:community});
            }
        }).catch(err=>res.status(400).json({message:err}))
})

module.exports = router;
