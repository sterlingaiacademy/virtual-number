const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { storageService } = require('../../services/storageService');

// GET /api/admin/calls
router.get('/', async (req, res, next) => {
  try {
    const { client_id, outcome, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (client_id) { params.push(client_id); conditions.push(`ca.client_id = $${params.length}`); }
    if (outcome) { params.push(outcome); conditions.push(`ca.outcome = $${params.length}`); }
    if (date_from) { params.push(date_from); conditions.push(`ca.started_at >= $${params.length}`); }
    if (date_to) { params.push(date_to); conditions.push(`ca.started_at <= $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await db.query(`SELECT COUNT(*) FROM calls ca ${where}`, params);

    params.push(parseInt(limit), offset);
    const result = await db.query(
      `SELECT ca.*, c.business_name, c.plan
       FROM calls ca
       LEFT JOIN clients c ON c.id = ca.client_id
       ${where}
       ORDER BY ca.started_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({
      data: result.rows,
      pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/calls/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ca.*, c.business_name FROM calls ca
       LEFT JOIN clients c ON c.id = ca.client_id
       WHERE ca.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Call not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/calls/:id/transcript
router.get('/:id/transcript', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM transcripts WHERE call_id = $1 ORDER BY sequence ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/calls/:id/recording
router.get('/:id/recording', async (req, res, next) => {
  try {
    const result = await db.query('SELECT recording_gcs_path FROM calls WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Call not found' });
    if (!result.rows[0].recording_gcs_path) return res.status(404).json({ error: 'No recording for this call' });

    const url = await storageService.getSignedUrl(
      process.env.GCS_RECORDINGS_BUCKET,
      result.rows[0].recording_gcs_path,
      15 // 15 minute expiry
    );
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
