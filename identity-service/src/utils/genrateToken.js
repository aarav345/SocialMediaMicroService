const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const RefreshToken = require("../models/refreshToken.model");

const generateToken = async (user) => {
    const accessToken = await jwt.sign({
        id: user._id,
        username: user.username,
    }, process.env.JWT_SECRET, {expiresIn: '60m'})


    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt: expiresAt
    });

    return {accessToken, refreshToken};
}


module.exports = generateToken;