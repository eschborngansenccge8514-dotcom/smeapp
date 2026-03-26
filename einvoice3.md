<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Continue

Continuing with **Phase 3: Automation** — fully rewritten for multi-tenancy. Every queue job, worker, event, and cron is now merchant-scoped.

***

## What Changes vs Single-Tenant Phase 3

| Concern | Single Tenant | Multi-Tenant |
| :-- | :-- | :-- |
| Queue jobs | No merchant context | Every job carries `merchantId` |
| Worker | Single flow | Loads merchant before processing |
| Events | Global emitter | Per-merchant event namespace |
| Cron | One consolidated run | Iterates all active merchants |
| Alerts | One alert channel | Alert includes merchant identity |
| Mailer | Single sender | Sends from merchant's email |


***

## Phase 3 Files

```
automation/
├── queue.js          ← REWRITE: jobs carry merchantId
├── worker.js         ← REWRITE: merchant-aware processor
├── events.js         ← REWRITE: per-merchant event emitter
├── cron.js           ← REWRITE: iterate all active merchants
├── mailer.js         ← REWRITE: send from merchant's email identity
└── alerts.js         ← REWRITE: include merchant info in all alerts
```


***

## `automation/queue.js`

```js
const { Queue }  = require('bullmq');
const IORedis    = require('ioredis');
const config     = require('../config');

const connection = new IORedis({
  host:                 process.env.REDIS_HOST || '127.0.0.1',
  port:                 parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null, // required by BullMQ
});

// Main invoice processing queue
const einvoiceQueue = new Queue('einvoice', { connection });

// Dead Letter Queue — jobs that exhausted all retries
const dlqQueue = new Queue('einvoice-dlq', { connection });

/**
 * Add an invoice job to the queue.
 * Every job MUST include merchantId so the worker knows which merchant to load.
 *
 * @param {string} type      - 'invoice' | 'credit-note' | 'debit-note'
 *                             | 'refund-note' | 'consolidated'
 * @param {string} merchantId - merchant_uid (e.g. "shop_abc123")
 * @param {Object} payload   - job-specific data (orderNumber, buyer, items etc.)
 */
async function enqueueInvoiceJob(type, merchantId, payload) {
  if (!merchantId) throw new Error('[Queue] merchantId is required for all jobs');

  await einvoiceQueue.add(type, { merchantId, ...payload }, {
    attempts: config.QUEUE.ATTEMPTS,
    backoff: {
      type:  'exponential',
      delay: config.QUEUE.BACKOFF_DELAY, // 3s, 6s, 12s, 24s, 48s
    },
    // Tag jobs with merchantId for easy filtering in dashboards
    jobId: `${merchantId}:${type}:${payload.orderNumber || payload.refNumber || Date.now()}`,
    removeOnComplete: { count: 200 },
    removeOnFail:     false,
  });

  console.log(
    `[Queue] Enqueued type="${type}" merchant="${merchantId}" ` +
    `order="${payload.orderNumber || payload.refNumber || 'consolidated'}"`
  );
}

/**
 * Get queue health stats for a specific merchant (used in admin dashboard)
 */
async function getMerchantQueueStats(merchantId) {
  const jobs = await einvoiceQueue.getJobs(['waiting', 'active', 'failed', 'completed']);
  const merchantJobs = jobs.filter(j => j.data?.merchantId === merchantId);
  return {
    waiting:   merchantJobs.filter(j => j.opts?.delay).length,
    active:    merchantJobs.filter(j => !j.finishedOn && !j.failedReason).length,
    failed:    merchantJobs.filter(j => j.failedReason).length,
    completed: merchantJobs.filter(j => j.finishedOn && !j.failedReason).length,
  };
}

module.exports = { einvoiceQueue, dlqQueue, connection, enqueueInvoiceJob, getMerchantQueueStats };
```


***

## `automation/alerts.js`

```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send failure alert to ops team.
 * Always includes merchant identity so ops know which tenant is affected.
 */
async function sendFailureAlert({ merchantId, merchantName, jobId, jobType, orderNumber, error, attempts }) {
  const subject = `⚠️ e-Invoice Failed — [${merchantId}] ${orderNumber || jobId}`;
  const text = `
