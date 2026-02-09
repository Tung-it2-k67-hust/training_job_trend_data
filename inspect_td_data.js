const fs = require('fs');
const content = fs.readFileSync('temp_topdev_v3.html', 'utf-8');

if (content.includes('__NEXT_DATA__')) {
    console.log('Found __NEXT_DATA__');
    const start = content.indexOf('__NEXT_DATA__');
    const end = content.indexOf('</script>', start);
    const jsonStr = content.substring(start, end).replace('__NEXT_DATA__" type="application/json">', '');
    // Need to handle the script tag properly. Usually: <script id="__NEXT_DATA__" type="application/json">{...}</script>
    // Let's use regex
    const match = content.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
    if (match && match[1]) {
        fs.writeFileSync('topdev_data.json', match[1]);
        console.log('Saved topdev_data.json');
    } else {
        console.log('Regex failed to extract JSON');
    }
} else {
    console.log('__NEXT_DATA__ NOT found');
    // Check for other hydration
    // Look for valid json-like structures
    const hydrationMatch = content.match(/self\.__next_f\.push/g);
    if (hydrationMatch) {
        console.log(`Found ${hydrationMatch.length} hydration chunks (next_f)`);
    }
}
