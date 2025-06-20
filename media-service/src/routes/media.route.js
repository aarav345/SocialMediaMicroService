const express = require('express');

const router = express.Router();
const multer = require('multer');
const { uploadMedia, getAllMedias } = require('../controllers/media.controller');
const { authenticateRequest } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

// configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    }
}).single("file"); // expecting a single file with the field name 'file'

router.post("/upload", authenticateRequest, (req, res, next) => {
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            logger.error("Multer error while uploading: ", err);
            return res.status(400).json({
                message: "Multer error while uploading.",
                error: err.message,
                stack: err.stack    
            })
        } else if (err) {
            logger.error("Unknown error while uploading: ", err);
            return res.status(500).json({
                message: "Unknown error while uploading.",
                error: err.message,
                stack: err.stack
            })
        }

        if (!req.file) {
            logger.error("No file uploaded");
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        next()
    })
}, uploadMedia);


router.get("/get-all-medias", authenticateRequest, getAllMedias);

module.exports = router;