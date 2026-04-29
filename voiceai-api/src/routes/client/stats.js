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
      calls: stats,
      resolution_rate: resolutionRate,
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
    const { days = 30 } = req.query;
    const result = await db.query(
      `SELECT
        date_trunc('day', started_at)::date as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE outcome = 'transferred') as transferred,
        ROUND(AVG(duration_secs)) as avg_duration
       FROM calls
       WHERE client_id = $1 AND started_at >= NOW() - ($2 || ' days')::interval
       GROUP BY 1
       ORDER BY 1 ASC`,
      [req.user.client_id, parseInt(days)]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
