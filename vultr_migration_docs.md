# Grace & Force — Vultr Migration Documentation

> **Platform:** VoiceAI Debate SaaS  
> **Current Stack:** Supabase (PostgreSQL) + Vercel (Frontend) + Render (Backend)  
> **Target Stack:** Vultr Managed PostgreSQL + Vultr VPS (Backend) + Vercel / Vultr CDN (Frontend)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                      │
│                                                             │
│  [React/Vite Frontend] ──► Vercel CDN                       │
│  [Node.js/Express Backend] ──► Render.com (Free Tier)       │
│  [Python Scripts] ──► Vercel Serverless Functions           │
│  [PostgreSQL DB] ──► Supabase (ap-northeast-1 / Tokyo)      │
│  [Auth] ──► Supabase Auth (Google OAuth + email)            │
│  [AI Voice] ──► ElevenLabs Conversational AI                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TARGET ARCHITECTURE                       │
│                                                             │
│  [React/Vite Frontend] ──► Vercel CDN (unchanged) OR        │
│                             Vultr Object Storage + CDN       │
│  [Node.js/Express Backend] ──► Vultr VPS (Ubuntu 22.04)     │
│  [Python Scripts] ──► Same VPS (co-located with backend)    │
│  [PostgreSQL DB] ──► Vultr Managed PostgreSQL 16            │
│  [Auth] ──► Supabase Auth (keep) OR migrate to custom JWT   │
│  [AI Voice] ──► ElevenLabs (unchanged)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Current Database Schema (Complete)

These are **all 5 active tables** that must be migrated. Run this SQL verbatim on your new Vultr PostgreSQL instance.

```sql
-- ============================================================
-- Grace & Force — Full Database Schema
-- Target: Vultr Managed PostgreSQL 16
-- ============================================================

-- TABLE 1: users (core auth + session data)
CREATE TABLE IF NOT EXISTS users (
    id                      SERIAL PRIMARY KEY,
    name                    TEXT,
    "studentId"             TEXT UNIQUE,
    password                TEXT,
    "classLevel"            TEXT,
    "assignedAgentId"       TEXT,
    "createdAt"             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "lastDebateDate"        TEXT DEFAULT '',
    "dailyRankedTime"       INTEGER DEFAULT 0,
    "dailyPersonaTime"      INTEGER DEFAULT 0,
    grade                   TEXT DEFAULT '',
    "dailyChallengeCompleted" TEXT DEFAULT '',
    email                   TEXT,
    phone                   TEXT,
    auth_provider           TEXT,
    avatar                  TEXT
);

-- TABLE 2: debate_users (leaderboard + token economy)
CREATE TABLE IF NOT EXISTS debate_users (
    user_id             TEXT PRIMARY KEY,
    username            TEXT NOT NULL,
    country             TEXT DEFAULT '',
    region              TEXT DEFAULT '',
    school              TEXT DEFAULT '',
    class               TEXT DEFAULT '',
    grade               TEXT DEFAULT '',
    avatar_url          TEXT DEFAULT '',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    total_debates       INTEGER DEFAULT 0,
    total_wins          INTEGER DEFAULT 0,
    best_score          REAL DEFAULT 0,
    avg_score           REAL DEFAULT 0,
    elo_rating          REAL DEFAULT 1000.0,
    current_streak      INTEGER DEFAULT 0,
    longest_streak      INTEGER DEFAULT 0,
    total_words_spoken  INTEGER DEFAULT 0,
    badges              JSONB DEFAULT '[]'::jsonb,
    gforce_tokens       INTEGER DEFAULT 0
);

-- TABLE 3: debates (individual session results)
CREATE TABLE IF NOT EXISTS debates (
    debate_id                   TEXT PRIMARY KEY,
    user_id                     TEXT NOT NULL REFERENCES debate_users(user_id),
    motion                      TEXT DEFAULT '',
    side                        TEXT DEFAULT '',
    overall_score               REAL NOT NULL,
    grade                       TEXT DEFAULT '',
    total_turns                 INTEGER DEFAULT 0,
    total_words                 INTEGER DEFAULT 0,
    score_argument_quality      REAL DEFAULT 0,
    score_rebuttal_engagement   REAL DEFAULT 0,
    score_clarity_coherence     REAL DEFAULT 0,
    score_speech_fluency        REAL DEFAULT 0,
    score_persuasiveness        REAL DEFAULT 0,
    score_knowledge_evidence    REAL DEFAULT 0,
    score_respectfulness        REAL DEFAULT 0,
    score_consistency_position  REAL DEFAULT 0,
    full_result                 JSONB DEFAULT '{}'::jsonb,
    country                     TEXT DEFAULT '',
    region                      TEXT DEFAULT '',
    school                      TEXT DEFAULT '',
    class                       TEXT DEFAULT '',
    created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 4: achievements (badges earned)
CREATE TABLE IF NOT EXISTS achievements (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES debate_users(user_id),
    badge_id    TEXT NOT NULL,
    badge_name  TEXT NOT NULL,
    badge_desc  TEXT DEFAULT '',
    earned_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- TABLE 5: argument_bank (saved user arguments)
CREATE TABLE IF NOT EXISTS argument_bank (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    motion      TEXT DEFAULT '',
    point       TEXT DEFAULT '',
    evidence    TEXT DEFAULT '',
    explain     TEXT DEFAULT '',
    link        TEXT DEFAULT '',
    score       REAL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_arg_bank_user  ON argument_bank(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_elo      ON debate_users(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_users_class    ON debate_users(class, elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_debates_user   ON debates(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debates_class  ON debates(class, overall_score DESC);
```

