const config = require('../config');

function roundMYR(val) { return Math.round((parseFloat(val) || 0) * 100) / 100; }
function isoDate()     { return new Date().toISOString().split('T')[0]; }
function isoTime()     { return new Date().toISOString().split('T')[1].replace(/\..+/, 'Z'); }

// ─── Supplier party built from merchant DB row ────────────────────────────

function buildSupplierParty(merchant) {
  return [{
    Party: [{
      IndustryClassificationCode: [{
        _: merchant.msic || '47910',
        name: 'Retail sale via internet',
      }],
      PartyIdentification: [
        { ID: [{ _: merchant.tin, schemeID: 'TIN' }] },
        { ID: [{ _: merchant.brn, schemeID: 'BRN' }] },
      ],
      PostalAddress: [{
        AddressLine:          [{ Line: [{ _: merchant.address || 'N/A' }] }],
        PostalZone:           [{ _: merchant.postcode || '00000' }],
        CityName:             [{ _: merchant.city     || 'N/A'   }],
        CountrySubentityCode: [{ _: merchant.state    || '00'    }],
        Country: [{
          IdentificationCode: [{
            _: merchant.country || 'MYS', listAgencyID: '6', listID: 'ISO3166-1',
          }],
        }],
      }],
      PartyLegalEntity: [{ RegistrationName: [{ _: merchant.name }] }],
      Contact: [{
        Telephone:      [{ _: merchant.phone || '00-00000000' }],
        ElectronicMail: [{ _: merchant.email || 'noreply@einvoice.my' }],
      }],
    }],
  }];
}

// ─── Buyer party (same as before — independent of merchant) ───────────────

function buildBuyerParty(buyer) {
  const isGeneralPublic = !buyer?.tin;
  return [{
    Party: [{
      PartyIdentification: [
        { ID: [{ _: isGeneralPublic ? 'EI00000000010' : (buyer.tin || 'EI00000000010'), schemeID: 'TIN' }] },
        ...(buyer?.brn  ? [{ ID: [{ _: buyer.brn,  schemeID: 'BRN'  }] }] : []),
        ...(buyer?.nric ? [{ ID: [{ _: buyer.nric, schemeID: 'NRIC' }] }] : []),
      ],
      PostalAddress: [{
        AddressLine:          [{ Line: [{ _: buyer?.address  || 'N/A'   }] }],
        PostalZone:           [{ _: buyer?.postcode || '00000' }],
        CityName:             [{ _: buyer?.city     || 'N/A'   }],
        CountrySubentityCode: [{ _: buyer?.state    || '00'    }],
        Country: [{
          IdentificationCode: [{
            _: buyer?.country || 'MYS', listAgencyID: '6', listID: 'ISO3166-1',
          }],
        }],
      }],
      PartyLegalEntity: [{
        RegistrationName: [{ _: isGeneralPublic ? 'General Public' : (buyer.name || 'General Public') }],
      }],
      Contact: [{
        Telephone:      [{ _: buyer?.phone || '00-00000000' }],
        ElectronicMail: [{ _: buyer?.email || 'noreply@einvoice.my' }],
      }],
    }],
  }];
}

// ─── Line items, tax totals, monetary totals ───────────────────────────────

function buildInvoiceLines(items) {
  return items.map((item, index) => {
    const subtotal = roundMYR(item.subtotal ?? item.quantity * item.unitPrice);
    const tax      = roundMYR(item.tax ?? 0);
    return {
      ID: [{ _: String(index + 1) }],
      InvoicedQuantity: [{ _: parseFloat(item.quantity), unitCode: item.unitCode || 'C62' }],
      LineExtensionAmount: [{ _: subtotal, currencyID: 'MYR' }],
      TaxTotal: [{
        TaxAmount: [{ _: tax, currencyID: 'MYR' }],
        TaxSubtotal: [{
          TaxableAmount: [{ _: subtotal, currencyID: 'MYR' }],
          TaxAmount:     [{ _: tax,      currencyID: 'MYR' }],
          TaxCategory: [{
            ID:      [{ _: item.taxCategory || 'E' }],
            Percent: [{ _: item.taxRate      || 0  }],
            TaxExemptionReason: [{ _: item.taxExemptReason || 'Exempted' }],
            TaxScheme: [{ ID: [{ _: 'OTH' }] }],
          }],
        }],
      }],
      Item: [{
        CommodityClassification: [{
          ItemClassificationCode: [{
            _: item.classCode || config.CLASS_CODES.ECOMMERCE, listID: 'CLASS',
          }],
        }],
        Description: [{ _: item.description }],
      }],
      Price: [{ PriceAmount: [{ _: roundMYR(item.unitPrice), currencyID: 'MYR' }] }],
    };
  });
}

