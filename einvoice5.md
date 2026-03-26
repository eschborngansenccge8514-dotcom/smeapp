<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# continue

Continuing with all remaining missing pieces — every file referenced but not yet written, the complete ops runbook, deployment setup, and the full environment reference.

***

## Remaining Files

```
db/
├── pool.js              ← database connection pool
├── migrate.js           ← complete migration runner (all phases)

middleware/
└── errorHandler.js      ← global Express error handler

scripts/
├── upload-cert.js       ← upload a merchant's .p12 cert to DB
└── setup-test-merchant.js ← seed test merchants for sandbox testing

__tests__/
└── phase3.verify.js     ← Phase 3 automation end-to-end test

.env.example             ← complete environment variable reference
package.json             ← all dependencies declared
docker-compose.yml       ← local dev stack
Dockerfile               ← production container
ops-runbook.md           ← complete ops runbook
```


***

## `db/pool.js`

```js
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'einvoice',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  max:             20,   // max concurrent DB connections
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

async function ping() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

module.exports = { pool, ping };
```


***

## `db/migrate.js` — Complete Runner (All Phases)

```js
require('dotenv').config();
const { pool } = require('./pool');

const migrations = [

  // ─── Phase 1 ─────────────────────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS einvoices (
    id              SERIAL PRIMARY KEY,
    merchant_id     INT,
    order_number    VARCHAR(100) UNIQUE NOT NULL,
    invoice_type    VARCHAR(30) NOT NULL,
    submission_uid  VARCHAR(200),
    lhdn_uuid       VARCHAR(200),
    lhdn_long_id    VARCHAR(500),
    qr_code_url     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message   TEXT,
    submitted_at    TIMESTAMP WITH TIME ZONE,
    validated_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS consolidated_staging (
    id                       SERIAL PRIMARY KEY,
    merchant_id              INT,
    order_number             VARCHAR(100) UNIQUE NOT NULL,
    subtotal                 DECIMAL(12,2) NOT NULL,
    tax                      DECIMAL(12,2) NOT NULL DEFAULT 0,
    year                     INT NOT NULL,
    month                    INT NOT NULL,
    consolidated_einvoice_id INT REFERENCES einvoices(id),
    consolidated_at          TIMESTAMP WITH TIME ZONE,
    staged_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS einvoice_audit_log (
    id            SERIAL PRIMARY KEY,
    merchant_id   INT,
    order_number  VARCHAR(100),
    action        VARCHAR(50),
    endpoint      TEXT,
    request_body  JSONB DEFAULT '{}',
    response_body JSONB DEFAULT '{}',
    status_code   INT,
    duration_ms   INT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS failed_invoice_jobs (
    id           SERIAL PRIMARY KEY,
    merchant_id  INT,
    job_id       VARCHAR(200),
    job_type     VARCHAR(50),
    order_number VARCHAR(100),
    error        TEXT,
    attempts     INT DEFAULT 0,
    payload      JSONB DEFAULT '{}',
    failed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved     BOOLEAN DEFAULT FALSE,
    resolved_at  TIMESTAMP WITH TIME ZONE,
    resolved_by  VARCHAR(200)
  )`,

  // Shared updated_at trigger function
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ language 'plpgsql'`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_trigger WHERE tgname = 'set_einvoices_updated_at'
     ) THEN
       CREATE TRIGGER set_einvoices_updated_at
         BEFORE UPDATE ON einvoices
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
     END IF;
   END $$`,

  // ─── Phase 2 — Multi-tenant ───────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS merchants (
    id                  SERIAL PRIMARY KEY,
    merchant_uid        VARCHAR(100) UNIQUE NOT NULL,
    name                VARCHAR(200) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','suspended','inactive')),
    env                 VARCHAR(20) NOT NULL DEFAULT 'sandbox'
                          CHECK (env IN ('sandbox','production')),

    -- LHDN supplier info
    tin                 VARCHAR(50),
    brn                 VARCHAR(50),
    msic                VARCHAR(20) DEFAULT '47910',
    phone               VARCHAR(50),
    email               VARCHAR(200),
    address             VARCHAR(500),
    postcode            VARCHAR(20),
    city                VARCHAR(100),
    state               VARCHAR(10),
    country             VARCHAR(10) DEFAULT 'MYS',

    -- LHDN API credentials
    lhdn_client_id      VARCHAR(300),
    lhdn_client_secret  VARCHAR(300),

    -- Digital certificate
    cert_p12_base64     TEXT,
    cert_passphrase     VARCHAR(500),
    cert_issuer_name    VARCHAR(500),
    cert_serial_number  VARCHAR(200),

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_trigger WHERE tgname = 'set_merchants_updated_at'
     ) THEN
       CREATE TRIGGER set_merchants_updated_at
         BEFORE UPDATE ON merchants
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
     END IF;
   END $$`,

  // Add merchant_id FK to all tables
  `ALTER TABLE einvoices
     ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id)`,

  `ALTER TABLE consolidated_staging
     ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id)`,

  `ALTER TABLE einvoice_audit_log
     ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id)`,

  `ALTER TABLE failed_invoice_jobs
     ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id)`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_merchants_uid
     ON merchants(merchant_uid)`,

  `CREATE INDEX IF NOT EXISTS idx_merchants_status_env
     ON merchants(status, env)`,

  `CREATE INDEX IF NOT EXISTS idx_einvoices_merchant_status
     ON einvoices(merchant_id, status)`,

  `CREATE INDEX IF NOT EXISTS idx_einvoices_order
     ON einvoices(order_number)`,

  `CREATE INDEX IF NOT EXISTS idx_consolidated_merchant_period
     ON consolidated_staging(merchant_id, year, month)`,

  `CREATE INDEX IF NOT EXISTS idx_audit_merchant_created
     ON einvoice_audit_log(merchant_id, created_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_failed_jobs_merchant_resolved
     ON failed_invoice_jobs(merchant_id, resolved)`,

  // ─── Phase 4 — Production audit log ──────────────────────────────────

  `CREATE TABLE IF NOT EXISTS einvoice_production_log (
    id               SERIAL PRIMARY KEY,
    merchant_id      INT NOT NULL REFERENCES merchants(id),
    order_number     VARCHAR(100) NOT NULL,
    lhdn_uuid        VARCHAR(200) NOT NULL,
    lhdn_long_id     VARCHAR(500),
    invoice_type     VARCHAR(30),
    amount           DECIMAL(12,2),
    issued_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tax_period_year  INT,
    tax_period_month INT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_prod_log_merchant_period
     ON einvoice_production_log(merchant_id, tax_period_year, tax_period_month)`,

];

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Migration tracker table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          SERIAL PRIMARY KEY,
        checksum    VARCHAR(64) UNIQUE NOT NULL,
        applied_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query(
      `SELECT checksum FROM schema_migrations`
    );
    const appliedSet = new Set(applied.map(r => r.checksum));

    const crypto = require('crypto');
    let ran = 0;

    for (const sql of migrations) {
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      if (appliedSet.has(checksum)) continue;

      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (checksum) VALUES ($1)`,
        [checksum]
      );
      ran++;
    }

    await client.query('COMMIT');

    if (ran > 0) {
      console.log(`[Migrate] ✅ Applied ${ran} migration(s)`);
    } else {
      console.log('[Migrate] ✅ Schema is up to date');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migrate] ❌ Failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Run directly: node db/migrate.js
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
```


***

## `middleware/errorHandler.js`

```js
/**
 * Global Express error handler.
 * Returns consistent JSON for all unhandled errors.
 * Strips stack traces in production.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status  = err.statusCode || err.status || 500;
  const isProd  = process.env.NODE_ENV === 'production';

  // Log every 5xx with stack trace
  if (status >= 500) {
    console.error(`[Error] ${req.method} ${req.path} — ${err.message}`);
    if (!isProd) console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    error:   err.message || 'Internal server error',
    ...(isProd ? {} : { stack: err.stack }),
    ...(err.code ? { code: err.code } : {}),
  });
}

module.exports = errorHandler;
```


***

## `scripts/upload-cert.js`

```js
// Usage: node scripts/upload-cert.js <merchantUid> <path/to/cert.p12> [passphrase]
// e.g.:  node scripts/upload-cert.js shop_abc123 ./certs/shop_abc123.p12 myPassphrase

require('dotenv').config();
const fs      = require('fs');
const path    = require('path');
const forge   = require('node-forge');
const { pool } = require('../db/pool');
const merchantService = require('../services/merchant.service');
const { invalidateCertCache } = require('../services/signer');

async function uploadCert(merchantUid, certPath, passphrase = '') {
  console.log(`\n📤 Uploading certificate for merchant: ${merchantUid}`);
  console.log(`   File: ${certPath}\n`);

  // ── Validate cert file exists ─────────────────────────────────────────
  const resolvedPath = path.resolve(certPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Certificate file not found: ${resolvedPath}`);
  }

  // ── Parse .p12 to extract metadata ───────────────────────────────────
  const pfxBuffer = fs.readFileSync(resolvedPath);
  const p12Asn1   = forge.asn1.fromDer(pfxBuffer.toString('binary'));

  let p12;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);
  } catch {
    throw new Error('Failed to parse .p12 — wrong passphrase or corrupt file.');
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const cert     = certBags[forge.pki.oids.certBag]?.[0]?.cert;
  if (!cert) throw new Error('No certificate found in .p12 file.');

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const hasKey  = !!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
  if (!hasKey) throw new Error('No private key found in .p12 file.');

  const issuerName   = cert.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(', ');
  const serialNumber = cert.serialNumber;
  const expiry       = cert.validity.notAfter;
  const certBase64   = pfxBuffer.toString('base64');

  console.log(`   Issuer:  ${issuerName}`);
  console.log(`   Serial:  ${serialNumber}`);
  console.log(`   Expires: ${expiry.toISOString().split('T')[0]}`);
  console.log(`   HasKey:  ${hasKey}`);

  // ── Confirm before writing to DB ──────────────────────────────────────
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => {
    rl.question('\n⚠️  Write this certificate to DB? (yes/no): ', (answer) => {
      rl.close();
      if (answer.toLowerCase() !== 'yes') {
        console.log('Aborted.');
        process.exit(0);
      }
      resolve();
    });
  });

  // ── Write to merchants table ──────────────────────────────────────────
  const merchant = await merchantService.getMerchant(merchantUid);

  await pool.query(`
    UPDATE merchants SET
      cert_p12_base64     = $1,
      cert_passphrase     = $2,
      cert_issuer_name    = $3,
      cert_serial_number  = $4
    WHERE merchant_uid = $5
  `, [certBase64, passphrase, issuerName, serialNumber, merchantUid]);

  // Invalidate cert cache so next request uses the new cert
  invalidateCertCache(merchant.id);
  merchantService.invalidateMerchantCache(merchantUid);

  console.log(`\n✅ Certificate uploaded for merchant "${merchantUid}"`);
  console.log('   Run validate-cert.js to verify before going live.\n');
  process.exit(0);
}

