const router = require("express").Router();
const { check, validationResult } = require("express-validator/check");
const Post = require("../models/post");
const authCheck = require("../middleware/index");
const User = require("../models/user");
const Tag = require("../models/tag");

// const imgUpload = require("../config/cloudinary")(cloudinary, cloudinaryStorage, multer, "Tags",500,500 )
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
    folder: "Tags",
    allowedFormats: ["jpg", "png"],
    transformation: [{ width: 500, height: 500, crop: "limit" }]
});
const parser = multer({ storage: storage });




router.post("/create-post", [check(['title', 'description'], "Some fields are missing")],
    [authCheck, parser.single('tagImage')], (req, res, next) => {
        let result = validationResult(req);
        if (!result.isEmpty()) {
            return res.status(422).json({ err: result.array() })
        }
        const post = new Post();
        const tag = new Tag();
        post.title = req.body.title;
        post.description = req.body.description;
        post.owner = req.body.user;

        if (req.body.tag !== 'Unknown') {
            post.tag = req.body.tag;
            post.save((err, savedPost) => {
                Tag.findById(req.body.tag, (err, foundTag) => {
                    if (err) {
                        return next(err)
                    }
                    if (foundTag) {
                        foundTag.posts.push(savedPost._id);
                        foundTag.save((err, tagSaved) => {
                            return res.status(201).json({ message: "Post Created Successfully", success: true })

                        });
                    }

                })

            })
        } else {
            let url = req.file.url;
            let newTag = req.body.addTag.toLowerCase();
            Tag.findOne({ name: newTag }).then(tags => {

                if (!tags) {
                    tag.name = newTag.trim().replace(/\s+/g, "-");
                    tag.image = url;
                    tag.save((err, savedTag) => {
                        if (err) {
                            return next(err);
                        }
                        post.tag = savedTag._id;
                        post.save((err, savedPost) => {
                            tag.posts.push(savedPost._id);
                            tag.save((err, tagSaved) => {
                                return res.status(201).json({ message: "Post Created Successfully", success: true })

                            });

                        });

                    });
                } else {
                    return res.status(400).json({ message: `${newTag} already Exist`, success: false })


                }

            })
        }
    })

router.get('/getallpost', authCheck, (req, res, next) => {
    Post.find({}).populate('tag', 'name').then(posts => {
        res.status(200).json({ success: true, posts: posts })
    }).catch(err => {
        res.json(400).json({ success: false, error: err });
    })
})

router.get("/readby/:postId", authCheck, (req, res, next) => {
    let postId = req.params.postId;
    let userId = req.decoded.user._id
    Post.findById(postId).then(foundPost => {
        if (foundPost) {
            User.findById(userId).then(foundUser => {
                if (foundUser) {
                    foundPost.readBy.push(req.decoded.user.name);
                    foundPost.save((err, saved) => {
                        return res.status(200).json({ success: true });
                    })
                }else{
                    return res.status(400).json({success:false,message: "User Not Found"});
                }
            })
        }
    })
})

router.get('/tags', authCheck, (req, res, next) => {
    Tag.find({}).then(foundTags => {
        res.status(200).json({ success: true, tags: foundTags })
    }).catch(err => res.status(400).json({ success: false, message: err }))
})

router.get('/tag/:name', authCheck, (req, res, next) => {

    Tag.findOne({ name: req.params.name }).populate({ path: 'posts', populate: { path: 'owner', select: 'name' } }).then(foundPost => {
        if (foundPost) {
            res.status(200).json({ success: true, tagPost: foundPost })
        } else {
            res.status(404).json({ success: false, message: "No post found" });
        }
    }).catch(err => res.status(400).json({ success: false, message: err }))

})

module.exports = router;