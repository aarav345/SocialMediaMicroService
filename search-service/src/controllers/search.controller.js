const Search = require("../models/search.model");
const logger = require("../utils/logger");

module.exports.searchPostController = async (req, res, next) => {
    logger.info("Search Post Controller invoked");
    try {
        const { query } = req.query;
        const userID = req.user.userID; // gets from api gateway

        if (!userID) {
            logger.warn("Authentication failed: No user ID provided");
            return res.status(401).json({
                success: false,
                message: "Authentication failed: No user ID provided",
            });
        }

        logger.info(`User ID: ${userID}, Search Query: ${query}`);

        if (!query || query.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Query parameter is required",
            });
        }

        const cacheKey = `search:user:${userID}:query:${query}`;
        const cachedResults = await req.redisClient.get(cacheKey);

        if (cachedResults) {
            logger.info("Cache hit for search results");
            return res.status(200).json(JSON.parse(cachedResults));
        }
        
        const results = await Search.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } }).limit(10);

        const formatedResults = {
            success: true,
            message: "Search results fetched successfully",
            data: results,   
        };

        await req.redisClient.setex(cacheKey, 300, JSON.stringify(formatedResults));        

        res.status(200).json(formatedResults);
    } catch (e) {
        logger.error("Error in Search Post Controller:", e);
        res.status(500).json({
        success: false,
        message: "Internal Server Error",
        });
    }
};
