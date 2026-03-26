const { enqueueInvoiceJob, getMerchantQueueStats, connection } = require('../automation/queue');
const { orderEvents } = require('../automation/events');
const { pool } = require('../db/pool');

async function runPhase3Verify() {
  console.log('🚀 Starting Phase 3 Verification (Automation & Queues)');

  try {
    // 1. Check Redis
    await connection.ping().then(() => console.log('✅ Redis connection healthy')).catch(err => {
      console.warn('⚠️ Redis connection failed. Ensure Redis is running (brew services start redis).');
      throw err;
    });

    // 2. Load test merchant
    const { rows } = await pool.query("SELECT merchant_uid FROM merchants WHERE status = 'active' LIMIT 1");
    if (rows.length === 0) {
      console.warn('⚠️ No active merchants found in DB. Run Phase 2 verification first.');
      return;
    }
    const merchantId = rows[0].merchant_uid;
    console.log(`✅ Using test merchant: ${merchantId}`);

    // 3. Test Queue Emitter
    console.log('📡 Testing Order EventEmitter...');
    orderEvents.emit('order.paid', {
      merchantId,
      orderNumber: `AUTO-${Date.now()}`,
      buyer: { name: 'Queue Test Buyer', tin: 'EI00000000010' },
      items: [{ description: 'Automation Test Item', quantity: 1, unitPrice: 50.00 }]
    });
    console.log('✅ order.paid event emitted');

    // 4. Test Manual Enqueue
    console.log('📥 Testing Manual Enqueue...');
    await enqueueInvoiceJob('invoice', merchantId, {
      orderNumber: `MANUAL-${Date.now()}`,
      buyer: { name: 'Manual Test Buyer', tin: 'EI00000000010' },
      items: [{ description: 'Manual Enqueue Test', quantity: 1, unitPrice: 75.00 }]
    });
    console.log('✅ Job enqueued successfully');

    // 5. Check Queue Stats
    const stats = await getMerchantQueueStats(merchantId);
    console.log(`📊 Merchant Queue Stats:`, stats);
    console.log('✅ Queue stats retrieval functional');

    console.log('\n✨ Phase 3 Verification PASSED!');
    console.log('Next steps: Start the worker (node index.js) and monitor for completion.');

  } catch (err) {
    console.error('\n❌ Phase 3 Verification FAILED:');
    console.error(err.message);
    process.exit(1);
  } finally {
    // We don't close Redis/Pool here because BullMQ might still be initializing
    process.exit(0);
  }
}

runPhase3Verify();
