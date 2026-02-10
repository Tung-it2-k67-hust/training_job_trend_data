const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function debugTopDev() {
    console.log('--- TopDev Debug ---');
    const API_URL = 'https://api.topdev.vn/td/v2/jobs/search/v2';
    const params = {
        page: 1,
        'fields[job]': 'id,title,salary,slug,company,published,refreshed',
        'locale': 'en_US',
        'limit': 10
    };
    try {
        const response = await axios.get(API_URL, { params });
        const jobs = response.data.data.map(job => ({
            title: job.title,
            company: job.company?.name || job.company?.tagline || 'Unknown',
            url: `https://topdev.vn/jobs/${job.slug}`,
            posted_date: job.published?.date || job.refreshed?.date || null,
            source: 'topdev'
        }));
        fs.writeFileSync('debug_topdev.json', JSON.stringify(jobs, null, 2));
        console.log(`✅ TopDev: Saved ${jobs.length} jobs`);
    } catch (e) {
        console.error('TopDev Error:', e.message);
    }
}

async function debugVieclam24h() {
    console.log('--- Vieclam24h Debug ---');
    const BASE_URL = 'https://vieclam24h.vn';
    try {
        const response = await axios.get(`${BASE_URL}/tim-kiem-viec-lam-nhanh`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(response.data);
        const jobs = [];
        // Newer selector based on snippet analysis
        $('a[data-job-id]').each((i, el) => {
            const container = $(el);
            const title = container.find('h3').first().text().trim();
            const company = container.find('h3').last().text().trim();
            const link = container.attr('href');
            if (title && link) {
                jobs.push({
                    title, company,
                    url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    posted_date: null,
                    source: 'vieclam24h'
                });
            }
        });
        fs.writeFileSync('debug_vieclam24h.json', JSON.stringify(jobs.slice(0, 10), null, 2));
        console.log(`✅ Vieclam24h: Saved ${jobs.length > 10 ? 10 : jobs.length} jobs`);
    } catch (e) {
        console.error('Vieclam24h Error:', e.message);
    }
}

async function debugStudentJob() {
    console.log('--- StudentJob Debug ---');
    const BASE_URL = 'https://studentjob.vn';
    try {
        const response = await axios.get(`${BASE_URL}/viec-lam`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        const jobs = [];
        $('.job-items').each((i, el) => {
            const title = $(el).find('.job-tittle h2').text().trim();
            const company = $(el).find('.job-tittle ul li a').first().text().trim();
            const link = $(el).find('.job-tittle h2 a').attr('href') || $(el).find('a').first().attr('href');
            if (title && link) {
                jobs.push({
                    title, company,
                    url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    posted_date: null,
                    source: 'studentjob'
                });
            }
        });
        fs.writeFileSync('debug_studentjob.json', JSON.stringify(jobs.slice(0, 10), null, 2));
        console.log(`✅ StudentJob: Saved ${jobs.length > 10 ? 10 : jobs.length} jobs`);
    } catch (e) {
        console.error('StudentJob Error:', e.message);
    }
}

async function runAll() {
    await debugTopDev();
    await debugVieclam24h();
    await debugStudentJob();
    console.log('\nAll debug crawls complete.');
}

runAll();
