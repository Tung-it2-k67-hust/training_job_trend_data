/**
 * storage.js - Bronze and Silver layer storage
 * According to Production Incremental Job Crawler architecture
 */

const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const { getMinioClient, ensureBucket } = require('./minio');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BRONZE_DIR = path.join(__dirname, '../data/bronze');
const SILVER_DIR = path.join(__dirname, '../data/silver');
const DEMO_DIR = path.join(__dirname, '../data/demo');
const MINIO_BRONZE_BUCKET = process.env.MINIO_BRONZE_BUCKET || 'job-bronze';

const minioClient = getMinioClient();

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * Generate timestamp for file naming
 */
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
           now.toTimeString().split(' ')[0].replace(/:/g, '-');
}

/**
 * Save to Bronze layer (raw JSON, all data including duplicates)
 * Used for audit/debug purposes
 * 
 * @param {Object} job - Job data object
 * @param {string} source - Source name
 */
async function saveToBronze(job, source) {
    try {
        const bronzeSourceDir = path.join(BRONZE_DIR, source);
        await ensureDir(bronzeSourceDir);

        const timestamp = getTimestamp();
        const filename = `${source}_${job.unique_key || 'no_key'}_${timestamp}.json`;
        const filepath = path.join(bronzeSourceDir, filename);
        const payload = JSON.stringify(job, null, 2);

        await fs.writeFile(filepath, payload, 'utf8');
        console.log(`[Bronze] Saved: ${filename}`);

        if (minioClient) {
            const dateStr = new Date().toISOString().split('T')[0];
            const objectName = `${source}/${dateStr}/${filename}`;

            try {
                await ensureBucket(minioClient, MINIO_BRONZE_BUCKET);
                await minioClient.putObject(
                    MINIO_BRONZE_BUCKET,
                    objectName,
                    Buffer.from(payload, 'utf8'),
                    payload.length,
                    { 'Content-Type': 'application/json' }
                );
                console.log(`[MinIO] Uploaded bronze: ${MINIO_BRONZE_BUCKET}/${objectName}`);
            } catch (error) {
                console.warn(`[MinIO] Upload failed:`, error.message);
            }
        }
    } catch (error) {
        console.error(`[Bronze] Error saving job:`, error.message);
    }
}

/**
 * Load existing unique keys from Silver layer
 * This is used to check for duplicates in memory (fast lookup)
 * 
 * @param {string} source - Source name
 * @returns {Set<string>} - Set of existing unique_keys
 */
async function loadExistingKeys(source) {
    const existingKeys = new Set();

    try {
        const silverSourceDir = path.join(SILVER_DIR, source);
        await ensureDir(silverSourceDir);

        const indexFile = path.join(silverSourceDir, 'index.json');
        
        try {
            const content = await fs.readFile(indexFile, 'utf8');
            const data = JSON.parse(content);
            
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.unique_key) {
                        existingKeys.add(item.unique_key);
                    }
                });
            }
            
            console.log(`[Silver] Loaded ${existingKeys.size} existing keys for ${source}`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn(`[Silver] Warning loading index for ${source}:`, error.message);
            }
        }
    } catch (error) {
        console.error(`[Silver] Error loading existing keys:`, error.message);
    }

    return existingKeys;
}

/**
 * Upsert to Silver layer (deduplicated, clean data)
 * Used for analytics & downstream pipeline
 * 
 * @param {Object} job - Job data object with unique_key
 * @param {string} source - Source name
 */
async function upsertToSilver(job, source) {
    try {
        const silverSourceDir = path.join(SILVER_DIR, source);
        await ensureDir(silverSourceDir);

        const indexFile = path.join(silverSourceDir, 'index.json');
        
        let existingJobs = [];
        try {
            const content = await fs.readFile(indexFile, 'utf8');
            existingJobs = JSON.parse(content);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn(`[Silver] Creating new index for ${source}`);
            }
        }

        // Find existing job by unique_key
        const existingIndex = existingJobs.findIndex(j => j.unique_key === job.unique_key);

        if (existingIndex >= 0) {
            // Update existing job
            existingJobs[existingIndex] = {
                ...existingJobs[existingIndex],
                ...job,
                updated_at: new Date().toISOString()
            };
            console.log(`[Silver] Updated: ${job.unique_key}`);
        } else {
            // Insert new job
            existingJobs.push({
                ...job,
                created_at: new Date().toISOString()
            });
            console.log(`[Silver] Inserted: ${job.unique_key}`);
        }

        await fs.writeFile(indexFile, JSON.stringify(existingJobs, null, 2), 'utf8');
    } catch (error) {
        console.error(`[Silver] Error upserting job:`, error.message);
    }
}

/**
 * Save to demo folder for local testing
 * 
 * @param {Array} jobs - Array of job objects
 * @param {string} source - Source name
 */
async function saveToDemo(jobs, source) {
    try {
        await ensureDir(DEMO_DIR);

        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `run_${source}_${timestamp}.json`;
        const filepath = path.join(DEMO_DIR, filename);

        await fs.writeFile(filepath, JSON.stringify(jobs, null, 2), 'utf8');
        console.log(`[Demo] Saved ${jobs.length} jobs to: ${filename}`);
    } catch (error) {
        console.error(`[Demo] Error saving:`, error.message);
    }
}

module.exports = {
    saveToBronze,
    loadExistingKeys,
    upsertToSilver,
    saveToDemo,
    ensureDir
};
