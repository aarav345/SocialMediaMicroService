const logger = require("../utils/logger");
const Search = require("../models/search.model");


async function invalidateSearchCache(redisClient, userID) {
    try {
        let cursor = '0';

        // if (input) {
        //     await redisClient.del(`search:${input}`); // delete specific post cache
        //     logger.info("Search cache invalidated for key:", `post:${input}`);
        // }

        do {
            const reply = await redisClient.scan(cursor, 'MATCH', `search:user:${userID}:query:*`, 'COUNT', 100);
            cursor = reply[0];
            const keys = reply[1];
            if (keys.length > 0) {
                await redisClient.del(...keys); // requires individual deletion of keys rather than deleting the entire array
                logger.info("Search cache invalidated for keys:", keys);
            }
        } while (cursor !== '0');
    } catch (error) {
        logger.error("Error invalidating Search cache", error);
        console.error("Error invalidating Search cache", error);
    }
}


async function handlePostCreated(event, redisClient) {
    try {
        const { postID, userID, content, createdAt } = event;

        const newSearchPost = new Search({
            postId: postID,
            userId: userID,
            content: content,
            createdAt: createdAt,
        });

        await newSearchPost.save();

        await invalidateSearchCache(redisClient, userID);

        logger.info(`Post indexed successfully in search service ${newSearchPost._id.toString()}: ${postID} for user: ${userID}`);

    } catch(e) {
        logger.error("Error handling post created event:", e);
        throw e;
    }
}


async function handlePostDeleted(event, redisClient) {
    try {
        const {postID, userID} = event; 

        await Search.deleteOne({postId: postID, userId: userID});

        await invalidateSearchCache(redisClient, userID);
        logger.info(`Post deleted successfully from search service ${postID} for user: ${userID}`);

    } catch(e) {
        logger.error("Error handling post delete event:", e);
        throw e;
    }
}


module.exports = {
    handlePostCreated,
    handlePostDeleted
}