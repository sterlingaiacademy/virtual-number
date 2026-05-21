const axios = require('axios');
const apiKey = 'sk_c86898a6cdbb6520c0af7f74c198f9a1260111d1ad4d2967';
const agentId = 'agent_7601kj7akhhsf3psk5gxkea2fpde'; // From the URL

async function run() {
  try {
    const res = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey }
    });
    const agent = res.data;
    console.log("Agent Name:", agent.name);
    
    // Let's check knowledge base
    const kb = agent.conversation_config?.agent?.prompt?.knowledge_base;
    console.log("Knowledge Base length:", kb ? kb.length : "undefined");
    if (kb && kb.length > 0) {
      console.log(JSON.stringify(kb, null, 2));
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
