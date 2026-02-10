const axios = require('axios');
const fs = require('fs');

async function savePage(url, filename) {
    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        fs.writeFileSync(filename, response.data);
        console.log(`Saved to ${filename}`);
    } catch (e) {
        console.error(`Error fetching ${url}: ${e.message}`);
    }
}

const v24hUrl = 'https://vieclam24h.vn/xay-dung/nhan-vien-tu-van-giam-sat-xay-dung-va-tu-van-giam-sat-mep-c31p123id200752529.html';
const sjUrl = 'https://studentjob.vn/viec-lam/guest-experience-maker-russian-speaking-butler-nhan-vien-cham-soc-khach-hang-tieng-nga-job819390';

savePage(v24hUrl, 'inspect_v24h.html');
savePage(sjUrl, 'inspect_sj.html');
