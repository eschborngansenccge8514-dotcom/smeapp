<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# our app is multi tenant, and it requires every merchant to have their own data and info. rewrite phase 2

Great catch — multi-tenancy changes the entire architecture of Phase 2. Every merchant needs their own supplier info, LHDN credentials, digital certificate, token cache, and fully isolated data. Here is the complete rewrite.

***

## What Changes in Multi-Tenant Phase 2

| Concern | Single Tenant | Multi-Tenant |
| :-- | :-- | :-- |
| Supplier info | Global `config.js` | Per-merchant DB record |
| LHDN credentials | Single `.env` | Per-merchant `client_id` + `client_secret` |
| Token cache | Single global token | Token map keyed by `merchant_id` |
| Digital certificate | Single `.p12` file | Per-merchant cert (stored in DB or filesystem) |
| Invoice data | No scoping | All tables scoped by `merchant_id` |
| Service methods | No context | All methods receive `merchantId` |


***

## Phase 2 Files

```
services/
├── merchant.service.js   ← NEW: load & cache merchant from DB
├── auth.js               ← REWRITE: per-merchant token cache
├── signer.js             ← REWRITE: per-merchant cert loading
├── builder.js            ← REWRITE: supplier info from merchant object
├── submitter.js          ← REWRITE: merchant-aware logged fetch
└── einvoice.service.js   ← REWRITE: all methods take merchantId

db/
├── migrate.js            ← ADD: merchants table + merchant_id columns
└── invoice.db.js         ← REWRITE: all queries scoped by merchant_id

__tests__/
├── builder.test.js
├── signer.test.js
├── submitter.test.js
└── phase2.verify.js
```


***

## Step 1: DB Migration — Add Merchants Table + Tenant Columns

Add to `db/migrate.js` (append after Phase 1 migrations):

```js
// ─── Phase 2 migrations ───────────────────────────────────────────────────

// Merchants master table
`CREATE TABLE IF NOT EXISTS merchants (
  id                  SERIAL PRIMARY KEY,
  merchant_uid        VARCHAR(100) UNIQUE NOT NULL, -- your internal ID e.g. "shop_abc123"
  name                VARCHAR(200) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','suspended','inactive')),

  -- LHDN Supplier Info
  tin                 VARCHAR(50)  NOT NULL,
  brn                 VARCHAR(50)  NOT NULL,
  phone               VARCHAR(50),
  email               VARCHAR(200),
  address             VARCHAR(500),
  postcode            VARCHAR(20),
  city                VARCHAR(100),
  state               VARCHAR(10),
  msic                VARCHAR(20) DEFAULT '47910',
  country             VARCHAR(10) DEFAULT 'MYS',

  -- LHDN API Credentials (per-merchant MyInvois registration)
  lhdn_client_id      VARCHAR(300),
  lhdn_client_secret  VARCHAR(300),

  -- Digital Certificate (stored as encrypted Base64 in DB)
  cert_p12_base64     TEXT,         -- Base64 of the .p12 file
  cert_passphrase     VARCHAR(500), -- encrypted passphrase
  cert_issuer_name    VARCHAR(500),
  cert_serial_number  VARCHAR(200),

  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`,

`CREATE INDEX IF NOT EXISTS idx_merchants_uid
   ON merchants(merchant_uid)`,

`CREATE INDEX IF NOT EXISTS idx_merchants_status
   ON merchants(status)`,

// Add merchant_id to einvoices
`ALTER TABLE einvoices
   ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id)`,

`CREATE INDEX IF NOT EXISTS idx_einvoices_merchant_id
   ON einvoices(merchant_id)`,

// Add merchant_id to consolidated_staging
`ALTER TABLE consolidated_staging
   ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id)`,

`CREATE INDEX IF NOT EXISTS idx_consolidated_merchant_id
   ON consolidated_staging(merchant_id)`,

// Add merchant_id to audit log
`ALTER TABLE einvoice_audit_log
   ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id)`,

// Add merchant_id to failed jobs
`ALTER TABLE failed_invoice_jobs
   ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id)`,

// Auto-update trigger for merchants
`DO $$
 BEGIN
   IF NOT EXISTS (
     SELECT 1 FROM pg_trigger
     WHERE tgname = 'set_merchants_updated_at'
   ) THEN
     CREATE TRIGGER set_merchants_updated_at
       BEFORE UPDATE ON merchants
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   END IF;
 END $$`,
```


***

## Step 2: `services/merchant.service.js` — Merchant Loader

This is the foundation everything else depends on. Loads merchants from DB and caches them in memory:

