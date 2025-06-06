require('dotenv').config(); 


const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/post.route");
const logger = require("./utils/logger");
const errorHandler = require('./middleware/errorHandler');



const app = express();
const PORT = process.env.PORT || 3002;


mongoose.connect(process.env.MONGODB_URL)
.then(() => logger.info("Connected to MongoDB"))
.catch((error) => logger.error("MongoDB connection error:", error));


const redisClient = new Redis(process.env.REDIS_URL);

// MIDDLEWARE
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.use((req, res, next) => {
    logger.info(`Received ${req.method} request for ${req.url}`);
    logger.info(`Request body: ${JSON.stringify(req.body)}`);
    next();
});



// routes -> pass redisClient to routes
app.use("/api/posts", (req, res, next) => {
    req.redisClient = redisClient;
    next();
}, postRoutes);


// error handler
app.use(errorHandler);


app.listen(PORT, () => {
    logger.info(`Post service is running on port ${PORT}`);
});


// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
    logger.info(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    // Optionally, you can exit the process or handle it as needed
    // process.exit(1);
})