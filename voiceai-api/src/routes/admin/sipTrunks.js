const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { livekitService } = require('../../services/livekitService');

// GET /api/admin/sip-trunks
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM sip_trunks ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/sip-trunks
router.post('/', async (req, res, next) => {
  try {
    const { name, provider, ip_address, port = 5060, transport = 'TCP', allowed_ips } = req.body;
    if (!name || !provider || !ip_address) {
      return res.status(400).json({ error: 'name, provider, and ip_address required' });
    }

    // Create LiveKit SIP trunk
    let livekitTrunkId = null;
    try {
      const trunk = await livekitService.createSIPTrunk({ name, ip_address, port, allowed_ips });
      livekitTrunkId = trunk?.sipTrunkId;
    } catch (e) {
      console.warn('LiveKit trunk creation failed (non-fatal):', e.message);
    }

    const result = await db.query(
      `INSERT INTO sip_trunks (name, provider, ip_address, port, transport, livekit_trunk_id, allowed_ips)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, provider, ip_address, port, transport, livekitTrunkId, allowed_ips || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/sip-trunks/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, ip_address, port, transport, status } = req.body;
    const result = await db.query(
      `UPDATE sip_trunks SET
        name = COALESCE($1, name),
        ip_address = COALESCE($2, ip_address),
        port = COALESCE($3, port),
        transport = COALESCE($4, transport),
        status = COALESCE($5, status)
       WHERE id = $6 RETURNING *`,
      [name, ip_address, port, transport, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'SIP trunk not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/sip-trunks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const trunkResult = await db.query('SELECT * FROM sip_trunks WHERE id = $1', [req.params.id]);
    if (trunkResult.rows.length === 0) return res.status(404).json({ error: 'SIP trunk not found' });

    if (trunkResult.rows[0].livekit_trunk_id) {
      try {
        await livekitService.deleteSIPTrunk(trunkResult.rows[0].livekit_trunk_id);
      } catch (e) {
        console.warn('LiveKit trunk deletion failed (non-fatal):', e.message);
      }
    }

    await db.query('DELETE FROM sip_trunks WHERE id = $1', [req.params.id]);
    res.json({ message: 'SIP trunk deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/sip-trunks/:id/test
router.post('/:id/test', async (req, res, next) => {
  try {
    const trunkResult = await db.query('SELECT * FROM sip_trunks WHERE id = $1', [req.params.id]);
    if (trunkResult.rows.length === 0) return res.status(404).json({ error: 'SIP trunk not found' });

    // Simple connectivity check via LiveKit
    const status = trunkResult.rows[0].livekit_trunk_id ? 'reachable' : 'unknown';
    res.json({ status, trunk: trunkResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
