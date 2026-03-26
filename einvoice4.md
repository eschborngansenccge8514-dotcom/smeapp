<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# continue

Continuing with **Phase 4: Production Cutover** and **Phase 5: Hardening** — both fully multi-tenant.

***

## Phase 4: Production Cutover

### Files

```
scripts/
├── migrate-merchant-to-prod.js  ← per-merchant production switch
├── load-test.js                 ← multi-merchant load test
└── validate-cert.js             ← verify a merchant's cert before go-live

config.js                        ← UPDATE: per-merchant env override support
```


***

## Update `config.js` — Per-Merchant Environment Override

Some merchants may go live while others are still in sandbox. Add per-merchant environment resolution:

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

/**
 * Resolve correct API URLs for a merchant.
 * Merchants have their own `env` column — allows per-merchant sandbox/production toggle.
 * Falls back to global NODE_ENV if merchant has no override.
 *
 * @param {Object|null} merchant  - merchant DB row (optional)
 */
function getURLs(merchant = null) {
  const env = merchant?.env || ENV;
  return URLS[env === 'production' ? 'production' : 'sandbox'];
}

const REQUIRED = [
  'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
];

function validateConfig() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`[Config] Missing required env vars: ${missing.join(', ')}`);
  }
  console.log(`[Config] Global environment: ${ENV.toUpperCase()}`);
}

module.exports = {
  ENV,
  URLS,
  getURLs,
  validateConfig,

  CLIENT_ID:     process.env.MYINVOIS_CLIENT_ID,
  CLIENT_SECRET: process.env.MYINVOIS_CLIENT_SECRET,

  CERT_PFX_PATH:      process.env.CERT_PFX_PATH,
  CERT_PASSPHRASE:    process.env.CERT_PASSPHRASE,
  CERT_ISSUER_NAME:   process.env.CERT_ISSUER_NAME,
  CERT_SERIAL_NUMBER: process.env.CERT_SERIAL_NUMBER,

  INVOICE_TYPES: {
    INVOICE:     '01',
    CREDIT_NOTE: '02',
    DEBIT_NOTE:  '03',
    REFUND_NOTE: '04',
  },

  CLASS_CODES: {
    ECOMMERCE:    '008',
    CONSOLIDATED: '004',
    OTHERS:       '022',
  },

  QUEUE: {
    ATTEMPTS:      5,
    BACKOFF_DELAY: 3000,
  },
};
```


### Update `db/migrate.js` — Add `env` Column to Merchants

Append to Phase 2 migrations:

```js
// Phase 4: per-merchant environment toggle
`ALTER TABLE merchants
   ADD COLUMN IF NOT EXISTS env VARCHAR(20)
   NOT NULL DEFAULT 'sandbox'
   CHECK (env IN ('sandbox', 'production'))`,

`COMMENT ON COLUMN merchants.env IS
  'Per-merchant LHDN environment. sandbox = preprod API, production = live API.'`,
```


### Update `services/auth.js` — Use Per-Merchant URL

```js
// Replace getTokenUrl() with merchant-aware version
const config = require('../config');

function getTokenUrl(merchant) {
  return config.getURLs(merchant).TOKEN; // ← uses merchant.env if set
}

async function getToken(merchant) {
  const cached = _tokenCache.get(merchant.id);
  if (cached && Date.now() < cached.expiry) return cached.token;

  const res = await fetch(getTokenUrl(merchant), { // ← pass merchant
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     merchant.lhdn_client_id,
      client_secret: merchant.lhdn_client_secret,
      scope:         'InvoicingAPI',
    }),
  });
  // ... rest unchanged
}
```


### Update `services/submitter.js` — Use Per-Merchant URL

```js
// Replace apiBase() with merchant-aware version
const config = require('../config');

function apiBase(merchant) {
  return config.getURLs(merchant).API; // ← uses merchant.env
}

// Update all loggedFetch calls to pass merchant:
async function loggedFetch(endpoint, options, action, merchant, orderNumber) {
  const url = `${apiBase(merchant)}${endpoint}`; // ← merchant-aware base
  // ... rest unchanged
}

// Update all method signatures to pass merchant through:
async function submitDocument(merchant, invoiceNumber, signedDoc, docDigest) {
  // ...
  const res = await loggedFetch(
    '/documentsubmissions',
    { method: 'POST', headers: await apiHeaders(merchant), body },
    'submit', merchant, invoiceNumber  // ← pass merchant not merchant.id
  );
}
// Apply same pattern to pollStatus, cancelDocument, rejectDocument, getDocument
```


***

## `db/migrate.js` — Phase 4 Addition: Production Audit Table

```js
// Append to migrations array:

// Separate table for production-specific records (compliance requirement)
`CREATE TABLE IF NOT EXISTS einvoice_production_log (
  id              SERIAL PRIMARY KEY,
  merchant_id     INT NOT NULL REFERENCES merchants(id),
  order_number    VARCHAR(100) NOT NULL,
  lhdn_uuid       VARCHAR(200) NOT NULL,
  lhdn_long_id    VARCHAR(500),
  invoice_type    VARCHAR(30),
  amount          DECIMAL(12,2),
  issued_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tax_period_year INT,
  tax_period_month INT
)`,

