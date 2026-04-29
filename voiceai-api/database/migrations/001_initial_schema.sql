-- ============================================================
-- VoiceAI Database Schema — PostgreSQL 15
-- Run against: voiceai database on Cloud SQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CLIENTS (must come before users due to FK reference)
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name         TEXT NOT NULL,
  contact_email         TEXT NOT NULL,
  contact_phone         TEXT,
  address               TEXT,
  logo_url              TEXT,
  plan                  TEXT DEFAULT 'trial' CHECK (plan IN ('starter', 'growth', 'enterprise', 'trial')),
  status                TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended', 'trial')),
  billing_status        TEXT DEFAULT 'trial' CHECK (billing_status IN ('paid', 'overdue', 'trial', 'cancelled')),
  elevenlabs_agent_id   TEXT,
  monthly_call_limit    INTEGER DEFAULT 500,
  calls_used_this_month INTEGER DEFAULT 0,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- VIRTUAL PHONE NUMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS virtual_numbers (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number               TEXT UNIQUE NOT NULL,
  display_number       TEXT NOT NULL,
  provider             TEXT NOT NULL DEFAULT 'BSNL',
  client_id            UUID REFERENCES clients(id) ON DELETE SET NULL,
  livekit_trunk_id     TEXT,
  livekit_dispatch_id  TEXT,
  status               TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'inactive')),
  assigned_at          TIMESTAMP,
  created_at           TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AI AGENT CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_agents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  elevenlabs_agent_id   TEXT NOT NULL,
  agent_name            TEXT NOT NULL,
  language              TEXT DEFAULT 'ml',
  first_message         TEXT,
  system_prompt         TEXT,
  voice_id              TEXT,
  transfer_number_1     TEXT,
  transfer_number_2     TEXT,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE BASE DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID REFERENCES clients(id) ON DELETE CASCADE,
  file_name        TEXT NOT NULL,
  file_size        INTEGER,
  gcs_path         TEXT NOT NULL,
  elevenlabs_kb_id TEXT,
  status           TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SIP TRUNKS
-- ============================================================
CREATE TABLE IF NOT EXISTS sip_trunks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  provider          TEXT NOT NULL,
  ip_address        TEXT NOT NULL,
  port              INTEGER DEFAULT 5060,
  transport         TEXT DEFAULT 'TCP',
  livekit_trunk_id  TEXT,
  allowed_ips       TEXT[],
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CALLS
-- ============================================================
CREATE TABLE IF NOT EXISTS calls (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID REFERENCES clients(id),
  virtual_number_id   UUID REFERENCES virtual_numbers(id),
  caller_number       TEXT,
  virtual_number      TEXT,
  started_at          TIMESTAMP DEFAULT NOW(),
  ended_at            TIMESTAMP,
  duration_secs       INTEGER,
  outcome             TEXT CHECK (outcome IN ('resolved', 'transferred', 'dropped', 'voicemail', 'in_progress')),
  transferred_to      TEXT,
  livekit_room_id     TEXT,
  recording_gcs_path  TEXT,
  recording_url       TEXT,
  elevenlabs_conv_id  TEXT,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TRANSCRIPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS transcripts (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id   UUID REFERENCES calls(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('agent', 'caller')),
  message   TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  sequence  INTEGER NOT NULL
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID REFERENCES clients(id),
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  base_amount           INTEGER NOT NULL,
  calls_amount          INTEGER DEFAULT 0,
  total_amount          INTEGER NOT NULL,
  currency              TEXT DEFAULT 'INR',
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date              DATE,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  paid_at               TIMESTAMP,
  pdf_url               TEXT,
  created_at            TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT UNIQUE NOT NULL,
  price_monthly    INTEGER NOT NULL,
  call_limit       INTEGER NOT NULL,
  overage_per_call INTEGER DEFAULT 0,
  features         JSONB DEFAULT '[]',
  is_active        BOOLEAN DEFAULT true
);

-- Seed plans
INSERT INTO plans (name, price_monthly, call_limit, overage_per_call, features) VALUES
  ('starter',    299900,  500,  200, '["1 virtual number", "500 calls/month", "Call logs", "Transcripts", "Email support"]'),
  ('growth',     799900,  2000, 150, '["1 virtual number", "2000 calls/month", "Analytics dashboard", "Knowledge base", "Priority support"]'),
  ('enterprise', 1999900, 9999, 100, '["Multiple numbers", "Unlimited calls", "Custom AI agent", "SLA guarantee", "Dedicated support"]'),
  ('trial',      0,       100,  0,   '["1 virtual number", "100 calls trial", "Basic dashboard"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_calls_client_id       ON calls(client_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at      ON calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_outcome         ON calls(outcome);
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id   ON transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id    ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_virtual_numbers_cid   ON virtual_numbers(client_id);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_client_id       ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_client_id   ON knowledge_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_client_id      ON ai_agents(client_id);

-- ============================================================
-- TOKEN BLACKLIST (for logout)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_blacklist (
  token_jti  TEXT PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_exp ON token_blacklist(expires_at);
