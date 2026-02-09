const { Kafka } = require('kafkajs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'job-listings-raw';

const kafka = new Kafka({
    clientId: 'test-verification-consumer',
    brokers: KAFKA_BROKERS
});

const consumer = kafka.consumer({ groupId: 'verification-group-' + Date.now() });

async function run() {
    console.log('Connecting verification consumer...');
    await consumer.connect();
    console.log('✅ Consumer connected');

    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
    console.log(`Subscribed to topic: ${KAFKA_TOPIC}`);
    console.log('Waiting for messages...');

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const prefix = `${topic}[${partition}|${message.offset}]`;
            const value = message.value.toString();
            try {
                const job = JSON.parse(value);
                const dateInfo = job.posted_date ? `[Posted: ${job.posted_date}]` : '[Posted: null]';
                console.log(`- ${prefix} ${dateInfo} Job: ${job.title} @ ${job.company} (${job.source})`);
            } catch (e) {
                console.log(`- ${prefix} Error parsing JSON: ${value.substring(0, 50)}...`);
            }
        },
    });
}

run().catch(console.error);
