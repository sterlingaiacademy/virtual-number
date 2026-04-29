const db = require('../config/database');
const { pubsubService } = require('./pubsubService');
const { storageService } = require('./storageService');

const callService = {
  /**
   * Called by Python agent when a call starts
   */
  async startCall({ phoneNumberId, callerNumber, roomName, conversationId }) {
    // Look up which client owns this phone number
    const numRes = await db.query(
      `SELECT pn.*, c.id as client_id FROM phone_numbers pn
       JOIN clients c ON pn.client_id = c.id
       WHERE pn.number = $1 AND pn.status = 'active'`,
      [phoneNumberId]
    );
    if (!numRes.rows.length) throw new Error('Phone number not found or inactive');
    const { client_id } = numRes.rows[0];

    const result = await db.query(
      `INSERT INTO calls (client_id, phone_number_id, caller_number, room_name,
        elevenlabs_conversation_id, status, started_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW()) RETURNING *`,
      [client_id, phoneNumberId, callerNumber, roomName, conversationId]
    );
    const call = result.rows[0];

    await pubsubService.publishCallEvent('call.started', { call_id: call.id, client_id, caller_number: callerNumber });
    return call;
  },

  /**
   * Called by Python agent when a call ends
   */
  async endCall({ callId, durationSeconds, recordingGcsUri, transcript }) {
    const result = await db.query(
      `UPDATE calls SET status = 'completed', ended_at = NOW(),
        duration_seconds = $2, recording_url = $3, transcript = $4
       WHERE id = $1 RETURNING *`,
      [callId, durationSeconds, recordingGcsUri || null, transcript ? JSON.stringify(transcript) : null]
    );
    const call = result.rows[0];
    if (!call) throw new Error('Call not found');

    await pubsubService.publishCallEvent('call.ended', {
      call_id: call.id,
      client_id: call.client_id,
      duration_seconds: durationSeconds,
    });
    return call;
  },

  /**
   * Mark a call as failed
   */
  async failCall(callId, reason) {
    const result = await db.query(
      `UPDATE calls SET status = 'failed', ended_at = NOW(), failure_reason = $2
       WHERE id = $1 RETURNING *`,
      [callId, reason]
    );
    return result.rows[0];
  },

  /**
   * Get agent config for a phone number (used by Python agent)
   */
  async getAgentConfig(phoneNumber) {
    const result = await db.query(
      `SELECT
         pn.number, pn.client_id,
         a.elevenlabs_agent_id, a.voice_id, a.system_prompt,
         a.language, a.first_message, a.name as agent_name,
         c.business_name, c.status as client_status, c.plan_id
       FROM phone_numbers pn
       JOIN agents a ON a.client_id = pn.client_id
       JOIN clients c ON c.id = pn.client_id
       WHERE pn.number = $1`,
      [phoneNumber]
    );
    return result.rows[0] || null;
  },
};

module.exports = { callService };