```js
const { pool } = require('../db/pool');

// In-memory cache: merchantUid → merchant record
// Invalidated on update
const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load a merchant by their internal merchant_uid.
 * Throws if not found or suspended.
 */
async function getMerchant(merchantUid) {
  const cached = _cache.get(merchantUid);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.merchant;
  }

  const { rows } = await pool.query(
    `SELECT * FROM merchants WHERE merchant_uid = $1 LIMIT 1`,
    [merchantUid]
  );

  if (rows.length === 0) {
    throw new Error(`[Merchant] Not found: ${merchantUid}`);
  }

  const merchant = rows[0];

  if (merchant.status !== 'active') {
    throw new Error(`[Merchant] Account is ${merchant.status}: ${merchantUid}`);
  }

  _cache.set(merchantUid, {
    merchant,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return merchant;
}

/**
 * Load merchant by internal DB id (used in worker after queue job)
 */
async function getMerchantById(merchantId) {
  const { rows } = await pool.query(
    `SELECT * FROM merchants WHERE id = $1 LIMIT 1`,
    [merchantId]
  );
  if (rows.length === 0) throw new Error(`[Merchant] ID not found: ${merchantId}`);
  return rows[0];
}

/**
 * Invalidate cache for a merchant (call after updating merchant settings)
 */
function invalidateMerchantCache(merchantUid) {
  _cache.delete(merchantUid);
  console.log(`[Merchant] Cache invalidated for: ${merchantUid}`);
}

/**
 * Register a new merchant (call from your onboarding flow)
 */
async function createMerchant({
  merchantUid, name, tin, brn, phone, email,
  address, postcode, city, state, msic,
  lhdnClientId, lhdnClientSecret,
  certP12Base64, certPassphrase,
  certIssuerName, certSerialNumber,
}) {
  const { rows } = await pool.query(`
    INSERT INTO merchants (
      merchant_uid, name, tin, brn, phone, email,
      address, postcode, city, state, msic,
      lhdn_client_id, lhdn_client_secret,
      cert_p12_base64, cert_passphrase,
      cert_issuer_name, cert_serial_number
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *
  `, [
    merchantUid, name, tin, brn, phone, email,
    address, postcode, city, state, msic || '47910',
    lhdnClientId, lhdnClientSecret,
    certP12Base64, certPassphrase,
    certIssuerName, certSerialNumber,
  ]);
  console.log(`[Merchant] Created: ${merchantUid}`);
  return rows[0];
}

/**
 * Update merchant LHDN credentials or cert
 */
async function updateMerchant(merchantUid, fields) {
  const allowed = [
    'name', 'phone', 'email', 'address', 'postcode', 'city', 'state',
    'lhdn_client_id', 'lhdn_client_secret',
    'cert_p12_base64', 'cert_passphrase',
    'cert_issuer_name', 'cert_serial_number',
    'status',
  ];
  const updates = Object.entries(fields)
    .filter(([k]) => allowed.includes(k));

  if (updates.length === 0) return;

  const setClauses = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values     = [merchantUid, ...updates.map(([, v]) => v)];

  await pool.query(
    `UPDATE merchants SET ${setClauses} WHERE merchant_uid = $1`,
    values
  );

  invalidateMerchantCache(merchantUid);
  console.log(`[Merchant] Updated: ${merchantUid}`);
}

module.exports = {
  getMerchant,
  getMerchantById,
  createMerchant,
  updateMerchant,
  invalidateMerchantCache,
};
```


***

## Step 3: `services/auth.js` — Per-Merchant Token Cache

```js
const config = require('../config');
const { pool } = require('../db/pool');

// Token cache: merchantId (DB int) → { token, expiry }
const _tokenCache = new Map();

function getTokenUrl() {
  return config.URLS[config.ENV === 'production' ? 'production' : 'sandbox'].TOKEN;
}

/**
 * Get a valid LHDN access token for a specific merchant.
 * Each merchant uses their own client_id + client_secret.
 *
 * @param {Object} merchant  - merchant DB row (must have lhdn_client_id, lhdn_client_secret)
 */
async function getToken(merchant) {
  const cached = _tokenCache.get(merchant.id);
  if (cached && Date.now() < cached.expiry) {
    return cached.token;
  }

  if (!merchant.lhdn_client_id || !merchant.lhdn_client_secret) {
    throw new Error(
      `[Auth] Merchant "${merchant.merchant_uid}" has no LHDN credentials configured.`
    );
  }

  const res = await fetch(getTokenUrl(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     merchant.lhdn_client_id,
      client_secret: merchant.lhdn_client_secret,
      scope:         'InvoicingAPI',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `[Auth] Token failed for merchant "${merchant.merchant_uid}" [${res.status}]: ${err}`
    );
  }

  const data  = await res.json();
  const token = data.access_token;

  _tokenCache.set(merchant.id, {
    token,
    expiry: Date.now() + (data.expires_in - 60) * 1000,
  });

  console.log(`[Auth] Token refreshed for merchant: ${merchant.merchant_uid}`);
  return token;
}

/**
 * Build Authorization headers for a specific merchant
 */
async function apiHeaders(merchant, extra = {}) {
  const token = await getToken(merchant);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    ...extra,
  };
}

/**
 * Force token refresh for a merchant (e.g. after 401 response)
 */
function invalidateToken(merchantId) {
  _tokenCache.delete(merchantId);
}

module.exports = { getToken, apiHeaders, invalidateToken };
```


***

## Step 4: `services/signer.js` — Per-Merchant Certificate

```js
const crypto = require('crypto');
const forge  = require('node-forge');

// Cert metadata cache: merchantId → cert metadata
const _certCache = new Map();

/**
 * Load and parse a merchant's .p12 certificate from their DB record.
 * Caches the result in memory to avoid re-parsing on every request.
 *
 * @param {Object} merchant - merchant DB row
 */
function loadCertMeta(merchant) {
  const cached = _certCache.get(merchant.id);
  if (cached) return cached;

  // Sandbox fallback: no cert configured yet
  if (!merchant.cert_p12_base64) {
    console.warn(
      `[Signer] Merchant "${merchant.merchant_uid}" has no certificate. Using sandbox placeholder.`
    );
    const meta = {
      privateKey:   null,
      certificate:  '',
      issuerName:   merchant.cert_issuer_name   || 'CN=Test, O=Test, C=MY',
      serialNumber: merchant.cert_serial_number || '00',
      certDigest:   Buffer.alloc(32).toString('base64'),
    };
    _certCache.set(merchant.id, meta);
    return meta;
  }

  // Decode Base64 .p12 from DB
  const pfxBuffer = Buffer.from(merchant.cert_p12_base64, 'base64');
  const p12Asn1   = forge.asn1.fromDer(pfxBuffer.toString('binary'));
  const p12       = forge.pkcs12.pkcs12FromAsn1(p12Asn1, merchant.cert_passphrase || '');

  // Extract private key
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const privateKeyPem = keyBag ? forge.pki.privateKeyToPem(keyBag.key) : null;

  // Extract certificate
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag  = certBags[forge.pki.oids.certBag]?.[0];
  const cert     = certBag?.cert;
  if (!cert) throw new Error(`[Signer] No certificate in .p12 for merchant "${merchant.merchant_uid}"`);

  const issuerName = cert.issuer.attributes
    .map(a => `${a.shortName}=${a.value}`)
    .join(', ');

  const certDer    = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const certBase64 = Buffer.from(certDer, 'binary').toString('base64');
  const certDigest = crypto
    .createHash('sha256')
    .update(Buffer.from(certDer, 'binary'))
    .digest('base64');

  const meta = {
    privateKey:   privateKeyPem,
    certificate:  certBase64,
    issuerName,
    serialNumber: cert.serialNumber,
    certDigest,
  };

  _certCache.set(merchant.id, meta);
  console.log(`[Signer] Certificate loaded for merchant: ${merchant.merchant_uid}`);
  return meta;
}

/**
 * Invalidate cert cache (call after merchant uploads a new certificate)
 */
function invalidateCertCache(merchantId) {
  _certCache.delete(merchantId);
}

// ─── Hashing ──────────────────────────────────────────────────────────────

function hashDocument(invoiceObj) {
  const minified  = JSON.stringify(invoiceObj);
  const hexHash   = crypto.createHash('sha256').update(minified, 'utf8').digest('hex');
  const docDigest = Buffer.from(hexHash).toString('base64');
  return { minified, hexHash, docDigest };
}

function signHex(hexHash, privateKeyPem, merchantUid) {
  if (!privateKeyPem) {
    console.warn(`[Signer] No private key for merchant "${merchantUid}" — sandbox placeholder.`);
    return 'SANDBOX_PLACEHOLDER_SIGNATURE';
  }
  return crypto
    .sign('RSA-SHA256', Buffer.from(hexHash), {
      key:     privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    })
    .toString('base64');
}

function buildSignedPropsXml(signingTime, certDigest, issuerName, serialNumber) {
  return [
    `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="id-xades-signed-props">`,
    `<xades:SignedSignatureProperties>`,
    `<xades:SigningTime>${signingTime}</xades:SigningTime>`,
    `<xades:SigningCertificate><xades:Cert>`,
    `<xades:CertDigest>`,
    `<ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>`,
    `<ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certDigest}</ds:DigestValue>`,
    `</xades:CertDigest>`,
    `<xades:IssuerSerial>`,
    `<ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${issuerName}</ds:X509IssuerName>`,
    `<ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${serialNumber}</ds:X509SerialNumber>`,
    `</xades:IssuerSerial></xades:Cert></xades:SigningCertificate>`,
    `</xades:SignedSignatureProperties></xades:SignedProperties>`,
  ].join('');
}

function injectSignatureBlock(invoiceObj, {
  docDigest, propsDigest, signatureValue,
  certDigest, issuerName, serialNumber,
  certificate, signingTime,
}) {
  const block = {
    UBLExtensions: [{
      UBLExtension: [{
        ExtensionURI: [{ _: 'urn:oasis:names:specification:ubl:dsig:enveloped:xades' }],
        ExtensionContent: [{
          'sig:UBLDocumentSignatures': [{
            'xmlns:sig': 'urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2',
            'xmlns:sac': 'urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2',
            'xmlns:sbc': 'urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2',
            'sac:SignatureInformation': [{
              'cbc:ID': [{ _: 'urn:oasis:names:specification:ubl:signature:1' }],
              'sbc:ReferencedSignatureID': [{ _: 'urn:oasis:names:specification:ubl:signature:Invoice' }],
              'ds:Signature': [{
                'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
                Id: 'id-doc-signed-data',
                'ds:SignedInfo': [{
                  'ds:CanonicalizationMethod': [{ Algorithm: 'http://www.w3.org/2006/12/xml-c14n11' }],
                  'ds:SignatureMethod': [{ Algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256' }],
                  'ds:Reference': [
                    {
                      Id: 'id-doc-signed-data', URI: '',
                      'ds:DigestMethod': [{ Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256' }],
                      'ds:DigestValue': [{ _: docDigest }],
                    },
                    {
                      URI: '#id-xades-signed-props',
                      Type: 'http://uri.etsi.org/01903#SignedProperties',
                      'ds:DigestMethod': [{ Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256' }],
                      'ds:DigestValue': [{ _: propsDigest }],
                    },
                  ],
                }],
                'ds:SignatureValue': [{ _: signatureValue }],
                'ds:KeyInfo': [{ 'ds:X509Data': [{ 'ds:X509Certificate': [{ _: certificate }] }] }],
                'ds:Object': [{
                  'xades:QualifyingProperties': [{
                    'xmlns:xades': 'http://uri.etsi.org/01903/v1.3.2#',
                    Target: 'id-doc-signed-data',
                    'xades:SignedProperties': [{
                      Id: 'id-xades-signed-props',
                      'xades:SignedSignatureProperties': [{
                        'xades:SigningTime': [{ _: signingTime }],
                        'xades:SigningCertificate': [{
                          'xades:Cert': [{
                            'xades:CertDigest': [{
                              'ds:DigestMethod': [{ Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256' }],
                              'ds:DigestValue':  [{ _: certDigest }],
                            }],
                            'xades:IssuerSerial': [{
                              'ds:X509IssuerName':   [{ _: issuerName   }],
                              'ds:X509SerialNumber': [{ _: serialNumber }],
                            }],
                          }],
                        }],
                      }],
                    }],
                  }],
                }],
              }],
            }],
          }],
        }],
      }],
    }],
    Signature: [{
      ID:              [{ _: 'urn:oasis:names:specification:ubl:signature:Invoice' }],
      SignatureMethod: [{ _: 'urn:oasis:names:specification:ubl:dsig:enveloped:xades' }],
    }],
  };

  return {
    ...invoiceObj,
    Invoice: invoiceObj.Invoice.map(inv => ({ ...block, ...inv })),
  };
}

/**
 * Full 8-step signing for a specific merchant
 *
 * @param {Object} invoiceObj - unsigned UBL JSON document
 * @param {Object} merchant   - merchant DB row
 */
function signDocument(invoiceObj, merchant) {
  const cert        = loadCertMeta(merchant);
  const signingTime = new Date().toISOString();
  const { hexHash, docDigest } = hashDocument(invoiceObj);
  const signatureValue = signHex(hexHash, cert.privateKey, merchant.merchant_uid);
  const signedPropsXml = buildSignedPropsXml(
    signingTime, cert.certDigest, cert.issuerName, cert.serialNumber
  );
  const propsDigest = crypto
    .createHash('sha256').update(signedPropsXml, 'utf8').digest('base64');

  const signedInvoice = injectSignatureBlock(invoiceObj, {
    docDigest, propsDigest, signatureValue,
    certDigest:   cert.certDigest,
    issuerName:   cert.issuerName,
    serialNumber: cert.serialNumber,
    certificate:  cert.certificate,
    signingTime,
  });

  return { signedInvoice, docDigest };
}

module.exports = { signDocument, hashDocument, loadCertMeta, invalidateCertCache };
```


