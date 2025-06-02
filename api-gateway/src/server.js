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
}))


