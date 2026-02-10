/**
 * identity.js - Extract job_id from URL and generate unique_key
 * According to Production Incremental Job Crawler architecture
 */

/**
 * Extract job_id from URL based on source
 * @param {string} url - Job URL
 * @param {string} source - Source name (careerviet, topdev, studentjob, vieclam24h)
 * @returns {string|null} - Extracted job_id or null if not found
 */
function extractJobIdFromUrl(url, source) {
    if (!url) return null;

    const urlNoQuery = url.split('?')[0];
    const urlPath = urlNoQuery.split('#')[0];

    try {
        switch (source) {
            case 'careerviet': {
                // Examples:
                // https://careerviet.vn/viec-lam/engineer-12345.html
                // https://careerviet.vn/vi/nha-tuyen-dung/viec-lam/123456-job-title.html
                // https://careerviet.vn/vi/tim-viec-lam/medicine-category-supervisor.35C68560.html
                const alphaMatch = urlPath.match(/\.([A-Za-z0-9]+)\.html$/);
                if (alphaMatch) return alphaMatch[1];
                const numericMatch = urlPath.match(/\/(\d+)[-.]|\/viec-lam\/(\d+)/);
                return numericMatch ? (numericMatch[1] || numericMatch[2]) : null;
            }

            case 'topdev': {
                // Examples:
                // https://topdev.vn/jobs/12345
                // https://topdev.vn/jobs/backend-engineer-12345
                // https://api.topdev.vn/td/v2/jobs/12345
                // https://topdev.vn/detail-jobbs/slug-2089312
                const apiMatch = urlPath.match(/\/jobs\/(\d+)|job[\/:](\d+)/);
                if (apiMatch) return apiMatch[1] || apiMatch[2];
                const tailNumber = urlPath.match(/-(\d+)(?:\.html)?$/);
                return tailNumber ? tailNumber[1] : null;
            }

            case 'studentjob': {
                // Examples:
                // https://studentjob.vn/viec-lam/12345/developer
                // https://studentjob.vn/tuyen-dung-12345.html
                // https://studentjob.vn/viec-lam/ky-su-...-job819422
                const jobMatch = urlPath.match(/job(\d+)/i);
                if (jobMatch) return jobMatch[1];
                const match = urlPath.match(/\/viec-lam\/(\d+)|tuyen-dung[\/-](\d+)/);
                return match ? (match[1] || match[2]) : null;
            }

            case 'vieclam24h': {
                // Examples:
                // https://vieclam24h.vn/viec-lam/developer-12345.html
                // https://vieclam24h.vn/tim-viec-lam/12345/job-title
                // https://vieclam24h.vn/...id200752970.html
                const idMatch = urlPath.match(/id(\d+)\.html/i);
                if (idMatch) return idMatch[1];
                const match = urlPath.match(/\/(\d+)[-\/]|viec-lam\/[^\/]*?[-_](\d+)/);
                return match ? (match[1] || match[2]) : null;
            }

            default:
                console.warn(`Unknown source: ${source}`);
                return null;
        }
    } catch (error) {
        console.error(`Error extracting job_id from ${url}:`, error.message);
        return null;
    }
}

/**
 * Generate unique_key from source and job_id
 * @param {string} source - Source name
 * @param {string} jobId - Job ID extracted from URL
 * @returns {string} - Unique key in format "source_jobId"
 */
function generateUniqueKey(source, jobId) {
    if (!source || !jobId) {
        throw new Error('Both source and jobId are required to generate unique_key');
    }
    return `${source}_${jobId}`;
}

/**
 * Extract job_id and generate unique_key in one step
 * @param {string} url - Job URL
 * @param {string} source - Source name
 * @returns {Object} - { jobId, uniqueKey } or { jobId: null, uniqueKey: null }
 */
function getJobIdentity(url, source) {
    const jobId = extractJobIdFromUrl(url, source);
    
    if (!jobId) {
        return { jobId: null, uniqueKey: null };
    }

    const uniqueKey = generateUniqueKey(source, jobId);
    return { jobId, uniqueKey };
}

module.exports = {
    extractJobIdFromUrl,
    generateUniqueKey,
    getJobIdentity
};