function buildTaxTotal(items) {
  const taxAmount = roundMYR(items.reduce((s, i) => s + (i.tax ?? 0), 0));
  const subtotal  = roundMYR(items.reduce((s, i) => s + (i.subtotal ?? i.quantity * i.unitPrice), 0));
  return [{
    TaxAmount: [{ _: taxAmount, currencyID: 'MYR' }],
    TaxSubtotal: [{
      TaxableAmount: [{ _: subtotal,  currencyID: 'MYR' }],
      TaxAmount:     [{ _: taxAmount, currencyID: 'MYR' }],
      TaxCategory: [{
        ID: [{ _: 'E' }], Percent: [{ _: 0 }],
        TaxExemptionReason: [{ _: 'Not Subject to SST' }],
        TaxScheme: [{ ID: [{ _: 'OTH' }] }],
      }],
    }],
  }];
}

function buildMonetaryTotal(items, discount = 0) {
  const subtotal   = roundMYR(items.reduce((s, i) => s + (i.subtotal ?? i.quantity * i.unitPrice), 0));
  const taxTotal   = roundMYR(items.reduce((s, i) => s + (i.tax ?? 0), 0));
  const discAmount = roundMYR(discount);
  const grandTotal = roundMYR(subtotal + taxTotal - discAmount);
  return [{
    LineExtensionAmount:  [{ _: subtotal,   currencyID: 'MYR' }],
    AllowanceTotalAmount: [{ _: discAmount, currencyID: 'MYR' }],
    TaxExclusiveAmount:   [{ _: subtotal,   currencyID: 'MYR' }],
    TaxInclusiveAmount:   [{ _: grandTotal, currencyID: 'MYR' }],
    PayableAmount:        [{ _: grandTotal, currencyID: 'MYR' }],
  }];
}

// ─── Base document — now takes merchant as first arg ──────────────────────

function baseDocument(merchant, typeCode, invoiceNumber, buyer, items, opts = {}) {
  return {
    _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    Invoice: [{
      ID:                   [{ _: invoiceNumber }],
      IssueDate:            [{ _: isoDate() }],
      IssueTime:            [{ _: isoTime() }],
      InvoiceTypeCode:      [{ _: typeCode, listVersionID: '1.0' }],
      DocumentCurrencyCode: [{ _: 'MYR' }],
      ...(opts.billingReference ? {
        BillingReference: [{
          InvoiceDocumentReference: [{ ID: [{ _: opts.billingReference }] }],
        }],
      } : {}),
      ...(opts.periodStart ? {
        InvoicePeriod: [{
          StartDate:   [{ _: opts.periodStart }],
          EndDate:     [{ _: opts.periodEnd   }],
          Description: [{ _: 'Monthly'        }],
        }],
      } : {}),
      AccountingSupplierParty: buildSupplierParty(merchant),
      AccountingCustomerParty: buildBuyerParty(buyer),
      TaxTotal:           buildTaxTotal(items),
      LegalMonetaryTotal: buildMonetaryTotal(items, opts.discount),
      InvoiceLine:        buildInvoiceLines(items),
    }],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

function buildInvoice(merchant, { invoiceNumber, buyer, items, discount = 0 }) {
  return baseDocument(merchant, config.INVOICE_TYPES.INVOICE, invoiceNumber, buyer, items, { discount });
}

function buildCreditNote(merchant, { invoiceNumber, originalInvoiceId, buyer, items }) {
  return baseDocument(merchant, config.INVOICE_TYPES.CREDIT_NOTE, invoiceNumber, buyer, items, {
    billingReference: originalInvoiceId,
  });
}

function buildDebitNote(merchant, { invoiceNumber, originalInvoiceId, buyer, items }) {
  return baseDocument(merchant, config.INVOICE_TYPES.DEBIT_NOTE, invoiceNumber, buyer, items, {
    billingReference: originalInvoiceId,
  });
}

function buildRefundNote(merchant, { invoiceNumber, originalInvoiceId, buyer, items }) {
  return baseDocument(merchant, config.INVOICE_TYPES.REFUND_NOTE, invoiceNumber, buyer, items, {
    billingReference: originalInvoiceId,
  });
}

module.exports = {
  buildInvoice,
  buildCreditNote,
  buildDebitNote,
  buildRefundNote,
};
