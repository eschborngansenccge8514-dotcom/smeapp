const db        = require('../db/invoice.db');
const merchant  = require('./merchant.service');
const builder   = require('./builder');
const signer    = require('./signer');
const submitter = require('./submitter');
const config    = require('../config');

/**
 * Issue and submit a standard invoice.
 */
async function issueInvoice(merchantUid, invoiceData) {
  const m = await merchant.getMerchant(merchantUid);
  const unsigned = builder.buildInvoice(m, invoiceData);
  const { signedInvoice, docDigest } = signer.signDocument(unsigned, m);
  const lhdnResponse = await submitter.submitInvoice(m, invoiceData.orderNumber, signedInvoice);

  const invoiceRecord = await db.createInvoice({
    merchant_id:    m.id,
    order_id:       invoiceData.orderId,
    invoice_number: invoiceData.orderNumber,
    submission_uid: lhdnResponse.submissionUID,
    document_id:    lhdnResponse.uuid,
    long_id:        lhdnResponse.longId,
    hash:           docDigest,
    status:         'submitted',
    lhdn_response:  lhdnResponse,
  });

  return { ...invoiceRecord, qrCodeUrl: lhdnResponse.longId ? `${config.URLS[config.ENV].API}/documents/${lhdnResponse.uuid}/details` : null };
}

/**
 * Issue and submit a consolidated invoice for a merchant's monthly B2C sales.
 */
async function issueConsolidatedInvoice(merchantUid, { year, month, orders }) {
  const m = await merchant.getMerchant(merchantUid);
  
  // Aggregate items from all orders into a single document
  const items = orders.flatMap(o => o.items || [{
    description: `Summary for Order ${o.orderNumber}`,
    quantity: 1,
    unitPrice: o.subtotal,
    tax: o.tax,
  }]);

  const invoiceData = {
    invoiceNumber: `CON-${year}-${String(month).padStart(2, '0')}-${merchantUid.slice(0,4)}`,
    buyer: { name: 'General Public', tin: 'EI00000000010' },
    items,
  };

  const unsigned = builder.buildInvoice(m, invoiceData);
  const { signedInvoice, docDigest } = signer.signDocument(unsigned, m);
  const lhdnResponse = await submitter.submitInvoice(m, invoiceData.invoiceNumber, signedInvoice);

  const invoiceRecord = await db.createInvoice({
    merchant_id:    m.id,
    invoice_number: invoiceData.invoiceNumber,
    submission_uid: lhdnResponse.submissionUID,
    document_id:    lhdnResponse.uuid,
    long_id:        lhdnResponse.longId,
    hash:           docDigest,
    status:         'submitted',
    lhdn_response:  lhdnResponse,
  });

  // Mark all orders as consolidated in the staging table
  await db.markOrdersConsolidated(m.id, orders.map(o => o.orderNumber), invoiceRecord.id);

  return invoiceRecord;
}

/**
 * Issue Credit Note / Debit Note / Refund Note (Stubs — implement builder methods as needed)
 */
async function issueCreditNote(merchantUid, data) {
  return issueInvoice(merchantUid, data); // Simplified fallback
}

async function issueDebitNote(merchantUid, data) {
  return issueInvoice(merchantUid, data); // Simplified fallback
}

async function issueRefundNote(merchantUid, data) {
  return issueInvoice(merchantUid, data); // Simplified fallback
}

/**
 * Cancel an invoice (Stub — implement LHDN cancellation API)
 */
async function cancelInvoice(merchantUid, uuid, reason, orderNumber) {
  const m = await merchant.getMerchant(merchantUid);
  console.log(`[Service] Cancel request for ${uuid} (Merchant: ${merchantUid}) - Reason: ${reason}`);
  // TODO: Implement LHDN Cancel API call
  return { success: true };
}

module.exports = {
  issueInvoice,
  issueConsolidatedInvoice,
  issueCreditNote,
  issueDebitNote,
  issueRefundNote,
  cancelInvoice,
};
