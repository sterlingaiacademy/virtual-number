const elevenlabs = require('../config/elevenlabs');

const elevenLabsService = {
  /**
   * Create a new conversational AI agent in ElevenLabs
   */
  async createAgent({ name, voiceId, systemPrompt, language = 'en', firstMessage }) {
    const res = await elevenlabs.post('/convai/agents/create', {
      name,
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
            llm: 'gemini-1.5-flash',
            temperature: 0.7,
          },
          first_message: firstMessage || `Hello! How can I help you today?`,
          language,
        },
        tts: {
          voice_id: voiceId,
          model_id: 'eleven_turbo_v2_5',
        },
        turn: {
          turn_timeout: 7,
          silence_end_call_timeout: 10,
        },
      },
      platform_settings: {
        auth: { enable_auth: false },
      },
    });
    return res.data;
  },

  /**
   * Update an existing agent's config
   */
  async updateAgent(agentId, { name, voiceId, systemPrompt, language, firstMessage }) {
    const body = {};
    if (name) body.name = name;
    const convConfig = {};
    if (systemPrompt || voiceId || language || firstMessage) {
      convConfig.agent = {};
      if (systemPrompt) convConfig.agent.prompt = { prompt: systemPrompt };
      if (firstMessage) convConfig.agent.first_message = firstMessage;
      if (language) convConfig.agent.language = language;
      if (voiceId) convConfig.tts = { voice_id: voiceId };
    }
    if (Object.keys(convConfig).length) body.conversation_config = convConfig;

    const res = await elevenlabs.patch(`/convai/agents/${agentId}`, body);
    return res.data;
  },

  /**
   * Delete an agent
   */
  async deleteAgent(agentId) {
    await elevenlabs.delete(`/convai/agents/${agentId}`);
  },

  /**
   * Get agent details
   */
  async getAgent(agentId) {
    const res = await elevenlabs.get(`/convai/agents/${agentId}`);
    return res.data;
  },

  /**
   * List all agents
   */
  async listAgents() {
    const res = await elevenlabs.get('/convai/agents');
    return res.data.agents || [];
  },

  /**
   * List available voices
   */
  async listVoices() {
    const res = await elevenlabs.get('/voices');
    return res.data.voices || [];
  },

  /**
   * Create a knowledge base document from text
   */
  async createKnowledgeBaseDoc(agentId, { name, text }) {
    const res = await elevenlabs.post(`/convai/agents/${agentId}/knowledge-base`, {
      type: 'text',
      name,
      text,
    });
    return res.data;
  },

  /**
   * Upload a file to the knowledge base
   */
  async uploadKnowledgeBaseFile(agentId, fileBuffer, fileName, mimeType) {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fileBuffer, { filename: fileName, contentType: mimeType });
    form.append('name', fileName);

    const res = await elevenlabs.post(`/convai/agents/${agentId}/knowledge-base`, form, {
      headers: form.getHeaders(),
    });
    return res.data;
  },

  /**
   * Delete a knowledge base document
   */
  async deleteKnowledgeBaseDoc(agentId, docId) {
    await elevenlabs.delete(`/convai/agents/${agentId}/knowledge-base/${docId}`);
  },

  /**
   * Get call transcript from ElevenLabs
   */
  async getCallTranscript(conversationId, customApiKey = null) {
    const config = {};
    if (customApiKey) {
      config.headers = { 'xi-api-key': customApiKey };
    }
    const res = await elevenlabs.get(`/convai/conversations/${conversationId}`, config);
    return res.data;
  },

  /**
   * Get a list of conversations for a specific agent directly from ElevenLabs
   */
  async getAgentConversations(agentId, customApiKey = null) {
    const config = {};
    if (customApiKey) {
      config.headers = { 'xi-api-key': customApiKey };
    }
    const res = await elevenlabs.get(`/convai/conversations?agent_id=${agentId}`, config);
    return res.data;
  },
};

module.exports = { elevenLabsService };
