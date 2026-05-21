const axios = require('axios');
const apiKey = 'sk_c86898a6cdbb6520c0af7f74c198f9a1260111d1ad4d2967';

async function run() {
  try {
    const res = await axios.get('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': apiKey }
    });
    console.log(JSON.stringify(res.data.agents.map(a => ({ id: a.agent_id, name: a.name })), null, 2));
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
