const axios = require('axios');
const fs = require('fs');

async function fetch() {
    try {
        const url = 'https://topdev.vn/jobs/search'; // Try this one based on 404 page links
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
            },
            validateStatus: () => true
        });
        console.log(`Status: ${response.status}`);
        fs.writeFileSync('temp_topdev_v3.html', response.data);
        console.log('Saved temp_topdev_v3.html');
    } catch (e) {
        console.error(e.message);
    }
}
fetch();