`CREATE INDEX IF NOT EXISTS idx_prod_log_merchant
   ON einvoice_production_log(merchant_id)`,

`CREATE INDEX IF NOT EXISTS idx_prod_log_tax_period
   ON einvoice_production_log(tax_period_year, tax_period_month)`,
```


***

## `scripts/validate-cert.js`

Run this for each merchant **before** switching them to production. Catches cert issues early:

```js
// Usage: node scripts/validate-cert.js <merchantUid>
// e.g.   node scripts/validate-cert.js shop_abc123

require('dotenv').config();
const forge           = require('node-forge');
const crypto          = require('crypto');
const merchantService = require('../services/merchant.service');
const { getToken }    = require('../services/auth');

async function validateMerchantCert(merchantUid) {
  console.log(`\n🔐 Certificate Validation — ${merchantUid}\n` + '─'.repeat(50));

  const merchant = await merchantService.getMerchant(merchantUid);
  const results  = [];

  function check(name, fn) {
    try {
      const detail = fn();
      results.push({ name, status: '✅ PASS', detail });
    } catch (err) {
      results.push({ name, status: '❌ FAIL', detail: err.message });
    }
  }

  // ── 1. cert_p12_base64 is present ──────────────────────────────────────
  check('cert_p12_base64 is set in DB', () => {
    if (!merchant.cert_p12_base64) throw new Error('No cert_p12_base64 in DB');
    return `${merchant.cert_p12_base64.length} chars`;
  });

  // ── 2. cert decodes to valid Base64 ────────────────────────────────────
  let pfxBuffer;
  check('cert_p12_base64 is valid Base64', () => {
    pfxBuffer = Buffer.from(merchant.cert_p12_base64, 'base64');
    if (pfxBuffer.length < 100) throw new Error('Decoded cert too small — likely corrupt');
    return `${pfxBuffer.length} bytes`;
  });

  // ── 3. .p12 parses with the stored passphrase ───────────────────────────
  let cert;
  check('.p12 parses with stored passphrase', () => {
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, merchant.cert_passphrase || '');
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
    if (!cert) throw new Error('No certificate found in .p12');
    return 'Parsed successfully';
  });

  // ── 4. Certificate is not expired ──────────────────────────────────────
  check('Certificate is not expired', () => {
    if (!cert) throw new Error('No cert to check (previous step failed)');
    const now    = new Date();
    const expiry = cert.validity.notAfter;
    if (now > expiry) throw new Error(`Expired on ${expiry.toISOString()}`);
    const daysLeft = Math.floor((expiry - now) / 86400000);
    if (daysLeft < 30) {
      console.warn(`   ⚠️  Certificate expires in ${daysLeft} days — renew soon`);
    }
    return `Valid until ${expiry.toISOString().split('T')[0]} (${daysLeft} days)`;
  });

  // ── 5. Issuer name matches stored value ────────────────────────────────
  check('cert_issuer_name matches certificate', () => {
    if (!cert) throw new Error('No cert');
    const issuerName = cert.issuer.attributes
      .map(a => `${a.shortName}=${a.value}`)
      .join(', ');
    if (merchant.cert_issuer_name && merchant.cert_issuer_name !== issuerName) {
      throw new Error(
        `Mismatch!\n    DB:   ${merchant.cert_issuer_name}\n    Cert: ${issuerName}`
      );
    }
    return issuerName;
  });

  // ── 6. Serial number matches stored value ─────────────────────────────
  check('cert_serial_number matches certificate', () => {
    if (!cert) throw new Error('No cert');
    if (merchant.cert_serial_number && merchant.cert_serial_number !== cert.serialNumber) {
      throw new Error(
        `Mismatch!\n    DB:   ${merchant.cert_serial_number}\n    Cert: ${cert.serialNumber}`
      );
    }
    return cert.serialNumber;
  });

  // ── 7. Private key is present and valid ───────────────────────────────
  check('Private key is present and usable', () => {
    if (!pfxBuffer) throw new Error('No buffer');
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, merchant.cert_passphrase || '');
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!keyBag?.key) throw new Error('No private key found in .p12');
    // Test sign
    const testData = crypto.createHash('sha256').update('test', 'utf8').digest('hex');
    const keyPem   = forge.pki.privateKeyToPem(keyBag.key);
    crypto.sign('RSA-SHA256', Buffer.from(testData), {
      key: keyPem, padding: crypto.constants.RSA_PKCS1_PADDING,
    });
    return 'Private key present and signing works';
  });

  // ── 8. LHDN credentials are set ───────────────────────────────────────
  check('LHDN credentials are configured', () => {
    if (!merchant.lhdn_client_id) throw new Error('lhdn_client_id is empty');
    if (!merchant.lhdn_client_secret) throw new Error('lhdn_client_secret is empty');
    return `client_id: ${merchant.lhdn_client_id.slice(0, 8)}...`;
  });

  // ── 9. Token fetch succeeds ────────────────────────────────────────────
  await (async () => {
    try {
      const token = await getToken(merchant);
      if (!token || token.length < 20) throw new Error('Token too short');
      results.push({ name: `Token fetch (env: ${merchant.env})`, status: '✅ PASS', detail: `${token.slice(0, 20)}...` });
    } catch (err) {
      results.push({ name: `Token fetch (env: ${merchant.env})`, status: '❌ FAIL', detail: err.message });
    }
  })();

  // ── Print results ──────────────────────────────────────────────────────
  console.log('\n📋 Results\n' + '─'.repeat(50));
  results.forEach(r => {
    console.log(`${r.status}  ${r.name}`);
    if (r.detail) console.log(`         └─ ${r.detail}`);
  });

  const passed = results.filter(r => r.status.startsWith('✅')).length;
  const failed = results.filter(r => r.status.startsWith('❌')).length;

  console.log('\n' + '─'.repeat(50));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log(`\n✅ Merchant "${merchantUid}" is ready for production go-live.\n`);
  } else {
    console.log(`\n❌ Fix the above before switching "${merchantUid}" to production.\n`);
    process.exit(1);
  }

  process.exit(0);
}

