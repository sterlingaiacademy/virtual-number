const axios = require('axios');

const elevenlabs = axios.create({
  baseURL: 'https://api.elevenlabs.io/v1',
  headers: {
    'xi-api-key': process.env.ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

elevenlabs.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.detail?.message || err.message;
    console.error('ElevenLabs API error:', message);
    return Promise.reject(new Error(`ElevenLabs: ${message}`));
  }
);

module.exports = { elevenlabs };
