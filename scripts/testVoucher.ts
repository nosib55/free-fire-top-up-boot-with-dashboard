import { processUniPinVoucher } from '../lib/automation/unipinVoucher';

async function run() {
  const start = Date.now();
  console.log('⏱️  Test started...');
  console.log('UID: 8027150707');
  console.log('Serial: BDMB-T-S-02567879');
  console.log('PIN: 3592-5122-5431-2552');
  console.log('─────────────────────────────────');

  const result = await processUniPinVoucher({
    uid: '8027150707',
    voucherCode: 'BDMB-T-S-02567879 3592-5122-5431-2552',
    serial: 'BDMB-T-S-02567879',
    pin: '3592512254312552',
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log('─────────────────────────────────');
  console.log(`⏱️  Total time: ${elapsed} seconds`);
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
