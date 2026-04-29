const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const { elevenLabsService } = require('../../services/elevenLabsService');
const { livekitService } = require('../../services/livekitService');

// GET /api/admin/clients
router.get('/', async (req, res, next) => {
  try {
    const { search, status, plan, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.business_name ILIKE $${params.length} OR c.contact_email ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (plan) {
      params.push(plan);
      conditions.push(`c.plan = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM clients c ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await db.query(
      `SELECT c.*,
              vn.number as virtual_number, vn.display_number,
              u.email as login_email,
              (SELECT COUNT(*) FROM calls WHERE client_id = c.id) as total_calls,
              (SELECT COUNT(*) FROM calls WHERE client_id = c.id AND started_at >= date_trunc('month', NOW())) as calls_this_month
       FROM clients c
       LEFT JOIN virtual_numbers vn ON vn.client_id = c.id
       LEFT JOIN users u ON u.client_id = c.id AND u.role = 'client'
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/clients
router.post('/', async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const {
      business_name, contact_email, contact_phone, address,
      plan = 'trial', login_email, login_password,
      elevenlabs_agent_id, elevenlabs_api_key
    } = req.body;

    if (!business_name || !contact_email) {
      return res.status(400).json({ error: 'business_name and contact_email required' });
    }

    // Create client record
    const clientResult = await client.query(
      `INSERT INTO clients (business_name, contact_email, contact_phone, address, plan, status, elevenlabs_agent_id, elevenlabs_api_key)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
       RETURNING *`,
      [business_name, contact_email, contact_phone, address, plan, elevenlabs_agent_id, elevenlabs_api_key]
    );
    const newClient = clientResult.rows[0];

    // Automatically create ai_agents record if agent ID provided
    if (elevenlabs_agent_id) {
      await client.query(
        `INSERT INTO ai_agents (client_id, elevenlabs_agent_id, agent_name)
         VALUES ($1, $2, $3)`,
        [newClient.id, elevenlabs_agent_id, `${business_name} Support Agent`]
      );
    }

    // Create login user for client
    if (login_email && login_password) {
      const hash = await bcrypt.hash(login_password, 12);
      await client.query(
        `INSERT INTO users (email, password_hash, role, client_id)
         VALUES ($1, $2, 'client', $3)`,
        [login_email.toLowerCase(), hash, newClient.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(newClient);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/admin/clients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.*,
              vn.id as number_id, vn.number as virtual_number, vn.display_number, vn.status as number_status,
              u.email as login_email, u.is_active as login_active, u.last_login_at,
              a.agent_name, a.elevenlabs_agent_id, a.language, a.is_active as agent_active
       FROM clients c
       LEFT JOIN virtual_numbers vn ON vn.client_id = c.id
       LEFT JOIN users u ON u.client_id = c.id AND u.role = 'client'
       LEFT JOIN ai_agents a ON a.client_id = c.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/clients/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { business_name, contact_email, contact_phone, address, plan, status, billing_status, monthly_call_limit } = req.body;
    const result = await db.query(
      `UPDATE clients SET
         business_name = COALESCE($1, business_name),
         contact_email = COALESCE($2, contact_email),
         contact_phone = COALESCE($3, contact_phone),
         address = COALESCE($4, address),
         plan = COALESCE($5, plan),
         status = COALESCE($6, status),
         billing_status = COALESCE($7, billing_status),
         monthly_call_limit = COALESCE($8, monthly_call_limit),
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [business_name, contact_email, contact_phone, address, plan, status, billing_status, monthly_call_limit, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/clients/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/clients/:id/suspend
router.post('/:id/suspend', async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE clients SET status = 'suspended', updated_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/clients/:id/activate
router.post('/:id/activate', async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE clients SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/clients/:id/reset-password
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const hash = await bcrypt.hash(new_password, 12);
    await db.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE client_id = $2 AND role = 'client'",
      [hash, req.params.id]
    );
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