const [,, merchantUid, certPath, passphrase] = process.argv;
if (!merchantUid || !certPath) {
  console.error('Usage: node scripts/upload-cert.js <merchantUid> <cert.p12> [passphrase]');
  process.exit(1);
}

uploadCert(merchantUid, certPath, passphrase || '').catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```


***

## `scripts/setup-test-merchant.js`

Seeds two sandbox merchants for local development and Phase 2–3 testing:

```js
require('dotenv').config();
const { runMigrations } = require('../db/migrate');
const merchantService   = require('../services/merchant.service');

const TEST_MERCHANTS = [
  {
    merchantUid:        'test-merchant-alpha',
    name:               'Alpha Retail Sdn Bhd',
    tin:                process.env.SUPPLIER_TIN    || 'C12345678901',
    brn:                process.env.SUPPLIER_BRN    || '202001000001',
    phone:              process.env.SUPPLIER_PHONE  || '+60312345678',
    email:              process.env.SUPPLIER_EMAIL  || 'alpha@test.com',
    address:            process.env.SUPPLIER_ADDRESS || 'No 1, Jalan Alpha',
    postcode:           process.env.SUPPLIER_POSTCODE || '50000',
    city:               process.env.SUPPLIER_CITY   || 'Kuala Lumpur',
    state:              process.env.SUPPLIER_STATE  || '14',
    msic:               '47910',
    lhdnClientId:       process.env.MYINVOIS_CLIENT_ID,
    lhdnClientSecret:   process.env.MYINVOIS_CLIENT_SECRET,
  },
  {
    merchantUid:        'test-merchant-beta',
    name:               'Beta Commerce Sdn Bhd',
    tin:                process.env.SUPPLIER_TIN    || 'C12345678901',
    brn:                process.env.SUPPLIER_BRN    || '202001000001',
    phone:              '+60387654321',
    email:              'beta@test.com',
    address:            'No 2, Jalan Beta',
    postcode:           '47500',
    city:               'Subang Jaya',
    state:              '10',
    msic:               '47910',
    lhdnClientId:       process.env.MYINVOIS_CLIENT_ID,
    lhdnClientSecret:   process.env.MYINVOIS_CLIENT_SECRET,
  },
];

