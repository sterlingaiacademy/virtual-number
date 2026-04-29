require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate, requireAdmin, requireClient } = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/auth');
const adminClientsRoutes = require('./routes/admin/clients');
const adminNumbersRoutes = require('./routes/admin/numbers');
const adminCallsRoutes = require('./routes/admin/calls');
const adminBillingRoutes = require('./routes/admin/billing');
const adminStatsRoutes = require('./routes/admin/stats');
const adminSipTrunksRoutes = require('./routes/admin/sipTrunks');
const adminSettingsRoutes = require('./routes/admin/settings');
const clientStatsRoutes = require('./routes/client/stats');
const clientCallsRoutes = require('./routes/client/calls');
const clientAgentRoutes = require('./routes/client/agent');
const clientKnowledgeRoutes = require('./routes/client/knowledge');
const clientBillingRoutes = require('./routes/client/billing');
const internalRoutes = require('./routes/internal');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Trust proxy (Cloud Run sits behind GCP load balancer) ───────────────────
app.set('trust proxy', 1);

// ─── Security & logging ───────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://app.sterlingaiacademy.com',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Webhooks (raw body BEFORE json parser) ───────────────────────────────────
app.use('/api/webhooks', webhookRoutes);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version || '1.0.0', ts: new Date().toISOString() });
});

// ─── Public auth routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Internal routes (Python agent only) ─────────────────────────────────────
app.use('/api/internal', internalRoutes);

// ─── Admin routes ─────────────────────────────────────────────────────────────
app.use('/api/admin/clients',    authenticate, requireAdmin, adminClientsRoutes);
app.use('/api/admin/numbers',    authenticate, requireAdmin, adminNumbersRoutes);
app.use('/api/admin/calls',      authenticate, requireAdmin, adminCallsRoutes);
app.use('/api/admin/billing',    authenticate, requireAdmin, adminBillingRoutes);
app.use('/api/admin/stats',      authenticate, requireAdmin, adminStatsRoutes);
app.use('/api/admin/sip-trunks', authenticate, requireAdmin, adminSipTrunksRoutes);
app.use('/api/admin/settings',   authenticate, requireAdmin, adminSettingsRoutes);

// ─── Client routes ─────────────────────────────────────────────────────────────
app.use('/api/client/stats',     authenticate, requireClient, clientStatsRoutes);
app.use('/api/client/calls',     authenticate, requireClient, clientCallsRoutes);
app.use('/api/client/agent',     authenticate, requireClient, clientAgentRoutes);
app.use('/api/client/knowledge', authenticate, requireClient, clientKnowledgeRoutes);
app.use('/api/client/billing',   authenticate, requireClient, clientBillingRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ VoiceAI API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
