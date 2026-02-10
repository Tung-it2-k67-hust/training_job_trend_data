const { Client } = require('minio');

function parseEndpoint(endpoint) {
  if (!endpoint) {
    return { endPoint: null, port: null };
  }

  const trimmed = endpoint.replace(/^https?:\/\//i, '');
  const [host, portStr] = trimmed.split(':');
  const port = portStr ? Number(portStr) : 9000;

  return { endPoint: host, port };
}

function getMinioClient() {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ROOT_USER;
  const secretKey = process.env.MINIO_ROOT_PASSWORD;

  if (!endpoint || !accessKey || !secretKey) {
    return null;
  }

  const { endPoint, port } = parseEndpoint(endpoint);
  if (!endPoint || !port) {
    return null;
  }

  return new Client({
    endPoint,
    port,
    useSSL: false,
    accessKey,
    secretKey,
  });
}

async function ensureBucket(client, bucketName) {
  if (!client || !bucketName) {
    return false;
  }

  const exists = await client.bucketExists(bucketName).catch(() => false);
  if (!exists) {
    await client.makeBucket(bucketName, 'us-east-1');
  }

  return true;
}

module.exports = {
  getMinioClient,
  ensureBucket,
};