***

## Step 5: `services/builder.js` — Merchant-Aware Document Builder

```js
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
        { ID: [{ _: isGeneralPublic ? 'EI00000000010' : buyer.tin, schemeID: 'TIN' }] },
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
        RegistrationName: [{ _: isGeneralPublic ? 'General Public' : buyer.name }],
      }],
      Contact: [{
        Telephone:      [{ _: buyer?.phone || '00-00000000' }],
        ElectronicMail: [{ _: buyer?.email || 'noreply@einvoice.my' }],
      }],
    }],
  }];
}

// ─── Line items, tax totals, monetary totals (unchanged) ──────────────────

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
      AccountingSupplierParty: buildSupplierParty(merchant),    // ← merchant-specific
      AccountingCustomerParty: buildBuyerParty(buyer),
      TaxTotal:           buildTaxTotal(items),
      LegalMonetaryTotal: buildMonetaryTotal(items, opts.discount),
      InvoiceLine:        buildInvoiceLines(items),
    }],
  };
}

// ─── Public API — all accept merchant as first argument ───────────────────

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

function buildConsolidatedInvoice(merchant, { invoiceNumber, periodStart, periodEnd, orders }) {
  const items = orders.map(o => ({
    description: `Order #${o.orderNumber}`,
    quantity:    1,
    unitCode:    'C62',
    unitPrice:   roundMYR(o.subtotal),
    subtotal:    roundMYR(o.subtotal),
    tax:         roundMYR(o.tax || 0),
    taxCategory: 'E',
    taxRate:     0,
    classCode:   config.CLASS_CODES.CONSOLIDATED,
  }));
  return baseDocument(merchant, config.INVOICE_TYPES.INVOICE, invoiceNumber, null, items, {
    periodStart, periodEnd,
  });
}

