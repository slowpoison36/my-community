const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const app = express();

dotenv.config();

const userRoutes = require("./routes/auth");
const communityRoutes = require("./routes/community");
const postRoute = require("./routes/post");
const messageRoute = require("./routes/message");
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname,'public','dist','community')));
app.use(bodyParser.json()).use(bodyParser.urlencoded({ extended: false }));


app.use("/auth",userRoutes);
app.use("/community",communityRoutes);
app.use("/post",postRoute);
app.use("/message",messageRoute);

mongoose.connect(process.env.database_url, { useNewUrlParser: true }, (err) => {
    if (err) {
        console.log(err)
    }
    console.log("Database connection successful");
})

app.get("*",(req,res,next)=>{
    
    res.sendFile(path.join(__dirname,'public','dist','community','index.html'));
})


const server = app.listen(PORT, () => console.log("Server has started"));

const io = require("./socket/socket").init(server);
io.on("connection",socket=>{
       console.log("Socket started");
})