Merchant:     ${merchantName || merchantId}
Merchant UID: ${merchantId}
Job ID:       ${jobId}
Job Type:     ${jobType}
Order:        ${orderNumber || 'N/A'}
Error:        ${error}
Attempts:     ${attempts}
Time:         ${new Date().toISOString()}

Action required: Review failed job in /admin/merchants/${merchantId}/dlq
  `.trim();

  // Email ops team
  if (process.env.ALERT_TO) {
    await transporter.sendMail({
      from:    process.env.ALERT_FROM,
      to:      process.env.ALERT_TO,
      subject, text,
    }).catch(e => console.error('[Alert] Email failed:', e.message));
  }

  // Slack alert
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*${subject}*\n\`\`\`${text}\`\`\``,
      }),
    }).catch(e => console.error('[Alert] Slack failed:', e.message));
  }

  console.log(`[Alert] Failure alert sent — Merchant: ${merchantId}, Job: ${jobId}`);
}

/**
 * Send weekly DLQ health report to ops team
 */
async function sendDLQHealthReport(summary) {
  if (!summary.totalFailed || summary.totalFailed === 0) return;

  const rows   = summary.merchants.map(m =>
    `  - ${m.merchantId}: ${m.failedCount} failed job(s)`
  ).join('\n');

  const subject = `📊 Weekly e-Invoice DLQ Report — ${summary.totalFailed} failed job(s)`;
  const text    = `
Weekly Dead Letter Queue Summary
Generated: ${new Date().toISOString()}

Total failed jobs: ${summary.totalFailed}
Affected merchants:
${rows}

Review at: ${process.env.ADMIN_URL || '/admin'}/dlq
  `.trim();

  if (process.env.ALERT_TO) {
    await transporter.sendMail({
      from: process.env.ALERT_FROM,
      to:   process.env.ALERT_TO,
      subject, text,
    }).catch(e => console.error('[Alert] DLQ report email failed:', e.message));
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*${subject}*\n\`\`\`${text}\`\`\`` }),
    }).catch(() => {});
  }
}

module.exports = { sendFailureAlert, sendDLQHealthReport };
```


***

## `automation/mailer.js`

```js
const nodemailer = require('nodemailer');

// Transporter per merchant sender — cached to avoid recreating on every email
const _transporters = new Map();

function getTransporter() {
  // All merchants share the same SMTP config but send FROM their own email
  // If you want per-merchant SMTP, extend this to accept merchant as arg
  const key = `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`;
  if (_transporters.has(key)) return _transporters.get(key);

  const t = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  _transporters.set(key, t);
  return t;
}

/**
 * Send invoice confirmation email to customer.
 * Branded with the merchant's name and email.
 *
 * @param {Object} merchant        - merchant DB row
 * @param {Object} params
 * @param {string} params.customerEmail
 * @param {string} params.customerName
 * @param {string} params.orderNumber
 * @param {string} params.qrCodeUrl
 * @param {string} params.uuid
 * @param {string} params.invoiceType  - 'invoice' | 'credit-note' | 'refund-note' etc.
 */
