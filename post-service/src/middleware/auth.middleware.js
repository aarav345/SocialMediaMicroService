const logger = require('../utils/logger');

module.exports.authenticateRequest = (req, res, next) => {
    const userID = req.headers['x-user-id']; // gets from api gateway

    if (!userID) {
        logger.warn(`Authentication failed: No user ID provided`);
        return res.status(401).json({
            success: false,
            message: 'Authentication failed: No user ID provided'
        });
    }

    req.user = {userID};
    next();
}