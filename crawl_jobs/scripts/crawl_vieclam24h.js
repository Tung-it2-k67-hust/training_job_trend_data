const cheerio = require('cheerio');
const path = require('path');

const { fetchUrl } = require('../lib/fetcher');
const { saveRawHtml, normalizeText, saveSilverJsonl } = require('../lib/storage');

const SOURCE_NAME = 'vieclam24h';
const BASE_URL = 'https://vieclam24h.vn';

async function fetchListingPage(page = 1) {
  const url = `${BASE_URL}/tim-kiem-viec-lam-nhanh?page=${page}`;
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

  // Container is a[data-job-id] wrapping the job card
  $('a[data-job-id]').each((index, element) => {
    try {
      const $el = $(element);
      const title = normalizeText($el.find('h3').first().text().trim());
      const company = normalizeText($el.find('h3').eq(1).text().trim());

      // Salary often near money icon
      const salary = normalizeText(
        $el.find('.svicon-money-circle').parent().text().trim(),
      );

      const location = normalizeText($el.find('.province-tooltip').text().trim());

      const link = $el.attr('href');
      const jobId = $el.attr('data-job-id') || `vl24_${index}`;

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
    console.log('No jobs found. Check selectors again.');
    return;
  }

  const silverPath = saveSilverJsonl(SOURCE_NAME, yearMonth, jobs);
  console.log(`Saved ${jobs.length} jobs to Silver: ${path.resolve(silverPath)}`);

  console.log('Sample Job:', JSON.stringify(jobs[0], null, 2));
}

if (require.main === module) {
  // Run directly: node crawl_jobs/scripts/crawl_vieclam24h.js
  main().catch((err) => {
    console.error('Crawler failed:', err);
    process.exitCode = 1;
  });
}