> [!NOTE]
> The tables `analytics` and `debate_sessions` were already dropped — do NOT recreate them on Vultr.

---

## 3. Vultr Resources Required

### 3.1 Vultr Managed PostgreSQL

| Setting | Value |
|---|---|
| **Plan** | Vultr Managed Database — PostgreSQL |
| **Version** | PostgreSQL 16 |
| **Node size** | 1 vCPU / 1 GB RAM (starter) → upgrade to 2 GB for production |
| **Region** | Singapore (SGP1) — closest to India |
| **Database name** | `graceandforce` |
| **Default user** | `vultradmin` (auto-created) |
| **SSL** | Required (`sslmode=require`) |

**Estimated cost:** ~$15–25/month (1 GB node)

### 3.2 Vultr VPS (Backend)

| Setting | Value |
|---|---|
| **Type** | Cloud Compute — Regular Performance |
| **OS** | Ubuntu 22.04 LTS x64 |
| **vCPU** | 1 vCPU |
| **RAM** | 2 GB |
| **Storage** | 55 GB SSD |
| **Region** | Singapore (SGP1) — same region as DB |
| **IPv4** | 1 public IP |

**Estimated cost:** ~$12/month

### 3.3 Optional: Vultr Object Storage (Frontend)
Only needed if moving away from Vercel.

| Setting | Value |
|---|---|
| **Type** | Object Storage |
| **Region** | Singapore |
| **Use** | Host `frontend/dist` static files |

**Estimated cost:** ~$5/month (S3-compatible)

---

## 4. Environment Variables — Complete Map

### 4.1 Backend (Node.js — `backend/.env`)

| Variable | Current Value Source | New Value |
|---|---|---|
| `DATABASE_URL` | Supabase connection string | Vultr PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL | ⚠️ Keep if using Supabase Auth, else remove |
| `SUPABASE_KEY` | Supabase service role key | ⚠️ Keep if using Supabase Auth, else remove |
| `ELEVENLABS_API_KEY` | ElevenLabs dashboard | **Unchanged** |
| `PORT` | 5000 (default) | 5000 or 80 on VPS |
| `NODE_ENV` | Not set | `production` |

