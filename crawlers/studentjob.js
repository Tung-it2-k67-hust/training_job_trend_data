const axios = require('axios');
const cheerio = require('cheerio');
const { sendJobToKafka, connectProducer, disconnectProducer } = require('../utils/kafka');

const SOURCE_NAME = 'studentjob';
const BASE_URL = 'https://studentjob.vn';
const START_URL = 'https://studentjob.vn/viec-lam';

async function run() {
    console.log(`Starting ${SOURCE_NAME} crawler (Kafka, Smart Freshness)...`);

    await connectProducer();

    try {
        console.log(`Fetching ${START_URL}...`);
        const response = await axios.get(START_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const jobs = [];

        $('.job-items').each((index, element) => {
            let title = $(element).find('.job-tittle h2').text().trim();
            let company = $(element).find('.job-tittle ul li a').first().text().trim();
            let link = $(element).find('.job-tittle h2 a').attr('href');

            let location = '';
            let salary = 'Negotiable';

            $(element).find('.job-tittle ul li').each((i, el) => {
                const text = $(el).text().trim();
                // Heuristic for location: not digits and not the company name
                if (!text.match(/\d/) && text !== company) {
                    location = text;
                }
            });

            // posted_date is null for now as per plan (stateless/speed optimization)
            const posted_date = null;

            if (title && link) {
                const job = {
                    title,
                    company: company || 'Hidden',
                    location: location || 'Vietnam',
                    salary,
                    url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    source: SOURCE_NAME,
                    posted_date: posted_date, // Null
                    crawled_at: new Date().toISOString()
                };
                jobs.push(job);
            }
        });

        console.log(`Found ${jobs.length} jobs.`);

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
