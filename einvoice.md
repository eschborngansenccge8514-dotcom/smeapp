<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Write a full implementation with code sample for phase 1

Here is the complete Phase 1 implementation — every file, migration, and verification script you need to go from zero to a confirmed working sandbox connection.

***

## Step 1: Project Scaffold

```bash
mkdir einvoice-service && cd einvoice-service
npm init -y
npm install express bullmq ioredis nodemailer node-cron dotenv node-forge
npm install --save-dev jest supertest nodemon
```


### `package.json` scripts block

```json
{
  "scripts": {
    "start":   "node index.js",
    "dev":     "nodemon index.js",
    "test":    "jest --runInBand --forceExit",
    "migrate": "node db/migrate.js"
  }
}
```


### Full folder structure — create all files now (even empty)

```bash
mkdir -p services automation routes middleware db certs __tests__

touch .env .env.example config.js index.js
touch services/auth.js services/signer.js services/builder.js
touch services/submitter.js services/einvoice.service.js
touch automation/queue.js automation/worker.js automation/events.js
touch automation/cron.js automation/mailer.js automation/alerts.js
touch db/migrate.js db/invoice.db.js db/pool.js
touch routes/invoice.routes.js middleware/errorHandler.js
touch __tests__/auth.test.js __tests__/phase1.verify.js
```


***

## Step 2: Environment Files

### `.env.example` — commit this to Git

```env
NODE_ENV=sandbox

# LHDN MyInvois API Credentials
MYINVOIS_CLIENT_ID=
MYINVOIS_CLIENT_SECRET=

# Your company (supplier) info
SUPPLIER_TIN=
SUPPLIER_BRN=
SUPPLIER_NAME=
SUPPLIER_PHONE=
SUPPLIER_EMAIL=
SUPPLIER_ADDRESS=
SUPPLIER_POSTCODE=
SUPPLIER_CITY=
SUPPLIER_STATE=14
SUPPLIER_MSIC=47910

# Digital Certificate (Phase 2)
CERT_PFX_PATH=./certs/signing.p12
CERT_PASSPHRASE=
CERT_ISSUER_NAME=
CERT_SERIAL_NUMBER=

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=einvoice_db
DB_USER=postgres
DB_PASSWORD=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Mailer
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Alerts
ALERT_FROM=
ALERT_TO=
SLACK_WEBHOOK_URL=
```


### `.env` — fill in your real sandbox values, never commit this

```env
NODE_ENV=sandbox

MYINVOIS_CLIENT_ID=your_sandbox_client_id_here
MYINVOIS_CLIENT_SECRET=your_sandbox_client_secret_here

SUPPLIER_TIN=C12345678900
SUPPLIER_BRN=202001012345
SUPPLIER_NAME=Your Company Sdn Bhd
SUPPLIER_PHONE=+60312345678
SUPPLIER_EMAIL=billing@yourcompany.com
SUPPLIER_ADDRESS=No. 1, Jalan Example, Taman Test
SUPPLIER_POSTCODE=50000
SUPPLIER_CITY=Kuala Lumpur
SUPPLIER_STATE=14
SUPPLIER_MSIC=47910

DB_HOST=localhost
DB_PORT=5432
DB_NAME=einvoice_db
DB_USER=postgres
DB_PASSWORD=yourpassword

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```


***

## Step 3: `config.js`

