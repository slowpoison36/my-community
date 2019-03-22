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
    console.log(user.community, req.body.community);
    User.findOne({ $or: [{ name: req.body.name }, { email: user.email }] }).then(existingUser => {
        if (existingUser) {
            let username;
             if(req.body.name==existingUser.name)
                   username  = req.body.name;
             else if(req.body.email === existingUser.email)
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
                console.log(req.body.community);
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
    let name, email;
    req.body.name.indexOf("@") > -1 ? email = req.body.name : name = req.body.name;
    User.findOne({ $or: [{ name: name }, { email: email }] })
        .populate("community")
        .populate("posts")
        .then(foundUser => {
            if (!foundUser) {
                return res.status(404).json({ message: "User not found" })
            } else {
                const passwordCheck = foundUser.comparePassword(req.body.password);
                if (!passwordCheck) {
                    return res.status(400).json({ success: false,message:"Invalid Password" });
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


//gets all the users
router.get('/members', authCheck, (req, res, next) => {
    let loggedUser = req.decoded.user._id
    let pageNum = req.query.pageNum || 0;
    let pageSize = 6;
    User.find({})
        .skip(pageSize * pageNum)
        .limit(pageSize)
        .populate("posts")
        .populate("community")
        .select(['-password', '-tokenString'])
        .exec((err, foundUsers) => {
            if (err) {
                return next(err);
            }

            User.countDocuments((err,count)=>{
                 if(err) 
                     return next(err);

                     foundUsers = foundUsers.filter(user => user._id != loggedUser);
                     res.status(200).json({ success: true, users: foundUsers,total:count });    
            })  
        })

})

//get user based on the id passed

router.get('/member/:id', authCheck, (req, res, next) => {
    User.findOne({ _id: req.params.id })
        .populate("posts")
        .populate("community")
        .select(['-password', '-tokenString'])
        .exec((err, foundUser) => {
            if (err) {
                return next(err);
            }
            res.status(200).json({ success: true, user: foundUser });
        })
})


// update user 

router.put('/profile/update',[authCheck,parser.single("profilePic")], (req, res, next) => {
    let userId = req.decoded.user._id;
    User.findById(userId).then(foundUser => {
        if (foundUser) {
            if (req.body.name) foundUser.name = req.body.name;
            if (req.body.email)  foundUser.email = req.body.email;
            if (req.body.intro) foundUser.intro = req.body.intro;
             if(req.file && req.file.url) foundUser.picture = req.file.url;
            if (req.body.phone)foundUser.phone = req.body.phone;
            if (req.body.profession) foundUser.profession = req.body.profession;
            if (req.body.gender) foundUser.gender = req.body.gender;
            if (req.body.password) foundUser.password = req.body.password;

            foundUser.save((err,userDataSaved)=>{
                return res.status(200).json({success:true})
            });
           
        }else{
            res.status(404).json({message:"User not found",success:false});
        }

    }).catch(err => res.status(500).json({ error: err }));

})



module.exports = router;