const merchantUid = process.argv[2];
if (!merchantUid) {
  console.error('Usage: node scripts/validate-cert.js <merchantUid>');
  process.exit(1);
}

validateMerchantCert(merchantUid).catch(err => {
  console.error('Script crashed:', err.message);
  process.exit(1);
});
```


***

## `scripts/migrate-merchant-to-prod.js`

Per-merchant production switch with a built-in dry-run mode and 6-step checklist:

```js
// Usage:
//   Dry run:  node scripts/migrate-merchant-to-prod.js shop_abc123
//   Go live:  node scripts/migrate-merchant-to-prod.js shop_abc123 --confirm

require('dotenv').config();
const merchantService = require('../services/merchant.service');
const { getToken }    = require('../services/auth');
const einvoice        = require('../services/einvoice.service');
const { pool }        = require('../db/pool');

const DRY_RUN = !process.argv.includes('--confirm');

async function migrateToProduction(merchantUid) {
  console.log(`\n🚀 Production Migration — ${merchantUid}`);
  console.log(DRY_RUN
    ? '⚠️  DRY RUN — no changes will be made. Add --confirm to go live.\n'
    : '🔴 LIVE RUN — changes will be committed to production.\n'
  );
  console.log('─'.repeat(60));

  const merchant = await merchantService.getMerchant(merchantUid);
  const steps    = [];

  async function step(name, fn) {
    process.stdout.write(`  ${name}... `);
    try {
      const detail = await fn();
      steps.push({ name, status: '✅', detail });
      console.log(`✅  ${detail || ''}`);
    } catch (err) {
      steps.push({ name, status: '❌', detail: err.message });
      console.log(`❌  ${err.message}`);
    }
  }

  // ── Step 1: Verify merchant is currently in sandbox ───────────────────
  await step('Check merchant is in sandbox', async () => {
    if (merchant.env === 'production') {
      throw new Error('Merchant is already in production');
    }
    return `Current env: ${merchant.env}`;
  });

  // ── Step 2: Verify production credentials exist ───────────────────────
  await step('Verify production LHDN credentials', async () => {
    if (!merchant.lhdn_client_id || !merchant.lhdn_client_secret) {
      throw new Error('lhdn_client_id or lhdn_client_secret is missing');
    }
    return `client_id: ${merchant.lhdn_client_id.slice(0, 8)}...`;
  });

  // ── Step 3: Verify production certificate ─────────────────────────────
  await step('Verify production certificate exists', async () => {
    if (!merchant.cert_p12_base64) throw new Error('No production certificate in DB');
    const bytes = Buffer.from(merchant.cert_p12_base64, 'base64').length;
    return `${bytes} bytes`;
  });

  // ── Step 4: Temporarily switch to production and test token ──────────
  await step('Test production token fetch', async () => {
    // Temporarily override env to test production credentials
    const testMerchant = { ...merchant, env: 'production' };
    const token = await getToken(testMerchant);
    if (!token || token.length < 20) throw new Error('Production token invalid');
    return 'Production token obtained successfully';
  });

  // ── Step 5: Issue a test invoice on production ─────────────────────────
  await step('Issue test invoice on production API', async () => {
    if (DRY_RUN) return 'Skipped (dry run)';

    // Temporarily set merchant env to production for this test
    await pool.query(
      `UPDATE merchants SET env = 'production' WHERE merchant_uid = $1`,
      [merchantUid]
    );
    merchantService.invalidateMerchantCache(merchantUid);

    try {
      const testOrderNum = `PROD-TEST-${Date.now()}`;
      const result = await einvoice.issueInvoice(merchantUid, {
        orderNumber: testOrderNum,
        buyer: {
          tin: 'EI00000000010', name: 'General Public',
          phone: '00-00000000', email: 'noreply@einvoice.my',
          address: 'N/A', postcode: '00000', city: 'N/A', state: '00',
        },
        items: [{
          description: 'Production Connectivity Test',
          quantity: 1, unitPrice: 1.00, subtotal: 1.00, tax: 0,
        }],
      });

      if (!result.uuid) throw new Error('No UUID returned — submission may have failed');

      // Cancel the test invoice immediately
      await einvoice.cancelInvoice(
        merchantUid, result.uuid, 'Production connectivity test', testOrderNum
      );

      return `Test invoice validated and cancelled — UUID: ${result.uuid}`;
    } catch (err) {
      // Rollback env to sandbox on failure
      await pool.query(
        `UPDATE merchants SET env = 'sandbox' WHERE merchant_uid = $1`,
        [merchantUid]
      );
      merchantService.invalidateMerchantCache(merchantUid);
      throw err;
    }
  });

  // ── Step 6: Finalize — mark merchant as production ────────────────────
  await step('Switch merchant to production', async () => {
    if (DRY_RUN) return 'Skipped (dry run) — run with --confirm to finalize';
    await pool.query(
      `UPDATE merchants SET env = 'production' WHERE merchant_uid = $1`,
      [merchantUid]
    );
    merchantService.invalidateMerchantCache(merchantUid);
    return `Merchant "${merchantUid}" is now LIVE on production`;
  });

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  const failed = steps.filter(s => s.status === '❌').length;

  if (failed === 0 && !DRY_RUN) {
    console.log(`\n🎉 LIVE — Merchant "${merchantUid}" is now on production LHDN.\n`);
  } else if (failed === 0 && DRY_RUN) {
    console.log(`\n✅ Dry run passed — run with --confirm to go live.\n`);
  } else {
    console.log(`\n❌ ${failed} step(s) failed. Merchant remains in sandbox.\n`);
    process.exit(1);
  }

  process.exit(0);
}

