const axios = require('axios');
const cheerio = require('cheerio');
const { sendJobToKafka, connectProducer, disconnectProducer } = require('../utils/kafka');

const SOURCE_NAME = 'careerviet';
const BASE_URL = 'https://careerviet.vn';

async function run() {
    console.log(`Starting ${SOURCE_NAME} crawler (Kafka, Smart Freshness)...`);

    await connectProducer();

    try {
        console.log(`Fetching ${BASE_URL}/viec-lam/tat-ca-viec-lam-vi.html...`);
        const response = await axios.get(`${BASE_URL}/viec-lam/tat-ca-viec-lam-vi.html`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });

        const $ = cheerio.load(response.data);
        const jobs = [];

        $('.job-item').each((index, element) => {
            let title = $(element).find('.title a').text().trim();
            let company = $(element).find('.company').text().trim();
            let location = $(element).find('.location').text().trim();
            let salary = $(element).find('.salary').text().trim();
            let link = $(element).find('.title a').attr('href');

            // Fallback selectors
            if (!title) title = $(element).find('h2 a').text().trim();
            if (!company) company = $(element).find('.employer').text().trim();

            // Extract posted_date
            let posted_date = null;
            // The structure is usually: 
            // <li><em class="mdi mdi-calendar"></em><span>Cập nhật:</span><time>09-02-2026</time></li>
            const timeElement = $(element).find('.time time').last(); // Usually the second <time> is the update date
            const dateText = timeElement.text().trim();

            // Allow "Hôm nay", "Hôm qua" or "dd-mm-yyyy"
            if (dateText.match(/\d{2}-\d{2}-\d{4}/)) {
                const parts = dateText.split('-');
                posted_date = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to YYYY-MM-DD
            } else if (dateText.toLowerCase().includes('hôm nay')) {
                posted_date = new Date().toISOString().split('T')[0];
            } else if (dateText.toLowerCase().includes('hôm qua')) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                posted_date = yesterday.toISOString().split('T')[0];
            }

            if (title && link) {
                const job = {
                    title,
                    company: company || 'Hidden',
                    location: location || 'Vietnam',
                    salary: salary || 'Negotiable',
                    url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    source: SOURCE_NAME,
                    posted_date: posted_date, // YYYY-MM-DD or null
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
