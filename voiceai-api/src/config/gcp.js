const { Storage } = require('@google-cloud/storage');
const { PubSub } = require('@google-cloud/pubsub');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'sterling-ai-workshop';

const storage = new Storage({ projectId: PROJECT_ID });
const pubsub = new PubSub({ projectId: PROJECT_ID });
const secretManager = new SecretManagerServiceClient();

/**
 * Retrieve a secret value from GCP Secret Manager
 */
async function getSecret(secretName) {
  try {
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await secretManager.accessSecretVersion({ name });
    return version.payload.data.toString('utf8');
  } catch (err) {
    console.error(`Failed to get secret ${secretName}:`, err.message);
    return null;
  }
}

module.exports = { storage, pubsub, secretManager, getSecret, PROJECT_ID };