**New `backend/.env` on Vultr VPS:**
```env
DATABASE_URL=postgresql://vultradmin:<PASSWORD>@<VULTR_DB_HOST>:5432/graceandforce?sslmode=require
ELEVENLABS_API_KEY=fd5d955ff7f3cebe2a63a1f41d9f90c59f0ca6f7f00477634da583512ff48374
PORT=5000
NODE_ENV=production
# Keep these ONLY if Supabase Auth is still in use:
SUPABASE_URL=https://whfmuswqbsgbmaramuhi.supabase.co
SUPABASE_KEY=<your_service_role_key>
```

### 4.2 Frontend (Vite — `frontend/.env.local`)

| Variable | Purpose | Change Required? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Auth client | Keep if Auth stays on Supabase |
| `VITE_SUPABASE_ANON_KEY` | Supabase Auth client | Keep if Auth stays on Supabase |
| `VITE_API_BASE_URL` | Points to backend | **Change to Vultr VPS IP/domain** |

**New `frontend/.env.local`:**
```env
VITE_SUPABASE_URL=https://whfmuswqbsgbmaramuhi.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_API_BASE_URL=https://api.graceandforce.com
```

> [!IMPORTANT]
> The frontend currently calls the backend via relative paths `/api/...` through Vercel rewrites. After migration, all API calls must use an absolute URL pointing to your Vultr VPS. You will need to update `VITE_API_BASE_URL` in all fetch calls.

---

## 5. Step-by-Step Migration Procedure

### Phase 1 — Provision Vultr Resources

```
1. Log in to Vultr → Products → Managed Databases → Add Database
   - Engine: PostgreSQL 16
   - Region: Singapore
   - Plan: 1 GB
   - Name: graceandforce-db

2. Log in to Vultr → Products → Cloud Compute → Deploy Server
   - OS: Ubuntu 22.04
   - Plan: Regular 2 GB
   - Region: Singapore (SAME as DB)
   - Label: graceandforce-api

3. Note down:
   - DB Host (from Vultr dashboard)
   - DB Port (usually 5432)
   - DB Password (auto-generated)
   - VPS Public IP
```

### Phase 2 — Export Data from Supabase

Run this on your local machine (requires `pg_dump`):

```bash
# Export schema + data from Supabase
pg_dump \
  "postgresql://postgres.whfmuswqbsgbmaramuhi:sterlingvoiceorders%40123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres" \
  --no-owner \
  --no-acl \
  --schema=public \
  -t users \
  -t debate_users \
  -t debates \
  -t achievements \
  -t argument_bank \
  -f grace_force_backup.sql
```

### Phase 3 — Import Data to Vultr

```bash
# Import into Vultr PostgreSQL
psql \
  "postgresql://vultradmin:<PASSWORD>@<VULTR_DB_HOST>:5432/graceandforce?sslmode=require" \
  -f grace_force_backup.sql
```

> [!WARNING]
> Run the schema creation SQL from Section 2 FIRST before importing data if the dump is data-only.

### Phase 4 — Setup VPS (Ubuntu 22.04)

SSH into your Vultr VPS and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3 + pip
sudo apt install -y python3 python3-pip

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install PostgreSQL client (for psql access)
sudo apt install -y postgresql-client-16
```

### Phase 5 — Deploy Backend to VPS

```bash
# On your local machine — copy project to VPS
scp -r ./backend root@<VPS_IP>:/var/www/grace-and-force/backend
scp requirements.txt root@<VPS_IP>:/var/www/grace-and-force/

# On the VPS
cd /var/www/grace-and-force/backend
npm install --production

# Install Python dependencies
pip3 install psycopg2-binary python-dotenv google-generativeai

# Create .env file (use values from Section 4.1)
nano .env

# Start with PM2
pm2 start server.js --name "grace-api"
pm2 save
pm2 startup
```

### Phase 6 — Configure Nginx Reverse Proxy

```bash
# Create nginx site config
sudo nano /etc/nginx/sites-available/graceapi
```

Paste this config:

```nginx
server {
    listen 80;
    server_name api.graceandforce.com <VPS_IP>;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/graceapi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Add SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.graceandforce.com
```

### Phase 7 — Update `database.js`

Change the connection string default:

```js
// backend/database.js — line 4-5
const connectionString = process.env.DATABASE_URL ||
  'postgresql://vultradmin:<PASSWORD>@<VULTR_DB_HOST>:5432/graceandforce?sslmode=require';

// SSL config stays the same
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },  // rejectUnauthorized: true in production is preferred
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

