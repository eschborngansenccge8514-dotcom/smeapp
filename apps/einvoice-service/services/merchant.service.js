const { pool } = require('../db/pool');

// In-memory cache: merchantUid → merchant record
const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load a merchant by their internal string ID.
 * @param {string} merchantUid 
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
    throw new Error(`[Merchant] Merchant not found: ${merchantUid}`);
  }

  const merchant = rows[0];
  _cache.set(merchantUid, {
    merchant,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return merchant;
}

/**
 * Invalidate cache for a merchant
 */
function invalidateMerchantCache(merchantUid) {
  _cache.delete(merchantUid);
  console.log(`[Merchant] Cache invalidated for: ${merchantUid}`);
}

module.exports = {
  getMerchant,
  invalidateMerchantCache,
};
