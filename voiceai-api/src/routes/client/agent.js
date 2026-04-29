const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { elevenLabsService } = require('../../services/elevenLabsService');

// GET /api/client/agent
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM ai_agents WHERE client_id = $1',
      [req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No agent configured yet' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/client/agent
router.put('/', async (req, res, next) => {
  try {
    const {
      agent_name, language, first_message, system_prompt,
      voice_id, transfer_number_1, transfer_number_2
    } = req.body;
    const clientId = req.user.client_id;

    const existing = await db.query('SELECT * FROM ai_agents WHERE client_id = $1', [clientId]);

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'No agent exists for this client. Contact admin to create one.' });
    }

    const agent = existing.rows[0];

    // Sync changes to ElevenLabs
    try {
      await elevenLabsService.updateAgent(agent.elevenlabs_agent_id, {
        agent_name,
        first_message,
        system_prompt,
        voice_id,
        language,
      });
    } catch (e) {
      console.warn('ElevenLabs sync failed (non-fatal):', e.message);
    }

    const result = await db.query(
      `UPDATE ai_agents SET
        agent_name = COALESCE($1, agent_name),
        language = COALESCE($2, language),
        first_message = COALESCE($3, first_message),
        system_prompt = COALESCE($4, system_prompt),
        voice_id = COALESCE($5, voice_id),
        transfer_number_1 = COALESCE($6, transfer_number_1),
        transfer_number_2 = COALESCE($7, transfer_number_2),
        updated_at = NOW()
       WHERE client_id = $8 RETURNING *`,
      [agent_name, language, first_message, system_prompt, voice_id, transfer_number_1, transfer_number_2, clientId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/client/agent/test-call
router.post('/test-call', async (req, res, next) => {
  try {
    // Placeholder: return agent URL for a test conversation
    const result = await db.query(
      'SELECT elevenlabs_agent_id FROM ai_agents WHERE client_id = $1',
      [req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No agent configured' });

    const agentId = result.rows[0].elevenlabs_agent_id;
    // Get a signed URL from ElevenLabs for web-based test call
    const signedUrl = await elevenLabsService.getSignedConversationUrl(agentId);
    res.json({ signed_url: signedUrl, agent_id: agentId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
