const cloudinary = require('cloudinary').v2;
const logger = require('./logger');


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


const uploadMediaToCloudinary = async (file) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    logger.error("Error uploading to Cloudinary:", error);
                    reject(error);
                } else {
                    logger.info("Successfully uploaded to Cloudinary:", result);
                    resolve(result);
                }

            }
        )

        uploadStream.end(file.buffer);
    })
}


const deleteMediaFromCloudinary = async(publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image' // automatically determine resource type ex: image, video, etc.
        });
        logger.info("Successfully deleted from Cloudinary:", result);
        return result;
    } catch(e) {
        logger.error("Error deleting from Cloudinary:", e);
        throw e;
    }
}

module.exports = {
    uploadMediaToCloudinary, deleteMediaFromCloudinary
};