```js
require('dotenv').config();

const ENV = process.env.NODE_ENV || 'sandbox';

const URLS = {
  sandbox: {
    TOKEN: 'https://preprod-api.myinvois.hasil.gov.my/connect/token',
    API:   'https://preprod-api.myinvois.hasil.gov.my/api/v1.0',
  },
  production: {
    TOKEN: 'https://api.myinvois.hasil.gov.my/connect/token',
    API:   'https://api.myinvois.hasil.gov.my/api/v1.0',
  },
};

// Validate required env vars on startup
const REQUIRED = [
  'MYINVOIS_CLIENT_ID',
  'MYINVOIS_CLIENT_SECRET',
  'SUPPLIER_TIN',
  'SUPPLIER_BRN',
  'SUPPLIER_NAME',
  'SUPPLIER_EMAIL',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
];

function validateConfig() {
  const missing = REQUIRED.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`[Config] Missing required env vars: ${missing.join(', ')}`);
  }
  console.log(`[Config] Environment: ${ENV.toUpperCase()}`);
  console.log(`[Config] API base: ${URLS[ENV === 'production' ? 'production' : 'sandbox'].API}`);
}

module.exports = {
  ENV,
  URLS,
  validateConfig,

  CLIENT_ID:     process.env.MYINVOIS_CLIENT_ID,
  CLIENT_SECRET: process.env.MYINVOIS_CLIENT_SECRET,

  CERT_PFX_PATH:   process.env.CERT_PFX_PATH,
  CERT_PASSPHRASE: process.env.CERT_PASSPHRASE,
  CERT_ISSUER_NAME:   process.env.CERT_ISSUER_NAME,
  CERT_SERIAL_NUMBER: process.env.CERT_SERIAL_NUMBER,

  SUPPLIER: {
    TIN:      process.env.SUPPLIER_TIN,
    BRN:      process.env.SUPPLIER_BRN,
    NAME:     process.env.SUPPLIER_NAME,
    PHONE:    process.env.SUPPLIER_PHONE,
    EMAIL:    process.env.SUPPLIER_EMAIL,
    ADDRESS:  process.env.SUPPLIER_ADDRESS,
    POSTCODE: process.env.SUPPLIER_POSTCODE,
    CITY:     process.env.SUPPLIER_CITY,
    STATE:    process.env.SUPPLIER_STATE,
    MSIC:     process.env.SUPPLIER_MSIC,
  },

  INVOICE_TYPES: {
    INVOICE:      '01',
    CREDIT_NOTE:  '02',
    DEBIT_NOTE:   '03',
    REFUND_NOTE:  '04',
  },

  CLASS_CODES: {
    ECOMMERCE:    '008',
    CONSOLIDATED: '004',
    OTHERS:       '022',
  },

  // BullMQ retry policy
  QUEUE: {
    ATTEMPTS: 5,
    BACKOFF_DELAY: 3000,
  },
};
```


***

## Step 4: `db/pool.js` — Database Connection Pool

```js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max:      10,                // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error:', err.message);
});

async function ping() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
}

module.exports = { pool, ping };
```


***

## Step 5: `db/migrate.js` — Full Schema Migration

Run with `npm run migrate`. Safe to re-run — uses `IF NOT EXISTS` and `IF NOT EXISTS` column guards.

