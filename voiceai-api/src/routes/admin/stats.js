const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// GET /api/admin/stats/overview
router.get('/overview', async (req, res, next) => {
  try {
    const [clients, calls, revenue, activeNow] = await Promise.all([
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'trial') as trial,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended
        FROM clients`),
      db.query(`SELECT
        COUNT(*) as total_all_time,
        COUNT(*) FILTER (WHERE started_at >= date_trunc('month', NOW())) as this_month,
        COUNT(*) FILTER (WHERE started_at >= NOW() - interval '24 hours') as today,
        ROUND(AVG(duration_secs) FILTER (WHERE duration_secs IS NOT NULL)) as avg_duration,
        COUNT(*) FILTER (WHERE outcome = 'transferred') as transferred,
        COUNT(*) FILTER (WHERE outcome = 'resolved') as resolved
        FROM calls`),
      db.query(`SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid' AND created_at >= date_trunc('month', NOW())), 0) as mrr,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0) as outstanding
        FROM invoices`),
      db.query(`SELECT COUNT(*) FROM calls WHERE outcome = 'in_progress'`),
    ]);

    res.json({
      clients: clients.rows[0],
      calls: calls.rows[0],
      revenue: revenue.rows[0],
      active_calls: parseInt(activeNow.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats/calls-chart
router.get('/calls-chart', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const result = await db.query(
      `SELECT
        date_trunc('day', started_at)::date as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE outcome = 'transferred') as transferred,
        COUNT(*) FILTER (WHERE outcome = 'dropped') as dropped
       FROM calls
       WHERE started_at >= NOW() - ($1 || ' days')::interval
       GROUP BY 1
       ORDER BY 1 ASC`,
      [parseInt(days)]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats/top-clients
router.get('/top-clients', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.business_name, c.plan,
        COUNT(ca.id) as call_count,
        ROUND(AVG(ca.duration_secs)) as avg_duration,
        COUNT(ca.id) FILTER (WHERE ca.started_at >= date_trunc('month', NOW())) as calls_this_month
       FROM clients c
       LEFT JOIN calls ca ON ca.client_id = c.id
       GROUP BY c.id, c.business_name, c.plan
       ORDER BY call_count DESC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats/revenue-chart
router.get('/revenue-chart', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
        date_trunc('month', created_at)::date as month,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as paid,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0) as pending
       FROM invoices
       WHERE created_at >= NOW() - interval '12 months'
       GROUP BY 1
       ORDER BY 1 ASC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats/system-health
router.get('/system-health', async (req, res, next) => {
  try {
    // Check DB health
    const dbHealth = await db.query('SELECT 1').then(() => true).catch(() => false);

    // Check call failure rate (last hour)
    const failureResult = await db.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome = 'dropped') as dropped
       FROM calls WHERE started_at >= NOW() - interval '1 hour'`
    );
    const { total, dropped } = failureResult.rows[0];
    const failureRate = total > 0 ? (parseInt(dropped) / parseInt(total)) * 100 : 0;

    res.json({
      database: dbHealth ? 'healthy' : 'down',
      failure_rate_1h: failureRate.toFixed(1),
      total_calls_1h: parseInt(total),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
