const Search = require("../models/search.model");
const logger = require("../utils/logger");

const searchPostController = async (req, res, next) => {
    logger.info("Search Post Controller invoked");
    try {
        const { query } = req.query;
        const results = await Search.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } });
    } catch (e) {
        logger.error("Error in Search Post Controller:", e);
        res.status(500).json({
        success: false,
        message: "Internal Server Error",
        });
    }
};