async function sendInvoiceEmail(merchant, { customerEmail, customerName, orderNumber, qrCodeUrl, uuid, invoiceType = 'invoice' }) {
  if (!customerEmail || customerEmail === 'noreply@einvoice.my') return;

  const typeLabels = {
    'invoice':     'e-Invoice',
    'credit-note': 'Credit Note',
    'debit-note':  'Debit Note',
    'refund-note': 'Refund Note',
    'consolidated':'Consolidated e-Invoice',
  };
  const label = typeLabels[invoiceType] || 'e-Invoice';

  await getTransporter().sendMail({
    from:    `"${merchant.name}" <${merchant.email || process.env.SMTP_USER}>`,
    to:      customerEmail,
    subject: `Your ${label} for Order #${orderNumber} — ${merchant.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif; max-width:600px; margin:auto; padding:20px;">
        <h2 style="color:#1a1a1a;">${merchant.name}</h2>
        <hr/>
        <p>Dear ${customerName || 'Valued Customer'},</p>
        <p>
          Your official <strong>${label}</strong> has been validated by LHDN
          and is now available for download and verification.
        </p>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <tr>
            <td style="padding:8px; color:#666; width:40%;">Order Number</td>
            <td style="padding:8px;"><strong>${orderNumber}</strong></td>
          </tr>
          <tr style="background:#f9f9f9;">
            <td style="padding:8px; color:#666;">Document Type</td>
            <td style="padding:8px;">${label}</td>
          </tr>
          <tr>
            <td style="padding:8px; color:#666;">LHDN Invoice ID</td>
            <td style="padding:8px; font-size:12px; color:#555;">${uuid}</td>
          </tr>
        </table>
        <div style="text-align:center; margin:30px 0;">
          <a href="${qrCodeUrl}" style="
            background:#1a73e8; color:#fff; padding:14px 28px;
            border-radius:6px; text-decoration:none; font-size:16px;
          ">
            View &amp; Verify e-Invoice
          </a>
        </div>
        <p style="color:#999; font-size:12px;">
          You can verify the authenticity of this invoice by clicking the button above
          or visiting the MyInvois portal. This invoice was issued on behalf of
          ${merchant.name} (TIN: ${merchant.tin}).
        </p>
      </body>
      </html>
    `,
  });

  console.log(`[Mailer] Invoice email sent — Merchant: ${merchant.merchant_uid}, To: ${customerEmail}`);
}

module.exports = { sendInvoiceEmail };
```


***

## `automation/worker.js`

```js
const { Worker }          = require('bullmq');
const { connection, dlqQueue } = require('./queue');
const einvoice            = require('../services/einvoice.service');
const merchantService     = require('../services/merchant.service');
const { sendInvoiceEmail }   = require('./mailer');
const { sendFailureAlert }   = require('./alerts');
const db                  = require('../db/invoice.db');

const worker = new Worker('einvoice', async (job) => {
  const { merchantId, ...data } = job.data;
  const jobType = job.name;

  console.log(`[Worker] Job id=${job.id} type="${jobType}" merchant="${merchantId}"`);

  // Load merchant — throws if not found or suspended
  const merchant = await merchantService.getMerchant(merchantId);
  let result;

  // ── Route to correct service method ──────────────────────────────────
  switch (jobType) {
    case 'invoice':
      result = await einvoice.issueInvoice(merchantId, {
        orderNumber: data.orderNumber,
        buyer:       data.buyer,
        items:       data.items,
        discount:    data.discount || 0,
      });
      break;

    case 'credit-note':
      result = await einvoice.issueCreditNote(merchantId, {
        refNumber:         data.refNumber,
        originalInvoiceId: data.originalInvoiceId,
        buyer:             data.buyer,
        items:             data.items,
      });
      break;

    case 'debit-note':
      result = await einvoice.issueDebitNote(merchantId, {
        refNumber:         data.refNumber,
        originalInvoiceId: data.originalInvoiceId,
        buyer:             data.buyer,
        items:             data.items,
      });
      break;

    case 'refund-note':
      result = await einvoice.issueRefundNote(merchantId, {
        refNumber:         data.refNumber,
        originalInvoiceId: data.originalInvoiceId,
        buyer:             data.buyer,
        items:             data.items,
      });
      break;

    case 'consolidated':
      result = await einvoice.issueConsolidatedInvoice(merchantId, {
        year:   data.year,
        month:  data.month,
        orders: data.orders,
      });
      break;

    default:
      throw new Error(`[Worker] Unknown job type: ${jobType}`);
  }

  // ── Email customer (skip for consolidated — no individual buyer) ──────
  if (jobType !== 'consolidated' && data.buyer?.email) {
    await sendInvoiceEmail(merchant, {
      customerEmail: data.buyer.email,
      customerName:  data.buyer.name || 'Valued Customer',
      orderNumber:   data.orderNumber || data.refNumber,
      qrCodeUrl:     result.qrCodeUrl,
      uuid:          result.uuid,
      invoiceType:   jobType,
    }).catch(err =>
      // Email failure should not fail the job — invoice is already validated
      console.error(`[Worker] Email failed for ${data.orderNumber}: ${err.message}`)
    );
  }

  console.log(`[Worker] ✅ Done — merchant="${merchantId}" uuid="${result.uuid}"`);
  return result;

}, {
  connection,
  concurrency: 5, // 5 concurrent jobs across all merchants
});

