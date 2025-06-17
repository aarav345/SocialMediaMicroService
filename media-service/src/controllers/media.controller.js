const { uploadMediaToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');
const Media = require('../models/media.model');


module.exports.uploadMedia = async (req, res) => {
    logger.info("Starting media upload process");

    try {
        if (!req.file) {
            logger.error("No file uploaded");
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const {originalname, mimetype, buffer} = req.file;
        const userID = req.user.userID;

        logger.info(`Recieved file: ${originalname}, MIME TYPE: ${mimetype}, User ID: ${userID}`);
        logger.info("Uploading file to media storage");


        const cloudinaryUploadMedia = await uploadMediaToCloudinary(req.file);
        logger.info(`File uploaded successfully to Cloudinary, public ID: ${cloudinaryUploadMedia.public_id}`);

        const newlyCreatedMedia  = new Media({
            publicId: cloudinaryUploadMedia.public_id,
            originalName: originalname,
            mimeType: mimetype,
            userId: userID,
            url: cloudinaryUploadMedia.secure_url,
        });

        await newlyCreatedMedia.save();

        logger.info("Media upload process completed successfully");

        return res.status(201).json({
            success: true,
            mediaId: newlyCreatedMedia._id,
            message: "Media uploaded successfully",
            url: newlyCreatedMedia.url
        });

    } catch (e) {
        logger.error("Error during media upload:", e);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}