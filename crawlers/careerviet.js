const cheerio = require('cheerio');
const { sendJobToKafka, connectProducer, disconnectProducer } = require('../utils/kafka');
const { getJobIdentity } = require('../utils/identity');
const { loadExistingKeys, saveToBronze, upsertToSilver, saveToDemo } = require('../utils/storage');
const { fetchWithRetry, randomDelay } = require('../utils/fetcher');

const SOURCE_NAME = 'careerviet';
const BASE_URL = 'https://careerviet.vn';
const DUP_LIMIT = 30;

async function run() {
    console.log(`\n=== Starting ${SOURCE_NAME} crawler with Early Stop Strategy ===\n`);

    // Load existing keys for duplicate detection
    const existingKeys = await loadExistingKeys(SOURCE_NAME);
    console.log(`[Init] Loaded ${existingKeys.size} existing keys\n`);

    await connectProducer();

    let duplicateCount = 0;
    let page = 1;
    const maxPages = 10; // Safety limit
    const allJobs = [];

    try {
        while (page <= maxPages) {
            console.log(`\n--- Page ${page} ---`);
            
            const url = page === 1 
                ? `${BASE_URL}/viec-lam/tat-ca-viec-lam-vi.html`
                : `${BASE_URL}/viec-lam/tat-ca-viec-lam-vi.html?page=${page}`;

            // Fetch with retry and delay (skip delay for first page)
            const response = await fetchWithRetry(url, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                },
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            });

            const $ = cheerio.load(response.data);
            const jobElements = $('.job-item').toArray();

            if (jobElements.length === 0) {
                console.log('No more jobs found. Stopping.');
                break;
            }

            console.log(`Found ${jobElements.length} job elements`);

            for (const element of jobElements) {
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
                const timeElement = $(element).find('.time time').last();
                const dateText = timeElement.text().trim();

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
                    const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                    
                    // Extract job_id and generate unique_key
                    const { jobId, uniqueKey } = getJobIdentity(fullUrl, SOURCE_NAME);

                    if (!uniqueKey) {
                        console.warn(`⚠️  Could not extract job_id from: ${fullUrl}`);
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

                    const job = {
                        job_id: jobId,
                        unique_key: uniqueKey,
                        title,
                        company: company || 'Hidden',
                        location: location || 'Vietnam',
                        salary: salary || 'Negotiable',
                        url: fullUrl,
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
                }
            }

            // Check if we should stop
            if (duplicateCount >= DUP_LIMIT) {
                break;
            }

            page++;
            
            // Random delay before next page
            if (page <= maxPages) {
                await randomDelay();
            }
        }

        console.log(`\n=== Crawl Summary ===`);
        console.log(`Total new jobs: ${allJobs.length}`);
        console.log(`Final duplicate count: ${duplicateCount}`);
        console.log(`Pages crawled: ${page - 1}`);

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
