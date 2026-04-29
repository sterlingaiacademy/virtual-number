const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { storageService } = require('../../services/storageService');

// GET /api/client/calls
router.get('/', async (req, res, next) => {
  try {
    const { outcome, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.user.client_id];
    let extraWhere = '';
    if (outcome) {
      params.push(outcome);
      extraWhere = `AND outcome = $${params.length}`;
    }
    params.push(parseInt(limit), offset);

    const result = await db.query(
      `SELECT id, caller_number, virtual_number, started_at, ended_at,
              duration_secs, outcome, transferred_to, recording_gcs_path
       FROM calls
       WHERE client_id = $1 ${extraWhere}
       ORDER BY started_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const total = await db.query(
      `SELECT COUNT(*) FROM calls WHERE client_id = $1 ${outcome ? 'AND outcome = $2' : ''}`,
      outcome ? [req.user.client_id, outcome] : [req.user.client_id]
    );

    res.json({
      data: result.rows,
      pagination: { total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/client/calls/elevenlabs
router.get('/elevenlabs', async (req, res, next) => {
  try {
    const { elevenLabsService } = require('../../services/elevenLabsService');
    const result = await db.query(
      'SELECT elevenlabs_agent_id, elevenlabs_api_key FROM clients WHERE id = $1',
      [req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    
    const { elevenlabs_agent_id, elevenlabs_api_key } = result.rows[0];
    if (!elevenlabs_agent_id) {
      return res.json({ conversations: [] }); // No agent configured yet
    }

    const data = await elevenLabsService.getAgentConversations(elevenlabs_agent_id, elevenlabs_api_key);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/client/calls/elevenlabs/:id
router.get('/elevenlabs/:conversationId', async (req, res, next) => {
  try {
    const { elevenLabsService } = require('../../services/elevenLabsService');
    const result = await db.query(
      'SELECT elevenlabs_agent_id, elevenlabs_api_key FROM clients WHERE id = $1',
      [req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    
    // Using the getCallTranscript method from the service which calls /v1/convai/conversations/{conversationId}
    const { elevenlabs_api_key } = result.rows[0];
    const data = await elevenLabsService.getCallTranscript(req.params.conversationId, elevenlabs_api_key);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/client/calls/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM calls WHERE id = $1 AND client_id = $2',
      [req.params.id, req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Call not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/client/calls/:id/transcript
router.get('/:id/transcript', async (req, res, next) => {
  try {
    // Verify ownership first
    const callResult = await db.query(
      'SELECT id FROM calls WHERE id = $1 AND client_id = $2',
      [req.params.id, req.user.client_id]
    );
    if (callResult.rows.length === 0) return res.status(404).json({ error: 'Call not found' });

    const result = await db.query(
      'SELECT * FROM transcripts WHERE call_id = $1 ORDER BY sequence ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/client/calls/:id/recording
router.get('/:id/recording', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT recording_gcs_path FROM calls WHERE id = $1 AND client_id = $2',
      [req.params.id, req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Call not found' });
    if (!result.rows[0].recording_gcs_path) return res.status(404).json({ error: 'No recording available' });

    const url = await storageService.getSignedUrl(
      process.env.GCS_RECORDINGS_BUCKET,
      result.rows[0].recording_gcs_path,
      15
    );
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