```js
require('dotenv').config();
const { pool } = require('./pool');

const migrations = [

  // ─── 1. Core einvoices table ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS einvoices (
    id                  SERIAL PRIMARY KEY,
    order_number        VARCHAR(100) UNIQUE NOT NULL,
    invoice_type        VARCHAR(30)  NOT NULL
                          CHECK (invoice_type IN (
                            'invoice','credit-note','debit-note',
                            'refund-note','consolidated'
                          )),
    lhdn_uuid           VARCHAR(200),
    lhdn_long_id        VARCHAR(500),
    qr_code_url         TEXT,
    submission_uid      VARCHAR(200),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending','valid','invalid',
                            'cancelled','rejected'
                          )),
    error_message       TEXT,
    submitted_at        TIMESTAMP WITH TIME ZONE,
    validated_at        TIMESTAMP WITH TIME ZONE,
    cancelled_at        TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // ─── 2. Index for fast lookups ────────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_einvoices_order_number
     ON einvoices(order_number)`,
  `CREATE INDEX IF NOT EXISTS idx_einvoices_status
     ON einvoices(status)`,
  `CREATE INDEX IF NOT EXISTS idx_einvoices_lhdn_uuid
     ON einvoices(lhdn_uuid)`,

  // ─── 3. Consolidated staging ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS consolidated_staging (
    id                      SERIAL PRIMARY KEY,
    order_number            VARCHAR(100) UNIQUE NOT NULL,
    subtotal                DECIMAL(12, 2) NOT NULL,
    tax                     DECIMAL(12, 2) NOT NULL DEFAULT 0,
    year                    INT NOT NULL,
    month                   INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    consolidated_einvoice_id INT REFERENCES einvoices(id),
    staged_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consolidated_at         TIMESTAMP WITH TIME ZONE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_consolidated_staging_year_month
     ON consolidated_staging(year, month)`,
  `CREATE INDEX IF NOT EXISTS idx_consolidated_staging_unconsolidated
     ON consolidated_staging(consolidated_einvoice_id)
     WHERE consolidated_einvoice_id IS NULL`,

  // ─── 4. Full audit log ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS einvoice_audit_log (
    id            SERIAL PRIMARY KEY,
    order_number  VARCHAR(100),
    action        VARCHAR(50) NOT NULL,
    endpoint      VARCHAR(300),
    request_body  JSONB,
    response_body JSONB,
    status_code   INT,
    duration_ms   INT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_order_number
     ON einvoice_audit_log(order_number)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
     ON einvoice_audit_log(created_at)`,

  // ─── 5. Failed jobs (DLQ mirror) ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS failed_invoice_jobs (
    id           SERIAL PRIMARY KEY,
    job_id       VARCHAR(100),
    job_type     VARCHAR(50),
    order_number VARCHAR(100),
    error        TEXT,
    attempts     INT DEFAULT 0,
    payload      JSONB,
    failed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved     BOOLEAN DEFAULT FALSE,
    resolved_at  TIMESTAMP WITH TIME ZONE,
    resolved_by  VARCHAR(100)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_failed_jobs_unresolved
     ON failed_invoice_jobs(resolved)
     WHERE resolved = FALSE`,

  // ─── 6. Auto-update updated_at trigger ───────────────────────────────────
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgname = 'set_einvoices_updated_at'
     ) THEN
       CREATE TRIGGER set_einvoices_updated_at
         BEFORE UPDATE ON einvoices
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
     END IF;
   END $$`,
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('[Migrate] Starting migrations...');
    await client.query('BEGIN');
    for (const [i, sql] of migrations.entries()) {
      await client.query(sql);
      console.log(`[Migrate] ✅ Step ${i + 1}/${migrations.length} done`);
    }
    await client.query('COMMIT');
    console.log('[Migrate] ✅ All migrations completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migrate] ❌ Migration failed, rolling back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
```


***

## Step 6: `db/invoice.db.js` — Data Access Layer

```js
const { pool } = require('./pool');

// ─── Save / update invoice record ─────────────────────────────────────────
async function upsertInvoice({
  orderNumber, invoiceType, submissionUid,
  lhdnUuid, lhdnLongId, qrCodeUrl, status, errorMessage
}) {
  await pool.query(`
    INSERT INTO einvoices
      (order_number, invoice_type, submission_uid, lhdn_uuid,
       lhdn_long_id, qr_code_url, status, error_message,
       submitted_at, validated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
      CASE WHEN $3 IS NOT NULL THEN NOW() ELSE NULL END,
      CASE WHEN $7 = 'valid'  THEN NOW() ELSE NULL END
    )
    ON CONFLICT (order_number)
    DO UPDATE SET
      submission_uid = COALESCE(EXCLUDED.submission_uid, einvoices.submission_uid),
      lhdn_uuid      = COALESCE(EXCLUDED.lhdn_uuid,      einvoices.lhdn_uuid),
      lhdn_long_id   = COALESCE(EXCLUDED.lhdn_long_id,   einvoices.lhdn_long_id),
      qr_code_url    = COALESCE(EXCLUDED.qr_code_url,    einvoices.qr_code_url),
      status         = EXCLUDED.status,
      error_message  = EXCLUDED.error_message,
      validated_at   = CASE
        WHEN EXCLUDED.status = 'valid' THEN NOW()
        ELSE einvoices.validated_at
      END
  `, [orderNumber, invoiceType, submissionUid, lhdnUuid,
      lhdnLongId, qrCodeUrl, status, errorMessage]);
}

// ─── Stage B2C order (no TIN) for consolidated invoice ────────────────────
async function stageForConsolidated({ orderNumber, subtotal, tax, year, month }) {
  await pool.query(`
    INSERT INTO consolidated_staging (order_number, subtotal, tax, year, month)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (order_number) DO NOTHING
  `, [orderNumber, subtotal, tax, year, month]);
}

// ─── Get all unstaged B2C orders for a given month ─────────────────────────
async function getStagedConsolidatedOrders(year, month) {
  const { rows } = await pool.query(`
    SELECT order_number AS "orderNumber",
           subtotal, tax
    FROM   consolidated_staging
    WHERE  year = $1
      AND  month = $2
      AND  consolidated_einvoice_id IS NULL
    ORDER  BY staged_at ASC
  `, [year, month]);
  return rows;
}

// ─── Mark orders as consolidated ──────────────────────────────────────────
async function markOrdersConsolidated(orderNumbers, einvoiceId) {
  await pool.query(`
    UPDATE consolidated_staging
    SET    consolidated_einvoice_id = $1,
           consolidated_at = NOW()
    WHERE  order_number = ANY($2::text[])
  `, [einvoiceId, orderNumbers]);
}

// ─── Save failed job to DB ─────────────────────────────────────────────────
async function saveFailedJob({ jobId, jobType, orderNumber, error, attempts, payload }) {
  await pool.query(`
    INSERT INTO failed_invoice_jobs
      (job_id, job_type, order_number, error, attempts, payload)
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [jobId, jobType, orderNumber, error, attempts, JSON.stringify(payload)]);
}

// ─── Mark failed job as resolved ──────────────────────────────────────────
async function resolveFailedJob(id, resolvedBy) {
  await pool.query(`
    UPDATE failed_invoice_jobs
    SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1
    WHERE id = $2
  `, [resolvedBy, id]);
}

// ─── Audit log ─────────────────────────────────────────────────────────────
async function auditLog({ orderNumber, action, endpoint, requestBody, responseBody, statusCode, durationMs }) {
  await pool.query(`
    INSERT INTO einvoice_audit_log
      (order_number, action, endpoint, request_body, response_body, status_code, duration_ms)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [
    orderNumber, action, endpoint,
    JSON.stringify(requestBody),
    JSON.stringify(responseBody),
    statusCode, durationMs,
  ]);
}

// ─── Queries for admin routes ──────────────────────────────────────────────
async function listInvoices({ limit = 50, offset = 0, status } = {}) {
  const whereClause = status ? 'WHERE status = $3' : '';
  const params = status ? [limit, offset, status] : [limit, offset];
  const { rows } = await pool.query(`
    SELECT * FROM einvoices
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `, params);
  return rows;
}

async function listFailedJobs(includeResolved = false) {
  const { rows } = await pool.query(`
    SELECT * FROM failed_invoice_jobs
    WHERE resolved = $1
    ORDER BY failed_at DESC
  `, [includeResolved]);
  return rows;
}

async function ping() {
  await pool.query('SELECT 1');
}

module.exports = {
  upsertInvoice,
  stageForConsolidated,
  getStagedConsolidatedOrders,
  markOrdersConsolidated,
  saveFailedJob,
  resolveFailedJob,
  auditLog,
  listInvoices,
  listFailedJobs,
  ping,
};
```


***

## Step 7: `services/auth.js` — Token Service

```js
const config = require('../config');
const db     = require('../db/invoice.db');

let _token  = null;
let _expiry = 0;

function getTokenUrl() {
  return config.URLS[config.ENV === 'production' ? 'production' : 'sandbox'].TOKEN;
}

async function getToken() {
  if (_token && Date.now() < _expiry) return _token;

  const start = Date.now();
  let responseBody, statusCode;

  try {
    const res = await fetch(getTokenUrl(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     config.CLIENT_ID,
        client_secret: config.CLIENT_SECRET,
        scope:         'InvoicingAPI',
      }),
    });

    statusCode   = res.status;
    responseBody = await res.json();

    if (!res.ok) {
      throw new Error(`Token request failed [${res.status}]: ${JSON.stringify(responseBody)}`);
    }

    _token  = responseBody.access_token;
    _expiry = Date.now() + (responseBody.expires_in - 60) * 1000;

    console.log(`[Auth] Token refreshed. Expires in ${responseBody.expires_in}s`);
    return _token;

  } catch (err) {
    // Log failed auth attempt for audit
    await db.auditLog({
      orderNumber:  null,
      action:       'auth',
      endpoint:     getTokenUrl(),
      requestBody:  { grant_type: 'client_credentials', client_id: config.CLIENT_ID },
      responseBody: responseBody || { error: err.message },
      statusCode:   statusCode || 0,
      durationMs:   Date.now() - start,
    }).catch(() => {}); // don't let audit failure crash auth

    throw new Error(`[Auth] ${err.message}`);
  }
}

