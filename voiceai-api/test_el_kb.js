require('dotenv').config();
const { elevenlabs } = require('./src/config/elevenlabs');
const db = require('./src/config/database');

async function test() {
  try {
    const agentId = 'dummy_agent_id';
    console.log('Testing with agent:', agentId);

    try {
      const res = await elevenlabs.post(`/convai/agents/${agentId}/knowledge-base`, {
        type: 'text',
        name: 'testdoc',
        text: 'hello this is test text'
      });
      console.log('Success:', res.data);
    } catch (err) {
      console.error('API Error:', err.response?.status, err.response?.data || err.message);
    }
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

test();
