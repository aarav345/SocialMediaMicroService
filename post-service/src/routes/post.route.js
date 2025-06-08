const express = require("express");
const router = express.Router();

const { createPost, getAllPosts, getPost, deletePost } = require("../controllers/post.controller");
const { authenticateRequest } = require("../middleware/auth.middleware");


// middleware for user login or not
router.use(authenticateRequest);

// routes
router.use("/create-post", createPost);
router.use("/get-posts", getAllPosts);
router.use("/get-post/:id", getPost);   
router.use("/delete-post/:id", deletePost);



module.exports = router;