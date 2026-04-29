const { getStorage } = require('../config/gcp');
const path = require('path');

const BUCKET = process.env.GCS_BUCKET || 'voiceai-recordings';

const storageService = {
  /**
   * Upload a file buffer to GCS
   * Returns the GCS URI (gs://bucket/path)
   */
  async uploadFile(fileBuffer, destPath, mimeType = 'application/octet-stream') {
    const storage = getStorage();
    const bucket = storage.bucket(BUCKET);
    const file = bucket.file(destPath);

    await file.save(fileBuffer, {
      metadata: { contentType: mimeType },
      resumable: false,
    });

    return `gs://${BUCKET}/${destPath}`;
  },

  /**
   * Upload a local file stream to GCS
   */
  async uploadStream(readStream, destPath, mimeType = 'application/octet-stream') {
    const storage = getStorage();
    const bucket = storage.bucket(BUCKET);
    const file = bucket.file(destPath);

    return new Promise((resolve, reject) => {
      const writeStream = file.createWriteStream({
        metadata: { contentType: mimeType },
        resumable: true,
      });
      readStream.pipe(writeStream)
        .on('error', reject)
        .on('finish', () => resolve(`gs://${BUCKET}/${destPath}`));
    });
  },

  /**
   * Generate a signed URL for temporary access (e.g. recording download)
   */
  async getSignedUrl(gcsUri, expiresInMinutes = 60) {
    const storage = getStorage();
    // Parse gs:// URI
    const withoutScheme = gcsUri.replace('gs://', '');
    const slashIdx = withoutScheme.indexOf('/');
    const bucketName = withoutScheme.slice(0, slashIdx);
    const filePath = withoutScheme.slice(slashIdx + 1);

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  },

  /**
   * Delete a file from GCS
   */
  async deleteFile(gcsUri) {
    const storage = getStorage();
    const withoutScheme = gcsUri.replace('gs://', '');
    const slashIdx = withoutScheme.indexOf('/');
    const bucketName = withoutScheme.slice(0, slashIdx);
    const filePath = withoutScheme.slice(slashIdx + 1);

    await storage.bucket(bucketName).file(filePath).delete({ ignoreNotFound: true });
  },

  /**
   * Build a knowledge base file path for a client
   */
  knowledgeBasePath(clientId, fileName) {
    const sanitized = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    return `knowledge/${clientId}/${Date.now()}_${sanitized}`;
  },

  /**
   * Build a recording path for a call
   */
  recordingPath(clientId, callId, ext = 'wav') {
    return `recordings/${clientId}/${callId}.${ext}`;
  },
};

module.exports = { storageService };
