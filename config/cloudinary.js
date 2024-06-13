const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (file) => {
    try {
        const result = await cloudinary.uploader.upload(file.path, {
            folder: 'uploads', // Optional: specify a folder in Cloudinary
            resource_type: "auto" // Automatically detect the file type
        });
        
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = uploadToCloudinary;
