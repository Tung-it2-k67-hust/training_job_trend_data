const fs = require('fs');
const content = fs.readFileSync('temp_vieclam.html', 'utf-8');
const index = content.indexOf('Abbott');
if (index !== -1) {
    const start = Math.max(0, index - 1000);
    const end = Math.min(content.length, index + 1000); // Get more context
    fs.writeFileSync('snippet.txt', content.substring(start, end));
    console.log('Saved snippet.txt');
} else {
    console.log('Not found');
}