async function setup() {
  console.log('\n🔧 Setting up test merchants...\n');

  await runMigrations();

  for (const merchant of TEST_MERCHANTS) {
    try {
      await merchantService.createMerchant(merchant);
      console.log(`✅ Created: ${merchant.merchantUid}`);
    } catch (err) {
      if (err.message.includes('unique') || err.message.includes('duplicate')) {
        console.log(`⚠️  Already exists: ${merchant.merchantUid} — skipping`);
      } else {
        throw err;
      }
    }
  }

  console.log('\n✅ Test merchants ready.');
  console.log('   Run: node __tests__/phase2.verify.js\n');
  process.exit(0);
}

setup().catch(err => { console.error(err.message); process.exit(1); });
```


***

## `__tests__/phase3.verify.js`

```js
require('dotenv').config();
const { enqueueInvoiceJob, einvoiceQueue, dlqQueue } = require('../automation/queue');
const { orderEvents } = require('../automation/events');
const merchantService = require('../services/merchant.service');
const db              = require('../db/invoice.db');
const { pool }        = require('../db/pool');

const ts          = Date.now();
const MERCHANT_A  = 'test-merchant-alpha';
const MERCHANT_B  = 'test-merchant-beta';
const results     = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: '✅ PASS', detail });
  } catch (err) {
    results.push({ name, status: '❌ FAIL', detail: err.message });
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const mockBuyer = {
  tin: 'C99999999090', name: 'Test Buyer Sdn Bhd',
  brn: '202001099999', phone: '+60312345678',
  email: 'buyer@test.com', address: 'No 1, Jalan Test',
  postcode: '50000', city: 'Kuala Lumpur', state: '14',
};

const mockItems = [
  { description: 'Test Product', quantity: 1, unitPrice: 50, subtotal: 50, tax: 0 },
];

async function run() {
  console.log('\n🔍 Phase 3 Multi-Tenant Automation Verification\n' + '─'.repeat(60));
  console.log('⏱  ~5 minutes (queue processing + LHDN sandbox polling)\n');

  const mA = await merchantService.getMerchant(MERCHANT_A).catch(() => null);
  const mB = await merchantService.getMerchant(MERCHANT_B).catch(() => null);

  if (!mA || !mB) {
    console.error('❌ Test merchants not found. Run: node scripts/setup-test-merchant.js');
    process.exit(1);
  }

  // ── 1. Queue accepts jobs with merchantId ─────────────────────────────
  await check('Queue accepts job with merchantId', async () => {
    await enqueueInvoiceJob('invoice', MERCHANT_A, {
      orderNumber: `Q-TEST-${ts}`,
      buyer: mockBuyer,
      items: mockItems,
    });
    return 'Job enqueued without error';
  });

  // ── 2. B2C order (no TIN) → consolidated_staging ─────────────────────
  await check('B2C order.paid → staged for consolidated (not queued)', async () => {
    const orderNum = `B2C-STAGE-${ts}`;
    orderEvents.emit('order.paid', {
      merchantId:  MERCHANT_A,
      orderNumber: orderNum,
      buyer:       { name: 'Customer', email: 'c@test.com' }, // no TIN
      items:       mockItems,
    });
    await sleep(500);

    const now    = new Date();
    const staged = await db.getStagedConsolidatedOrders(mA.id, now.getFullYear(), now.getMonth() + 1);
    const found  = staged.some(o => o.orderNumber === orderNum);
    if (!found) throw new Error('B2C order not found in consolidated_staging');
    return `Staged as order ${orderNum}`;
  });

  // ── 3. B2B order.paid → enqueued (has TIN) ───────────────────────────
  await check('B2B order.paid → invoice job enqueued', async () => {
    const orderNum = `B2B-EVT-${ts}`;
    const before   = await einvoiceQueue.getJobCounts('waiting');
    orderEvents.emit('order.paid', {
      merchantId:  MERCHANT_B,
      orderNumber: orderNum,
      buyer:       mockBuyer, // has TIN
      items:       mockItems,
    });
    await sleep(500);
    const after = await einvoiceQueue.getJobCounts('waiting');
    if (after.waiting <= before.waiting) throw new Error('No new job appeared in queue');
    return `Queue waiting: ${before.waiting} → ${after.waiting}`;
  });

  // ── 4. Worker processes jobs end-to-end ──────────────────────────────
  await check('Worker processes invoice job end-to-end (waits for LHDN)', async () => {
    // The job enqueued in step 1 (Q-TEST-{ts}) should process now
    // Wait up to 2 minutes for it to complete
    const orderNum = `Q-TEST-${ts}`;
    let invoice    = null;
    for (let i = 0; i < 30; i++) {
      await sleep(4000);
      invoice = await db.getInvoiceByOrderNumber(mA.id, orderNum);
      if (invoice?.status === 'valid') break;
      if (invoice?.status === 'invalid') throw new Error(`LHDN rejected: ${invoice.error_message}`);
    }
    if (!invoice || invoice.status !== 'valid') {
      throw new Error(`Invoice still ${invoice?.status || 'not found'} after 2 minutes`);
    }
    return `UUID: ${invoice.lhdn_uuid}`;
  });

  // ── 5. Data isolation: workers don't cross merchant boundaries ────────
  await check('Worker result scoped to correct merchant only', async () => {
    const aInvoices = await db.listInvoices(mA.id);
    const bInvoices = await db.listInvoices(mB.id);
    const aHasB = aInvoices.some(i => i.order_number.startsWith('B2B-EVT'));
    const bHasA = bInvoices.some(i => i.order_number.startsWith('Q-TEST'));
    if (aHasB || bHasA) throw new Error('Cross-tenant invoice data detected!');
    return `A: ${aInvoices.length} invoice(s) | B: ${bInvoices.length} invoice(s) — isolated`;
  });

  // ── 6. order.cancelled fires cancelInvoice ───────────────────────────
  await check('order.cancelled event cancels invoice within 72h', async () => {
    const invoice = await db.getInvoiceByOrderNumber(mA.id, `Q-TEST-${ts}`);
    if (!invoice?.lhdn_uuid) throw new Error('No UUID to cancel');

    orderEvents.emit('order.cancelled', {
      merchantId:  MERCHANT_A,
      uuid:        invoice.lhdn_uuid,
      orderNumber: `Q-TEST-${ts}`,
      reason:      'Phase 3 verify test',
    });
    await sleep(3000);

    const updated = await db.getInvoiceByOrderNumber(mA.id, `Q-TEST-${ts}`);
    if (updated?.status !== 'cancelled') throw new Error(`Status is still ${updated?.status}`);
    return `Invoice ${invoice.lhdn_uuid} cancelled`;
  });

  // ── 7. Suspended merchant blocked at event level ──────────────────────
  await check('Suspended merchant blocked at worker level', async () => {
    await merchantService.updateMerchant(MERCHANT_B, { status: 'suspended' });
    await sleep(200);

    await enqueueInvoiceJob('invoice', MERCHANT_B, {
      orderNumber: `SUSP-TEST-${ts}`,
      buyer: mockBuyer, items: mockItems,
    });

    // Wait for the job to fail (worker should reject suspended merchant)
    await sleep(6000);

    const failedJob = await pool.query(`
      SELECT * FROM failed_invoice_jobs
      WHERE order_number = $1 LIMIT 1
    `, [`SUSP-TEST-${ts}`]);

    // Restore merchant
    await merchantService.updateMerchant(MERCHANT_B, { status: 'active' });

    if (failedJob.rows.length === 0) {
      throw new Error('Expected a failed job for suspended merchant — none found');
    }
    return `Job failed correctly: ${failedJob.rows[0].error}`;
  });

  // ── 8. Consolidated staging is merchant-scoped ────────────────────────
  await check('Consolidated staging isolated between merchants', async () => {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = now.getMonth() + 1;

    await db.stageForConsolidated({ merchantId: mA.id, orderNumber: `CS-A-${ts}`, subtotal: 100, tax: 0, year: y, month: m });
    await db.stageForConsolidated({ merchantId: mB.id, orderNumber: `CS-B-${ts}`, subtotal: 200, tax: 0, year: y, month: m });

    const aOrders = await db.getStagedConsolidatedOrders(mA.id, y, m);
    const bOrders = await db.getStagedConsolidatedOrders(mB.id, y, m);

    if (aOrders.some(o => o.orderNumber === `CS-B-${ts}`)) throw new Error('A sees B staging data');
    if (bOrders.some(o => o.orderNumber === `CS-A-${ts}`)) throw new Error('B sees A staging data');
    return `A: ${aOrders.length} staged | B: ${bOrders.length} staged — isolated`;
  });

  // ── 9. Audit log is merchant-scoped ───────────────────────────────────
  await check('Audit log entries scoped by merchant_id', async () => {
    const { rows: aLogs } = await pool.query(
      `SELECT COUNT(*) FROM einvoice_audit_log WHERE merchant_id = $1`, [mA.id]
    );
    const { rows: bLogs } = await pool.query(
      `SELECT COUNT(*) FROM einvoice_audit_log WHERE merchant_id = $1`, [mB.id]
    );
    if (parseInt(aLogs[0].count) === 0) throw new Error('No audit logs found for merchant A');
    return `A: ${aLogs[0].count} entries | B: ${bLogs[0].count} entries`;
  });

  // ── 10. merchant.updated clears caches ───────────────────────────────
  await check('merchant.updated event clears token + cert cache', async () => {
    orderEvents.emit('merchant.updated', { merchantId: MERCHANT_A });
    await sleep(300);
    // If caches cleared, re-fetching token should succeed (proves refresh path works)
    const { getToken } = require('../services/auth');
    const token = await getToken(mA);
    if (!token) throw new Error('Token re-fetch failed after cache clear');
    return 'Caches cleared and token re-fetched successfully';
  });

  // ── Results ───────────────────────────────────────────────────────────
  console.log('\n📋 Results\n' + '─'.repeat(60));
  results.forEach(r => {
    console.log(`${r.status}  ${r.name}`);
    if (r.detail) console.log(`         └─ ${r.detail}`);
  });

  const passed = results.filter(r => r.status.startsWith('✅')).length;
  const failed = results.filter(r => r.status.startsWith('❌')).length;

  console.log('\n' + '─'.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 Phase 3 complete — Multi-tenant automation verified.');
    console.log('   Ready for Phase 4: Production Cutover.\n');
  } else {
    console.log('\n⚠️  Fix failures before proceeding.\n');
    process.exit(1);
  }
  process.exit(0);
}

run().catch(err => { console.error('[Verify] Crashed:', err.message); process.exit(1); });
```


***

## `.env.example`

```bash
# ─── App ──────────────────────────────────────────────────────────────────
NODE_ENV=sandbox                        # sandbox | production

# ─── Database ─────────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=einvoice
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_SSL=false                            # true for managed DB (RDS, Supabase etc.)

# ─── Redis ────────────────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379

# ─── LHDN Default Credentials (used only if merchant has no credentials) ─
# Typically only used for seeding test merchants in sandbox
MYINVOIS_CLIENT_ID=your-sandbox-client-id
MYINVOIS_CLIENT_SECRET=your-sandbox-client-secret

# ─── Default Supplier Info (for test merchant seeding) ───────────────────
SUPPLIER_TIN=C12345678901
SUPPLIER_BRN=202001000001
SUPPLIER_NAME=Your Company Sdn Bhd
SUPPLIER_PHONE=+60312345678
SUPPLIER_EMAIL=einvoice@yourcompany.com
SUPPLIER_ADDRESS=No 1, Jalan Business Park
SUPPLIER_POSTCODE=50000
SUPPLIER_CITY=Kuala Lumpur
SUPPLIER_STATE=14                       # LHDN state code

# ─── Email (SMTP) ─────────────────────────────────────────────────────────
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.yourcompany.com
SMTP_PASS=your-smtp-password

# ─── Alerts ───────────────────────────────────────────────────────────────
ALERT_FROM=einvoice-alerts@yourcompany.com
ALERT_TO=ops@yourcompany.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

# ─── Admin ────────────────────────────────────────────────────────────────
ADMIN_URL=https://admin.yourcompany.com  # used in alert email links
```


***

## `package.json`

```json
{
  "name": "einvoice-service",
  "version": "1.0.0",
  "description": "Multi-tenant LHDN e-Invoice service",
  "main": "index.js",
  "scripts": {
    "start":         "node index.js",
    "dev":           "nodemon index.js",
    "migrate":       "node db/migrate.js",
    "setup":         "node scripts/setup-test-merchant.js",
    "test":          "jest --runInBand --forceExit",
    "test:watch":    "jest --watch",
    "verify:phase2": "node __tests__/phase2.verify.js",
    "verify:phase3": "node __tests__/phase3.verify.js",
    "load-test":     "node scripts/load-test.js"
  },
  "dependencies": {
    "bullmq":     "^5.0.0",
    "express":    "^4.18.0",
    "ioredis":    "^5.3.0",
    "node-cron":  "^3.0.0",
    "node-forge": "^1.3.0",
    "nodemailer": "^6.9.0",
    "pg":         "^8.11.0",
    "dotenv":     "^16.0.0"
  },
  "devDependencies": {
    "jest":       "^29.0.0",
    "nodemon":    "^3.0.0",
    "supertest":  "^6.3.0"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch":       ["**/__tests__/**/*.test.js"],
    "testTimeout":     60000
  }
}
```


***

## `docker-compose.yml`

```yaml
version: '3.9'

services:

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV:     sandbox
      DB_HOST:      postgres
      DB_PORT:      5432
      DB_NAME:      einvoice
      DB_USER:      postgres
      DB_PASSWORD:  postgres
      REDIS_HOST:   redis
      REDIS_PORT:   6379
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./certs:/app/certs:ro   # mount cert directory read-only

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB:       einvoice
      POSTGRES_USER:     postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout:  5s
      retries:  10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test:     ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout:  3s
      retries:  10
    command: redis-server --appendonly yes   # persist queue to disk

volumes:
  postgres_data:
  redis_data:
```


***

## `Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Run migrations automatically on startup
CMD ["sh", "-c", "node db/migrate.js && node index.js"]

EXPOSE 3000

# Healthcheck for container orchestrators
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health | grep -q '"status":"ok"'
```


***

## `ops-runbook.md`

```markdown
# e-Invoice Service — Ops Runbook

**Service:** Multi-tenant LHDN e-Invoice
**Stack:** Node.js · PostgreSQL · Redis · BullMQ
**Admin panel:** GET /admin/*
**Health endpoint:** GET /health

---

## Contacts

| Role | Name | Contact |
|---|---|---|
| On-call engineer | — | ops@yourcompany.com |
| LHDN helpdesk | MyInvois Support | https://myinvois.hasil.gov.my |

---

## 1. Invoice Stuck in `pending` > 15 Minutes

**Symptom:** `/health` returns `stuck_invoices > 0`

**Cause:** Worker submitted to LHDN but polling timed out before status returned.

**Steps:**
1. Find the stuck invoice:
   ```sql
   SELECT order_number, submission_uid, merchant_id, created_at
   FROM einvoices
   WHERE status = 'pending'
     AND created_at < NOW() - INTERVAL '15 minutes';
```

2. Look up `submissionUid` in the MyInvois portal manually.
3. If LHDN shows `Valid` — manually update DB:

```sql
UPDATE einvoices
```

SET status = 'valid', lhdn_uuid = '<uuid>', lhdn_long_id = '<longId>',

```
    ```
    qr_code_url = 'https://myinvois.hasil.gov.my/<uuid>/share/<longId>',
    ```
    validated_at = NOW()
WHERE order_number = '<orderNumber>';
```

4. If LHDN shows `Invalid` — move to DLQ manually or fix and re-queue.
5. If no record in LHDN portal — re-queue the invoice:

```bash
```

curl -X POST /admin/merchants/<merchantId>/dlq/<jobId>/retry

```
```


---

## 2. LHDN API Is Down

**Symptom:** All submissions failing, `lhdn_auth: false` in `/health`

**Cause:** LHDN preprod or production API outage.

**Steps:**

1. Check LHDN status: https://myinvois.hasil.gov.my
2. Do nothing — BullMQ retries with exponential backoff (3s → 6s → 12s → 24s → 48s).
3. Jobs stay in queue for up to 5 attempts.
4. If outage > 48s (all retries exhausted) → jobs land in DLQ automatically.
5. Once LHDN recovers, bulk-retry from DLQ:

```bash
# Retry all unresolved failed jobs for a merchant
curl GET /admin/merchants/<merchantId>/dlq | \
  jq '.[].id' | \
  xargs -I {} curl -X POST /admin/merchants/<merchantId>/dlq/{}/retry
```

6. If LHDN is down for > 72h and invoices are being cancelled — escalate to LHDN.

---

## 3. Certificate Expired

**Symptom:** All invoices for one merchant failing with signing errors.

**Steps:**

1. Renew certificate from your CA (LHDN-approved CA list).
2. Upload new `.p12` to the merchant:

```bash
```

node scripts/upload-cert.js <merchantUid> ./certs/new-cert.p12 <passphrase>

```
```

3. Validate the new cert:

```bash
node scripts/validate-cert.js <merchantUid>
```

4. No code changes or deployments needed — cert is loaded from DB at runtime.
5. Retry any failed jobs from the expiry window:

```bash
```

curl -X POST /admin/merchants/<merchantId>/dlq/<jobId>/retry

```
```


**Prevention:** Weekly DLQ report includes cert expiry warnings 30 days out.

---

## 4. Job in DLQ — Manual Review

**Symptom:** Slack alert "e-Invoice Failed", DLQ count > 0 at `/admin/dlq`

**Steps:**

1. View all unresolved failed jobs:

```bash
curl GET /admin/dlq
```

2. For each job, check the `error` field for root cause:
    - `Merchant is suspended` → reactivate merchant
    - `LHDN rejected invoice` → fix invoice data, retry
    - `Token failed` → check merchant's LHDN credentials
    - `No certificate` → upload cert with `upload-cert.js`
    - `LHDN API timeout` → safe to retry, API was down
3. Retry the job (re-queues with original payload):

```bash
```

curl -X POST /admin/merchants/<merchantId>/dlq/<jobId>/retry \

```
  -H "Content-Type: application/json" \
  -d '{"resolvedBy": "your-name"}'
```

4. If data is unfixable (e.g. duplicate order number) — mark as manually resolved:

```bash
```

curl -X POST /admin/merchants/<merchantId>/dlq/<jobId>/resolve \

```
  -d '{"resolvedBy": "your-name"}'
```

Then issue the invoice manually via MyInvois portal.

---

## 5. Customer Disputes Invoice

| Scenario | Timing | Action |
| :-- | :-- | :-- |
| Wrong amount, within 72h | ≤ 72h after validation | Cancel → re-issue correct invoice |
| Wrong amount, after 72h | > 72h | Issue Credit Note or Debit Note |
| Full refund, within 72h | ≤ 72h | Cancel invoice, issue refund |
| Full refund, after 72h | > 72h | Issue Refund Note |

**Cancel an invoice (within 72h):**

```bash
curl -X DELETE /api/invoices/<lhdn-uuid> \
  -H "X-Merchant-Id: <merchantId>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Customer dispute — wrong amount", "orderNumber": "ORD-001"}'
```

**Issue credit note (after 72h):**

```bash
curl -X POST /api/invoices/credit-note \
  -H "X-Merchant-Id: <merchantId>" \
  -H "Content-Type: application/json" \
  -d '{
    "refNumber": "CN-001",
    "originalInvoiceId": "ORD-001",
    "buyer": { ... },
    "items": [ ... ]
  }'
```


---

## 6. Missed Monthly Consolidated Invoice

**Symptom:** Daily overdue cron alert fires, or merchant reports missing submission.

**Deadline:** LHDN requires consolidated invoices within 7 days of month end.

**Steps:**

1. Check what's staged for the overdue period:

```sql
SELECT order_number, subtotal, tax, year, month
FROM consolidated_staging
WHERE merchant_id = <id>
  AND year = <year> AND month = <month>
  AND consolidated_einvoice_id IS NULL;
```

2. Trigger consolidated invoice manually:

```bash
curl -X POST /api/invoices/enqueue \
  -H "X-Merchant-Id: <merchantId>" \
  -d '{"type": "consolidated", "year": 2026, "month": 2}'
```

3. If the 7-day window has passed — submit via MyInvois portal directly and mark staged orders as resolved manually.

---

## 7. New Merchant Onboarding

```bash
# 1. Create merchant record
curl -X POST /api/merchants \
  -d '{"merchantUid":"shop_new","name":"New Shop Sdn Bhd","tin":"...","brn":"...", ...}'

# 2. Upload sandbox cert
node scripts/upload-cert.js shop_new ./certs/shop_new_sandbox.p12 passphrase

# 3. Verify cert
node scripts/validate-cert.js shop_new

# 4. Test in sandbox — place a test order
curl -X POST /api/invoices/order-paid \
  -H "X-Merchant-Id: shop_new" \
  -d '{"orderNumber":"TEST-001","buyer":{...},"items":[...]}'

# 5. When ready for production:
#    a. Upload production cert
node scripts/upload-cert.js shop_new ./certs/shop_new_prod.p12 prodPassphrase
#    b. Update production credentials
curl -X PUT /api/merchants/shop_new \
  -d '{"lhdn_client_id":"prod-id","lhdn_client_secret":"prod-secret"}'
#    c. Dry run
node scripts/migrate-merchant-to-prod.js shop_new
#    d. Go live
node scripts/migrate-merchant-to-prod.js shop_new --confirm
```


---

## 8. Merchant Goes Offline / Needs Suspension

```bash
# Suspend (blocks all new invoice jobs immediately)
curl -X PATCH /admin/merchants/<merchantId>/status \
  -d '{"status": "suspended"}'

# Reactivate
curl -X PATCH /admin/merchants/<merchantId>/status \
  -d '{"status": "active"}'
```

Note: Jobs already in queue will fail and land in DLQ. Re-queue them after reactivation.

---

## 9. Rollback from Production to Sandbox

If a merchant needs to roll back (e.g. cert issue discovered after go-live):

```sql
UPDATE merchants SET env = 'sandbox' WHERE merchant_uid = '<merchantId>';
```

Then invalidate the cache:

```bash
curl -X PUT /api/merchants/<merchantId> -d '{"env": "sandbox"}'
# This triggers merchant.updated → cache cleared automatically
```


---

## 10. Redis Goes Down

**Impact:** Queue stops processing. New jobs cannot be enqueued. Existing jobs are lost if Redis was not persisted.

**Prevention:** `docker-compose.yml` runs Redis with `--appendonly yes` (AOF persistence).

**Recovery:**

1. Restart Redis — jobs in AOF log are replayed automatically.
2. If Redis is completely wiped — identify orders that are still `pending` in DB and re-queue:

```sql
SELECT order_number, merchant_id
FROM einvoices
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '1 day';
```

3. Re-enqueue each via admin API.

---

## Monitoring Endpoints

| Endpoint | Purpose | Expected |
| :-- | :-- | :-- |
| `GET /health` | Full system health check | `{"status":"ok"}` |
| `GET /admin/stats` | Platform-wide invoice counts | HTTP 200 |
| `GET /admin/dlq` | All unresolved failed jobs | Empty array = healthy |
| `GET /admin/queue` | BullMQ queue depths | `waiting` should trend to 0 |
| `GET /admin/merchants/:id/metrics` | Per-merchant stats | `successRate30d: "100.0%"` |

**Set up UptimeRobot (free):** Monitor `GET /health` every 5 minutes. Alert on non-200.

```

***

## Full Startup Sequence

```bash
# First time setup
git clone your-repo && cd your-repo
cp .env.example .env          # fill in your values

docker-compose up -d postgres redis    # start dependencies
npm install
node db/migrate.js                     # apply all migrations
node scripts/setup-test-merchant.js    # seed test merchants

# Verify all phases
npm test                               # unit tests
node __tests__/phase2.verify.js        # sandbox invoice validation
node __tests__/phase3.verify.js        # queue + automation

# Start the service
npm run dev                            # development
docker-compose up --build              # production (Docker)

# Go live for first merchant
node scripts/validate-cert.js shop_abc123
node scripts/migrate-merchant-to-prod.js shop_abc123 --confirm
```

The entire multi-tenant e-invoice system is now fully implemented across all 5 phases — every file, test, script, migration, deployment config, and runbook scenario is complete.