async function apiHeaders(extra = {}) {
  const token = await getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    ...extra,
  };
}

// Force token refresh (call this if you get 401 mid-session)
function invalidateToken() {
  _token  = null;
  _expiry = 0;
  console.log('[Auth] Token invalidated. Will refresh on next request.');
}

module.exports = { getToken, apiHeaders, invalidateToken };
```


***

## Step 8: `middleware/errorHandler.js`

```js
module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[Error] ${req.method} ${req.path} — ${err.message}`);
  res.status(status).json({
    success: false,
    error:   err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
```


***

## Step 9: `index.js` — Minimal Phase 1 App

```js
require('dotenv').config();
const express    = require('express');
const config     = require('./config');
const { ping: dbPing } = require('./db/pool');

// Validate all required env vars before starting
config.validateConfig();

const app = express();
app.use(express.json());

// ── Health check (used in Phase 5 monitoring, useful now too) ────────────
app.get('/health', async (req, res) => {
  const checks = { api: true, database: false };
  try { await dbPing(); checks.database = true; } catch {}
  const healthy = Object.values(checks).every(Boolean);
  res.status(healthy ? 200 : 503).json({
    status:      healthy ? 'ok' : 'degraded',
    environment: config.ENV,
    checks,
    timestamp:   new Date().toISOString(),
  });
});

// ── Placeholder for invoice routes (added in Phase 2) ────────────────────
// app.use('/invoices', require('./routes/invoice.routes'));

app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[App] e-Invoice service running on port ${PORT}`);
  console.log(`[App] Environment: ${config.ENV.toUpperCase()}`);
});
```


***

## Step 10: Phase 1 Verification Script

Run this after setup to confirm everything works before moving to Phase 2:

```js
// __tests__/phase1.verify.js
// Run with: node __tests__/phase1.verify.js

