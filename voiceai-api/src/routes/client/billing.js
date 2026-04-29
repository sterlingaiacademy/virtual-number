const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const db = require('../../config/database');

let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// GET /api/client/billing
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT i.*, c.plan, c.billing_status
       FROM invoices i
       LEFT JOIN clients c ON c.id = i.client_id
       WHERE i.client_id = $1
       ORDER BY i.created_at DESC`,
      [req.user.client_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/client/billing/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM invoices WHERE id = $1 AND client_id = $2',
      [req.params.id, req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/client/billing/:id/pay — Create Razorpay order
router.post('/:id/pay', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM invoices WHERE id = $1 AND client_id = $2',
      [req.params.id, req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = result.rows[0];

    if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice already paid' });

    if (!razorpay) {
      return res.status(503).json({ error: 'Payment gateway not configured' });
    }

    const order = await razorpay.orders.create({
      amount: invoice.total_amount, // in paise
      currency: 'INR',
      receipt: invoice.id,
      notes: { invoice_id: invoice.id, client_id: req.user.client_id },
    });

    await db.query(
      'UPDATE invoices SET razorpay_order_id = $1 WHERE id = $2',
      [order.id, invoice.id]
    );

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      invoice_id: invoice.id,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/client/billing/:id/download
router.get('/:id/download', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT pdf_url FROM invoices WHERE id = $1 AND client_id = $2',
      [req.params.id, req.user.client_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    if (!result.rows[0].pdf_url) return res.status(404).json({ error: 'PDF not available yet' });
    res.redirect(result.rows[0].pdf_url);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
