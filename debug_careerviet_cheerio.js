const cheerio = require('cheerio');
const fs = require('fs');

const content = fs.readFileSync('temp_careerviet.html', 'utf-8');
const $ = cheerio.load(content);

console.log('Job items found:', $('.job-item').length);

if ($('.job-item').length > 0) {
    const firstJob = $('.job-item').first();
    console.log('Structure:');
    console.log(firstJob.html().substring(0, 500)); // Print first 500 chars of inner HTML

    console.log('--- Analysis ---');
    console.log('Title:', firstJob.find('.title').text().trim() || firstJob.find('a.job_link').text().trim());
    console.log('Company:', firstJob.find('.company').text().trim() || firstJob.find('.company-name').text().trim());
    console.log('Salary:', firstJob.find('.salary').text().trim());
    console.log('Link:', firstJob.find('a').attr('href'));
} else {
    console.log('No .job-item found. Trying to list common classes...');
    // List some classes from body to see what's there
    console.log($('body').html().substring(0, 500));
}