module.exports = {
  buildInvoice,
  buildCreditNote,
  buildDebitNote,
  buildRefundNote,
  buildConsolidatedInvoice,
  buildSupplierParty,
  buildBuyerParty,
  roundMYR,
};
```


***

## Step 6: `services/submitter.js` — Merchant-Aware API Calls

```js
const config               = require('../config');
const { apiHeaders, invalidateToken } = require('./auth');
const db                   = require('../db/invoice.db');

function apiBase() {
  return config.URLS[config.ENV === 'production' ? 'production' : 'sandbox'].API;
}

async function loggedFetch(endpoint, options, action, merchantId, orderNumber) {
  const url   = `${apiBase()}${endpoint}`;
  const start = Date.now();
  let responseBody, statusCode, res;

  try {
    res          = await fetch(url, options);
    statusCode   = res.status;
    responseBody = await res.clone().json().catch(() => ({}));

    // Auto-refresh token on 401 and retry once
    if (statusCode === 401) {
      invalidateToken(merchantId);
      const merchant = await require('./merchant.service').getMerchantById(merchantId);
      const headers  = await apiHeaders(merchant);
      res          = await fetch(url, { ...options, headers });
      statusCode   = res.status;
      responseBody = await res.clone().json().catch(() => ({}));
    }

    return res;
  } finally {
    await db.auditLog({
      merchantId,
      orderNumber,
      action,
      endpoint: url,
      requestBody:  JSON.parse(options.body || '{}'),
      responseBody: responseBody || {},
      statusCode:   statusCode || 0,
      durationMs:   Date.now() - start,
    }).catch(() => {});
  }
}

async function submitDocument(merchant, invoiceNumber, signedDoc, docDigest) {
  const documentBase64 = Buffer.from(JSON.stringify(signedDoc)).toString('base64');
  const body = JSON.stringify({
    documents: [{
      format:       'JSON',
      documentHash: docDigest,
      codeNumber:   invoiceNumber,
      document:     documentBase64,
    }],
  });

  const res = await loggedFetch(
    '/documentsubmissions',
    { method: 'POST', headers: await apiHeaders(merchant), body },
    'submit', merchant.id, invoiceNumber
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`[Submit][${merchant.merchant_uid}] ${res.status} — ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const { submissionUid, rejectedDocuments } = data;

  if (rejectedDocuments?.length > 0) {
    const reasons = rejectedDocuments.map(d => d.error?.message).join('; ');
    throw new Error(`[Submit][${merchant.merchant_uid}] Rejected: ${reasons}`);
  }

  console.log(`[Submit] ✅ Merchant: ${merchant.merchant_uid} | UID: ${submissionUid}`);
  return submissionUid;
}

async function pollStatus(merchant, submissionUid, maxRetries = 15, intervalMs = 4000) {
  for (let i = 0; i < maxRetries; i++) {
    await sleep(intervalMs);

    const res = await loggedFetch(
      `/documentsubmissions/${submissionUid}`,
      { method: 'GET', headers: await apiHeaders(merchant) },
      'poll', merchant.id, submissionUid
    );

    if (!res.ok) continue;

    const data = await res.json();
    const doc  = data.documentSummary?.[0];
    if (!doc) continue;

    console.log(`[Poll][${merchant.merchant_uid}] Attempt ${i + 1} — ${doc.status}`);

    if (doc.status === 'Valid') {
      return {
        status:    'Valid',
        uuid:      doc.uuid,
        longId:    doc.longId,
        qrCodeUrl: `https://myinvois.hasil.gov.my/${doc.uuid}/share/${doc.longId}`,
      };
    }

    if (doc.status === 'Invalid') {
      const errors = doc.validationResults?.validationSteps
        ?.filter(s => s.status === 'Invalid')
        .map(s => `[${s.name}] ${s.error?.message}`)
        .join(' | ');
      throw new Error(`[Poll][${merchant.merchant_uid}] Rejected: ${errors}`);
    }
  }
  throw new Error(`[Poll][${merchant.merchant_uid}] Timed out for UID: ${submissionUid}`);
}

