const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const SOURCE_NAME = 'careerviet';
const BASE_URL = 'https://careerviet.vn';

async function run() {
    console.log(`Starting ${SOURCE_NAME} debug crawl (Local File)...`);

    try {
        const response = await axios.get(`${BASE_URL}/viec-lam/tat-ca-viec-lam-vi.html`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: process.env.NODE_ENV === 'development' ? false : true })
        });

        const $ = cheerio.load(response.data);
        const jobs = [];

        $('.job-item').each((index, element) => {
            let title = $(element).find('.title a').text().trim();
            let company = $(element).find('.company').text().trim();
            let location = $(element).find('.location').text().trim();
            let salary = $(element).find('.salary').text().trim();
            let link = $(element).find('.title a').attr('href');

            let posted_date = null;
            const timeElement = $(element).find('.time time').last();
            const dateText = timeElement.text().trim();

            if (dateText.match(/\d{2}-\d{2}-\d{4}/)) {
                const parts = dateText.split('-');
                posted_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (dateText.toLowerCase().includes('hôm nay')) {
                posted_date = new Date().toISOString().split('T')[0];
            }

            if (title && link) {
                jobs.push({
                    title, company, location, salary,
                    url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    source: SOURCE_NAME,
                    posted_date,
                    crawled_at: new Date().toISOString()
                });
            }
        });

        const outputPath = path.join(__dirname, 'debug_careerviet.json');
        fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2));
        console.log(`✅ Saved ${jobs.length} jobs to ${outputPath}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}
run();
