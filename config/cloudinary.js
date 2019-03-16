module.exports = (cloudinary,cloudinaryStorage,multer,folderName,imgWidth,imgHeight) => {

    cloudinary.config({
        cloud_name: process.env.cloud_name,
        api_key: process.env.cloudinary_api_key,
        api_secret: process.env.cloudinary_api_secret
    })

    const storage = cloudinaryStorage({
        cloudinary: cloudinary,
        folder:folderName ,
        allowedFormats: ["jpg", "png"],
        transformation: [{ width: imgWidth, height: imgHeight, crop: "limit" }]
    });
    const parser = multer({ storage: storage });

    return parser;
}