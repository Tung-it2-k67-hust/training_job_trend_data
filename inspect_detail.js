const axios = require('axios');
const cheerio = require('cheerio');

async function inspect(url, source) {
    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(response.data);

        console.log(`--- ${source} Analysis ---`);
        // Naive search for date-like text
        const bodyText = $('body').text();
        const dateMatches = bodyText.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
        console.log('Date patterns found:', dateMatches.slice(0, 5));

        // specific checks
        if (source === 'vieclam24h') {
            // Look for specific classes or text "Ngày cập nhật", "Hạn nộp"
            // Often in .job-detail-info or similar
            const updateText = $('*:contains("Cập nhật")').last().parent().text().trim();
            console.log('Update text context:', updateText.substring(0, 100));

            const postedText = $('*:contains("Ngày đăng")').last().parent().text().trim();
            console.log('Posted text context:', postedText.substring(0, 100));
        }

        if (source === 'studentjob') {
            const dateText = $('.job-tittle ul li').text();
            console.log('Header list text:', dateText);

            const metaText = $('.job-overview').text();
            console.log('Overview text:', metaText.substring(0, 200));
        }

    } catch (e) {
        console.error(e.message);
    }
}

const v24hUrl = 'https://vieclam24h.vn/xay-dung/nhan-vien-tu-van-giam-sat-xay-dung-va-tu-van-giam-sat-mep-c31p123id200752529.html'; // Example from debug
const sjUrl = 'https://studentjob.vn/viec-lam/guest-experience-maker-russian-speaking-butler-nhan-vien-cham-soc-khach-hang-tieng-nga-job819390'; // Example

async function run() {
    await inspect(v24hUrl, 'vieclam24h');
    await inspect(sjUrl, 'studentjob');
}

run();
