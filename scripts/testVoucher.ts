import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local without external dotenv dependency
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn('Could not load .env.local:', e);
}

// Force visible browser (headful mode)
process.env.HEADLESS = 'false';

import { processUniPinVoucher } from '../lib/automation/unipinVoucher';

async function run() {
  const start = Date.now();
  console.log('⏱️  Test started with HEADLESS=false...');
  console.log('UID: 6683201668');
  console.log('Serial: UPBD-N-S-16708072');
  console.log('PIN: 1165-3614-5643-3263');
  console.log('─────────────────────────────────');

  const result = await processUniPinVoucher({
    uid: '6683201668',
    voucherCode: 'UPBD-N-S-16708072 1165-3614-5643-3263',
    serial: 'UPBD-N-S-16708072',
    pin: '1165361456433263',
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log('─────────────────────────────────');
  console.log(`⏱️  Total time: ${elapsed} seconds`);
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
