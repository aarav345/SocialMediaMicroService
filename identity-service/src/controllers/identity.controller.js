const { ref } = require("joi");
const RefreshToken = require("../models/refreshToken.model");
const User = require("../models/user.model");
const generateToken = require("../utils/genrateToken");
const logger = require("../utils/logger");
const { validationRegistration, validationLogin } = require("../utils/validation");


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

        const {accessToken, refreshToken} = await generateToken(user);

        res.status(201).json({
            status: true,
            message: "User created successfully",
            accessToken,
            refreshToken
        })
        
    } catch (error) {
        logger.error("Registration error occured", error);
        res.status(500).json({
            status: false,
            message: "Registration error occured"   
        })
    }
}


module.exports.loginUser = async (req, res) => {
    logger.info("loginUser");
    try {
        const {error} = validationLogin(req.body);
        if (error) {
            logger.warn('Validation Error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const {email, password} = req.body;
        let user = await User.findOne({email});
        if (!user) {
            logger.warn("User not found.");
            return res.status(400).json({
                status: false,
                message: "Invalid User"
            });
        }

        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            logger.warn("Invalid Password");
            return res.status(400).json({
                status: false,
                message: "Invalid Password"
            });
        }

        const {accessToken, refreshToken} = await generateToken(user);

        return res.status(200).json({
            status: true,
            message: "User logged in successfully",
            userId: user._id,
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error("Login error occured", error);
        res.status(500).json({
            status: false,
            message: "Login error occured"   
        })
    }
}



module.exports.refreshTokenUser = async (req, res, next) => {
    logger.info("Refresh Token endpoint hit....");
    try {
        const {refreshToken} = req.body;
        if (!refreshToken) {
            logger.error("Refresh token not found");
            return res.status(400).json({
                status: false,
                message: "Invalid Credentials"
            });
        }

        const storedToken = await RefreshToken.findOne({token: refreshToken});

        if (!storedToken || storedToken.expiresAt < new Date()) {
            logger.warn("Invalid or expired refresh token");
            return res.status(401).json({
                status: false,
                message: "Refresh Token not found or invalid"
            });
        }

        let user = await User.findById(storedToken.user);   
        if (!user) {
            logger.warn("User not found");
            return res.status(401).json({
                status: false,
                message: "User not found"
            });
        }


        const {accessToken: newAccessToken, refreshToken: newRefreshToken} = await generateToken(user);
        await RefreshToken.deleteOne({_id: storedToken._id});

        return res.status(200).json({
            status: true,
            message: "Token refreshed successfully",
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        })

    } catch (error) {
        logger.error("Refresh token error occured", error);
        return res.status(500).json({
            status: false,
            message: "Refresh token error occured"   
        })
    }
}


module.exports.logoutUser = async (req, res) => {
    logger.info("Logout endpoint hit....");
    try {
        const {refreshToken} = req.body;
        if (!refreshToken) {
            logger.error("Refresh token not found");
            return res.status(400).json({
                status: false,
                message: "Invalid Credentials"
            }); 
        }

        await RefreshToken.deleteOne({token: refreshToken});

        logger.info("Refresh Token Deleted for logout");
        return res.status(200).json({
            status: true,
            message: "Logout successful"
        });

    } catch (error) {
        logger.error("Logout error occured", error);
        return res.status(500).json({
            status: false,
            message: "Logout error occured"   
        })
    }

}