// ── On job failure (after all retries exhausted) ──────────────────────────
worker.on('failed', async (job, err) => {
  if (!job || job.attemptsMade < job.opts.attempts) return; // still retrying

  const { merchantId, orderNumber, refNumber } = job.data;
  console.error(
    `[Worker] ❌ Job ${job.id} exhausted retries — merchant="${merchantId}" error="${err.message}"`
  );

  let merchantName = merchantId;
  try {
    const m = await merchantService.getMerchant(merchantId);
    merchantName = m.name;
  } catch {}

  // Move to DLQ
  await dlqQueue.add('failed-invoice', {
    merchantId,
    originalJob: { id: job.id, type: job.name, data: job.data },
    error:       { message: err.message, stack: err.stack },
    failedAt:    new Date().toISOString(),
  }).catch(() => {});

  // Persist to DB
  await db.saveFailedJob({
    merchantId:   (await merchantService.getMerchant(merchantId).catch(() => ({ id: null }))).id,
    jobId:        job.id,
    jobType:      job.name,
    orderNumber:  orderNumber || refNumber || null,
    error:        err.message,
    attempts:     job.attemptsMade,
    payload:      job.data,
  }).catch(() => {});

  // Alert ops team
  await sendFailureAlert({
    merchantId,
    merchantName,
    jobId:       job.id,
    jobType:     job.name,
    orderNumber: orderNumber || refNumber,
    error:       err.message,
    attempts:    job.attemptsMade,
  }).catch(() => {});
});

worker.on('error', err => console.error('[Worker] Uncaught error:', err.message));

console.log('[Worker] Multi-tenant invoice worker started (concurrency: 5)');
module.exports = { worker };
```


***

## `automation/events.js`

```js
const EventEmitter          = require('events');
const { enqueueInvoiceJob } = require('./queue');
const db                    = require('../db/invoice.db');
const merchantService       = require('../services/merchant.service');
const einvoice              = require('../services/einvoice.service');

// Global emitter — all merchants share it; merchantId is always in the payload
const orderEvents = new EventEmitter();
orderEvents.setMaxListeners(50);

// ─── ORDER PAID ───────────────────────────────────────────────────────────
// Payload: { merchantId, orderNumber, buyer, items, discount }
orderEvents.on('order.paid', async (payload) => {
  const { merchantId, orderNumber, buyer, items, discount } = payload;

  try {
    if (buyer?.tin) {
      // B2B or B2C with TIN → individual invoice via queue
      await enqueueInvoiceJob('invoice', merchantId, {
        orderNumber, buyer, items, discount,
      });
      console.log(`[Events] Enqueued invoice for order ${orderNumber} (merchant: ${merchantId})`);
    } else {
      // B2C no TIN → stage for monthly consolidated
      const merchant = await merchantService.getMerchant(merchantId);
      const now      = new Date();
      await db.stageForConsolidated({
        merchantId: merchant.id,
        orderNumber,
        subtotal: items.reduce((s, i) => s + (i.subtotal ?? i.quantity * i.unitPrice), 0),
        tax:      items.reduce((s, i) => s + (i.tax ?? 0), 0),
        year:     now.getFullYear(),
        month:    now.getMonth() + 1,
      });
      console.log(`[Events] Order ${orderNumber} staged for consolidated (merchant: ${merchantId})`);
    }
  } catch (err) {
    console.error(`[Events] order.paid handler failed — merchant: ${merchantId}: ${err.message}`);
  }
});

// ─── ORDER CANCELLED (within 72h) ─────────────────────────────────────────
// Payload: { merchantId, uuid, orderNumber, reason }
orderEvents.on('order.cancelled', async ({ merchantId, uuid, orderNumber, reason }) => {
  try {
    await einvoice.cancelInvoice(
      merchantId, uuid,
      reason || 'Order cancelled by customer',
      orderNumber
    );
    console.log(`[Events] Invoice cancelled — merchant: ${merchantId}, order: ${orderNumber}`);
  } catch (err) {
    console.error(`[Events] cancel failed — merchant: ${merchantId}: ${err.message}`);
  }
});