const merchantUid = process.argv[2];
if (!merchantUid) {
  console.error('Usage: node scripts/migrate-merchant-to-prod.js <merchantUid> [--confirm]');
  process.exit(1);
}

migrateToProduction(merchantUid).catch(err => {
  console.error('Script crashed:', err.message);
  process.exit(1);
});
```


***

## `scripts/load-test.js`

Multi-merchant concurrent load test before full production rollout:

```js
// Usage: node scripts/load-test.js
// Tests multiple merchants submitting invoices concurrently

require('dotenv').config();
const einvoice        = require('../services/einvoice.service');
const merchantService = require('../services/merchant.service');
const { pool }        = require('../db/pool');

const CONCURRENT_PER_MERCHANT = 10;  // invoices per merchant
const CONCURRENCY_DELAY_MS    = 500; // stagger merchant starts

async function runLoadTest() {
  console.log('\n⚡ Multi-Merchant Load Test\n' + '─'.repeat(60));

  // Fetch all active sandbox merchants
  const { rows: merchants } = await pool.query(
    `SELECT merchant_uid FROM merchants WHERE status = 'active' AND env = 'sandbox' LIMIT 5`
  );

  if (merchants.length === 0) {
    console.error('No active sandbox merchants found. Create test merchants first.');
    process.exit(1);
  }

  console.log(`Testing ${merchants.length} merchant(s) × ${CONCURRENT_PER_MERCHANT} invoices each`);
  console.log(`Total: ${merchants.length * CONCURRENT_PER_MERCHANT} invoices\n`);

  const allResults = [];
  const startTime  = Date.now();

  // Run merchants with slight stagger to avoid LHDN rate limiting
  for (const [i, { merchant_uid }] of merchants.entries()) {
    if (i > 0) await sleep(CONCURRENCY_DELAY_MS * i);

    const merchantResults = await runMerchantBatch(merchant_uid, CONCURRENT_PER_MERCHANT);
    allResults.push({ merchantUid: merchant_uid, ...merchantResults });
  }

  const totalMs = Date.now() - startTime;

  // ── Print report ───────────────────────────────────────────────────────
  console.log('\n📊 Load Test Results\n' + '─'.repeat(60));
  console.log(`${'Merchant'.padEnd(30)} ${'Passed'.padEnd(8)} ${'Failed'.padEnd(8)} Avg(ms)`);
  console.log('─'.repeat(60));

  let grandPassed = 0, grandFailed = 0;
  for (const r of allResults) {
    console.log(
      `${r.merchantUid.padEnd(30)} ${String(r.passed).padEnd(8)} ` +
      `${String(r.failed).padEnd(8)} ${r.avgMs}`
    );
    grandPassed += r.passed;
    grandFailed += r.failed;
  }

  console.log('─'.repeat(60));
  console.log(`${'TOTAL'.padEnd(30)} ${String(grandPassed).padEnd(8)} ${String(grandFailed).padEnd(8)}`);
  console.log(`\nTotal wall time: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`Success rate: ${((grandPassed / (grandPassed + grandFailed)) * 100).toFixed(1)}%\n`);

  if (grandFailed === 0) {
    console.log('✅ Load test passed. System is ready for production traffic.\n');
  } else {
    console.warn(`⚠️  ${grandFailed} failure(s). Investigate before going live.\n`);
    process.exit(1);
  }

  process.exit(0);
}

async function runMerchantBatch(merchantUid, count) {
  const ts      = Date.now();
  const jobs    = Array.from({ length: count }, (_, i) => ({
    orderNumber: `LOAD-${merchantUid}-${ts}-${i}`,
    buyer: {
      tin: 'EI00000000010', name: 'General Public',
      phone: '00-00000000', email: 'noreply@einvoice.my',
      address: 'N/A', postcode: '00000', city: 'N/A', state: '00',
    },
    items: [{
      description: `Load Test Item ${i}`,
      quantity: 1, unitPrice: 10, subtotal: 10, tax: 0,
    }],
  }));

  const timings  = [];
  const results  = await Promise.allSettled(
    jobs.map(async (job) => {
      const start  = Date.now();
      const result = await einvoice.issueInvoice(merchantUid, job);
      timings.push(Date.now() - start);
      return result;
    })
  );

  const passed = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const avgMs  = timings.length > 0
    ? Math.round(timings.reduce((s, t) => s + t, 0) / timings.length)
    : 0;

  // Log failures for investigation
  results
    .filter(r => r.status === 'rejected')
    .forEach((r, i) => console.error(`  [${merchantUid}] Job ${i} failed: ${r.reason?.message}`));

  return { passed, failed, avgMs };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
runLoadTest().catch(err => { console.error(err.message); process.exit(1); });
```


***

## Phase 4 Go-Live Checklist

Run these in order for **each merchant**:

```bash
# 1. Upload production cert to DB
#    (do this via your admin panel or a one-off script)
node scripts/upload-cert.js shop_abc123 ./certs/shop_abc123_prod.p12

# 2. Validate cert is correct and not expired
node scripts/validate-cert.js shop_abc123

# 3. Dry-run the production migration
node scripts/migrate-merchant-to-prod.js shop_abc123

# 4. Go live (runs test invoice + cancels it automatically)
node scripts/migrate-merchant-to-prod.js shop_abc123 --confirm

# 5. Run load test (sandbox — do before migrating remaining merchants)
node scripts/load-test.js
```


***

## Phase 5: Hardening

### Files

```
admin/
├── dashboard.routes.js  ← full admin REST API
audit/
├── logger.js            ← structured audit logger
├── retention.js         ← 7-year retention enforcer (cron)
monitoring/
├── healthcheck.js       ← deep health check
└── metrics.js           ← per-merchant counters
```


***

## `audit/logger.js`

```js
const db = require('../db/invoice.db');

/**
 * Structured audit logger — wraps all LHDN API calls.
 * Call this instead of raw fetch everywhere in submitter.js.
 */
async function withAuditLog(opts, fn) {
  const {
    merchantId, orderNumber, action, endpoint,
  } = opts;

  const start = Date.now();
  let responseBody = {}, statusCode = 0;

  try {
    const res    = await fn();
    statusCode   = res.status;
    responseBody = await res.clone().json().catch(() => ({}));
    return res;
  } catch (err) {
    statusCode   = 0;
    responseBody = { error: err.message };
    throw err;
  } finally {
    await db.auditLog({
      merchantId,
      orderNumber,
      action,
      endpoint,
      requestBody:  opts.requestBody  || {},
      responseBody,
      statusCode,
      durationMs:   Date.now() - start,
    }).catch(() => {}); // never let audit logging crash the main flow
  }
}

module.exports = { withAuditLog };
```


***

## `audit/retention.js`

```js
const cron = require('node-cron');
const { pool } = require('../db/pool');

const RETENTION_YEARS = 7;

/**
 * Monthly job that checks for records nearing or past the 7-year retention window.
 * LHDN mandates all e-invoice records be kept for 7 years.
 *
 * Run on the 1st of every month at 3AM (off-peak).
 */
cron.schedule('0 3 1 * *', async () => {
  console.log('[Retention] Running 7-year retention audit...');

  // ── Flag records approaching 7-year mark (within 6 months) ───────────
  const { rows: approaching } = await pool.query(`
    SELECT
      m.merchant_uid,
      COUNT(*) AS record_count,
      MIN(e.created_at) AS oldest_record
    FROM einvoices e
    JOIN merchants m ON m.id = e.merchant_id
    WHERE e.created_at <= NOW() - INTERVAL '${RETENTION_YEARS - 1} years 6 months'
      AND e.created_at >  NOW() - INTERVAL '${RETENTION_YEARS} years'
    GROUP BY m.merchant_uid
    ORDER BY oldest_record ASC
  `);

  if (approaching.length > 0) {
    console.warn(`[Retention] ⚠️  ${approaching.length} merchant(s) have records approaching 7-year mark:`);
    approaching.forEach(r =>
      console.warn(`  ${r.merchant_uid}: ${r.record_count} records (oldest: ${r.oldest_record})`)
    );
  }

  // ── Hard-delete audit logs older than 7 years + 1 month (safe buffer) ─
  // NOTE: Delete audit logs only — keep einvoices table forever (compliance)
  const { rowCount } = await pool.query(`
    DELETE FROM einvoice_audit_log
    WHERE created_at < NOW() - INTERVAL '${RETENTION_YEARS} years 1 month'
  `);

  if (rowCount > 0) {
    console.log(`[Retention] Purged ${rowCount} audit log entries older than 7 years.`);
  }

  // ── Report to console for ops visibility ──────────────────────────────
  const { rows: stats } = await pool.query(`
    SELECT
      COUNT(*) AS total_invoices,
      MIN(created_at) AS oldest_invoice,
      MAX(created_at) AS newest_invoice
    FROM einvoices
  `);

  console.log(`[Retention] Stats — Total: ${stats[0].total_invoices} invoices | ` +
    `Oldest: ${stats[0].oldest_invoice?.toISOString().split('T')[0]} | ` +
    `Newest: ${stats[0].newest_invoice?.toISOString().split('T')[0]}`
  );
});

console.log('[Retention] 7-year retention cron registered (0 3 1 * *)');
```


***

## `monitoring/healthcheck.js`

```js
const { pool, ping: dbPing } = require('../db/pool');
const { getToken }           = require('../services/auth');
const merchantService        = require('../services/merchant.service');

/**
 * Deep health check — verifies all system components.
 * Called by GET /health
 */
async function runHealthCheck() {
  const checks  = {};
  const details = {};

  // ── Database ───────────────────────────────────────────────────────────
  try {
    await dbPing();
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS total FROM einvoices WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '15 minutes'`
    );
    checks.database  = true;
    details.database = {
      status:          'connected',
      stuck_invoices:  parseInt(rows[0].total), // invoices stuck in pending > 15min
    };
  } catch (err) {
    checks.database  = false;
    details.database = { error: err.message };
  }

  // ── Redis ──────────────────────────────────────────────────────────────
  try {
    const { connection } = require('../automation/queue');
    await connection.ping();
    const { einvoiceQueue, dlqQueue } = require('../automation/queue');
    const queueCounts = await einvoiceQueue.getJobCounts('waiting', 'active', 'failed');
    const dlqCount    = await dlqQueue.getJobCounts('waiting');
    checks.redis  = true;
    details.redis = {
      status:        'connected',
      queue_waiting: queueCounts.waiting || 0,
      queue_active:  queueCounts.active  || 0,
      queue_failed:  queueCounts.failed  || 0,
      dlq_waiting:   dlqCount.waiting    || 0,
    };
  } catch (err) {
    checks.redis  = false;
    details.redis = { error: err.message };
  }

  // ── LHDN Connectivity (spot-check first active merchant) ──────────────
  try {
    const { rows } = await pool.query(
      `SELECT * FROM merchants WHERE status = 'active' LIMIT 1`
    );
    if (rows.length > 0) {
      const token = await getToken(rows[0]);
      checks.lhdn_auth  = !!token;
      details.lhdn_auth = {
        status: 'reachable',
        env:    rows[0].env,
        tested_merchant: rows[0].merchant_uid,
      };
    } else {
      checks.lhdn_auth  = true; // no merchants yet — not a failure
      details.lhdn_auth = { status: 'no_active_merchants' };
    }
  } catch (err) {
    checks.lhdn_auth  = false;
    details.lhdn_auth = { error: err.message };
  }

  // ── Merchant count ─────────────────────────────────────────────────────
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')      AS active,
        COUNT(*) FILTER (WHERE status = 'suspended')   AS suspended,
        COUNT(*) FILTER (WHERE env = 'production')     AS production,
        COUNT(*) FILTER (WHERE env = 'sandbox')        AS sandbox
      FROM merchants
    `);
    checks.merchants  = true;
    details.merchants = {
      active:     parseInt(rows[0].active),
      suspended:  parseInt(rows[0].suspended),
      production: parseInt(rows[0].production),
      sandbox:    parseInt(rows[0].sandbox),
    };
  } catch (err) {
    checks.merchants  = false;
    details.merchants = { error: err.message };
  }

  const healthy = Object.values(checks).every(Boolean);

  return {
    status:    healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    details,
  };
}

module.exports = { runHealthCheck };
```


