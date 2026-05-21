const axios = require('axios');

async function run() {
  try {
    const loginRes = await axios.post('https://voiceai-api-niiorsa2ra-el.a.run.app/api/auth/login', {
      email: 'admin@greenworld.com',
      password: 'GreenWorld@123'
    });
    const token = loginRes.data.token;
    console.log("Logged in!");

    const kbRes = await axios.get('https://voiceai-api-niiorsa2ra-el.a.run.app/api/client/knowledge', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Docs:", kbRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
