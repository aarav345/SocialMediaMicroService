const logger = require("../utils/logger");
const Media = require("../models/media.model");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");

const handlePostDeleted = async (event) => {
    const {postID, userID, mediaIds} = event;   

    try {
        const mediaToDelete = await Media.find({
            _id: {$in: mediaIds}
        });

        for (const media of mediaToDelete) {
            await deleteMediaFromCloudinary(media.publicId);
            await Media.deleteOne({_id: media._id});
            logger.info(`Media deleted successfully from Cloudinary and database: ${media.publicId} associated with post ${postID}`);
        }

        logger.info(`Processed deletion of media for post id: ${postID} for user: ${userID}`);
    } catch(e) {
        logger.error("Error handling post deleted event:", e);
        throw e;
    }

};


module.exports = {
    handlePostDeleted   
}