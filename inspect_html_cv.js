const fs = require('fs');
const content = fs.readFileSync('temp_careerviet.html', 'utf-8');
const searchString = 'class="job-item';
const index = content.indexOf(searchString);

if (index !== -1) {
    console.log(`Found '${searchString}' at index ${index}`);
    const start = Math.max(0, index - 500);
    const end = Math.min(content.length, index + 3000);
    fs.writeFileSync('snippet_cv.txt', content.substring(start, end));
    console.log('Saved snippet_cv.txt');
} else {
    console.log('Not found');
    // Try alternatives
    const altSearch = 'class="title';
    const altIndex = content.indexOf(altSearch);
    if (altIndex !== -1) {
        console.log(`Found '${altSearch}' at index ${altIndex}`);
        const start = Math.max(0, altIndex - 500);
        const end = Math.min(content.length, altIndex + 3000);
        fs.writeFileSync('snippet_cv.txt', content.substring(start, end));
    } else {
        console.log('Really not found');
    }
}
