const { pool } = require('./pool');

// ─── Create invoice record ────────────────────────────────────────────────
async function createInvoice({
  merchant_id, order_id, invoice_number, submission_uid,
  document_id, long_id, hash, status, lhdn_response
}) {
  const { rows } = await pool.query(`
    INSERT INTO public.einvoices
      (merchant_id, order_id, order_number, submission_uid, lhdn_uuid,
       lhdn_long_id, hash, status, lhdn_response, submitted_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
    RETURNING *
  `, [merchant_id, order_id, invoice_number, submission_uid, document_id,
      long_id, hash, status, JSON.stringify(lhdn_response)]);
  return rows[0];
}

// ─── Stage B2C order for consolidated invoice ─────────────────────────────
async function stageForConsolidated({ merchantId, orderNumber, subtotal, tax, year, month }) {
  await pool.query(`
    INSERT INTO public.consolidated_staging (merchant_id, order_number, subtotal, tax, year, month)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (order_number) DO NOTHING
  `, [merchantId, orderNumber, subtotal, tax, year, month]);
}

// ─── Get staged orders for consolidated ───────────────────────────────────
async function getStagedConsolidatedOrders(merchantId, year, month) {
  const { rows } = await pool.query(`
    SELECT order_number AS "orderNumber", subtotal, tax
    FROM   public.consolidated_staging
    WHERE  merchant_id = $1 AND year = $2 AND month = $3
      AND  consolidated_einvoice_id IS NULL
    ORDER  BY staged_at ASC
  `, [merchantId, year, month]);
  return rows;
}

// ─── Mark orders as consolidated ──────────────────────────────────────────
async function markOrdersConsolidated(merchantId, orderNumbers, einvoiceId) {
  await pool.query(`
    UPDATE public.consolidated_staging
    SET    consolidated_einvoice_id = $1,
           consolidated_at = NOW()
    WHERE  merchant_id = $2 AND order_number = ANY($3::text[])
  `, [einvoiceId, merchantId, orderNumbers]);
}

// ─── Save failed job ──────────────────────────────────────────────────────
async function saveFailedJob({ merchantId, jobId, jobType, orderNumber, error, attempts, payload }) {
  await pool.query(`
    INSERT INTO public.failed_invoice_jobs
      (merchant_id, job_id, job_type, order_number, error, attempts, payload)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [merchantId, jobId, jobType, orderNumber, error, attempts, JSON.stringify(payload)]);
}

// ─── Audit log ─────────────────────────────────────────────────────────────
async function auditLog({ orderNumber, merchant_id, action, endpoint, requestBody, responseBody, statusCode, durationMs }) {
  const { rows } = await pool.query(`
    INSERT INTO public.einvoice_audit_log
      (order_number, merchant_id, action, endpoint, request_body, response_body, status_code, duration_ms)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id
  `, [
    orderNumber, merchant_id, action, endpoint,
    JSON.stringify(requestBody),
    JSON.stringify(responseBody),
    statusCode, durationMs,
  ]);
  return rows[0]?.id;
}

async function ping() {
  await pool.query('SELECT 1');
}

module.exports = {
  createInvoice,
  stageForConsolidated,
  getStagedConsolidatedOrders,
  markOrdersConsolidated,
  saveFailedJob,
  auditLog,
  ping,
};
