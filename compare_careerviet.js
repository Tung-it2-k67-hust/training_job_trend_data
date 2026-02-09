const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Sử dụng path.join và __dirname để đảm bảo code chạy được trên mọi máy
const OLD_DATA_FILE = path.join(__dirname, 'data/careerviet/jobs_1770628294507.json');
const SOURCE_NAME = 'careerviet';
const BASE_URL = 'https://careerviet.vn';

async function compareData() {
    console.log(`Comparing current data with ${OLD_DATA_FILE}...`);

    // 1. Load old data
    const oldData = JSON.parse(fs.readFileSync(OLD_DATA_FILE, 'utf-8'));
    const oldUrls = new Set(oldData.map(j => j.url));
    const oldTitles = new Set(oldData.map(j => j.title));

    // 2. Fetch current data
    const currentJobs = [];
    try {
        const response = await axios.get(`${BASE_URL}/viec-lam/tat-ca-viec-lam-vi.html`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            httpsAgent: new (require('https').Agent)({
                // CẢNH BÁO: Chỉ dùng rejectUnauthorized: false khi debug local. 
                // Nên xóa bỏ hoặc chuyển thành true khi chạy thực tế.
                rejectUnauthorized: false
            })
        });

        const $ = cheerio.load(response.data);
        $('.job-item').each((index, element) => {
            let title = $(element).find('.title a').text().trim();
            let link = $(element).find('.title a').attr('href');
            if (title && link) {
                currentJobs.push({
                    title,
                    url: link.startsWith('http') ? link : `${BASE_URL}${link}`
                });
            }
        });
    } catch (error) {
        console.error('Fetch error:', error.message);
        return;
    }

    // 3. Compare
    let newJobs = [];
    let duplicateJobs = [];

    for (const job of currentJobs) {
        if (oldUrls.has(job.url)) {
            duplicateJobs.push(job);
        } else {
            newJobs.push(job);
        }
    }

    console.log('--- Comparison Results ---');
    console.log(`Old jobs count: ${oldData.length}`);
    console.log(`Current jobs found: ${currentJobs.length}`);
    console.log(`Duplicate jobs: ${duplicateJobs.length}`);
    console.log(`New jobs: ${newJobs.length}`);

    if (newJobs.length > 0) {
        console.log('\nSample New Jobs:');
        newJobs.slice(0, 5).forEach(j => console.log(`- ${j.title} (${j.url})`));
    }
}

compareData();
