const fs = require('fs');
const content = fs.readFileSync('temp_studentjob_v2.html', 'utf-8');
const index = content.indexOf('job-item');
if (index !== -1) {
    const start = Math.max(0, index - 500);
    const end = Math.min(content.length, index + 2000);
    fs.writeFileSync('snippet_sj_v2.txt', content.substring(start, end));
    console.log('Saved snippet_sj_v2.txt');
} else {
    console.log('Not found');
}