// ─── ORDER REFUNDED (after 72h — needs refund note) ───────────────────────
// Payload: { merchantId, refNumber, originalInvoiceId, buyer, items }
orderEvents.on('order.refunded', async (payload) => {
  const { merchantId, ...data } = payload;
  try {
    await enqueueInvoiceJob('refund-note', merchantId, data);
    console.log(`[Events] Refund note queued — merchant: ${merchantId}, ref: ${data.refNumber}`);
  } catch (err) {
    console.error(`[Events] order.refunded failed — merchant: ${merchantId}: ${err.message}`);
  }
});

// ─── PRICE CORRECTION — CREDIT NOTE ───────────────────────────────────────
// Payload: { merchantId, refNumber, originalInvoiceId, buyer, items }
orderEvents.on('invoice.credit', async (payload) => {
  const { merchantId, ...data } = payload;
  try {
    await enqueueInvoiceJob('credit-note', merchantId, data);
    console.log(`[Events] Credit note queued — merchant: ${merchantId}`);
  } catch (err) {
    console.error(`[Events] invoice.credit failed — merchant: ${merchantId}: ${err.message}`);
  }
});

// ─── PRICE CORRECTION — DEBIT NOTE ────────────────────────────────────────
// Payload: { merchantId, refNumber, originalInvoiceId, buyer, items }
orderEvents.on('invoice.debit', async (payload) => {
  const { merchantId, ...data } = payload;
  try {
    await enqueueInvoiceJob('debit-note', merchantId, data);
    console.log(`[Events] Debit note queued — merchant: ${merchantId}`);
  } catch (err) {
    console.error(`[Events] invoice.debit failed — merchant: ${merchantId}: ${err.message}`);
  }
});

// ─── MERCHANT SETTINGS UPDATED ────────────────────────────────────────────
// Invalidate caches when a merchant updates their cert or credentials
orderEvents.on('merchant.updated', ({ merchantId }) => {
  merchantService.invalidateMerchantCache(merchantId);
  const { invalidateCertCache } = require('../services/signer');
  // Find merchant DB id to invalidate cert cache
  merchantService.getMerchant(merchantId)
    .then(m => invalidateCertCache(m.id))
    .catch(() => {});
  console.log(`[Events] Caches cleared for updated merchant: ${merchantId}`);
});

module.exports = { orderEvents };
```


***

## `automation/cron.js`

```js
const cron            = require('node-cron');
const { pool }        = require('../db/pool');
const { enqueueInvoiceJob } = require('./queue');
const { dlqQueue }    = require('./queue');
const db              = require('../db/invoice.db');
const { sendDLQHealthReport } = require('./alerts');

// ─── Helper: get all active merchants ────────────────────────────────────

async function getAllActiveMerchants() {
  const { rows } = await pool.query(
    `SELECT id, merchant_uid, name FROM merchants WHERE status = 'active' ORDER BY id`
  );
  return rows;
}

// ─── 1st of every month at 9:00 AM ───────────────────────────────────────
// Submit consolidated invoice for each merchant that has staged B2C orders

cron.schedule('0 9 1 * *', async () => {
  const now       = new Date();
  const year      = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month     = now.getMonth() === 0 ? 12 : now.getMonth(); // last month, 1-indexed
  const label     = `${year}-${String(month).padStart(2, '0')}`;

  console.log(`\n[Cron] 📅 Monthly consolidated run for ${label}`);

  const merchants = await getAllActiveMerchants();
  console.log(`[Cron] Processing ${merchants.length} active merchant(s)...`);

  let submitted = 0, skipped = 0, errored = 0;

  for (const merchant of merchants) {
    try {
      const orders = await db.getStagedConsolidatedOrders(merchant.id, year, month);

      if (orders.length === 0) {
        console.log(`[Cron] ${merchant.merchant_uid}: no staged orders — skipping`);
        skipped++;
        continue;
      }

      await enqueueInvoiceJob('consolidated', merchant.merchant_uid, {
        year,
        month,
        orders,
      });

      console.log(
        `[Cron] ${merchant.merchant_uid}: queued consolidated invoice ` +
        `(${orders.length} orders)`
      );
      submitted++;

    } catch (err) {
      console.error(
        `[Cron] ${merchant.merchant_uid}: consolidated failed — ${err.message}`
      );
      errored++;
    }
  }

  console.log(
    `[Cron] Monthly run done — ` +
    `submitted: ${submitted}, skipped: ${skipped}, errored: ${errored}\n`
  );
});

