const router = require("express").Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const sendGridNodemailer = require("nodemailer-sendgrid-transport");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { check, validationResult } = require("express-validator/check");
dotenv.config();

const Community = require("../models/community")

const User = require("../models/user");
const authCheck = require("../middleware/index");
const Post = require("../models/post");
const Message = require("../models/message");
const Comment = require("../models/comment");

const transporter = nodemailer.createTransport(sendGridNodemailer({
    auth: {
        api_key: process.env.SENDGRID_APIKEY
    }
}))

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
    folder: "Profile",
    allowedFormats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 500, height: 500, crop: "limit" }]
});
const parser = multer({ storage: storage });

router.post("/register", parser.single("picture"), (req, res, next) => {
    let user = new User();
    user.name = req.body.name;
    user.email = req.body.email;
    user.intro = req.body.intro;
    user.picture = req.file && req.file.url || "NA";
    user.phone = req.body.phone;
    user.profession = req.body.profession;
    user.gender = req.body.gender || "unspecified";
    user.password = req.body.password;
    user.community = req.body.community;
    User.findOne({ $or: [{ name: req.body.name }, { email: user.email }] }).then(existingUser => {
        if (existingUser) {
            let username;
            if (req.body.name == existingUser.name)
                username = req.body.name;
            else if (req.body.email === existingUser.email)
                username = req.body.email;

            return res.status(400).json({ success: false, message: `${username} already exists` });
        }
        crypto.randomBytes(32, (err, buffer) => {
            if (err) {
                return next(err);
            }
            user.tokenString = buffer.toString('hex');
            user.tokenExpiration = Date.now() + 3600000;

            user.save((err, savedUser) => {
                Community.findOne({ _id: req.body.community })
                    .then(foundCommunity => {
                        if (foundCommunity) {
                            foundCommunity.members.push(savedUser._id);
                            foundCommunity.save(() => {
                                transporter.sendMail({
                                    to: req.body.email,
                                    from: "adhikaris1@homail.com",
                                    subject: "Email Verification Needed",
                                    html: `<p>You registration is yet to be completed. Please click the link below to complete our
                                        registration.
                                    </p>
                                     <p><a href="https://our-community.herokuapp.com/register/${user.tokenString}"> Click this link </a>
                                    `
                                }).then(() => {

                                    return res.status(201).json(
                                        {
                                            success: true,
                                            message: "Registration complete waiting for email verification",
                                            isVerified: false
                                        });
                                })
                            });
                        } else {
                            //if new comunity needs to be create here it goes;
                            return res.status(400).json({ message: "Community not found" });
                        }
                    }).catch(err => res.status(500).json({ err: err }));

            });
        })


    })

})


router.post("/login", [check("name", "Name is required"), check("password").isLength({ min: 4 }).withMessage("Must be atleast 3 characters")], (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(422).json({ error: result.array() });
    }
    let name = "", email = "";
    req.body.name.indexOf("@") > -1 ? email = req.body.name : name = req.body.name;
    User.findOne({ $or: [{ name: name }, { email: email }] })
        .populate("community")
        .populate("posts")
        .then(foundUser => {

            if (!foundUser) {
                return res.status(404).json({ message: "User not found" })
            }
            if (foundUser.accDisabled) {
                return res.status(403).json({ success: false, message: "Sorry!,Your account has been disabled" })
            }
            else {
                const passwordCheck = foundUser.comparePassword(req.body.password);
                if (!passwordCheck) {
                    return res.status(400).json({ success: false, message: "Invalid Password" });
                }

                const token = jwt.sign({
                    user: foundUser,
                }, process.env.secret_key,
                    { expiresIn: "2d" }
                )

                res.status(200).json({ success: true, token: token });
            }
        })
})


