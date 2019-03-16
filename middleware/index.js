const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    let token = req.headers["authorization"];
    if (token) {
        jwt.verify(token, process.env.secret_key,(err, decoded) => {
            if (err) {
                res.status(401).json({
                    success: false,
                    message: "Failed to authenticate token"
                })
            } else {
                req.decoded = decoded;
                
                next();
            }
        })


    } else {
        res.status(401).json({ success: false, message: "No token provided" })
    }
}