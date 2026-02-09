const cheerio = require('cheerio');
const path = require('path');

const { fetchUrl } = require('../lib/fetcher');
const { saveRawHtml, normalizeText, saveSilverJsonl } = require('../lib/storage');

const SOURCE_NAME = 'studentjob';
const BASE_URL = 'https://studentjob.vn';

async function fetchListingPage(page = 1) {
  const url = `${BASE_URL}/tuyen-dung?page=${page}`;
  console.log(`Fetching listing page: ${url}`);

  const htmlBytes = await fetchUrl(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  return htmlBytes;
}

function parseListing(htmlBytes) {
  let html;
  try {
    html = htmlBytes.toString('utf8');
  } catch (e) {
    html = htmlBytes.toString('latin1');
  }

  const $ = cheerio.load(html);
  const jobs = [];

  // Primary selectors
  $('.job-item').each((index, element) => {
    const $el = $(element);
    const title = normalizeText($el.find('.job-title').text().trim());
    const company = normalizeText($el.find('.company-title').text().trim());
    const location = normalizeText($el.find('.location').text().trim());
    const salary = normalizeText($el.find('.salary').text().trim());
    const link = $el.find('.job-title a').attr('href');

    if (title && link) {
      jobs.push({
        id: `sj_${index}`,
        title,
        company,
        location,
        salary,
        url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
        source: SOURCE_NAME,
        crawled_at: new Date().toISOString(),
      });
    }
  });

  // Fallback selectors if above fails
  if (jobs.length === 0) {
    console.log('Trying fallback selectors...');
    $('.recruitment-item').each((index, element) => {
      const $el = $(element);
      const title = normalizeText($el.find('.title').text().trim());
      const company = normalizeText($el.find('.company').text().trim());
      const link = $el.find('a').first().attr('href');

      if (title) {
        jobs.push({
          id: `sj_fb_${index}`,
          title,
          company,
          url: link && link.startsWith('http') ? link : link ? `${BASE_URL}${link}` : '',
          source: SOURCE_NAME,
          crawled_at: new Date().toISOString(),
        });
      }
    });
  }

  return jobs;
}

async function main() {
  console.log(`Starting ${SOURCE_NAME} crawler (Bronze/Silver)...`);

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const yearMonth = dateStr.slice(0, 7); // YYYY-MM

  const htmlBytes = await fetchListingPage(1);

  const jobIdForPage = 'listing-page-1';
  const rawPath = saveRawHtml(SOURCE_NAME, dateStr, jobIdForPage, htmlBytes);

  const jobs = parseListing(htmlBytes).map((job) => ({
    ...job,
    _raw_path: rawPath,
    _source_url: job.url,
    _fetched_at: job.crawled_at,
  }));

  if (jobs.length === 0) {
    console.log('No jobs found. Check selectors.');
    return;
  }

  const silverPath = saveSilverJsonl(SOURCE_NAME, yearMonth, jobs);
  console.log(`Saved ${jobs.length} jobs to Silver: ${path.resolve(silverPath)}`);
}

if (require.main === module) {
  // Run directly: node crawl_jobs/scripts/crawl_studentjob.js
  main().catch((err) => {
    console.error('Crawler failed:', err);
    process.exitCode = 1;
  });
}


