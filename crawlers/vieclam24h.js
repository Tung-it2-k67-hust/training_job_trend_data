const cheerio = require('cheerio');
const { sendJobToKafka, connectProducer, disconnectProducer } = require('../utils/kafka');
const { getJobIdentity } = require('../utils/identity');
const { loadExistingKeys, saveToBronze, upsertToSilver, saveToDemo } = require('../utils/storage');
const { fetchWithRetry, randomDelay } = require('../utils/fetcher');

const SOURCE_NAME = 'vieclam24h';
const BASE_URL = 'https://vieclam24h.vn';
const DUP_LIMIT = 30;

function looksLikeSalary(text) {
    if (!text) return false;
    return /(\d).*(tr|trieu|million|usd|vnd|\$)/i.test(text) || /negotiable/i.test(text);
}

function pickFallbackMeta($, element, existingSalary) {
    const spanTexts = $(element)
        .find('span')
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(Boolean);

    const salary = existingSalary || spanTexts.find(looksLikeSalary) || '';
    const location = spanTexts.find((text) => text !== salary && !/\d{2}\/\d{2}\/\d{4}/.test(text)) || '';

    return { salary, location };
}


async function getJobDetails(url) {
    try {
        const response = await fetchWithRetry(url, {
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
    console.log(`\n=== Starting ${SOURCE_NAME} crawler with Early Stop Strategy ===\n`);

    // Load existing keys for duplicate detection
    const existingKeys = await loadExistingKeys(SOURCE_NAME);
    console.log(`[Init] Loaded ${existingKeys.size} existing keys\n`);

    // Connect to Kafka first
    await connectProducer();

    let duplicateCount = 0;
    const allJobs = [];

    try {
        console.log(`Fetching ${BASE_URL}/tim-kiem-viec-lam-nhanh...`);
        const response = await fetchWithRetry(`${BASE_URL}/tim-kiem-viec-lam-nhanh`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        let items = $('.job-item-search').toArray();

        if (items.length === 0) {
            items = $('a[data-job-id]').toArray();
        }

        console.log(`Found ${items.length} items. Processing...\n`);

        for (const element of items) {
            let title = $(element).find('.job-title').text().trim();
            let company = $(element).find('.company-name').text().trim();
            let location = $(element).find('.location').text().trim();
            let salary = $(element).find('.salary').text().trim();

            if (!title) title = $(element).find('h3').first().text().trim();
            if (!company) company = $(element).find('h3').eq(1).text().trim();

            if (!location || !salary) {
                const fallback = pickFallbackMeta($, element, salary);
                salary = salary || fallback.salary;
                location = location || fallback.location;
            }

            const relativeLink = $(element).attr('href') || $(element).find('a').attr('href');
            const link = relativeLink ? (relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`) : '';

            if (title && link) {
                // Extract job_id and generate unique_key
                const { jobId, uniqueKey } = getJobIdentity(link, SOURCE_NAME);

                if (!uniqueKey) {
                    console.warn(`⚠️  Could not extract job_id from: ${link}`);
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

                // Fetch details specifically for the date
                const posted_date = await getJobDetails(link);

                const job = {
                    job_id: jobId,
                    unique_key: uniqueKey,
                    title,
                    company,
                    location,
                    salary,
                    url: link,
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
