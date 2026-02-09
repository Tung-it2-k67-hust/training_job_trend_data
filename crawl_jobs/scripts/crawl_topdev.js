const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { saveRawHtml, normalizeText, saveSilverJsonl } = require('../lib/storage');

const SOURCE_NAME = 'topdev';
const BASE_URL = 'https://topdev.vn/it-jobs';

async function main() {
  console.log(`Starting ${SOURCE_NAME} crawler (Bronze/Silver, Puppeteer)...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const yearMonth = dateStr.slice(0, 7); // YYYY-MM

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Save full page HTML as bronze snapshot
    const html = await page.content();
    const rawPath = saveRawHtml(
      SOURCE_NAME,
      dateStr,
      'listing-page-1',
      Buffer.from(html, 'utf8'),
    );

    // Try extract from __NEXT_DATA__ first
    const { jobs, rawDumpPath } = await page.evaluate(() => {
      const result = {
        jobs: [],
        rawDumpPath: null,
      };

      const script = document.getElementById('__NEXT_DATA__');
      if (!script) {
        return result;
      }

      try {
        const nextData = JSON.parse(script.textContent || script.innerHTML || '{}');
        const props = nextData?.props?.pageProps || {};
        const jobList = props.jobs || props.initialState?.jobs?.jobList || [];

        if (Array.isArray(jobList)) {
          result.jobs = jobList.map((j, idx) => ({
            id: j.id || `topdev_${idx}`,
            title: j.title,
            company: j.company?.display_name || j.company_name || '',
            salary: j.salary?.value || 'Thỏa thuận',
            location: j.addresses?.full_address || j.location_display || '',
            url: j.job_url || '',
            crawled_at: new Date().toISOString(),
            raw: j,
          }));
        }
      } catch (e) {
        console.error('Error parsing __NEXT_DATA__', e);
      }

      return result;
    });

    let normalizedJobs = Array.isArray(jobs) ? jobs : [];

    // Fallback: basic DOM scraping if NEXT_DATA structure changed
    if (normalizedJobs.length === 0) {
      console.log('Fallback to DOM scraping for TopDev...');
      const domJobs = await page.evaluate(() => {
        const items = document.querySelectorAll('div[class*="JobItem"]');
        const results = [];
        items.forEach((item, idx) => {
          const titleEl = item.querySelector('h3 a');
          if (titleEl) {
            results.push({
              id: `topdev_dom_${idx}`,
              title: titleEl.innerText,
              company: item.querySelector('.company')?.innerText || '',
              salary: '',
              location: '',
              url: titleEl.href,
              crawled_at: new Date().toISOString(),
            });
          }
        });
        return results;
      });

      normalizedJobs = domJobs;
    }

    if (normalizedJobs.length === 0) {
      console.log('No jobs found via Puppeteer for TopDev.');
      return;
    }

    const jobsWithMeta = normalizedJobs.map((job) => ({
      ...job,
      title: normalizeText(job.title),
      company: normalizeText(job.company),
      location: normalizeText(job.location),
      _raw_path: rawPath,
      _source_url: job.url || BASE_URL,
      _fetched_at: job.crawled_at,
    }));

    const silverPath = saveSilverJsonl(SOURCE_NAME, yearMonth, jobsWithMeta);
    console.log(
      `Saved ${jobsWithMeta.length} jobs for TopDev to Silver: ${path.resolve(
        silverPath,
      )}`,
    );
  } catch (e) {
    console.error('Puppeteer Error (TopDev):', e);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  // Run directly: node crawl_jobs/scripts/crawl_topdev.js
  main().catch((err) => {
    console.error('Crawler failed:', err);
    process.exitCode = 1;
  });
}


