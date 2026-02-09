const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Save raw HTML bytes to bronze/<site>/<date>/<jobId>.html
 *
 * @param {string} site
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} jobId
 * @param {Buffer} htmlBuffer
 * @param {string} [root]
 * @returns {string} absolute file path
 */
function saveRawHtml(site, dateStr, jobId, htmlBuffer, root = 'bronze') {
  const dir = path.join(root, site, dateStr);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${jobId}.html`);
  fs.writeFileSync(filePath, htmlBuffer);
  return filePath;
}

/**
 * Normalize Unicode text using NFC, similar to Python's unicodedata.normalize('NFC', s)
 *
 * @param {string} s
 * @returns {string}
 */
function normalizeText(s) {
  if (!s) return '';
  if (typeof s !== 'string') {
    // best-effort conversion
    s = String(s);
  }
  if (s.normalize) {
    return s.normalize('NFC');
  }
  return s;
}

/**
 * Save normalized records as JSONL.GZ in silver/<site>/<year>/<month>/jobs_<ts>.jsonl.gz
 *
 * @param {string} site
 * @param {string} yearMonth - 'YYYY-MM'
 * @param {Array<object>} records
 * @param {string} [root]
 * @returns {string} absolute file path
 */
function saveSilverJsonl(site, yearMonth, records, root = 'silver') {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('saveSilverJsonl: records must be a non-empty array');
  }

  const [year, month] = yearMonth.split('-');
  const dir = path.join(root, site, year, month);
  fs.mkdirSync(dir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '');
  const filePath = path.join(dir, `jobs_${ts}.jsonl.gz`);

  const jsonl = records
    .map((r) => JSON.stringify(r, null, 0))
    .join('\n')
    .concat('\n');

  const gzipped = zlib.gzipSync(Buffer.from(jsonl, 'utf8'));
  fs.writeFileSync(filePath, gzipped);

  return filePath;
}

module.exports = {
  saveRawHtml,
  normalizeText,
  saveSilverJsonl,
};


