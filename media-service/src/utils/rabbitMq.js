const amqp = require("amqplib");
const logger = require("./logger");


let connection = null;
let channel = null;

const EXCHANGE_NAME = "post_exchange";


async function connectRabbitMQ(retries = 5, delay = 5000) {
    while (retries > 0) {
        try {
            connection = await amqp.connect(process.env.RABBITMQ_URL);
            channel = await connection.createChannel();

            await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
            logger.info("Connected to RabbitMQ successfully");
            return channel;
        } catch (e) {
            logger.error(`Error connecting to RabbitMQ. Retries left: ${retries - 1}`);
            logger.error(e.message);

            retries--;
            if (retries === 0) {
                logger.error("Exhausted all RabbitMQ connection retries. Exiting...");
                process.exit(1); // or throw error
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}


async function publishEvent(routingKey, message) {
    if (!channel) {
        await connectRabbitMQ();
    }

    channel.publish(
        EXCHANGE_NAME,
        routingKey,
        Buffer.from(JSON.stringify(message)),
    );
    logger.info(`Event published with routing key: ${routingKey}`);
}


async function consumeEvent(routingKey, callback)  {
    if (!channel) {
        await connectRabbitMQ();
    }

    const q = await channel.assertQueue('', {exclusive: true});
    await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
    channel.consume(q.queue, (msg) => {
        if (msg !== null) {
            const content = JSON.parse(msg.content.toString());
            callback(content);
            channel.ack(msg);
        }
    });

    logger.info(`Subscribed to event: ${routingKey}`);
}



module.exports = {connectRabbitMQ, publishEvent, consumeEvent};


