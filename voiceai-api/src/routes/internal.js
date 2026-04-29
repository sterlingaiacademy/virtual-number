const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { callService } = require('../services/callService');

// Internal secret check middleware (inline to avoid circular dep)
function requireInternal(req, res, next) {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: 'Invalid internal secret' });
  }
  next();
}

// All internal routes require the shared internal secret
router.use(requireInternal);


/**
 * GET /api/internal/agent-config?phone=+919876543210
 * Python agent calls this on incoming call to get agent config
 */
router.get('/agent-config', async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'phone query param required' });

    const config = await callService.getAgentConfig(phone);
    if (!config) return res.status(404).json({ error: 'No agent configured for this number' });
    if (config.client_status !== 'active') {
      return res.status(403).json({ error: 'Client account is not active' });
    }

    res.json(config);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/internal/calls/start
 * Python agent calls this when a call begins
 */
router.post('/calls/start', async (req, res, next) => {
  try {
    const { phone_number, caller_number, room_name, conversation_id } = req.body;
    if (!phone_number || !room_name) {
      return res.status(400).json({ error: 'phone_number and room_name are required' });
    }

    const call = await callService.startCall({
      phoneNumberId: phone_number,
      callerNumber: caller_number,
      roomName: room_name,
      conversationId: conversation_id,
    });

    res.status(201).json({ call_id: call.id, status: 'started' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/internal/calls/:callId/end
 * Python agent calls this when a call ends
 */
router.post('/calls/:callId/end', async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { duration_seconds, recording_gcs_uri, transcript } = req.body;

    const call = await callService.endCall({
      callId,
      durationSeconds: duration_seconds || 0,
      recordingGcsUri: recording_gcs_uri,
      transcript,
    });

    res.json({ call_id: call.id, status: 'completed' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/internal/calls/:callId/fail
 * Python agent calls this if call fails
 */
router.post('/calls/:callId/fail', async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { reason } = req.body;
    await callService.failCall(callId, reason || 'unknown');
    res.json({ status: 'failed' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/internal/calls/:callId/transcript
 * Stream partial transcript updates (agent sends periodically)
 */
router.post('/calls/:callId/transcript', async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { transcript } = req.body;

    await db.query(
      `UPDATE calls SET transcript = $2 WHERE id = $1`,
      [callId, JSON.stringify(transcript)]
    );

    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