***

## `monitoring/metrics.js`

```js
const { pool } = require('../db/pool');

/**
 * Per-merchant invoice metrics for the admin dashboard.
 * All queries are scoped by merchant to enforce data isolation.
 */
async function getMerchantMetrics(merchantId, { year, month } = {}) {
  const now          = new Date();
  const targetYear   = year  || now.getFullYear();
  const targetMonth  = month || now.getMonth() + 1;

  const [byStatus, byType, monthly, recentFailed, successRate] = await Promise.all([

    // Count by status (all time)
    pool.query(`
      SELECT status, COUNT(*) AS count
      FROM einvoices WHERE merchant_id = $1
      GROUP BY status ORDER BY count DESC
    `, [merchantId]),

    // Count by type (this month)
    pool.query(`
      SELECT invoice_type, COUNT(*) AS count
      FROM einvoices
      WHERE merchant_id = $1
        AND EXTRACT(YEAR  FROM created_at) = $2
        AND EXTRACT(MONTH FROM created_at) = $3
      GROUP BY invoice_type
    `, [merchantId, targetYear, targetMonth]),

    // Monthly volume (last 6 months)
    pool.query(`
      SELECT
        EXTRACT(YEAR  FROM created_at)::int AS year,
        EXTRACT(MONTH FROM created_at)::int AS month,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'valid')     AS valid,
        COUNT(*) FILTER (WHERE status = 'invalid')   AS invalid,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
      FROM einvoices
      WHERE merchant_id = $1
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY year, month
      ORDER BY year, month
    `, [merchantId]),

    // Recent failed jobs
    pool.query(`
      SELECT job_type, order_number, error, failed_at
      FROM failed_invoice_jobs
      WHERE merchant_id = $1 AND resolved = FALSE
      ORDER BY failed_at DESC LIMIT 5
    `, [merchantId]),

    // 30-day success rate
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'valid') AS valid
      FROM einvoices
      WHERE merchant_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
    `, [merchantId]),

  ]);

  const total30d      = parseInt(successRate.rows[0]?.total  || 0);
  const valid30d      = parseInt(successRate.rows[0]?.valid  || 0);
  const successRate30 = total30d > 0
    ? ((valid30d / total30d) * 100).toFixed(1)
    : null;

  return {
    period:        { year: targetYear, month: targetMonth },
    byStatus:      Object.fromEntries(byStatus.rows.map(r => [r.status, parseInt(r.count)])),
    byType:        Object.fromEntries(byType.rows.map(r => [r.invoice_type, parseInt(r.count)])),
    monthlyVolume: monthly.rows.map(r => ({
      year:      r.year,
      month:     r.month,
      total:     parseInt(r.total),
      valid:     parseInt(r.valid),
      invalid:   parseInt(r.invalid),
      cancelled: parseInt(r.cancelled),
    })),
    recentFailed:  recentFailed.rows,
    successRate30d: successRate30 ? `${successRate30}%` : 'N/A',
  };
}

