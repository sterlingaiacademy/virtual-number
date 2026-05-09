const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// GET /api/client/stats/overview
router.get('/overview', async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    const [callStats, agent, number, plan] = await Promise.all([
      db.query(
        `SELECT
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE started_at >= date_trunc('month', NOW())) as calls_this_month,
          COUNT(*) FILTER (WHERE started_at >= NOW() - interval '24 hours') as calls_today,
          ROUND(AVG(duration_secs) FILTER (WHERE duration_secs IS NOT NULL)) as avg_duration,
          COUNT(*) FILTER (WHERE outcome = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE outcome = 'transferred') as transferred,
          COUNT(*) FILTER (WHERE outcome = 'dropped') as dropped
         FROM calls WHERE client_id = $1`,
        [clientId]
      ),
      db.query('SELECT agent_name, is_active, language FROM ai_agents WHERE client_id = $1', [clientId]),
      db.query('SELECT number, display_number FROM virtual_numbers WHERE client_id = $1', [clientId]),
      db.query(
        `SELECT c.plan, c.monthly_call_limit, c.calls_used_this_month, p.price_monthly, p.call_limit
         FROM clients c LEFT JOIN plans p ON p.name = c.plan WHERE c.id = $1`,
        [clientId]
      ),
    ]);

    const stats = callStats.rows[0];
    const total = parseInt(stats.calls_this_month);
    const limit = parseInt(plan.rows[0]?.monthly_call_limit || 500);
    const resolutionRate = stats.total_calls > 0
      ? ((parseInt(stats.resolved) / parseInt(stats.total_calls)) * 100).toFixed(1)
      : 0;

    res.json({
      // Flat fields for dashboard
      calls_this_month: parseInt(stats.calls_this_month),
      calls_today: parseInt(stats.calls_today),
      total_calls: parseInt(stats.total_calls),
      avg_duration: parseInt(stats.avg_duration || 0),
      total_seconds_this_month: parseInt(stats.calls_this_month) * parseInt(stats.avg_duration || 0),
      phone_number: number.rows[0]?.display_number || number.rows[0]?.number || null,
      plan_name: plan.rows[0]?.plan || null,
      monthly_call_limit: plan.rows[0]?.monthly_call_limit || 500,
      resolution_rate: resolutionRate,
      // Nested for advanced use
      calls: stats,
      usage: { used: total, limit, percent: Math.min(100, (total / limit) * 100).toFixed(1) },
      agent: agent.rows[0] || null,
      number: number.rows[0] || null,
      plan: plan.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/client/stats/calls-chart
router.get('/calls-chart', async (req, res, next) => {
  try {
    // Support ?period=7d or ?days=7
    let days = parseInt(req.query.days) || 7;
    const period = req.query.period;
    if (period) {
      const match = period.match(/(\d+)d/);
      if (match) days = parseInt(match[1]);
    }
    const result = await db.query(
      `SELECT
        date_trunc('day', started_at)::date as date,
        COUNT(*) as calls,
        COUNT(*) FILTER (WHERE outcome = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE outcome = 'transferred') as transferred,
        ROUND(AVG(duration_secs)) as avg_duration
       FROM calls
       WHERE client_id = $1 AND started_at >= NOW() - ($2 || ' days')::interval
       GROUP BY 1
       ORDER BY 1 ASC`,
      [req.user.client_id, days]
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
