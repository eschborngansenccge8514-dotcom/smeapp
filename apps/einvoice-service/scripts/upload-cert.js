require('dotenv').config();
const fs              = require('fs');
const path            = require('path');
const { pool }        = require('../db/pool');
const merchantService = require('../services/merchant.service');

async function uploadCert(merchantUid, certPath, passphrase) {
  console.log(`\n📦 Uploading certificate for ${merchantUid}...`);

  if (!fs.existsSync(certPath)) {
    throw new Error(`File not found: ${certPath}`);
  }

  const base64 = fs.readFileSync(certPath).toString('base64');
  
  await pool.query(
    `UPDATE merchants 
     SET cert_p12_base64 = $1, cert_passphrase = $2
     WHERE merchant_uid = $3`,
    [base64, passphrase, merchantUid]
  );

  merchantService.invalidateMerchantCache(merchantUid);
  console.log('✅ Certificate uploaded and cache invalidated.');
}

const [,, uid, file, pass] = process.argv;
if (!uid || !file) {
  console.error('Usage: node scripts/upload-cert.js <merchantUid> <path_to_p12> [passphrase]');
  process.exit(1);
}

uploadCert(uid, file, pass || '').catch(e => { console.error(e); process.exit(1); });