async function cancelDocument(merchant, uuid, reason, orderNumber) {
  const res = await loggedFetch(
    `/documents/state/${uuid}/state`,
    { method: 'PUT', headers: await apiHeaders(merchant), body: JSON.stringify({ status: 'cancelled', reason }) },
    'cancel', merchant.id, orderNumber
  );
  if (!res.ok) throw new Error(`[Cancel][${merchant.merchant_uid}] ${res.status}`);
  return await res.json();
}

async function rejectDocument(merchant, uuid, reason, orderNumber) {
  const res = await loggedFetch(
    `/documents/state/${uuid}/state`,
    { method: 'PUT', headers: await apiHeaders(merchant), body: JSON.stringify({ status: 'rejected', reason }) },
    'reject', merchant.id, orderNumber
  );
  if (!res.ok) throw new Error(`[Reject][${merchant.merchant_uid}] ${res.status}`);
  return await res.json();
}

async function getDocument(merchant, uuid, orderNumber) {
  const res = await loggedFetch(
    `/documents/${uuid}/details`,
    { method: 'GET', headers: await apiHeaders(merchant) },
    'get-document', merchant.id, orderNumber
  );
  if (!res.ok) throw new Error(`[Get][${merchant.merchant_uid}] ${res.status}`);
  return await res.json();
}

async function validateBuyerTIN(merchant, tin, idType, idValue) {
  const res = await loggedFetch(
    `/taxpayer/validate/${tin}?idType=${idType}&idValue=${idValue}`,
    { method: 'GET', headers: await apiHeaders(merchant) },
    'validate-tin', merchant.id, null
  );
  return res.ok;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  submitDocument, pollStatus,
  cancelDocument, rejectDocument,
  getDocument, validateBuyerTIN,
};
```


***

## Step 7: `db/invoice.db.js` — All Queries Scoped by `merchant_id`

```js
const { pool } = require('./pool');

// ─── Invoices ─────────────────────────────────────────────────────────────

async function upsertInvoice({
  merchantId, orderNumber, invoiceType, submissionUid,
  lhdnUuid, lhdnLongId, qrCodeUrl, status, errorMessage,
}) {
  await pool.query(`
    INSERT INTO einvoices
      (merchant_id, order_number, invoice_type, submission_uid,
       lhdn_uuid, lhdn_long_id, qr_code_url, status, error_message,
       submitted_at, validated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
      CASE WHEN $4 IS NOT NULL THEN NOW() ELSE NULL END,
      CASE WHEN $8 = 'valid'   THEN NOW() ELSE NULL END
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
        ELSE einvoices.validated_at END
  `, [merchantId, orderNumber, invoiceType, submissionUid,
      lhdnUuid, lhdnLongId, qrCodeUrl, status, errorMessage]);
}

async function getInvoiceByOrderNumber(merchantId, orderNumber) {
  const { rows } = await pool.query(
    `SELECT * FROM einvoices WHERE merchant_id = $1 AND order_number = $2`,
    [merchantId, orderNumber]
  );
  return rows[0] || null;
}

async function listInvoices(merchantId, { limit = 50, offset = 0, status } = {}) {
  const where  = status ? 'AND status = $4' : '';
  const params = status
    ? [merchantId, limit, offset, status]
    : [merchantId, limit, offset];
  const { rows } = await pool.query(`
    SELECT * FROM einvoices
    WHERE merchant_id = $1 ${where}
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, params);
  return rows;
}

// ─── Consolidated Staging ─────────────────────────────────────────────────

async function stageForConsolidated({ merchantId, orderNumber, subtotal, tax, year, month }) {
  await pool.query(`
    INSERT INTO consolidated_staging
      (merchant_id, order_number, subtotal, tax, year, month)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (order_number) DO NOTHING
  `, [merchantId, orderNumber, subtotal, tax, year, month]);
}

async function getStagedConsolidatedOrders(merchantId, year, month) {
  const { rows } = await pool.query(`
    SELECT order_number AS "orderNumber", subtotal, tax
    FROM   consolidated_staging
    WHERE  merchant_id = $1
      AND  year = $2 AND month = $3
      AND  consolidated_einvoice_id IS NULL
    ORDER  BY staged_at ASC
  `, [merchantId, year, month]);
  return rows;
}

async function markOrdersConsolidated(merchantId, orderNumbers, einvoiceId) {
  await pool.query(`
    UPDATE consolidated_staging
    SET    consolidated_einvoice_id = $1, consolidated_at = NOW()
    WHERE  merchant_id = $2
      AND  order_number = ANY($3::text[])
  `, [einvoiceId, merchantId, orderNumbers]);
}

// ─── Failed Jobs ──────────────────────────────────────────────────────────

async function saveFailedJob({ merchantId, jobId, jobType, orderNumber, error, attempts, payload }) {
  await pool.query(`
    INSERT INTO failed_invoice_jobs
      (merchant_id, job_id, job_type, order_number, error, attempts, payload)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [merchantId, jobId, jobType, orderNumber, error, attempts, JSON.stringify(payload)]);
}

