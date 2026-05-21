require('dotenv').config();
const { storageService } = require('./src/services/storageService');

async function test() {
  try {
    console.log("Testing uploadBuffer...");
    await storageService.uploadBuffer(
      process.env.GCS_BUCKET || 'voiceai-recordings',
      'test.txt',
      Buffer.from('hello world', 'utf-8'),
      'text/plain'
    );
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err.message);
    console.error(err.stack);
  }
}

test();