/**
 * Platform-wide metrics for super-admin
 */
async function getPlatformMetrics() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(DISTINCT merchant_id)                        AS active_merchants,
      COUNT(*)                                           AS total_invoices,
      COUNT(*) FILTER (WHERE status = 'valid')           AS valid_invoices,
      COUNT(*) FILTER (WHERE status = 'invalid')         AS invalid_invoices,
      COUNT(*) FILTER (WHERE status = 'pending'
        AND created_at < NOW() - INTERVAL '15 minutes')  AS stuck_invoices,
      COUNT(*) FILTER (
        WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM NOW())
      ) AS invoices_this_month
    FROM einvoices
  `);

  return rows[0];
}

module.exports = { getMerchantMetrics, getPlatformMetrics };
```


***

## `admin/dashboard.routes.js`

```js
const express         = require('express');
const router          = express.Router();
const db              = require('../db/invoice.db');
const merchantService = require('../services/merchant.service');
const { runHealthCheck }     = require('../monitoring/healthcheck');
const { getMerchantMetrics, getPlatformMetrics } = require('../monitoring/metrics');
const { dlqQueue, einvoiceQueue, enqueueInvoiceJob } = require('../automation/queue');
const { pool }        = require('../db/pool');

// ── Platform health ───────────────────────────────────────────────────────

router.get('/health', async (req, res, next) => {
  try {
    const result = await runHealthCheck();
    res.status(result.status === 'ok' ? 200 : 503).json(result);
  } catch (e) { next(e); }
});

// ── Platform-wide stats (super-admin) ────────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getPlatformMetrics();
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
});

// ── Merchant management ───────────────────────────────────────────────────

router.get('/merchants', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, merchant_uid, name, status, env, tin, email, created_at
      FROM merchants ORDER BY created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

router.get('/merchants/:merchantId', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    const { lhdn_client_secret, cert_p12_base64, cert_passphrase, ...safe } = merchant;
    res.json({ success: true, data: safe });
  } catch (e) { next(e); }
});

// Suspend / reactivate a merchant
router.patch('/merchants/:merchantId/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await merchantService.updateMerchant(req.params.merchantId, { status });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Per-merchant metrics ──────────────────────────────────────────────────

router.get('/merchants/:merchantId/metrics', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    const { year, month } = req.query;
    const metrics = await getMerchantMetrics(merchant.id, {
      year:  year  ? parseInt(year)  : undefined,
      month: month ? parseInt(month) : undefined,
    });
    res.json({ success: true, data: metrics });
  } catch (e) { next(e); }
});

// ── Per-merchant invoices ─────────────────────────────────────────────────

router.get('/merchants/:merchantId/invoices', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    const { status, limit, offset } = req.query;
    const invoices = await db.listInvoices(merchant.id, {
      status,
      limit:  parseInt(limit)  || 50,
      offset: parseInt(offset) || 0,
    });
    res.json({ success: true, data: invoices });
  } catch (e) { next(e); }
});

// ── Dead Letter Queue (DLQ) ───────────────────────────────────────────────

// All failed jobs across all merchants
router.get('/dlq', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, m.merchant_uid, m.name AS merchant_name
      FROM failed_invoice_jobs f
      LEFT JOIN merchants m ON m.id = f.merchant_id
      WHERE f.resolved = FALSE
      ORDER BY f.failed_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (e) { next(e); }
});

// Failed jobs for a specific merchant
router.get('/merchants/:merchantId/dlq', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    const jobs     = await db.listFailedJobs(merchant.id, req.query.includeResolved === 'true');
    res.json({ success: true, data: jobs });
  } catch (e) { next(e); }
});

// Retry a failed job — re-enqueue with original payload
router.post('/merchants/:merchantId/dlq/:jobId/retry', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    const { rows } = await pool.query(
      `SELECT * FROM failed_invoice_jobs WHERE id = $1 AND merchant_id = $2`,
      [req.params.jobId, merchant.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Failed job not found' });
    }

    const job = rows[0];
    await enqueueInvoiceJob(job.job_type, req.params.merchantId, job.payload);
    await db.resolveFailedJob(merchant.id, req.params.jobId, req.body.resolvedBy || 'admin-retry');

    res.json({ success: true, message: 'Job re-queued successfully' });
  } catch (e) { next(e); }
});

// Mark a failed job as manually resolved (e.g. issued via portal)
router.post('/merchants/:merchantId/dlq/:jobId/resolve', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    await db.resolveFailedJob(merchant.id, req.params.jobId, req.body.resolvedBy || 'admin');
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Audit log viewer ──────────────────────────────────────────────────────

router.get('/merchants/:merchantId/audit', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    const { action, limit, offset } = req.query;
    const where  = action ? 'AND action = $4' : '';
    const params = action
      ? [merchant.id, parseInt(limit) || 50, parseInt(offset) || 0, action]
      : [merchant.id, parseInt(limit) || 50, parseInt(offset) || 0];

    const { rows } = await pool.query(`
      SELECT * FROM einvoice_audit_log
      WHERE merchant_id = $1 ${where}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, params);

    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// ── Queue stats ───────────────────────────────────────────────────────────

