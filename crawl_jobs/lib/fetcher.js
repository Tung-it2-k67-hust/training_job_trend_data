const axios = require('axios');

/**
 * Fetch URL and return raw bytes (Buffer), with simple retry & backoff.
 *
 * @param {string} url
 * @param {object} options
 * @param {object} [options.headers]
 * @param {number} [options.timeout] - in ms
 * @param {number} [options.retries]
 * @param {number} [options.backoff] - in ms
 * @param {object} [options.httpsAgent]
 * @returns {Promise<Buffer>}
 */
async function fetchUrl(
  url,
  {
    headers = {},
    timeout = 10000,
    retries = 2,
    backoff = 1000,
    httpsAgent,
  } = {},
) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.get(url, {
        headers,
        timeout,
        responseType: 'arraybuffer',
        httpsAgent,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      return Buffer.from(response.data);
    } catch (err) {
      lastError = err;
      if (attempt === retries) {
        throw err;
      }
      const delay = backoff * (attempt + 1);
      // simple linear backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = {
  fetchUrl,
};


