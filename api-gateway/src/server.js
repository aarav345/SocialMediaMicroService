const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const logger = require("./utils/logger");
const {rateLimit} = require("express-rate-limit");
const {RedisStore} = require("rate-limit-redis");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/auth.middleware");


const app = express();
const PORT = process.env.PORT || 5000;  

const redisClient = new Redis(process.env.REDIS_URL);

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended: true}));


// rate limiting
const ratelimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Max 100 requests per IP
    standardHeaders: true, // Adds rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disables `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests, please try again later"
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
});

app.use(ratelimit); 


// for logging
app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body: ${JSON.stringify(req.body)}`);
    next();
})


// proxy
const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/, "/api");
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Proxy error: ${err.message}`);    
        res.status(500).json({
            message: `Internal Server Error: ${err.message}`
        })   
    }
}


// setting up proxy for identity service
app.use("/v1/auth", proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["Content-Type"] = "application/json";
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from Identity service: ${JSON.stringify(proxyResData)}`);
        return proxyResData;
    }
}));


// setting up proxy for post service
app.use("/v1/posts", validateToken, proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers['Content-Type'] = 'application/json';
        proxyReqOpts.headers['x-user-id'] = srcReq.user.id; 
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from Post service: ${JSON.stringify(proxyResData)}`);
        return proxyResData;
    }
}));

// setting up proxy for media service
app.use("/v1/media", validateToken, proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        if (!srcReq.headers['content-type'].startsWith('multipart/form-data')) {
            proxyReqOpts.headers['Content-Type'] = 'application/json';
        }
        proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
        return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from Media service: ${JSON.stringify(proxyResData)}`);
        return proxyResData;
    },
    parseReqBody: false // for multipart/form-data support don't parse the body automatically
}));



app.use(errorHandler);


app.listen(PORT, () => {
    logger.info(`API Gateway is running on PORT ${PORT}`);
    logger.info(`Identity Service URL is running on PORT: ${process.env.IDENTITY_SERVICE_URL}`);
    logger.info(`Post Service URL is running on PORT: ${process.env.POST_SERVICE_URL}`);
    logger.info(`Media Service URL is running on PORT: ${process.env.MEDIA_SERVICE_URL}`);
    logger.info(`Redis URL: ${process.env.REDIS_URL}`);
})