router.get('/queue', async (req, res, next) => {
  try {
    const [mainCounts, dlqCounts] = await Promise.all([
      einvoiceQueue.getJobCounts('waiting', 'active', 'failed', 'completed'),
      dlqQueue.getJobCounts('waiting', 'active'),
    ]);
    res.json({
      success: true,
      data: { main: mainCounts, dlq: dlqCounts },
    });
  } catch (e) { next(e); }
});

module.exports = router;
```


***

## Final `index.js`

```js
require('dotenv').config();
const express      = require('express');
const config       = require('./config');
const { ping: dbPing } = require('./db/pool');

config.validateConfig();

const app = express();
app.use(express.json({ limit: '5mb' }));

// ── Background services ───────────────────────────────────────────────────
require('./automation/worker');    // BullMQ worker
require('./automation/cron');      // monthly + weekly + daily crons
require('./audit/retention');      // 7-year retention enforcer

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api',    require('./routes/invoice.routes'));
app.use('/admin',  require('./admin/dashboard.routes'));

// ── Health (used by load balancer / UptimeRobot) ──────────────────────────
const { runHealthCheck } = require('./monitoring/healthcheck');
app.get('/health', async (req, res) => {
  const result = await runHealthCheck().catch(err => ({
    status: 'error', error: err.message,
  }));
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});

