/**
 * fetcher.js - HTTP request with retry and random delay
 * According to Production Incremental Job Crawler architecture
 */

const axios = require('axios');

let requestCount = 0;
const MAX_REQUESTS = Number.parseInt(process.env.MAX_REQUESTS || '0', 10);

/**
 * Random delay between min and max seconds
 * According to spec: 25-45 seconds
 * 
 * @param {number} minSeconds - Minimum delay in seconds (default: 25)
 * @param {number} maxSeconds - Maximum delay in seconds (default: 45)
 */
async function randomDelay(minSeconds = 25, maxSeconds = 45) {
    const delayMs = (minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000;
    console.log(`[Delay] Waiting ${(delayMs / 1000).toFixed(1)}s before next request...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Fetch URL with retry logic
 * 
 * @param {string} url - URL to fetch
 * @param {Object} options - Axios options (headers, params, etc.)
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<Object>} - Axios response
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8'
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        },
        timeout: options.timeout || 30000
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (MAX_REQUESTS > 0 && requestCount >= MAX_REQUESTS) {
                throw new Error(`Request limit reached (${MAX_REQUESTS})`);
            }
            requestCount += 1;
            console.log(`[Fetch] Attempt ${attempt}/${maxRetries}: ${url}`);
            const response = await axios.get(url, config);
            console.log(`[Fetch] Success: ${response.status} ${url}`);
            return response;
        } catch (error) {
            console.error(`[Fetch] Attempt ${attempt} failed:`, error.message);

            if (attempt === maxRetries) {
                throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            }

            // Exponential backoff
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            console.log(`[Fetch] Retrying in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
    }
}

/**
 * Fetch with automatic delay between requests
 * Use this for sequential crawling to avoid being blocked
 * 
 * @param {string} url - URL to fetch
 * @param {Object} options - Axios options
 * @param {boolean} skipDelay - Skip delay for first request (default: false)
 * @returns {Promise<Object>} - Axios response
 */
async function fetchWithDelay(url, options = {}, skipDelay = false) {
    if (!skipDelay) {
        await randomDelay();
    }
    return await fetchWithRetry(url, options);
}

module.exports = {
    randomDelay,
    fetchWithRetry,
    fetchWithDelay
};
