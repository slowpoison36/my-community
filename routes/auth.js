const router = require("express").Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const sendGridNodemailer = require("nodemailer-sendgrid-transport");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { check,validationResult } = require("express-validator/check");
dotenv.config();

const Community = require("../models/community")

const User = require("../models/user");

const transporter = nodemailer.createTransport(sendGridNodemailer({
    auth: {
        api_key: process.env.SENDGRID_APIKEY
    }
}))



router.post("/register", (req, res, next) => {
    let user = new User();
    user.name = req.body.name;
    user.email = req.body.email;
    user.password = req.body.password;
    user.community = req.body.community;
    User.findOne({ $or: [{ name: req.body.name }, { email: user.email }] }).then(existingUser => {
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists", user: { name: existingUser.name, email: existingUser.email } });
        }
        crypto.randomBytes(32, (err, buffer) => {
            if (err) {
                return next(err);
            }
            user.tokenString = buffer.toString('hex');
            user.tokenExpiration = Date.now() + 3600000;

            user.save((err, savedUser) => {
                transporter.sendMail({
                    to: req.body.email,
                    from: "adhikaris1@homail.com",
                    subject: "Email Verification Needed",
                    html: `<p>You registration is yet to be completed. Please click the link below to complete our
                            registration.
                        </p>
                         <p><a href="http://localhost:4200/register/${user.tokenString}"> Click this link </a>
                        `
                }).then((res) => {
                })
                res.status(201).json({ message: "Registration complete waiting for email verification", success: true, isVerified: false });
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
        .populate({path : 'community',populate : {path : 'members'}})
        .then(foundUser => {
            if (!foundUser) {
                return res.status(404).json({ message: "User not found" })
            } else {
                const passwordCheck = foundUser.comparePassword(req.body.password);
                if (!passwordCheck) {
                    return res.status(401).json({ success: false });
                }

                const token = jwt.sign({
                    user: foundUser,
                }, process.env.secret_key,
                    { expiresIn: "2d"}
                )

                res.status(200).json({ success: true, token: token });
            }
        })
    })


    router.get("/verify/:token", (req, res, next) => {
        User.findOne({ tokenString: req.params.token, tokenExpiration: { $gt: Date.now() } })
            .then(user => {
                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }
                user.isVerified = true;
                user.tokenExpiration = Date.now() - 1000;
                user.save(err => {
                    if (err)
                        return next(err);

                    let token = jwt.sign({
                        user: user
                    }, process.env.secret_key, { expiresIn: "2d"})

                    res.status(200).json({ token: token, verified: true });
                });
            })
    })





module.exports = router;