const fs = require('fs');
const content = fs.readFileSync('temp_topdev_v3.html', 'utf-8');
// Search for common job indicators
const searchString = 'class="mb-4'; // Common tailwind class for items? or 'job'
let index = content.indexOf('job');
if (index === -1) index = content.indexOf('title');

if (index !== -1) {
    const start = Math.max(0, index - 500);
    const end = Math.min(content.length, index + 3000);
    fs.writeFileSync('snippet_td_v3.txt', content.substring(start, end));
    console.log('Saved snippet_td_v3.txt');
} else {
    console.log('Not found');
}
