const fs = require('fs');
const content = fs.readFileSync('temp_topdev_v3.html', 'utf-8');

const regex = /self\.__next_f\.push\(\[1,"(.+?)"\]\)/g;
let match;
const chunks = [];
while ((match = regex.exec(content)) !== null) {
    // These chunks are often JSON-like strings or parts of them.
    // We clean them up a bit for inspection
    let raw = match[1];
    // unescape quotes
    raw = raw.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    chunks.push(raw);
}

fs.writeFileSync('topdev_chunks.txt', chunks.join('\n----------------------------------------\n'));
console.log(`Saved ${chunks.length} chunks to topdev_chunks.txt`);

// Try to find "jobs" or "title" in chunks
const jobChunks = chunks.filter(c => c.includes('jobs') || c.includes('title'));
console.log(`Found ${jobChunks.length} chunks containing 'jobs' or 'title'`);
fs.writeFileSync('topdev_job_chunks.txt', jobChunks.join('\n----------------------------------------\n'));