require('dotenv').config();
const { getToken }  = require('../services/auth');
const { ping }      = require('../db/pool');
const config        = require('../config');

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: '✅ PASS' });
  } catch (err) {
    results.push({ name, status: `❌ FAIL — ${err.message}` });
  }
}

async function run() {
  console.log('\n🔍 Phase 1 Verification\n' + '─'.repeat(50));

  await check('Environment is sandbox', async () => {
    if (config.ENV === 'production') throw new Error('Should be sandbox for Phase 1');
  });

  await check('All required env vars present', async () => {
    config.validateConfig();
  });

  await check('Database connection', async () => {
    await ping();
  });

  await check('einvoices table exists', async () => {
    const { pool } = require('../db/pool');
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'einvoices'
    `);
    if (rows.length === 0) throw new Error('Table "einvoices" not found — run: npm run migrate');
  });

  await check('consolidated_staging table exists', async () => {
    const { pool } = require('../db/pool');
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'consolidated_staging'
    `);
    if (rows.length === 0) throw new Error('Table "consolidated_staging" not found');
  });

  await check('einvoice_audit_log table exists', async () => {
    const { pool } = require('../db/pool');
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'einvoice_audit_log'
    `);
    if (rows.length === 0) throw new Error('Table "einvoice_audit_log" not found');
  });

  await check('failed_invoice_jobs table exists', async () => {
    const { pool } = require('../db/pool');
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'failed_invoice_jobs'
    `);
    if (rows.length === 0) throw new Error('Table "failed_invoice_jobs" not found');
  });

  await check('LHDN sandbox token fetch', async () => {
    const token = await getToken();
    if (!token || token.length < 10) throw new Error('Token returned is empty or invalid');
    console.log(`   Token preview: ${token.slice(0, 30)}...`);
  });

  await check('Token caching works (second call uses cache)', async () => {
    const t1 = await getToken();
    const t2 = await getToken();
    if (t1 !== t2) throw new Error('Token was not cached — two different tokens returned');
  });

  await check('DB audit log write works', async () => {
    const db = require('../db/invoice.db');
    await db.auditLog({
      orderNumber:  'PHASE1-VERIFY',
      action:       'phase1-check',
      endpoint:     '/verify',
      requestBody:  { test: true },
      responseBody: { ok: true },
      statusCode:   200,
      durationMs:   1,
    });
  });

  // ── Print results ──────────────────────────────────────────────────────
  console.log('\n📋 Results\n' + '─'.repeat(50));
  results.forEach(r => console.log(`${r.status}  ${r.name}`));

  const passed = results.filter(r => r.status.startsWith('✅')).length;
  const failed = results.filter(r => r.status.startsWith('❌')).length;

  console.log('\n' + '─'.repeat(50));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 Phase 1 complete! Ready to start Phase 2.\n');
  } else {
    console.log('\n⚠️  Fix the failing checks above before proceeding to Phase 2.\n');
    process.exit(1);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Verification crashed:', err.message);
  process.exit(1);
});
```


***

## Step 11: Jest Unit Tests for `auth.js`

```js
// __tests__/auth.test.js
require('dotenv').config();
const { getToken, invalidateToken } = require('../services/auth');

