const express = require('express');
const { searchPostController } = require('../controllers/search.controller');
const { authenticateRequest } = require('../middleware/auth.middleware');
const router = express.Router();


// middleware for user login or not 
router.use(authenticateRequest);


// routes
router.get('/posts', searchPostController);


module.exports = router;