require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("./utils/logger");
const errorHandler = require('./middleware/errorHandler');
const Redis = require("ioredis");
const { connectRabbitMQ, consumeEvent } = require('./utils/rabbitMq');
const searchRoutes = require('./routes/search.route');
const { handlePostCreated, handlePostDeleted } = require('./eventHandlers/searchEventHandler');


const app = express();
const PORT = process.env.PORT || 3004;


mongoose.connect(process.env.MONGODB_URL)
.then(() => logger.info("Connected to MongoDB"))
.catch((error) => logger.error("MongoDB connection error:", error));


const redisClient = new Redis(process.env.REDIS_URL);


// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request for ${req.url}`);
    logger.info(`Request body: ${JSON.stringify(req.body)}`);
    next();
});


// routes
app.use('/api/search', (req, res, next) => {
    req.redisClient = redisClient; // Pass redisClient to routes
    next();
}, searchRoutes);


// error handler
app.use(errorHandler);


// start server 
async function startServer() {
    try {
        connectRabbitMQ();

        await consumeEvent("post.created", (msg) => handlePostCreated(msg, redisClient));
        await consumeEvent("post.deleted", (msg) => handlePostDeleted(msg, redisClient));
        app.listen(PORT, () => {
            logger.info(`Search service is running on port ${PORT}`);
        })
    } catch(e) {
        logger.error("Failed to connect to RabbitMQ:", e);
        process.exit(1); // Exit the process if RabbitMQ connection fails
    }
};


startServer();


process.on("unhandledRejection", (error) => {
    logger.error("Unhandled Rejection:", error);
});