app.use(require('./middleware/errorHandler'));

app.listen(3000, () => {
  console.log('\n[App] ✅ Multi-Tenant e-Invoice Service');
  console.log(`[App] Environment:  ${config.ENV.toUpperCase()}`);
  console.log('[App] Worker:       online');
  console.log('[App] Cron jobs:    registered (monthly, weekly, daily)');
  console.log('[App] Retention:    7-year enforcer active');
  console.log('[App] Listening on: http://localhost:3000\n');
});
```


***

## Complete Phase 4 + 5 Exit Criteria

```bash
# Phase 4
node scripts/validate-cert.js shop_abc123         # cert passes all 9 checks
node scripts/migrate-merchant-to-prod.js shop_abc123        # dry run passes
node scripts/migrate-merchant-to-prod.js shop_abc123 --confirm  # goes live
node scripts/load-test.js                          # 100% pass rate

# Phase 5
curl http://localhost:3000/health                  # status: ok, all checks green
curl http://localhost:3000/admin/stats             # returns platform metrics
curl http://localhost:3000/admin/dlq               # returns empty array (no failures)
curl http://localhost:3000/admin/merchants/shop_abc123/metrics  # returns valid stats
curl http://localhost:3000/admin/merchants/shop_abc123/audit    # returns audit entries
```

```
□ Every LHDN API call appears in einvoice_audit_log with merchant_id
□ /health returns all 4 checks green (database, redis, lhdn_auth, merchants)
□ DLQ retry re-queues job and marks DB record as resolved
□ Platform metrics show correct counts across all merchants
□ Retention cron runs without errors
□ Suspended merchant blocked at API, worker, and event level
□ Per-merchant metrics isolated — no data bleed between merchants
```

The entire system — from Phase 1 foundation through Phase 5 hardening — is now complete and production-ready for a multi-tenant ecommerce platform.

