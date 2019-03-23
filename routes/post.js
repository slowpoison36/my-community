const router = require("express").Router();
const { check, validationResult } = require("express-validator/check");
const Post = require("../models/post");
const authCheck = require("../middleware/index");
const User = require("../models/user");
const Tag = require("../models/tag");
const Comment = require("../models/comment");

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
    transformation: [{ width: 1000, height: 400, crop: "limit" }]
});
const parser = multer({ storage: storage });




router.post("/create-post", [check(['title', 'description'], "Some fields are missing")],
    [authCheck, parser.array('tagImage', 5)], (req, res, next) => {
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
            if (req.files && req.files.length) post.postPic = req.files[0].url;
            post.tag = req.body.tag;
            post.save((err, savedPost) => {
                Tag.findById(req.body.tag, (err, foundTag) => {
                    if (err) {
                        return next(err)
                    }
                    if (foundTag) {
                        foundTag.posts.push(savedPost._id);
                        foundTag.save((err, tagSaved) => {
                            User.findById(post.owner, (err, foundUser) => {
                                if (err) {
                                    return next(err)
                                }

                                foundUser.posts.push(savedPost._id);
                                foundUser.save((err, savedUser) => {

                                    return res.status(201).json({ message: "Post Created Successfully", success: true, postId: savedPost._id })
                                })
                            })

                        });
                    }

                })

            })
        } else {
            let tagUrl, postUrl;
            if (req.files.length > 1) {
                postUrl = req.files[0].url;
                tagUrl = req.files[1].url;
            } else {
                tagUrl = req.files[0].url;
            }
            let newTag = req.body.addTag.toLowerCase();
            Tag.findOne({ name: newTag }).then(tags => {

                if (!tags) {
                    tag.name = newTag.trim().replace(/\s+/g, "-");
                    if (tagUrl) { tag.image = tagUrl; }
                    tag.save((err, savedTag) => {
                        if (err) {
                            return next(err);
                        }
                        post.tag = savedTag._id;
                        if (postUrl) { post.postPic = postUrl; }
                        post.save((err, savedPost) => {
                            tag.posts.push(savedPost._id);
                            tag.save((err, tagSaved) => {
                                User.findById(post.owner).then(foundUser => {
                                    if (foundUser) {
                                        foundUser.posts.push(savedPost._id);
                                        foundUser.save((err, savedUserPost) => {
                                            return res.status(201).json({ message: "Post Created Successfully", success: true, postId: savedPost._id })
                                        })

                                    } else {
                                        return res.status(404).json({ message: "No User found", success: false })
                                    }
                                })


                            });

                        });

                    });
                } else {
                    return res.status(400).json({ message: `${newTag} Tag is already taken`, success: false })


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

router.get('/get-post/:postTitle', authCheck, ((req, res, next) => {
    Post.findOne({ title: req.params.postTitle })
        .populate('owner')
        .populate({ path: "comments", populate: { path: "user" } })
        .then(foundPost => {
            if (foundPost) {
                return res.status(200).json({ success: true, post: foundPost })
            } else {
                return res.status(404).json({ success: false, message: "No post found" });
            }
        }).catch(err => res.status(500).json({ error: err }));
}))

router.get("/readby/:postId", authCheck, (req, res, next) => {
    let postId = req.params.postId;
    let userId = req.decoded.user._id
    Post.findById(postId).then(foundPost => {
        if (foundPost) {
            User.findById(userId).then(foundUser => {
                if (foundUser) {
                    let postReader = req.decoded.user.name;
                    let index = foundPost.readBy.indexOf(postReader);
                    if (index === -1) {
                        foundPost.readBy.push(postReader);
                        foundPost.save((err, saved) => {
                            return res.status(200).json({ success: true });
                        })

                    } else {
                        return res.status(400).json({ success: false })
                    }

                } else {
                    return res.status(400).json({ success: false, message: "User Not Found" });
                }
            })
        }
    })
})


router.get('/tags', authCheck, (req, res, next) => {
    let perPage = 5
    let pageNum = req.query.pageNum || 0;
    Tag.find({})
        .skip(perPage * pageNum)
        .limit(perPage)
        .sort({ created: "-1" })
        .exec((err, foundTags) => {
            if (err) {
                return next(err);
            }

            Tag.countDocuments((err, totalTags) => {
                if (err) {
                    return next(err)
                }
                res.status(200).json({ success: true, tags: foundTags, total: totalTags })

            })
        })
})

router.get('/all-tags', authCheck, async (req, res, next) => {
    try {
        const foundTags = await Tag.find({});

        return res.status(200).json({ success: true, tags: foundTags });
    } catch (err) {
        res.status(500).json({ success: false, error: err })
    }
})

router.get('/tag/:name', authCheck, (req, res, next) => {

    Tag.findOne({ name: req.params.name })
        .populate({ path: "posts", populate: { path: "owner", select: "name -_id" } })
        .populate({
            path: 'posts',
            populate: { path: 'comments', populate: { path: "user", select: "name -_id" } }
        })
        .then(foundPost => {
            if (foundPost) {
                res.status(200).json({ success: true, tagPost: foundPost })
            } else {
                res.status(404).json({ success: false, message: "No post found" });
            }
        }).catch(err => res.status(400).json({ success: false, message: err }))

})

router.post("/add-comment", authCheck, (req, res, next) => {

    const comment = new Comment();
    const user = req.decoded.user._id;
    comment.description = req.body.description;
    comment.post = req.body.postId;
    comment.user = user;

    comment.save((err, commentSaved) => {
        if (err)
            return next(err)
        Post.findById(comment.post).then(foundPost => {
            if (foundPost) {
                foundPost.comments.push(commentSaved._id);
                foundPost.save();
                res.status(201).json({ success: true, message: "Comment successfully added", comment: commentSaved });
            } else {
                res.status(400).json({ success: false, message: "No post found" });
            }
        }).catch(err => res.status(500).json({ error: err }));
    })


})

//sets a post to be featured if none within 24 hours range
router.put("/feature/:id", authCheck, async (req, res, next) => {
    try {
        let allPost = await Post.find({
            created: {
                $gt: Date.now() - 1000 * 60 * 60 * 12,// 12 hours
                $lte: Date.now()
            }
        })

        if (allPost) {
            allPost = allPost.filter(post => post.featured);
        }

        if (!allPost.length) {
            let foundPost = await Post.findById(req.params.id)
            foundPost.featured = true;
            let savedPost = await foundPost.save();
            return res.status(201).json({ success: true, message: "Your Post has been featured" })
        }

        return res.status(409).json({ success: false, message: "Sorry!,Other Post is already featured" })


    } catch (err) {
        res.status(500).json({ error: err });
    }

})

router.get('/featurepost', authCheck, async (req, res, next) => {
    try {
        const featuredPost = await Post.find({
            $and: [{ featured: true }, {
                created: {
                    $gt: Date.now() - 1000 * 60 * 60 * 24 * 7,//week
                    $lte: Date.now()
                }
            }]
        })
            .sort({ created: "-1" })
            .limit(1)
            .populate('tag', 'name')
        if (featuredPost) {
            return res.status(200).json({ success: true, post: featuredPost[0] })
        }
        const anyFeatured = await Post.findOne({ featured: true });
        if (anyFeatured) {

            return res.status(200).json({ success: true, post: anyFeatured })
        }

        return res.status(404).json({ success: false, message: "No featured post found" });
    } catch (err) {
        res.status(500).json({ error: err });

    }
})


router.delete("/:id", authCheck, async (req, res, next) => {
    try {
        await Comment.deleteMany({ post: req.params.id });
        await Post.findByIdAndDelete(req.params.id);
         Tag.findOne({posts:req.params.id},(err,tag)=>{
                 tag.posts.remove(req.params.id);
                 tag.save((err)=>{
                      if(err){
                          return next(err);
                      }

                      return res.status(200).json({ success: true });
                 })
         })

      

    } catch (err) {
        res.status(500).json({ error: err });
    }

})

router.delete("/tag/post/:id", async(req,res,next)=>{

})
module.exports = router;