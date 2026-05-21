const axios = require('axios');

async function test() {
  try {
    const agentId = 'agent_1201kkdnn526eebs4fwb822fzgs3'; // Level 4
    
    const res = await axios.post(`https://api.elevenlabs.io/v1/convai/agents/${agentId}/add-to-knowledge-base`, {
      name: 'Test URL',
      url: 'https://example.com'
    }, {
      headers: {
        'xi-api-key': 'sk_c86898a6cdbb6520c0af7f74c198f9a1260111d1ad4d2967'
      }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('API Error:', err.response?.status, err.response?.data || err.message);
  }
}

test();