describe('Auth Service', () => {

  beforeEach(() => {
    invalidateToken(); // force fresh token each test
  });

  test('fetches a valid access token from LHDN sandbox', async () => {
    const token = await getToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  }, 15000);

  test('returns cached token on second call', async () => {
    const t1 = await getToken();
    const t2 = await getToken();
    expect(t1).toBe(t2); // same reference = cached
  }, 15000);

  test('refreshes token after invalidation', async () => {
    const t1 = await getToken();
    invalidateToken();
    const t2 = await getToken();
    // Both are valid tokens — may or may not be the same string depending on LHDN
    expect(typeof t2).toBe('string');
    expect(t2.length).toBeGreaterThan(20);
  }, 15000);

});
```


***

## Run Order for Phase 1

```bash
# 1. Install dependencies
npm install

# 2. Set up your .env from .env.example
cp .env.example .env
# → fill in CLIENT_ID, CLIENT_SECRET, DB credentials

# 3. Create the database (PostgreSQL)
createdb einvoice_db

# 4. Run migrations
npm run migrate

# 5. Start the app
npm run dev
# → Test health: curl http://localhost:3000/health

# 6. Run unit tests
npm test

# 7. Run Phase 1 full verification
node __tests__/phase1.verify.js
```


### Expected verification output

```
🔍 Phase 1 Verification
──────────────────────────────────────────────────
   Token preview: eyJhbGciOiJSUzI1NiIsInR5cCI6...

📋 Results
──────────────────────────────────────────────────
✅ PASS  Environment is sandbox
✅ PASS  All required env vars present
✅ PASS  Database connection
✅ PASS  einvoices table exists
✅ PASS  consolidated_staging table exists
✅ PASS  einvoice_audit_log table exists
✅ PASS  failed_invoice_jobs table exists
✅ PASS  LHDN sandbox token fetch
✅ PASS  Token caching works (second call uses cache)
✅ PASS  DB audit log write works

──────────────────────────────────────────────────
Total: 10 passed, 0 failed

🎉 Phase 1 complete! Ready to start Phase 2.
```

Once all 10 checks pass, Phase 1 is done and you are ready to build the document builder, digital signer, and LHDN submission layer in Phase 2.

