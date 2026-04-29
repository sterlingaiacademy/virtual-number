const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { billingService } = require('../../services/billingService');
const { emailService } = require('../../services/emailService');

// GET /api/admin/billing
router.get('/', async (req, res, next) => {
  try {
    const { client_id, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (client_id) { params.push(client_id); conditions.push(`i.client_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`i.status = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await db.query(`SELECT COUNT(*) FROM invoices i ${where}`, params);
    params.push(parseInt(limit), offset);

    const result = await db.query(
      `SELECT i.*, c.business_name, c.plan, c.contact_email
       FROM invoices i
       LEFT JOIN clients c ON c.id = i.client_id
       ${where}
       ORDER BY i.created_at DESC
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

// POST /api/admin/billing/generate
router.post('/generate', async (req, res, next) => {
  try {
    const invoices = await billingService.generateMonthlyInvoices();
    res.json({ message: `Generated ${invoices.length} invoices`, invoices });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/billing/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT i.*, c.business_name, c.contact_email, c.plan
       FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/billing/:id/mark-paid
router.put('/:id/mark-paid', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

    // Update client billing status
    await db.query(
      "UPDATE clients SET billing_status = 'paid', updated_at = NOW() WHERE id = $1",
      [result.rows[0].client_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/billing/:id/send-reminder
router.post('/:id/send-reminder', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT i.*, c.business_name, c.contact_email FROM invoices i
       LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    await emailService.sendInvoiceReminder(result.rows[0]);
    res.json({ message: 'Reminder sent' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
