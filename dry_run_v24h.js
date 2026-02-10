const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE_NAME = 'vieclam24h';
const BASE_URL = 'https://vieclam24h.vn';

async function getJobDetails(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        let datePosted = null;

        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const json = JSON.parse($(el).html());
                if (json['@type'] === 'JobPosting' && json.datePosted) {
                    datePosted = json.datePosted;
                }
            } catch (e) { }
        });

        return datePosted;
    } catch (error) {
        console.error(`Error fetching details for ${url}: ${error.message}`);
        return null;
    }
}

async function run() {
    console.log(`Starting ${SOURCE_NAME} dry run (No Kafka)...`);

    try {
        console.log(`Fetching search results...`);
        const response = await axios.get(`${BASE_URL}/tim-kiem-viec-lam-nhanh`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const items = $('.job-item-search').toArray().slice(0, 5); // Just 5 for demo

        console.log(`Found ${items.length} items to process.`);

        for (const element of items) {
            const title = $(element).find('.job-title').text().trim();
            const company = $(element).find('.company-name').text().trim();
            const relativeLink = $(element).find('a').attr('href');
            const link = relativeLink ? (relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`) : '';

            if (title && link) {
                console.log(`Processing: ${title} @ ${company}`);
                const posted_date = await getJobDetails(link);
                console.log(`   -> Posted Date: ${posted_date}`);

                // Respectful delay
                await new Promise(r => setTimeout(r, 500));
            }
        }

        console.log(`Dry run completed.`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

run();
