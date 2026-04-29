const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { livekitService } = require('../../services/livekitService');

// GET /api/admin/numbers
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE vn.status = $1`;
    }

    params.push(parseInt(limit), offset);
    const result = await db.query(
      `SELECT vn.*, c.business_name, c.contact_email
       FROM virtual_numbers vn
       LEFT JOIN clients c ON c.id = vn.client_id
       ${where}
       ORDER BY vn.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const total = await db.query('SELECT COUNT(*) FROM virtual_numbers' + (status ? ' WHERE status = $1' : ''), status ? [status] : []);
    res.json({
      data: result.rows,
      pagination: { total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/numbers
router.post('/', async (req, res, next) => {
  try {
    const { number, display_number, provider = 'BSNL' } = req.body;
    if (!number || !display_number) {
      return res.status(400).json({ error: 'number and display_number required' });
    }
    const result = await db.query(
      'INSERT INTO virtual_numbers (number, display_number, provider) VALUES ($1, $2, $3) RETURNING *',
      [number, display_number, provider]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/numbers/:id/assign
router.put('/:id/assign', async (req, res, next) => {
  const dbClient = await db.getClient();
  try {
    await dbClient.query('BEGIN');
    const { client_id } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id required' });

    // Check number exists and is available
    const numResult = await dbClient.query('SELECT * FROM virtual_numbers WHERE id = $1', [req.params.id]);
    if (numResult.rows.length === 0) return res.status(404).json({ error: 'Number not found' });
    if (numResult.rows[0].status === 'assigned') {
      return res.status(409).json({ error: 'Number is already assigned' });
    }

    // Check client exists
    const clientResult = await dbClient.query('SELECT * FROM clients WHERE id = $1', [client_id]);
    if (clientResult.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

    // Create LiveKit SIP dispatch rule for this number
    let dispatchId = null;
    try {
      const dispatch = await livekitService.createDispatchRule(
        numResult.rows[0].number,
        client_id
      );
      dispatchId = dispatch?.sipDispatchRuleId;
    } catch (e) {
      console.warn('LiveKit dispatch creation failed (non-fatal):', e.message);
    }

    const updated = await dbClient.query(
      `UPDATE virtual_numbers
       SET client_id = $1, status = 'assigned', assigned_at = NOW(), livekit_dispatch_id = $2
       WHERE id = $3 RETURNING *`,
      [client_id, dispatchId, req.params.id]
    );

    await dbClient.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
});

// PUT /api/admin/numbers/:id/unassign
router.put('/:id/unassign', async (req, res, next) => {
  try {
    const numResult = await db.query('SELECT * FROM virtual_numbers WHERE id = $1', [req.params.id]);
    if (numResult.rows.length === 0) return res.status(404).json({ error: 'Number not found' });

    // Remove LiveKit dispatch rule
    if (numResult.rows[0].livekit_dispatch_id) {
      try {
        await livekitService.deleteDispatchRule(numResult.rows[0].livekit_dispatch_id);
      } catch (e) {
        console.warn('LiveKit dispatch deletion failed (non-fatal):', e.message);
      }
    }

    const result = await db.query(
      `UPDATE virtual_numbers
       SET client_id = NULL, status = 'available', assigned_at = NULL, livekit_dispatch_id = NULL
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/numbers/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM virtual_numbers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Number not found' });
    res.json({ message: 'Number deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