// ─── Every Monday at 8:00 AM — DLQ health check ──────────────────────────

cron.schedule('0 8 * * 1', async () => {
  console.log('[Cron] 🔍 Weekly DLQ health check...');

  try {
    // Count DLQ jobs per merchant
    const dlqJobs = await dlqQueue.getJobs(['wait', 'active', 'delayed']);
    const merchants = await getAllActiveMerchants();

    const merchantMap = new Map(merchants.map(m => [m.merchant_uid, m.name]));

    const countsByMerchant = dlqJobs.reduce((acc, job) => {
      const mid = job.data?.merchantId || 'unknown';
      acc[mid]  = (acc[mid] || 0) + 1;
      return acc;
    }, {});

    const merchantSummaries = Object.entries(countsByMerchant).map(([merchantId, failedCount]) => ({
      merchantId,
      merchantName: merchantMap.get(merchantId) || merchantId,
      failedCount,
    }));

    const totalFailed = dlqJobs.length;

    if (totalFailed > 0) {
      await sendDLQHealthReport({
        totalFailed,
        merchants: merchantSummaries,
      });
    }

    console.log(`[Cron] DLQ check done — ${totalFailed} job(s) in DLQ`);
  } catch (err) {
    console.error('[Cron] DLQ check failed:', err.message);
  }
});

// ─── Every day at 6:00 AM — check for overdue consolidated submissions ────
// Warn ops if any merchant has staged orders from 2+ months ago (missed deadline)

cron.schedule('0 6 * * *', async () => {
  const now       = new Date();
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const { rows } = await pool.query(`
    SELECT
      m.merchant_uid,
      m.name,
      cs.year,
      cs.month,
      COUNT(*) AS overdue_count
    FROM consolidated_staging cs
    JOIN merchants m ON m.id = cs.merchant_id
    WHERE cs.consolidated_einvoice_id IS NULL
      AND make_date(cs.year, cs.month, 1) < $1
    GROUP BY m.merchant_uid, m.name, cs.year, cs.month
    ORDER BY cs.year, cs.month
  `, [twoMonthsAgo]);

  if (rows.length > 0) {
    const { sendFailureAlert } = require('./alerts');
    for (const row of rows) {
      await sendFailureAlert({
        merchantId:   row.merchant_uid,
        merchantName: row.name,
        jobId:        'overdue-check',
        jobType:      'consolidated',
        orderNumber:  `${row.year}-${String(row.month).padStart(2, '0')}`,
        error:        `${row.overdue_count} staged B2C orders were never submitted to LHDN. Overdue by 2+ months.`,
        attempts:     0,
      });
    }
    console.warn(`[Cron] ⚠️ ${rows.length} overdue consolidated invoice(s) found.`);
  }
});

console.log('[Cron] Schedulers registered:');
console.log('  - 0 9 1 * *   Monthly consolidated invoice (all merchants)');
console.log('  - 0 8 * * 1   Weekly DLQ health check');
console.log('  - 0 6 * * *   Daily overdue consolidated check');
```


***

## `routes/invoice.routes.js` — Multi-Tenant REST API

```js
const express           = require('express');
const router            = express.Router();
const einvoice          = require('../services/einvoice.service');
const merchantService   = require('../services/merchant.service');
const db                = require('../db/invoice.db');
const { enqueueInvoiceJob, getMerchantQueueStats } = require('../automation/queue');
const { orderEvents }   = require('../automation/events');

// ── Middleware: resolve merchant from request ─────────────────────────────
// Expects merchantId in header: X-Merchant-Id: shop_abc123
// OR in URL param: /merchants/:merchantId/invoices/...

async function resolveMerchant(req, res, next) {
  const merchantId = req.headers['x-merchant-id'] || req.params.merchantId;
  if (!merchantId) {
    return res.status(400).json({ success: false, error: 'X-Merchant-Id header is required' });
  }
  try {
    req.merchant   = await merchantService.getMerchant(merchantId);
    req.merchantId = merchantId;
    next();
  } catch (err) {
    res.status(err.message.includes('Not found') ? 404 : 403)
      .json({ success: false, error: err.message });
  }
}

