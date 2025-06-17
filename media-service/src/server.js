require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mediaRoutes = require('./routes/media.route');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { default: mongoose } = require('mongoose');
const {rateLimit} = require('express-rate-limit');
const Redis = require('ioredis');
const {RedisStore} = require('rate-limit-redis');


const app = express();
const PORT = process.env.PORT || 3003;

mongoose.connect(process.env.MONGODB_URL)
.then(() => logger.info('Connected to MongoDB'))
.catch((error) => logger.error('MongoDB connection error:', error));

const redisClient = new Redis(process.env.REDIS_URL)



// MIDDLEWARE
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request for ${req.url}`);
    logger.info(`Request body: ${JSON.stringify(req.body)}`);
    next();
});


// IP based rate limiting for sensitive endpoints
const sensitiveEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests, please try again later"
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    })
});

app.use("/api/media/upload", sensitiveEndpointLimiter);
app.use("/api/media", mediaRoutes);

app.use(errorHandler);


app.listen(PORT, () => {
    logger.info(`Media service is running on port ${PORT}`);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
