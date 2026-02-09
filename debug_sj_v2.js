const axios = require('axios');
const fs = require('fs');

async function fetch() {
    try {
        const url = 'https://studentjob.vn/viec-lam';
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        fs.writeFileSync('temp_studentjob_v2.html', response.data);
        console.log('Saved temp_studentjob_v2.html');
    } catch (e) {
        console.error(e.message);
    }
}
fetch();