### Phase 8 — Update Frontend API Calls

The frontend currently calls `/api/...` (relative URLs via Vercel rewrites). After migration, update all fetch calls to use `VITE_API_BASE_URL`:

```js
// Create frontend/src/api.js
const BASE = import.meta.env.VITE_API_BASE_URL || '';

export const api = {
  get: (path) => fetch(`${BASE}${path}`).then(r => r.json()),
  post: (path, body) => fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json()),
};
```

Then replace all `fetch('/api/...')` calls in components with `fetch(${BASE}/api/...)`.

### Phase 9 — Update Vercel Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
VITE_API_BASE_URL = https://api.graceandforce.com
VITE_SUPABASE_URL = https://whfmuswqbsgbmaramuhi.supabase.co  (keep)
VITE_SUPABASE_ANON_KEY = <anon_key>  (keep)
```

---

## 6. Python Services Requirements

The backend runs 3 Python scripts via `child_process.exec`. On the Vultr VPS, install:

```bash
pip3 install \
  psycopg2-binary \
  python-dotenv \
  google-generativeai \
  httpx \
  supabase
```

**Scripts and their DB access:**

| Script | DB Tables Used | Notes |
|---|---|---|
| `api_evaluate.py` | `debate_users`, `debates` | Writes post-debate scores |
| `api_leaderboard.py` | `debate_users`, `debates` | Reads leaderboard rankings |
| `api_profile.py` | `debate_users`, `debates`, `achievements` | Reads user analytics |

All 3 scripts read `DATABASE_URL` from `.env` — **no changes needed to script code**, just ensure the env file is correct on VPS.

> [!IMPORTANT]
> The scripts are called with `py` on Windows (local dev). On Ubuntu VPS, `py` does not exist — `server.js` must use `python3` instead. Update these lines in `server.js`:
> ```js
> // Change all instances of:
> exec(`py "${scriptPath}"  ...`)
> // To:
> exec(`python3 "${scriptPath}" ...`)
> ```

---

## 7. ElevenLabs Agent Configuration

No changes required. The `ELEVENLABS_API_KEY` and hardcoded agent IDs in `server.js` remain unchanged.

| Level | Agent ID |
|---|---|
| Level 1 / Class 1-3 | `agent_3201kkb0dbh3fgravbhyjw4crve8` |
| Level 2 | `agent_1201kkvd9ke5fd180zjz6ckrameq` |
| Level 3 | `agent_5601kkx9fa95e9eswcm93gdmp18h` |
| Level 4 / Class 10-12 | `agent_1201kkdnn526eebs4fwb822fzgs3` |
| Level 5 | `agent_3801km7h68pbfn1t8m52ny028t6w` |

---

## 8. Mobile App Considerations

If you plan to build or already have a mobile app (React Native / Flutter) consuming this backend:

### 8.1 API Base URL
Mobile apps must target your Vultr VPS URL:
```
https://api.graceandforce.com
```

### 8.2 CORS Configuration
Update `server.js` to allow mobile app origins. Replace the current `app.use(cors())` with:

```js
const allowedOrigins = [
  'https://graceandforce.com',
  'https://www.graceandforce.com',
  'capacitor://localhost',       // Ionic/Capacitor mobile
  'http://localhost',            // Android local dev
  'http://localhost:5173',       // Vite dev server
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

### 8.3 SSL Certificate
Mobile apps require HTTPS. Ensure your domain `api.graceandforce.com` has a valid SSL cert (Step 6 covers this with Let's Encrypt).

### 8.4 Authentication for Mobile
The current auth uses `studentId` + `password` (bcrypt). This works natively on mobile — just POST to:
```
POST https://api.graceandforce.com/api/login
Body: { "studentId": "...", "password": "..." }
```

For Google OAuth on mobile, continue using `@supabase/supabase-js` with the Supabase project (no DB change needed — auth data stays in Supabase, only debate/game data moves to Vultr).

---

## 9. Supabase Auth Decision

> [!IMPORTANT]
> **You have two options for authentication after migration:**

### Option A: Keep Supabase Auth (Recommended — Less Work)
- Keep `SUPABASE_URL` and `SUPABASE_KEY` env vars
- Frontend `supabase.js` stays unchanged
- Google OAuth continues to work
- Only the **PostgreSQL database** moves to Vultr
- Cost: Free tier of Supabase Auth (50,000 MAU free)

### Option B: Migrate Auth to Custom JWT (More Work)
- Remove Supabase entirely
- Implement JWT-based auth in `server.js` using `jsonwebtoken`
- Store sessions in Vultr PostgreSQL
- Required if you want zero dependency on Supabase

**Recommendation: Go with Option A** to reduce migration scope and risk.

---

## 10. Firewall / Security Rules

Configure Vultr Firewall Group on your VPS:

| Rule | Protocol | Port | Source |
|---|---|---|---|
| SSH | TCP | 22 | Your IP only |
| HTTP | TCP | 80 | Anywhere |
| HTTPS | TCP | 443 | Anywhere |
| PostgreSQL | TCP | 5432 | VPS Internal IP only |
| Node API | TCP | 5000 | Localhost only (behind Nginx) |

For Managed PostgreSQL, in Vultr DB settings → Trusted Sources:
- Add your VPS internal IP address
- Do NOT expose PostgreSQL publicly

---

## 11. Post-Migration Verification Checklist

```
[ ] Vultr Managed PostgreSQL created & accessible
[ ] All 5 tables created with correct schema
[ ] Data exported from Supabase and imported to Vultr
[ ] Row counts match between old and new DB
[ ] VPS provisioned with Node.js 20 + Python 3 + PM2 + Nginx
[ ] backend/.env updated with new DATABASE_URL
[ ] server.js updated: py → python3 for script execution
[ ] PM2 running and auto-restarting on reboot
[ ] Nginx reverse proxy configured and SSL active
[ ] CORS updated for mobile + web origins
[ ] Frontend VITE_API_BASE_URL set in Vercel env vars
[ ] /api/login endpoint tested ✓
[ ] /api/register endpoint tested ✓
[ ] /api/leaderboard endpoint tested ✓
[ ] /api/evaluate endpoint tested ✓
[ ] /api/analytics/:studentId endpoint tested ✓
[ ] ElevenLabs conversation still working ✓
[ ] Daily time limits resetting at 12 AM IST ✓
[ ] GForce tokens awarding correctly ✓
[ ] Referral codes working ✓
[ ] Old Supabase DB kept in read-only mode for 7 days as backup
```

---

## 12. Estimated Total Monthly Cost (Vultr)

| Resource | Plan | Cost |
|---|---|---|
| Managed PostgreSQL (1 GB) | Starter | ~$15/mo |
| VPS (2 GB RAM) | Regular | ~$12/mo |
| Object Storage (optional) | 250 GB | ~$5/mo |
| **Total** | | **~$27–32/mo** |

vs. Current:
- Supabase: Free tier (limited)
- Render: Free tier (spins down after inactivity)
- Vercel: Free tier

> [!NOTE]
> The Vultr setup eliminates cold-start delays from Render's free tier and the 500ms+ connection latency from Supabase's ap-northeast-1 pooler. Singapore (SGP1) will reduce latency for Indian users significantly.

---

## 13. Quick Reference — Connection String Format

```
# Vultr PostgreSQL connection string format:
postgresql://<username>:<password>@<host>:<port>/<dbname>?sslmode=require

# Example:
postgresql://vultradmin:MySecurePass123@vultr-prod-abc123.vultrdb.com:5432/graceandforce?sslmode=require
```

The host, port, username and password are all visible in the Vultr database dashboard under **Connection Details**.