// ── Merchant management ───────────────────────────────────────────────────

// Register new merchant
router.post('/merchants', async (req, res, next) => {
  try {
    const merchant = await merchantService.createMerchant(req.body);
    res.status(201).json({ success: true, data: sanitizeMerchant(merchant) });
  } catch (e) { next(e); }
});

// Update merchant settings (cert, credentials etc.)
router.put('/merchants/:merchantId', async (req, res, next) => {
  try {
    await merchantService.updateMerchant(req.params.merchantId, req.body);
    orderEvents.emit('merchant.updated', { merchantId: req.params.merchantId });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Invoice operations (all require X-Merchant-Id) ────────────────────────

// Issue invoice (direct — synchronous, waits for LHDN validation)
router.post('/invoices/issue', resolveMerchant, async (req, res, next) => {
  try {
    const result = await einvoice.issueInvoice(req.merchantId, req.body);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Enqueue invoice (async — returns immediately, processes in background)
router.post('/invoices/enqueue', resolveMerchant, async (req, res, next) => {
  try {
    const { type = 'invoice', ...payload } = req.body;
    await enqueueInvoiceJob(type, req.merchantId, payload);
    res.json({ success: true, message: 'Job enqueued successfully' });
  } catch (e) { next(e); }
});

// Fire order.paid event (recommended — use this from your order service)
router.post('/invoices/order-paid', resolveMerchant, async (req, res, next) => {
  try {
    orderEvents.emit('order.paid', { merchantId: req.merchantId, ...req.body });
    res.json({ success: true, message: 'order.paid event fired' });
  } catch (e) { next(e); }
});

// Credit note
router.post('/invoices/credit-note', resolveMerchant, async (req, res, next) => {
  try {
    const result = await einvoice.issueCreditNote(req.merchantId, req.body);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Debit note
router.post('/invoices/debit-note', resolveMerchant, async (req, res, next) => {
  try {
    const result = await einvoice.issueDebitNote(req.merchantId, req.body);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Refund note
router.post('/invoices/refund-note', resolveMerchant, async (req, res, next) => {
  try {
    const result = await einvoice.issueRefundNote(req.merchantId, req.body);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Cancel invoice (within 72h)
router.delete('/invoices/:uuid', resolveMerchant, async (req, res, next) => {
  try {
    const { reason, orderNumber } = req.body;
    const result = await einvoice.cancelInvoice(req.merchantId, req.params.uuid, reason, orderNumber);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Reject invoice (buyer rejects within 72h)
router.post('/invoices/:uuid/reject', resolveMerchant, async (req, res, next) => {
  try {
    const { reason, orderNumber } = req.body;
    const result = await einvoice.rejectInvoice(req.merchantId, req.params.uuid, reason, orderNumber);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// List merchant's invoices
router.get('/invoices', resolveMerchant, async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const invoices = await db.listInvoices(req.merchant.id, {
      status,
      limit:  parseInt(limit)  || 50,
      offset: parseInt(offset) || 0,
    });
    res.json({ success: true, data: invoices });
  } catch (e) { next(e); }
});

// ── Admin routes ──────────────────────────────────────────────────────────

// Get queue stats for a merchant
router.get('/admin/merchants/:merchantId/queue-stats', async (req, res, next) => {
  try {
    const stats = await getMerchantQueueStats(req.params.merchantId);
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
});

// Get failed jobs for a merchant
router.get('/admin/merchants/:merchantId/dlq', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    const jobs     = await db.listFailedJobs(merchant.id);
    res.json({ success: true, data: jobs });
  } catch (e) { next(e); }
});

// Resolve a failed job
router.post('/admin/merchants/:merchantId/dlq/:jobId/resolve', async (req, res, next) => {
  try {
    const merchant = await merchantService.getMerchant(req.params.merchantId);
    await db.resolveFailedJob(merchant.id, req.params.jobId, req.body.resolvedBy || 'admin');
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Sanitize merchant before returning (strip secrets)
function sanitizeMerchant(m) {
  const { lhdn_client_secret, cert_p12_base64, cert_passphrase, ...safe } = m;
  return safe;
}

module.exports = router;
```


***

## `index.js` — Final Wired App

```js
require('dotenv').config();
const express         = require('express');
const config          = require('./config');
const { ping: dbPing } = require('./db/pool');
const { getToken }    = require('./services/auth');

config.validateConfig();

const app = express();
app.use(express.json({ limit: '2mb' })); // cert uploads can be large

// ── Start worker ──────────────────────────────────────────────────────────
require('./automation/worker');

// ── Start cron schedulers ─────────────────────────────────────────────────
require('./automation/cron');

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api', require('./routes/invoice.routes'));
app.use(require('./middleware/errorHandler'));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const checks = { database: false, redis: false };
  try { await dbPing();                        checks.database = true; } catch {}
  try {
    const { connection } = require('./automation/queue');
    await connection.ping();                   checks.redis = true;
  } catch {}
  const healthy = Object.values(checks).every(Boolean);
  res.status(healthy ? 200 : 503).json({
    status:      healthy ? 'ok' : 'degraded',
    environment: config.ENV,
    checks,
    timestamp:   new Date().toISOString(),
  });
});

app.listen(3000, () => {
  console.log('\n[App] ✅ e-Invoice service started');
  console.log(`[App] Environment:  ${config.ENV.toUpperCase()}`);
  console.log('[App] Worker:       running');
  console.log('[App] Cron jobs:    registered');
  console.log('[App] Listening on: http://localhost:3000\n');
});
```


***

## How to Trigger From Your Order Service

```js
const { orderEvents } = require('./einvoice/automation/events');

// ── B2C order paid (no TIN) → staged for consolidated ────────────────────
orderEvents.emit('order.paid', {
  merchantId:  'shop_abc123',
  orderNumber: 'ORD-001',
  buyer:       { name: 'Customer', email: 'customer@email.com' }, // no tin
  items:       [{ description: 'Shirt', quantity: 1, unitPrice: 59, subtotal: 59, tax: 0 }],
});

// ── B2B order paid (has TIN) → individual invoice queued ─────────────────
orderEvents.emit('order.paid', {
  merchantId:  'shop_abc123',
  orderNumber: 'ORD-002',
  buyer: {
    tin: 'C99999999090', name: 'Business Buyer Sdn Bhd',
    email: 'ap@buyer.com', phone: '+60312345678',
    address: 'No 1, Jalan Biz', postcode: '50000',
    city: 'KL', state: '14',
  },
  items: [{ description: 'Bulk Order', quantity: 10, unitPrice: 100, subtotal: 1000, tax: 0 }],
});

// ── Cancel within 72h ────────────────────────────────────────────────────
orderEvents.emit('order.cancelled', {
  merchantId:  'shop_abc123',
  uuid:        'lhdn-uuid-here',
  orderNumber: 'ORD-001',
  reason:      'Customer cancelled',
});

// ── Refund after 72h ─────────────────────────────────────────────────────
orderEvents.emit('order.refunded', {
  merchantId:        'shop_abc123',
  refNumber:         'REF-001',
  originalInvoiceId: 'ORD-002',
  buyer:             order.buyer,
  items:             order.items,
});

// ── Merchant updates their cert ───────────────────────────────────────────
orderEvents.emit('merchant.updated', { merchantId: 'shop_abc123' });
```


***

## Phase 3 Exit Criteria

```bash
# Run Phase 3 verification
node __tests__/phase3.verify.js
```

```
□ Queue accepts jobs with merchantId
□ Worker routes jobs to correct invoice type per merchant
□ Two merchants process jobs without data crossover
□ Failed job → DLQ → Slack/email alert with merchant name
□ B2C order (no TIN) → staged in consolidated_staging (merchant-scoped)
□ Cron runs → picks up staged orders per merchant → queues consolidated job
□ Customer email sent with merchant's name as sender
□ Suspended merchant jobs fail immediately with correct error
□ merchant.updated event → clears token + cert cache for that merchant
□ /health returns ok with database + redis both green
```

Once all checks pass, Phase 3 is complete and you're ready for **Phase 4: Production Cutover** — switching from sandbox to live LHDN credentials for each merchant.

