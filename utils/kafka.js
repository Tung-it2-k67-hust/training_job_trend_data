const { Kafka } = require('kafkajs');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Default config if not in .env
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'job-crawler';
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'job-listings-raw';

const kafka = new Kafka({
    clientId: KAFKA_CLIENT_ID,
    brokers: KAFKA_BROKERS
});

const producer = kafka.producer();

let isConnected = false;

async function connectProducer() {
    if (isConnected) return;
    try {
        console.log('Connecting to Kafka...');
        await producer.connect();
        isConnected = true;
        console.log('✅ Connected to Kafka');
    } catch (error) {
        console.error('❌ Failed to connect to Kafka:', error.message);
        throw error;
    }
}

async function sendJobToKafka(jobData) {
    if (!isConnected) {
        await connectProducer();
    }

    try {
        await producer.send({
            topic: KAFKA_TOPIC,
            messages: [
                {
                    key: jobData.url || jobData.title, // Use URL or Title as key for partitioning
                    value: JSON.stringify(jobData)
                },
            ],
        });
        // console.log(`Sent job to Kafka: ${jobData.title}`);
        return true;
    } catch (error) {
        console.error(`❌ Error sending job to Kafka: ${error.message}`, jobData.url);
        return false;
    }
}

async function disconnectProducer() {
    if (isConnected) {
        await producer.disconnect();
        isConnected = false;
        console.log('Disconnected from Kafka');
    }
}

module.exports = {
    connectProducer,
    sendJobToKafka,
    disconnectProducer,
    KAFKA_TOPIC
};
