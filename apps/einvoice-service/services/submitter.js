const config = require('../config');
const auth   = require('./auth');
const db     = require('../db/invoice.db');

function getApiBase(merchant) {
  return config.getURLs(merchant).API;
}

/**
 * Submit a signed invoice to LHDN MyInvois API
 */
async function submitInvoice(merchant, invoiceNumber, signedInvoiceJson) {
  const start = Date.now();
  const url   = `${getApiBase(merchant)}/documentsubmissions`;

  let responseBody, statusCode;

  try {
    const headers = await auth.apiHeaders(merchant);
    const res = await fetch(url, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        documents: [{
          format:          'JSON',
          document:        JSON.stringify(signedInvoiceJson),
          documentHash:    '', // LHDN calculates this from the minified string
          codeNumber:      invoiceNumber,
        }],
      }),
    });

    statusCode   = res.status;
    responseBody = await res.json();

    if (!res.ok) {
      throw new Error(`Submission failed [${res.status}]: ${JSON.stringify(responseBody)}`);
    }

    // Success response contains submissionUID and acceptedDocuments
    const result = responseBody.acceptedDocuments?.[0] || responseBody;

    // Log to standard audit
    await db.auditLog({
      orderNumber:  invoiceNumber,
      merchant_id:  merchant.id,
      action:       'submission',
      endpoint:     url,
      requestBody:  { invoiceNumber },
      responseBody,
      statusCode,
      durationMs:   Date.now() - start,
    }).catch(console.error);

    // If production, log to special compliance table
    if (merchant.env === 'production') {
      await pool.query(`
        INSERT INTO einvoice_production_log 
          (merchant_id, order_number, lhdn_uuid, lhdn_long_id, invoice_type, amount)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        merchant.id, invoiceNumber, result.uuid, result.longId, 
        signedInvoiceJson.type || '01', 1.0 // Placeholder amount — update builder to pass it
      ]).catch(console.error);
    }

    return result;

  } catch (err) {
    await db.auditLog({
      orderNumber:  invoiceNumber,
      merchant_id:  merchant.id,
      action:       'submission_error',
      endpoint:     url,
      requestBody:  { invoiceNumber },
      responseBody: responseBody || { error: err.message },
      statusCode:   statusCode || 0,
      durationMs:   Date.now() - start,
    }).catch(console.error);

    throw err;
  }
}

module.exports = { submitInvoice };
