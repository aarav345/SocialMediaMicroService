const Post = require("../models/post.model");
const logger = require("../utils/logger");  
const { publishEvent } = require("../utils/rabbitMq");
const { validationCreatePost } = require("../utils/validation");



async function invalidatePostCache(req, input) {
    try {
        let cursor = '0';

        if (input) {
            await req.redisClient.del(`post:${input}`); // delete specific post cache
            logger.info("Post cache invalidated for key:", `post:${input}`);
        }

        do {
            const reply = await req.redisClient.scan(cursor, 'MATCH', 'posts:*', 'COUNT', 100);
            cursor = reply[0];
            const keys = reply[1];
            if (keys.length > 0) {
                await req.redisClient.del(...keys); // requires individual deletion of keys rather than deleting the entire array
                logger.info("Post cache invalidated for keys:", keys);
            }
        } while (cursor !== '0');
    } catch (error) {
        logger.error("Error invalidating post cache", error);
        console.error("Error invalidating post cache", error);
    }
}

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
        await invalidatePostCache(req, newPost._id.toString());

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
            logger.info("Cache hit for posts", { page, limit });
            return res.json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find({}).sort({createdAt: -1}).skip(startIndex).limit(limit); // -1 for descending, 1 for ascending

        const total = await Post.countDocuments({});

        const result = {
            success: true,
            posts,
            currentPage: page,
            totalPage: Math.ceil(total / limit),
            totalPosts: total,
        };

        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

        logger.info("Fetched posts", { page, limit, total });

        return res.status(200).json(result);
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
        const postID = req.params.id;
        const cacheKey = `post:${postID}`;
        const cachedPosts = await req.redisClient.get(cacheKey);
        if (cachedPosts) {
            logger.info("Cache hit for post", { postID });
            return res.json(JSON.parse(cachedPosts));
        }

        const post = await Post.find({_id: postID});

        if (!post || post.length === 0) {
            logger.warn("Post not found", { postID });
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const result = {
            success: true,
            post
        };

        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
        logger.info("Fetched post by ID", { postID });

        return res.status(200).json(result);
        
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
        const postID =  req.params.id;
        
        const post = await Post.findOneAndDelete({
            _id: postID,
            user: req.user.userID
        });
        
        if (!post) {
            logger.warn("Post not found", { postID });
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // publish post delete method : routingKey: post.deleted, message: { postID, userID, mediaIds }
        await publishEvent('post.deleted', {
            postID: post._id.toString(),
            userID: req.user.userID,
            mediaIds: post.mediaIds || []
        })

        await invalidatePostCache(req, postID);
        logger.info("Post deleted successfully", { postID });

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully"
        });

    } catch (error) {
        logger.error("Error deleting post", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting post"
        })
    }
}