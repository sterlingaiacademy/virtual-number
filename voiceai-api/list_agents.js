const axios = require('axios');
const apiKey = 'sk_c86898a6cdbb6520c0af7f74c198f9a1260111d1ad4d2967';

async function run() {
  try {
    const res = await axios.get('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': apiKey }
    });
    
    if (res.data.agents && res.data.agents.length > 0) {
      const agentId = res.data.agents[0].agent_id;
      console.log('Found agent:', agentId);
      const agentRes = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        headers: { 'xi-api-key': apiKey }
      });
      console.log(JSON.stringify(agentRes.data, null, 2));
    } else {
      console.log('No agents found');
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
