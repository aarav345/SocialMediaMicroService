const User = require("../models/user.model");
const logger = require("../utils/logger");
const { validationRegistration } = require("../utils/validation");


module.exports.registerUser = async (req, res) => {
    logger.info("registerUser");
    try {
        const {error} = validationRegistration(req.body);
        if (error) {
            logger.warn('Validation Error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const {email, username, password} = req.body;
        let user = await User.findOne({$or : [{email}, {username}]});
        if (user) {
            logger.warn("User already Exists");
            return res.status(400).json({
                success: false,
                message: "User already Exists"
            })
        }

        user = new User({
            username, email, password 
        });
        await user.save();

        logger.info("User saved successfully", user._id);
        
    } catch (error) {

    }
}