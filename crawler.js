const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs-lite');

// --- CONFIGURATION ---
const API_KEY = '5c60c4912616a3d214b6ed4504ce0d3c52bfe720a0d57642d7b626849cc88e47';
const BASE_URL = 'https://www.themuse.com/api/public/jobs';
const OUTPUT_DIR = 'G:\\My Drive\\big_data';
// const OUTPUT_DIR = 'E:\\drive_recover'; // Backup option
const MAX_PAGES_TO_TEST = 2; // Test with 2 pages first

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Parquet Schema definition
const jobSchema = new parquet.ParquetSchema({
    id: { type: 'INT64' },
    title: { type: 'UTF8' },
    company: { type: 'UTF8' },
    locations: { type: 'UTF8', repeated: true },
    levels: { type: 'UTF8', repeated: true },
    categories: { type: 'UTF8', repeated: true },
    publish_date: { type: 'UTF8' },
    url: { type: 'UTF8' }
});

async function fetchJobs(page) {
    const url = `${BASE_URL}?page=${page}&api_key=${API_KEY}`;
    console.log(`Fetching page ${page}... URL: ${url}`);

    try {
        const response = await fetch(url);

        // Log Rate Limits (Good practice)
        const remaining = response.headers.get('x-ratelimit-remaining');
        console.log(`Rate Limit Remaining: ${remaining}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        return null;
    }
}

function cleanData(rawData) {
    if (!rawData || !rawData.results) return [];

    const cleanedResults = rawData.results.map(job => ({
        id: BigInt(job.id), // Parquet INT64 needs BigInt
        title: job.name || 'N/A',
        company: job.company ? job.company.name : 'N/A',
        locations: job.locations ? job.locations.map(l => l.name) : [],
        levels: job.levels ? job.levels.map(l => l.name) : [],
        categories: job.categories ? job.categories.map(c => c.name) : [],
        publish_date: job.publication_date || '',
        url: job.refs ? job.refs.landing_page : ''
    }));

    return cleanedResults;
}

async function run() {
    console.log('--- Starting Crawler (Parquet Mode) ---');

    for (let page = 0; page < MAX_PAGES_TO_TEST; page++) {
        const data = await fetchJobs(page);

        if (data) {
            const cleanedJobs = cleanData(data);
            const filename = path.join(OUTPUT_DIR, `jobs_page_${page}.parquet`);

            try {
                const writer = await parquet.ParquetWriter.openFile(jobSchema, filename);
                for (const job of cleanedJobs) {
                    await writer.appendRow(job);
                }
                await writer.close();
                console.log(`Saved Parquet: ${filename}`);
                console.log(`Page ${page} saved with ${cleanedJobs.length} jobs.`);
            } catch (err) {
                console.error(`Error writing parquet for page ${page}:`, err);
            }
        } else {
            console.log('Stopping due to error.');
            break;
        }

        // Slight delay to be nice
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('--- Crawler Finished ---');
}

run();