//this endpoint is to verify user registration
router.get("/verify/:token", (req, res, next) => {
    User.findOne({ tokenString: req.params.token, tokenExpiration: { $gt: Date.now() } })
        .then(user => {
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            user.isVerified = true;
            user.tokenExpiration = Date.now() - 1000;
            user.save((err, savedUser) => {
                if (err)
                    return next(err);
                res.status(200).json({ isVerified: true, success: true });
            });
        })
})
//gets all the users based on the particular community
router.get('/members', authCheck, async (req, res, next) => {
    let loggedUser = req.decoded.user._id
    let communityId = await Community.findOne({ members: loggedUser });
    let pageNum = req.query.pageNum || 0;
    let pageSize = 5;
    User.find({ _id: { $ne: { _id: loggedUser } }, community: communityId.id })
        .skip(pageSize * pageNum)
        .limit(pageSize)
        .sort({ created: "-1" })
        .populate("posts")
        .populate("community")
        .select(['-password', '-tokenString'])
        .exec((err, foundUsers) => {
            if (err) {
                return next(err);
            }

            if (foundUsers.length) {
                User.countDocuments({ community: communityId.id }, (err, count) => {
                    if (err)
                        return next(err);
                    res.status(200).json({ success: true, users: foundUsers, total: count });
                })
            } else {
                res.status(404).json({ success: false, message: "No memebers available" })
            }
        })

})
//get all members regardless of the community

router.get('/admin/members', authCheck, async (req, res, next) => {
    let loggedUser = req.decoded.user._id
    let pageNum = req.query.pageNum || 0;
    let pageSize = 10;
    User.find({ _id: { $ne: { _id: loggedUser } } })
        .skip(pageSize * pageNum)
        .limit(pageSize)
        .sort({ created: "-1" })
        .populate("posts")
        .populate("community")
        .select(['-password', '-tokenString'])
        .exec((err, foundUsers) => {
            if (err) {
                return next(err);
            }

            if (foundUsers.length) {
                User.countDocuments((err, count) => {
                    if (err)
                        return next(err);
                    res.status(200).json({ success: true, users: foundUsers, total: count });
                })
            } else {
                res.status(404).json({ success: false, message: "No memebers available" })
            }
        })

})

//delete user based on their id

router.delete("/admin/removeUser/:id", authCheck, async (req, res, next) => {
    try {
        const userId = req.params.id;
        const isAdmin = req.decoded.user.role == 'admin';
        console.log(isAdmin);
        if (isAdmin) {
            await User.findByIdAndRemove(userId);
           const community = await Community.findOne({members:userId});
           community.members.remove(userId);
           await community.save();
           await Post.deleteMany({owner: userId})
           await Message.deleteMany({sender:userId});
           await Message.deleteMany({recepient: userId})
           await Comment.deleteMany({user:userId});

            return res.status(200).json({ success: true, message: "User successfully deleted" });
        } else {
            res.status(401).json({ message: "Not enough Prevlidge" });
        }
    }
    catch (err) {
        return res.status(500).json({ error: err });
    }
})

//get user based on the id passed

router.get('/member/:id', authCheck, (req, res, next) => {
    User.findOne({ _id: req.params.id })
        .populate({ path: "posts", options:{sort :{created:"-1"}}, populate: { path: "tag" } })
        .populate("community")
        .populate("tag")
        .select(['-password', '-tokenString'])
        .exec((err, foundUser) => {
            if (err) {
                return next(err);
            }
            res.status(200).json({ success: true, user: foundUser });
        })
})


// update user 

router.put('/profile/update', [authCheck, parser.single("profilePic")], (req, res, next) => {
    let userId = req.decoded.user._id;
    User.findById(userId).then(foundUser => {
        if (foundUser) {
            if (req.body.name) foundUser.name = req.body.name;
            if (req.body.email) foundUser.email = req.body.email;
            if (req.body.intro) foundUser.intro = req.body.intro;
            if (req.file && req.file.url) foundUser.picture = req.file.url;
            if (req.body.phone) foundUser.phone = req.body.phone;
            if (req.body.profession) foundUser.profession = req.body.profession;
            if (req.body.gender) foundUser.gender = req.body.gender;
            if (req.body.password) foundUser.password = req.body.password;

            foundUser.save((err, userDataSaved) => {
                return res.status(200).json({ success: true })
            });

        } else {
            res.status(404).json({ message: "User not found", success: false });
        }

    }).catch(err => res.status(500).json({ error: err }));

})


router.put("/disable/:userId", authCheck, async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const accDisabled = req.body.disableAccount;
        const admin = req.decoded.user.role.toLowerCase() === 'admin';
        if (!admin) {
            return res.status(403).json({ message: "You dont have prevlidge to do this operation" });
        }

        const user = await User.findById(userId);
        user.accDisabled = accDisabled;
        await user.save();
        return res.status(200).json({ success: true })


    } catch (err) {
        res.status(500).json({ error: err });
    }
})



module.exports = router;