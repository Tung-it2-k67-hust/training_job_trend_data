const axios = require('axios');
const cheerio = require('cheerio');
const { sendJobToKafka, connectProducer, disconnectProducer } = require('../utils/kafka');

const SOURCE_NAME = 'vieclam24h';
const BASE_URL = 'https://vieclam24h.vn';

async function run() {
    console.log(`Starting ${SOURCE_NAME} crawler (Kafka, Smart Freshness)...`);

    // Connect to Kafka first
    await connectProducer();

    try {
        console.log(`Fetching ${BASE_URL}/tim-kiem-viec-lam-nhanh...`);
        const response = await axios.get(`${BASE_URL}/tim-kiem-viec-lam-nhanh`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const jobs = [];

        $('.job-item-search').each((index, element) => {
            const title = $(element).find('.job-title').text().trim();
            const company = $(element).find('.company-name').text().trim();
            const location = $(element).find('.location').text().trim();
            const salary = $(element).find('.salary').text().trim();
            const relativeLink = $(element).find('a').attr('href');
            const link = relativeLink ? (relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`) : '';

            // posted_date is null for now as per plan (stateless/speed optimization)
            const posted_date = null;

            if (title && link) {
                const job = {
                    title,
                    company,
                    location,
                    salary,
                    url: link,
                    source: SOURCE_NAME,
                    posted_date: posted_date, // Null
                    crawled_at: new Date().toISOString()
                };
                jobs.push(job);
            }
        });

        console.log(`Found ${jobs.length} jobs.`);

        // Send to Kafka instead of saving to file
        for (const job of jobs) {
            await sendJobToKafka(job);
        }
        console.log(`✅ Sent ${jobs.length} jobs to Kafka.`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await disconnectProducer();
    }
}

run();
