const dotenv = require("dotenv");
dotenv.config();


const express = require("express"); 
const logger = require("./utils/logger");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const {RateLimiterRedis} = require("rate-limiter-flexible");
const Redis = require("ioredis"); 
const {rateLimit} = require("express-rate-limit");
const {RedisStore} = require("rate-limit-redis");
const authRoutes = require("./routes/identity.route");
const errorHandler = require("./middleware/errorHandler");
const app = express();

const PORT = process.env.PORT || 5000;

mongoose
.connect(process.env.MONGODB_URL)
.then(() => {
    logger.info("Connected to MongoDB");
})
.catch((error) => {
    logger.error("Mongo connection error:", error)
});

const redisClient = new Redis(process.env.REDIS_URL);



// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request for ${req.url}`);
    logger.info(`Request body ${req.body}`);
    next();
});


// DDOS protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10,
    duration: 1
});

app.use((req, res, next) => {
    rateLimiter.consume(req.ip).then(() => next()).catch(() => {
        logger.warn(`Rate limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests, please try again later"
        })
    })
})


// Ip based rate limiting for senstitive endpoints
const senstitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests, please try again later"
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
});



// apply this sensitiveEndpointLimiter to our routes
app.use("/api/auth/register", senstitiveEndpointsLimiter);


// Routes 
app.use('/api/auth', authRoutes)


// error handler 
app.use(errorHandler);


app.listen(PORT, () => {
    logger.info(`Identity Service is running on PORT ${PORT}`);
})


// unhandled promise rejection

process.on('unhandledRejection', (reason, promise) => {
    logger.info("Unhandled Rejection at:", promise, "reason:", reason);
})
