const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// GET /api/admin/settings
router.get('/', async (req, res, next) => {
  try {
    const plans = await db.query('SELECT * FROM plans ORDER BY price_monthly ASC');
    res.json({
      plans: plans.rows,
      platform: {
        name: 'VoiceAI',
        support_email: process.env.SMTP_USER || 'support@sterlingaiacademy.com',
        frontend_url: process.env.FRONTEND_URL,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/settings/plans/:name
router.put('/plans/:name', async (req, res, next) => {
  try {
    const { price_monthly, call_limit, overage_per_call, features, is_active } = req.body;
    const result = await db.query(
      `UPDATE plans SET
        price_monthly = COALESCE($1, price_monthly),
        call_limit = COALESCE($2, call_limit),
        overage_per_call = COALESCE($3, overage_per_call),
        features = COALESCE($4, features),
        is_active = COALESCE($5, is_active)
       WHERE name = $6 RETURNING *`,
      [price_monthly, call_limit, overage_per_call, features ? JSON.stringify(features) : null, is_active, req.params.name]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