async function resolveFailedJob(merchantId, id, resolvedBy) {
  await pool.query(`
    UPDATE failed_invoice_jobs
    SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1
    WHERE id = $2 AND merchant_id = $3
  `, [resolvedBy, id, merchantId]);
}

async function listFailedJobs(merchantId, includeResolved = false) {
  const { rows } = await pool.query(`
    SELECT * FROM failed_invoice_jobs
    WHERE merchant_id = $1 AND resolved = $2
    ORDER BY failed_at DESC
  `, [merchantId, includeResolved]);
  return rows;
}

// ─── Audit Log ────────────────────────────────────────────────────────────

async function auditLog({
  merchantId, orderNumber, action, endpoint,
  requestBody, responseBody, statusCode, durationMs,
}) {
  await pool.query(`
    INSERT INTO einvoice_audit_log
      (merchant_id, order_number, action, endpoint,
       request_body, response_body, status_code, duration_ms)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [
    merchantId, orderNumber, action, endpoint,
    JSON.stringify(requestBody),
    JSON.stringify(responseBody),
    statusCode, durationMs,
  ]);
}

async function ping() { await pool.query('SELECT 1'); }

module.exports = {
  upsertInvoice, getInvoiceByOrderNumber, listInvoices,
  stageForConsolidated, getStagedConsolidatedOrders, markOrdersConsolidated,
  saveFailedJob, resolveFailedJob, listFailedJobs,
  auditLog, ping,
};
```


***

## Step 8: `services/einvoice.service.js` — All Methods Take `merchantId`

```js
const builder         = require('./builder');
const signer          = require('./signer');
const submitter       = require('./submitter');
const db              = require('../db/invoice.db');
const merchantService = require('./merchant.service');

// ─── Internal orchestrator ─────────────────────────────────────────────────

async function processDocument(merchant, invoiceNumber, invoiceType, invoiceDoc) {
  const { signedInvoice, docDigest } = signer.signDocument(invoiceDoc, merchant);

  const submissionUid = await submitter.submitDocument(
    merchant, invoiceNumber, signedInvoice, docDigest
  );

  // Save as pending immediately
  await db.upsertInvoice({
    merchantId:  merchant.id,
    orderNumber: invoiceNumber,
    invoiceType,
    submissionUid,
    status:      'pending',
  });

  const result = await submitter.pollStatus(merchant, submissionUid);

  await db.upsertInvoice({
    merchantId:  merchant.id,
    orderNumber: invoiceNumber,
    invoiceType,
    submissionUid,
    lhdnUuid:    result.uuid,
    lhdnLongId:  result.longId,
    qrCodeUrl:   result.qrCodeUrl,
    status:      'valid',
  });

  return result;
}

// ─── Public API — all accept merchantId as first argument ─────────────────

async function issueInvoice(merchantId, { orderNumber, buyer, items, discount = 0 }) {
  const merchant = await merchantService.getMerchant(merchantId);
  const doc      = builder.buildInvoice(merchant, { invoiceNumber: orderNumber, buyer, items, discount });
  return processDocument(merchant, orderNumber, 'invoice', doc);
}

async function issueCreditNote(merchantId, { refNumber, originalInvoiceId, buyer, items }) {
  const merchant = await merchantService.getMerchant(merchantId);
  const doc      = builder.buildCreditNote(merchant, { invoiceNumber: refNumber, originalInvoiceId, buyer, items });
  return processDocument(merchant, refNumber, 'credit-note', doc);
}

async function issueDebitNote(merchantId, { refNumber, originalInvoiceId, buyer, items }) {
  const merchant = await merchantService.getMerchant(merchantId);
  const doc      = builder.buildDebitNote(merchant, { invoiceNumber: refNumber, originalInvoiceId, buyer, items });
  return processDocument(merchant, refNumber, 'debit-note', doc);
}

async function issueRefundNote(merchantId, { refNumber, originalInvoiceId, buyer, items }) {
  const merchant = await merchantService.getMerchant(merchantId);
  const doc      = builder.buildRefundNote(merchant, { invoiceNumber: refNumber, originalInvoiceId, buyer, items });
  return processDocument(merchant, refNumber, 'refund-note', doc);
}

async function cancelInvoice(merchantId, uuid, reason, orderNumber) {
  const merchant = await merchantService.getMerchant(merchantId);
  const result   = await submitter.cancelDocument(merchant, uuid, reason, orderNumber);
  await db.upsertInvoice({
    merchantId: merchant.id,
    orderNumber, invoiceType: 'invoice',
    status: 'cancelled', lhdnUuid: uuid,
  });
  return result;
}

async function rejectInvoice(merchantId, uuid, reason, orderNumber) {
  const merchant = await merchantService.getMerchant(merchantId);
  const result   = await submitter.rejectDocument(merchant, uuid, reason, orderNumber);
  await db.upsertInvoice({
    merchantId: merchant.id,
    orderNumber, invoiceType: 'invoice',
    status: 'rejected', lhdnUuid: uuid,
  });
  return result;
}

async function issueConsolidatedInvoice(merchantId, { year, month, orders }) {
  const merchant    = await merchantService.getMerchant(merchantId);
  const pad         = n => String(n).padStart(2, '0');
  const lastDay     = new Date(year, month, 0).getDate();
  const invoiceNum  = `${merchant.merchant_uid}-CONS-${year}-${pad(month)}`;

  const doc = builder.buildConsolidatedInvoice(merchant, {
    invoiceNumber: invoiceNum,
    periodStart:   `${year}-${pad(month)}-01`,
    periodEnd:     `${year}-${pad(month)}-${lastDay}`,
    orders,
  });

  const result = await processDocument(merchant, invoiceNum, 'consolidated', doc);

  const record = await db.getInvoiceByOrderNumber(merchant.id, invoiceNum);
  if (record) {
    await db.markOrdersConsolidated(
      merchant.id,
      orders.map(o => o.orderNumber),
      record.id
    );
  }

  return result;
}

async function getInvoiceDetails(merchantId, uuid, orderNumber) {
  const merchant = await merchantService.getMerchant(merchantId);
  return submitter.getDocument(merchant, uuid, orderNumber);
}

async function validateBuyerTIN(merchantId, tin, idType, idValue) {
  const merchant = await merchantService.getMerchant(merchantId);
  return submitter.validateBuyerTIN(merchant, tin, idType, idValue);
}

module.exports = {
  issueInvoice, issueCreditNote, issueDebitNote,
  issueRefundNote, cancelInvoice, rejectInvoice,
  issueConsolidatedInvoice, getInvoiceDetails, validateBuyerTIN,
};
```


***

## Step 9: `__tests__/phase2.verify.js`

```js
require('dotenv').config();
const merchantService = require('../services/merchant.service');
const einvoice        = require('../services/einvoice.service');
const db              = require('../db/invoice.db');
const { pool }        = require('../db/pool');

const ts      = Date.now();
const results = [];
const issued  = {};

// Two test merchants — verifies complete data isolation
const MERCHANT_A = `test-merchant-a-${ts}`;
const MERCHANT_B = `test-merchant-b-${ts}`;

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: '✅ PASS', detail });
  } catch (err) {
    results.push({ name, status: '❌ FAIL', detail: err.message });
  }
}

const mockBuyer = {
  tin: 'C99999999090', name: 'Test Buyer Sdn Bhd',
  brn: '202001099999', phone: '+60312345678',
  email: 'buyer@test.com', address: 'No 1, Jalan Test',
  postcode: '50000', city: 'Kuala Lumpur', state: '14',
};

const mockItems = [
  { description: 'Test Product', quantity: 1, unitPrice: 100, subtotal: 100, tax: 0 },
];

async function run() {
  console.log('\n🔍 Phase 2 Multi-Tenant Verification\n' + '─'.repeat(60));
  console.log('⏱  ~3 minutes (two merchants × LHDN sandbox polling)\n');

  // ── Setup: create two test merchants ─────────────────────────────────────
  await check('Create merchant A', async () => {
    await merchantService.createMerchant({
      merchantUid:        MERCHANT_A,
      name:               'Test Merchant Alpha Sdn Bhd',
      tin:                process.env.SUPPLIER_TIN,
      brn:                process.env.SUPPLIER_BRN,
      phone:              process.env.SUPPLIER_PHONE,
      email:              process.env.SUPPLIER_EMAIL,
      address:            process.env.SUPPLIER_ADDRESS,
      postcode:           process.env.SUPPLIER_POSTCODE,
      city:               process.env.SUPPLIER_CITY,
      state:              process.env.SUPPLIER_STATE,
      lhdnClientId:       process.env.MYINVOIS_CLIENT_ID,
      lhdnClientSecret:   process.env.MYINVOIS_CLIENT_SECRET,
    });
    return `uid: ${MERCHANT_A}`;
  });

  await check('Create merchant B (separate identity)', async () => {
    await merchantService.createMerchant({
      merchantUid:        MERCHANT_B,
      name:               'Test Merchant Beta Sdn Bhd',
      tin:                process.env.SUPPLIER_TIN,
      brn:                process.env.SUPPLIER_BRN,
      phone:              process.env.SUPPLIER_PHONE,
      email:              process.env.SUPPLIER_EMAIL,
      address:            process.env.SUPPLIER_ADDRESS,
      postcode:           process.env.SUPPLIER_POSTCODE,
      city:               process.env.SUPPLIER_CITY,
      state:              process.env.SUPPLIER_STATE,
      lhdnClientId:       process.env.MYINVOIS_CLIENT_ID,
      lhdnClientSecret:   process.env.MYINVOIS_CLIENT_SECRET,
    });
    return `uid: ${MERCHANT_B}`;
  });

  // ── Merchant A: issue invoice ──────────────────────────────────────────
  await check('Merchant A: issue standard invoice', async () => {
    issued.a = await einvoice.issueInvoice(MERCHANT_A, {
      orderNumber: `A-INV-${ts}`,
      buyer: mockBuyer,
      items: mockItems,
    });
    return `UUID: ${issued.a.uuid}`;
  });

  // ── Merchant B: issue invoice ──────────────────────────────────────────
  await check('Merchant B: issue standard invoice', async () => {
    issued.b = await einvoice.issueInvoice(MERCHANT_B, {
      orderNumber: `B-INV-${ts}`,
      buyer: mockBuyer,
      items: mockItems,
    });
    return `UUID: ${issued.b.uuid}`;
  });

  // ── Data isolation checks ─────────────────────────────────────────────
  await check('Merchant A cannot see Merchant B invoices', async () => {
    const merchantA  = await merchantService.getMerchant(MERCHANT_A);
    const aInvoices  = await db.listInvoices(merchantA.id);
    const hasB       = aInvoices.some(i => i.order_number === `B-INV-${ts}`);
    if (hasB) throw new Error('Merchant A can see Merchant B data — isolation failure!');
    return `Merchant A sees ${aInvoices.length} invoice(s), none from B`;
  });

  await check('Merchant B cannot see Merchant A invoices', async () => {
    const merchantB  = await merchantService.getMerchant(MERCHANT_B);
    const bInvoices  = await db.listInvoices(merchantB.id);
    const hasA       = bInvoices.some(i => i.order_number === `A-INV-${ts}`);
    if (hasA) throw new Error('Merchant B can see Merchant A data — isolation failure!');
    return `Merchant B sees ${bInvoices.length} invoice(s), none from A`;
  });

  // ── Token isolation ───────────────────────────────────────────────────
  await check('Tokens are cached independently per merchant', async () => {
    const { getToken } = require('../services/auth');
    const mA  = await merchantService.getMerchant(MERCHANT_A);
    const mB  = await merchantService.getMerchant(MERCHANT_B);
    const tA  = await getToken(mA);
    const tB  = await getToken(mB);
    if (typeof tA !== 'string' || typeof tB !== 'string') throw new Error('Invalid tokens');
    return 'Both merchants have independent valid tokens';
  });

  // ── Merchant A: credit note ───────────────────────────────────────────
  await check('Merchant A: issue credit note (type 02)', async () => {
    const result = await einvoice.issueCreditNote(MERCHANT_A, {
      refNumber: `A-CN-${ts}`, originalInvoiceId: `A-INV-${ts}`,
      buyer: mockBuyer, items: mockItems,
    });
    return `UUID: ${result.uuid}`;
  });

  // ── Merchant A: consolidated invoice ──────────────────────────────────
  await check('Merchant A: consolidated invoice', async () => {
    const result = await einvoice.issueConsolidatedInvoice(MERCHANT_A, {
      year: 2026, month: 2,
      orders: [
        { orderNumber: `A-ORD-1-${ts}`, subtotal: 100, tax: 0 },
        { orderNumber: `A-ORD-2-${ts}`, subtotal: 200, tax: 0 },
      ],
    });
    return `UUID: ${result.uuid}`;
  });

  // ── Consolidated staging isolation ────────────────────────────────────
  await check('Consolidated staging is merchant-scoped', async () => {
    const mA = await merchantService.getMerchant(MERCHANT_A);
    const mB = await merchantService.getMerchant(MERCHANT_B);
    await db.stageForConsolidated({ merchantId: mA.id, orderNumber: `A-STAGED-${ts}`, subtotal: 50, tax: 0, year: 2026, month: 3 });
    await db.stageForConsolidated({ merchantId: mB.id, orderNumber: `B-STAGED-${ts}`, subtotal: 75, tax: 0, year: 2026, month: 3 });
    const aStaged = await db.getStagedConsolidatedOrders(mA.id, 2026, 3);
    const bStaged = await db.getStagedConsolidatedOrders(mB.id, 2026, 3);
    const aHasB   = aStaged.some(o => o.orderNumber.startsWith('B-'));
    const bHasA   = bStaged.some(o => o.orderNumber.startsWith('A-'));
    if (aHasB || bHasA) throw new Error('Consolidated staging data leaked between merchants!');
    return `A has ${aStaged.length} staged, B has ${bStaged.length} staged — isolated ✓`;
  });

  // ── Merchant A: cancel invoice ─────────────────────────────────────────
  await check('Merchant A: cancel invoice within 72h', async () => {
    if (!issued.a?.uuid) throw new Error('No UUID to cancel');
    await einvoice.cancelInvoice(MERCHANT_A, issued.a.uuid, 'Verification test', `A-INV-${ts}`);
    return `Cancelled: ${issued.a.uuid}`;
  });

  // ── Audit log isolation ───────────────────────────────────────────────
  await check('Audit logs are scoped per merchant', async () => {
    const mA = await merchantService.getMerchant(MERCHANT_A);
    const mB = await merchantService.getMerchant(MERCHANT_B);
    const { rows: aLogs } = await pool.query(
      `SELECT COUNT(*) FROM einvoice_audit_log WHERE merchant_id = $1`, [mA.id]
    );
    const { rows: bLogs } = await pool.query(
      `SELECT COUNT(*) FROM einvoice_audit_log WHERE merchant_id = $1`, [mB.id]
    );
    return `A: ${aLogs[0].count} log entries | B: ${bLogs[0].count} log entries`;
  });

  // ── Suspended merchant is blocked ─────────────────────────────────────
  await check('Suspended merchant is blocked from issuing invoices', async () => {
    await merchantService.updateMerchant(MERCHANT_B, { status: 'suspended' });
    try {
      await einvoice.issueInvoice(MERCHANT_B, {
        orderNumber: `B-BLOCKED-${ts}`, buyer: mockBuyer, items: mockItems,
      });
      throw new Error('Should have been blocked!');
    } catch (err) {
      if (!err.message.includes('suspended')) throw err;
      return 'Blocked correctly with "suspended" error';
    }
  });

  // ── Print results ──────────────────────────────────────────────────────
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
    console.log('\n🎉 Phase 2 (Multi-Tenant) complete!');
    console.log('   Data isolation confirmed. Ready for Phase 3: Automation.\n');
  } else {
    console.log('\n⚠️  Fix failures before proceeding.\n');
    process.exit(1);
  }
  process.exit(0);
}

run().catch(err => {
  console.error('[Verify] Crashed:', err.message);
  process.exit(1);
});
```


***

## How to Call It From Your App

Every call now passes `merchantId` (your internal identifier) as the first argument:

```js
const einvoice = require('./services/einvoice.service');

// When merchant "shop_abc123" gets a paid order:
await einvoice.issueInvoice('shop_abc123', {
  orderNumber: 'ORD-20260326-001',
  buyer: { tin: 'C99999', name: 'Buyer Co', ... },
  items: [{ description: 'Item', quantity: 1, unitPrice: 99, subtotal: 99, tax: 0 }],
});

// Credit note for the same merchant:
await einvoice.issueCreditNote('shop_abc123', {
  refNumber: 'CN-001', originalInvoiceId: 'ORD-20260326-001',
  buyer, items,
});

// Monthly consolidated for a different merchant:
await einvoice.issueConsolidatedInvoice('shop_xyz789', {
  year: 2026, month: 3, orders: [...],
});
```

