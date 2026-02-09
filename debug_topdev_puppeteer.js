const puppeteer = require('puppeteer');
const fs = require('fs');

async function debug() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        console.log('Navigating to TopDev...');
        await page.goto('https://topdev.vn/jobs/search', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('Waiting for content to load...');
        // Wait for body to be fully loaded
        await page.waitForSelector('body');

        // Give it extra time for React hydration
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Save the rendered HTML
        const html = await page.content();
        fs.writeFileSync('topdev_rendered.html', html);
        console.log('Saved topdev_rendered.html');

        // Try to find any job-related elements
        const analysis = await page.evaluate(() => {
            const results = {
                allLinks: document.querySelectorAll('a').length,
                jobLinks: document.querySelectorAll('a[href*="/jobs/"]').length,
                h3Tags: document.querySelectorAll('h3').length,
                strongTags: document.querySelectorAll('strong').length,
                divs: document.querySelectorAll('div').length,
                sampleLinks: [],
                bodyText: document.body.textContent.substring(0, 500)
            };

            // Get first 10 job links
            const jobLinks = Array.from(document.querySelectorAll('a[href*="/jobs/"]')).slice(0, 10);
            jobLinks.forEach(link => {
                results.sampleLinks.push({
                    href: link.getAttribute('href'),
                    text: link.textContent.trim().substring(0, 100),
                    classes: link.className
                });
            });

            return results;
        });

        console.log('Analysis:', JSON.stringify(analysis, null, 2));
        fs.writeFileSync('topdev_analysis.json', JSON.stringify(analysis, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

debug();
