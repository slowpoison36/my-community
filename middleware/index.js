const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = function (req, res, next) {
    let token = req.headers["authorization"];
    if (token) {
        jwt.verify(token, process.env.secret_key, (err, decoded) => {
            if (err) {
                res.status(403).json({
                    success: false,
                    message: "Failed to authenticate token"
                })
            } else {
                User.findById(decoded.user._id, (err, foundUser) => {
                    if (err) {
                        return next(err);
                    }
                    if (foundUser) {
                        foundUser.lastActive = Date.now();
                        foundUser.save();
                    }
                    req.decoded = decoded;
                    next();
                })

            }
        })


    } else {
        res.status(401).json({ success: false, message: "No token provided" })
    }
}