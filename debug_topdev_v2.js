const axios = require('axios');
const fs = require('fs');

async function fetch() {
    try {
        console.log('Fetching TopDev IT Jobs...');
        const response = await axios.get('https://topdev.vn/it-jobs', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://google.com'
            },
            validateStatus: () => true // Don't throw on 404
        });

        console.log(`Status: ${response.status}`);
        fs.writeFileSync('temp_topdev_v2.html', response.data);
        console.log('Saved temp_topdev_v2.html');

        if (response.data.includes('__NEXT_DATA__')) {
            console.log('Found __NEXT_DATA__!');
        } else {
            console.log('__NEXT_DATA__ not found.');
        }
    } catch (e) {
        console.error(e.message);
    }
}
fetch();
