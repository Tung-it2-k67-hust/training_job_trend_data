const axios = require('axios');
const { sendJobToKafka, connectProducer, disconnectProducer } = require('../utils/kafka');

const SOURCE_NAME = 'topdev';
const BASE_URL = 'https://topdev.vn';
const API_URL = 'https://api.topdev.vn/td/v2/jobs/search/v2';

async function fetchJobsFromAPI(page = 1) {
    const params = {
        page: page,
        'fields[job]': 'id,title,salary,slug,company,expires,extra_skills,skills_str,skills_arr,skills_ids,job_types_str,job_levels_str,job_levels_arr,job_levels_ids,addresses,status_display,detail_url,job_url,salary,published,refreshed,applied,candidate,requirements_arr,packages,benefits,content,features,contract_types_ids,is_free,is_basic,is_basic_plus,is_distinction,level,contract_types_str,experiences_str,benefits_v2,services,job_category_id',
        'fields[company]': 'tagline,addresses,skills_arr,industries_arr,industries_ids,industries_str,image_cover,image_galleries,num_job_openings,company_size,nationalities_str,skills_str,skills_ids,benefits,num_employees',
        'locale': 'en_US',
        'limit': 50 // Increase limit as per plan
    };

    const headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
        'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        console.log(`Fetching page ${page} from TopDev API...`);
        const response = await axios.get(API_URL, {
            params,
            headers,
            timeout: 30000
        });

        if (response.data && response.data.data) {
            const jobs = response.data.data.map(job => {
                const companyName = job.company?.name || job.company?.tagline || 'Unknown';

                let location = 'Vietnam';
                if (job.addresses && Array.isArray(job.addresses) && job.addresses.length > 0) {
                    location = job.addresses.join(', ');
                } else if (job.company?.addresses && Array.isArray(job.company.addresses) && job.company.addresses.length > 0) {
                    location = job.company.addresses.join(', ');
                }

                let salary = 'Negotiable';
                if (job.salary) {
                    if (typeof job.salary === 'object') {
                        if (job.salary.value) {
                            salary = job.salary.value;
                        } else if (job.salary.is_negotiable === '1') {
                            salary = 'Negotiable';
                        } else if (job.salary.min_filter && job.salary.max_filter) {
                            const min = (job.salary.min_filter / 1000000).toFixed(0);
                            const max = (job.salary.max_filter / 1000000).toFixed(0);
                            salary = `${min} - ${max} million VND`;
                        }
                    } else {
                        salary = String(job.salary);
                    }
                }

                const jobUrl = job.detail_url || job.job_url || `${BASE_URL}/jobs/${job.slug}`;

                // Extract posted_date from published or refreshed
                let posted_date = null;
                if (job.published && job.published.date) {
                    posted_date = job.published.date; // Usually YYYY-MM-DD
                } else if (job.refreshed && job.refreshed.date) {
                    posted_date = job.refreshed.date;
                }

                return {
                    title: job.title || 'No title',
                    company: companyName,
                    location: location,
                    salary: salary,
                    url: jobUrl.startsWith('http') ? jobUrl : `${BASE_URL}${jobUrl}`,
                    skills: job.skills_str || job.skills_arr?.join(', ') || '',
                    level: job.job_levels_str || job.level || '',
                    job_type: job.job_types_str || '',
                    source: SOURCE_NAME,
                    posted_date: posted_date,
                    crawled_at: new Date().toISOString()
                };
            });

            console.log(`Found ${jobs.length} jobs on page ${page}`);
            return {
                jobs,
                hasMore: jobs.length > 0 && response.data.data.length >= 20 // Check if we got a full page (or close to it)
            };
        }

        return { jobs: [], hasMore: false };
    } catch (error) {
        console.error(`Error fetching page ${page}:`, error.message);
        return { jobs: [], hasMore: false };
    }
}

async function run() {
    console.log(`Starting ${SOURCE_NAME} crawler (API-based, Kafka, Smart Freshness)...`);

    await connectProducer();

    let currentPage = 1;
    const maxPages = 5; // Increased max pages
    let hasMore = true;

    try {
        while (hasMore && currentPage <= maxPages) {
            const result = await fetchJobsFromAPI(currentPage);

            if (result.jobs.length > 0) {
                for (const job of result.jobs) {
                    await sendJobToKafka(job);
                }
                console.log(`✅ Sent ${result.jobs.length} jobs from page ${currentPage} to Kafka.`);

                hasMore = result.hasMore;
                currentPage++;

                if (hasMore && currentPage <= maxPages) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                hasMore = false;
            }
        }
    } catch (error) {
        console.error('Error in crawl loop:', error.message);
    } finally {
        await disconnectProducer();
    }
}

run();
