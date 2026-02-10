const cheerio = require('cheerio');
const { sendJobToKafka, connectProducer, disconnectProducer } = require('../utils/kafka');
const { getJobIdentity } = require('../utils/identity');
const { loadExistingKeys, saveToBronze, upsertToSilver, saveToDemo } = require('../utils/storage');
const { fetchWithRetry, randomDelay } = require('../utils/fetcher');

const SOURCE_NAME = 'studentjob';
const BASE_URL = 'https://studentjob.vn';
const START_URL = 'https://studentjob.vn/viec-lam';
const DUP_LIMIT = 30;


async function getJobDetails(url) {
    try {
        const response = await fetchWithRetry(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        let date = null;

        // Find the list item with the calendar icon
        $('.box-summary li').each((i, el) => {
            if ($(el).find('.lnr-calendar-full').length > 0) {
                // The structure is .summary-content -> .content
                date = $(el).find('.summary-content .content').last().text().trim();
            }
        });

        return date;
    } catch (error) {
        console.error(`Error fetching details for ${url}: ${error.message}`);
        return null;
    }
}

async function run() {
    console.log(`\n=== Starting ${SOURCE_NAME} crawler with Early Stop Strategy ===\n`);

    // Load existing keys for duplicate detection
    const existingKeys = await loadExistingKeys(SOURCE_NAME);
    console.log(`[Init] Loaded ${existingKeys.size} existing keys\n`);

    await connectProducer();

    let duplicateCount = 0;
    const allJobs = [];

    try {
        console.log(`Fetching ${START_URL}...`);
        const response = await fetchWithRetry(START_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const items = $('.job-items').toArray();

        console.log(`Found ${items.length} items. Processing...\n`);

        for (const element of items) {
            let title = $(element).find('.job-tittle h2').text().trim();
            let company = $(element).find('.job-tittle ul li a').first().text().trim();
            let link = $(element).find('.job-tittle a').first().attr('href');

            if (!link) {
                link = $(element).find('.company-img a').first().attr('href');
            }

            let location = '';
            let salary = 'Negotiable';

            $(element).find('.job-tittle ul li').each((i, el) => {
                const text = $(el).text().trim();
                // Heuristic for location: not digits and not the company name
                if (!text.match(/\d/) && text !== company) {
                    location = text;
                }
            });

            if (title && link) {
                const fullLink = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                
                // Extract job_id and generate unique_key
                const { jobId, uniqueKey } = getJobIdentity(fullLink, SOURCE_NAME);

                if (!uniqueKey) {
                    console.warn(`⚠️  Could not extract job_id from: ${fullLink}`);
                    continue;
                }

                // Check if duplicate
                if (existingKeys.has(uniqueKey)) {
                    duplicateCount++;
                    console.log(`[Duplicate ${duplicateCount}/${DUP_LIMIT}] ${uniqueKey}`);

                    if (duplicateCount >= DUP_LIMIT) {
                        console.log(`\n✋ Reached ${DUP_LIMIT} consecutive duplicates. Stopping crawl.\n`);
                        break;
                    }
                    continue; // Skip to next job
                }

                // Reset duplicate count when we find new job
                duplicateCount = 0;

                // Fetch details for posted_date
                const posted_date = await getJobDetails(fullLink);

                const job = {
                    job_id: jobId,
                    unique_key: uniqueKey,
                    title,
                    company: company || 'Hidden',
                    location: location || 'Vietnam',
                    salary,
                    url: fullLink,
                    source: SOURCE_NAME,
                    posted_date: posted_date,
                    crawled_at: new Date().toISOString()
                };

                console.log(`✅ NEW: ${uniqueKey} - ${title}`);

                // Save to Bronze layer (raw)
                await saveToBronze(job, SOURCE_NAME);

                // Upsert to Silver layer (deduplicated)
                await upsertToSilver(job, SOURCE_NAME);

                // Send to Kafka
                await sendJobToKafka(job);

                // Add to existing keys
                existingKeys.add(uniqueKey);
                allJobs.push(job);

                // Respectful delay between detail fetches
                await new Promise(r => setTimeout(r, 2000));
            }

            // Check if we should stop
            if (duplicateCount >= DUP_LIMIT) {
                break;
            }
        }

        console.log(`\n=== Crawl Summary ===`);
        console.log(`Total new jobs: ${allJobs.length}`);
        console.log(`Final duplicate count: ${duplicateCount}`);

        // Save demo file
        if (allJobs.length > 0) {
            await saveToDemo(allJobs, SOURCE_NAME);
        }

        console.log(`✅ Completed ${SOURCE_NAME} crawl\n`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await disconnectProducer();
    }
}

run();
