const axios = require('axios');
axios.get('https://api.elevenlabs.io/v1/convai/agents', {
  headers: { 'xi-api-key': 'sk_c86898a6cdbb6520c0af7f74c198f9a1260111d1ad4d2967' }
}).then(res => {
  console.log(JSON.stringify(res.data, null, 2));
}).catch(err => {
  console.error(err.response?.data || err.message);
});
