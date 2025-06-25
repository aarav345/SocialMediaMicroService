const express = require('express');
const { searchPostController } = require('../controllers/search.controller');
const { authenticateRequest } = require('../../../post-service/src/middleware/auth.middleware');
const router = express.Router();


// middleware for user login or not 
router.use(authenticateRequest);


// routes
router.get('/posts', searchPostController);


module.exports = router;