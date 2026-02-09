const cheerio = require('cheerio');
const https = require('https');
const path = require('path');

const { fetchUrl } = require('../lib/fetcher');
const { saveRawHtml, normalizeText, saveSilverJsonl } = require('../lib/storage');

const SOURCE_NAME = 'careerviet';
const BASE_URL = 'https://careerviet.vn';
const START_URL = 'https://careerviet.vn/viec-lam/tat-ca-viec-lam-vi.html';

// Ignore SSL errors (site-specific quirk from original script)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function fetchListingPage(page = 1) {
  const url =
    page === 1
      ? START_URL
      : `https://careerviet.vn/viec-lam/tat-ca-viec-lam-trang-${page}-vi.html`;

  console.log(`Fetching listing page: ${url}`);

  const htmlBytes = await fetchUrl(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
    httpsAgent,
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

  $('.job-item').each((index, element) => {
    try {
      const $el = $(element);
      const titleEl = $el.find('.title a, a.job_link').first();
      const title = normalizeText(titleEl.text().trim());
      const link = titleEl.attr('href');

      const company = normalizeText($el.find('.company, .company-name').text().trim());
      const salary = normalizeText($el.find('.salary').text().trim());
      const location = normalizeText($el.find('.location').text().trim());

      const jobId =
        $el.attr('id') || link?.split('-').pop()?.replace('.html', '') || `cv_${index}`;

      if (title && link) {
        jobs.push({
          id: jobId,
          title,
          company,
          location: location || 'Unknown',
          salary: salary || 'Thỏa thuận',
          url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          source: SOURCE_NAME,
          crawled_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error parsing job item:', err.message);
    }
  });

  return jobs;
}

async function main() {
  console.log(`Starting ${SOURCE_NAME} crawler (Bronze/Silver)...`);

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const yearMonth = dateStr.slice(0, 7); // YYYY-MM

  // For now, crawl only first page as in original script
  const htmlBytes = await fetchListingPage(1);

  // Save listing HTML as bronze snapshot (page-level)
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
  // Run directly: node crawl_jobs/scripts/crawl_careerviet.js
  main().catch((err) => {
    console.error('Crawler failed:', err);
    process.exitCode = 1;
  });
}


