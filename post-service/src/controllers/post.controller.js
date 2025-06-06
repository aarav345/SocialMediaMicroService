const Post = require("../models/post.model");
const logger = require("../utils/logger");  
const { validationCreatePost } = require("../utils/validation");


module.exports.createPost = async (req, res) => {
    logger.info(`Creating Post....`)
    try {

        const {error} = validationCreatePost(req.body);

        if (error) {
            logger.warn('Validation Error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const {content, mediaIds} = req.body;


        const newPost = new Post({
            user: req.user.userID,
            content,
            mediaIds : mediaIds || []
        });


        await newPost.save();
        logger.info("Post created successfully", newPost);  
        return res.status(201).json({
            success: true,
            message: "Post created successfully",
        })
    } catch (error) {
        logger.error("Error creating post", error);
        return res.status(500).json({
            success: false,
            message: "Error creating post"
        })
    }
}




module.exports.getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit || 10);
        const startIndex = (page - 1) * limit;

        const cacheKey  = `posts:${page}:${limit}`;
        const cachedPosts = await req.redisClient.get(cacheKey);

        if (cachedPosts) {
            return res.json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find();
    } catch (error) {
        logger.error("Error fetching all post", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching all post"
        })
    }
}



module.exports.getPost = async (req, res) => {
    try {
        
    } catch (error) {
        logger.error("Error fetching post by ID", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching post by ID"
        })
    }
}



module.exports.deletePost = async (req, res) => {
    try {
        
    } catch (error) {
        logger.error("Error deleting post", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting post"
        })
    }
}