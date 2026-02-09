const axios = require('axios');
const fs = require('fs');

async function fetch() {
    try {
        const response = await axios.get('https://careerviet.vn/viec-lam/tat-ca-viec-lam-vi.html', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        fs.writeFileSync('temp_careerviet.html', response.data);
        console.log('Saved temp_careerviet.html');
    } catch (e) {
        console.error(e);
    }
}
fetch();
