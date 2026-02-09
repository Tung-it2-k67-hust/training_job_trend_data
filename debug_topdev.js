const axios = require('axios');
const fs = require('fs');

async function fetch() {
    try {
        const response = await axios.get('https://topdev.vn/it-jobs', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        fs.writeFileSync('temp_topdev.html', response.data);
        console.log('Saved temp_topdev.html');
        // Check for NEXT_DATA
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
