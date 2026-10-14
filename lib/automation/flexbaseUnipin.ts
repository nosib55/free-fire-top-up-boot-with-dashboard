// lib/automation/flexbaseUnipin.ts
// Flexbase UniPin API Integration Engine
// Calls the external Flexbase UniPin Python Flask API (deployed on Vercel)
// to execute top-ups via Garena Malaysia shop → UniPin voucher redemption.

import { AutomationResult } from './unipinVoucher';
import { detectUnipinDenomination, UNIPIN_DIAMOND_MAP } from './unipinPatterns';

// Flexbase API DENOM_LIST packageId mapping (amount_up → packageId)
// Maps the UniPin amount keys from our unipinPatterns to Flexbase packageIds
// Flexbase API DENOM_LIST packageId mapping (amount_up or package name → packageId)
// Maps the UniPin amount keys, package IDs, and names to Flexbase packageIds (1-9)
const AMOUNT_TO_FLEXBASE_PACKAGE_ID: Record<string, string> = {
  // Direct Flexbase IDs
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  // UP amounts from DENOM_LIST
  '20': '1',    // 25 Diamond  → amount_up=20
  '36': '2',    // 50 Diamond  → amount_up=36
  '80': '3',    // 115 Diamond → amount_up=80
  '160': '4',   // 240 Diamond → amount_up=160
  '405': '5',   // 610 Diamond → amount_up=405
  '810': '6',   // 1240 Diamond → amount_up=810
  '1625': '7',  // 2530 Diamond → amount_up=1625
  '161': '8',   // Weekly Membership → amount_up=161
  '800': '9',   // Monthly Membership → amount_up=800
  // Named diamond packages
  '25': '1',
  '25_DIAMOND': '1',
  '25_DIAMONDS': '1',
  '50': '2',
  '50_DIAMOND': '2',
  '50_DIAMONDS': '2',
  '115': '3',
  '115_DIAMOND': '3',
  '115_DIAMONDS': '3',
  '240': '4',
  '240_DIAMOND': '4',
  '240_DIAMONDS': '4',
  '610': '5',
  '610_DIAMOND': '5',
  '610_DIAMONDS': '5',
  '1240': '6',
  '1240_DIAMOND': '6',
  '1240_DIAMONDS': '6',
  '2530': '7',
  '2530_DIAMOND': '7',
  '2530_DIAMONDS': '7',
  // Memberships
  'WEEKLY': '8',
  'WEEKLY_MEMBERSHIP': '8',
  'MONTHLY': '9',
  'MONTHLY_MEMBERSHIP': '9',
};

export interface FlexbaseTopupParams {
  uid: string;
  voucherCode?: string;
  serial?: string;
  pin?: string;
  packageId?: string;   // Optional override: Flexbase packageId (1-9) or package name
}

export interface FlexbaseApiResponse {
  status: 'success' | 'failed' | 'error';
  message?: string;
  player?: {
    uid: string;
    nickname: string;
    region: string;
  };
  transaction?: {
    date: string;
    trans_no: string;
    reference: string;
    item: string;
    amount: string;
  };
  bd_time?: string;
}

/**
 * Resolves the Flexbase packageId from voucher serial/code or passed package.
 * Auto-detection from voucher serial takes PRIORITY because UniPin vouchers
 * are strictly tied to specific denominations (e.g. UPBD-P-S = 800 UP Monthly).
 * Submitting a voucher to the wrong denomination causes "Invalid Serial".
 */
function resolvePackageId(params: FlexbaseTopupParams): string | null {
  // 1. Auto-detect from voucher code/serial FIRST (essential for UniPin voucher redemption)
  const voucherText = params.voucherCode || params.serial || '';
  if (voucherText) {
    const detected = detectUnipinDenomination(voucherText);
    if (detected) {
      const pkgId = AMOUNT_TO_FLEXBASE_PACKAGE_ID[detected.rawAmountKey];
      if (pkgId) {
        console.log(`[Flexbase UniPin] 🎯 Auto-detected package '${detected.diamondLabel}' (PackageId: ${pkgId}) from voucher prefix '${detected.matchedPattern}'`);
        return pkgId;
      }
    }
  }

  // 2. Fallback to explicit packageId/name if provided
  if (params.packageId) {
    const normalized = params.packageId.trim().toUpperCase();
    if (AMOUNT_TO_FLEXBASE_PACKAGE_ID[normalized]) {
      return AMOUNT_TO_FLEXBASE_PACKAGE_ID[normalized];
    }
    if (/^[1-9]$/.test(normalized)) {
      return normalized;
    }
  }

  return null;
}

/**
 * Format the voucher code into the format expected by Flexbase API:
 * "SERIAL PIN_PART1-PIN_PART2-PIN_PART3-PIN_PART4"
 * Example: "BDMB-I-S-12345678 1234-5678-9012-3456"
 */
function formatFlexbaseCode(params: FlexbaseTopupParams): string {
  let serial = (params.serial || '').trim();
  let pin = (params.pin || '').trim();

  // If voucherCode is provided, parse serial and pin from it
  if (params.voucherCode && (!serial || !pin)) {
    const fullText = params.voucherCode.trim();

    // Match serial pattern: BDMB-X-S-NNNNNNNN or UPBD-X-S-NNNNNNNN
    const serialMatch = fullText.match(/((?:BDMB|UPBD)-[A-Z0-9]-S-\d{8})/i);
    if (serialMatch) {
      serial = serialMatch[1].toUpperCase();
      const rest = fullText.replace(serialMatch[0], '').trim();
      if (rest) {
        pin = rest.replace(/[^0-9]/g, '');
      }
    }
  }

  // Format PIN into 4-4-4-4 groups if it's a continuous 16-digit string
  let formattedPin = pin;
  const cleanPin = pin.replace(/[^0-9]/g, '');
  if (cleanPin.length === 16 && !pin.includes('-')) {
    formattedPin = `${cleanPin.slice(0, 4)}-${cleanPin.slice(4, 8)}-${cleanPin.slice(8, 12)}-${cleanPin.slice(12, 16)}`;
  }

  return `${serial} ${formattedPin}`.trim();
}

/**
 * Execute top-up via the Flexbase UniPin API.
 * This calls the external Python Flask API which handles:
 *   1. DataDome cookie generation
 *   2. Garena MY shop player login
 *   3. Payment init → UniPin voucher redemption
 */
export async function processFlexbaseUnipin(params: FlexbaseTopupParams): Promise<AutomationResult> {
  const startTime = Date.now();
  const { uid, voucherCode, serial, pin } = params;

  const FLEXBASE_API_URL = process.env.FLEXBASE_UNIPIN_API_URL || 'https://flexbase-unipin-api.vercel.app';
  const FLEXBASE_API_KEY = process.env.FLEXBASE_UNIPIN_API_KEY || 'flexbase2026';

  // 1. Resolve packageId from voucher pattern
  const packageId = resolvePackageId(params);
  if (!packageId) {
    const voucherText = voucherCode || serial || '';
    return {
      success: false,
      message: `Could not detect UniPin diamond package from voucher code. Please provide a valid BDMB/UPBD voucher. Input: "${voucherText.substring(0, 20)}..."`,
      errorReason: 'INVALID_VOUCHER',
      playerName: `Player (${uid})`,
    };
  }

  // 2. Format the voucher code for Flexbase API
  const formattedCode = formatFlexbaseCode(params);
  if (!formattedCode || formattedCode.trim().length < 10) {
    return {
      success: false,
      message: 'Invalid voucher code format. Expected: SERIAL PIN (e.g., BDMB-I-S-12345678 1234-5678-9012-3456)',
      errorReason: 'INVALID_VOUCHER',
      playerName: `Player (${uid})`,
    };
  }

  // 3. Determine diamond label for logging
  const detected = detectUnipinDenomination(voucherCode || serial || '');
  const diamondLabel = detected?.diamondLabel || 'Unknown Package';

  console.log(`[Flexbase UniPin] 🚀 Starting top-up: UID=${uid}, Package=${packageId} (${diamondLabel}), Code=${formattedCode.substring(0, 12)}...`);

  // 4. Call Flexbase UniPin API
  try {
    const apiUrl = `${FLEXBASE_API_URL}/api/unipin`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        uid: uid.trim(),
        packageId: packageId,
        code: formattedCode,
        apiKey: FLEXBASE_API_KEY,
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout — Flexbase does multiple HTTP hops
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok && response.status !== 200) {
      const errorBody = await response.text().catch(() => '');
      console.error(`[Flexbase UniPin] ❌ API returned HTTP ${response.status}: ${errorBody.substring(0, 200)}`);

      // Parse error body for specific error reasons
      try {
        const errorData = JSON.parse(errorBody);
        if (errorData.message?.includes('Invalid API Key')) {
          return {
            success: false,
            message: 'Flexbase API authentication failed. Invalid API Key.',
            errorReason: 'WORKER_ERROR',
          };
        }
      } catch {}

      return {
        success: false,
        message: `Flexbase UniPin API error (HTTP ${response.status}). Retryable.`,
        errorReason: 'WORKER_ERROR',
      };
    }

    const data: any = await response.json();

    console.log('\n================== [FLEXBASE API RESPONSE] ==================');
    console.log(JSON.stringify(data, null, 2));
    console.log('=============================================================\n');

    // 5. Handle SUCCESS response
    if (data.status === 'success' && data.transaction) {
      const tx = data.transaction;
      const playerName = data.player?.nickname || `Player (${uid})`;
      const region = data.player?.region || 'MY';

      console.log(`[Flexbase UniPin] ✅ Top-up SUCCESS in ${elapsed}ms! Player: ${playerName}, TxID: ${tx.trans_no}, Item: ${tx.item}`);

      return {
        success: true,
        message: `Top-up of ${tx.item || diamondLabel} completed successfully for ${playerName} (Region: ${region}) via Flexbase UniPin in ${elapsed}ms. Transaction: ${tx.trans_no}`,
        playerName,
        voucherType: `UniPin Flexbase (${tx.item || diamondLabel})`,
        orderId: tx.trans_no || `FLX_${Date.now()}`,
        rawResponse: data,
      };
    }

    // 6. Handle FAILED responses with specific error mapping
    const errorMsg = data.message || 'Unknown error from Flexbase API';
    console.warn(`[Flexbase UniPin] ⚠️ Top-up failed in ${elapsed}ms: ${errorMsg}`);

    // Map Flexbase error messages to our standardized error reasons
    if (
      errorMsg.includes('Invalid Player ID') ||
      errorMsg.includes('empty nickname') ||
      errorMsg.includes('Verification Failed')
    ) {
      return {
        success: false,
        message: `Invalid Player ID: Free Fire UID '${uid}' does not exist or verification failed.`,
        errorReason: 'INVALID_UID',
        playerName: data.player?.nickname || `Player (${uid})`,
        rawResponse: data,
      };
    }

    if (
      errorMsg.includes('Consumed Voucher') ||
      errorMsg.includes('Already Used')
    ) {
      return {
        success: false,
        message: 'UniPin Voucher is already used / consumed.',
        errorReason: 'CONSUMED_VOUCHER',
        playerName: data.player?.nickname || `Player (${uid})`,
        rawResponse: data,
      };
    }

    if (
      errorMsg.includes('Invalid Serial') ||
      errorMsg.includes('validationError') ||
      errorMsg.includes('Invalid Voucher')
    ) {
      return {
        success: false,
        message: `UniPin Voucher redemption failed: ${errorMsg}`,
        errorReason: 'INVALID_VOUCHER',
        playerName: data.player?.nickname || `Player (${uid})`,
        rawResponse: data,
      };
    }

    if (
      errorMsg.includes('mspid2 not found') ||
      errorMsg.includes('Session Key Not found') ||
      errorMsg.includes('Init URL not found')
    ) {
      // These are infrastructure/session errors — retryable
      return {
        success: false,
        message: `Flexbase session error: ${errorMsg}. Please retry.`,
        errorReason: 'WORKER_ERROR',
        playerName: data.player?.nickname || `Player (${uid})`,
        rawResponse: data,
      };
    }

    // Default: treat as worker error (retryable)
    return {
      success: false,
      message: `Flexbase UniPin error: ${errorMsg}`,
      errorReason: 'WORKER_ERROR',
      playerName: data.player?.nickname || `Player (${uid})`,
      rawResponse: data,
    };

  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[Flexbase UniPin] ❌ Network/timeout error in ${elapsed}ms:`, err?.message);

    if (err?.name === 'TimeoutError' || err?.message?.includes('timeout')) {
      return {
        success: false,
        message: `Flexbase UniPin API timed out after ${elapsed}ms. The request may still be processing.`,
        errorReason: 'WORKER_ERROR',
      };
    }

    const isConnRefused =
      err?.message?.includes('fetch failed') ||
      err?.code === 'ECONNREFUSED' ||
      err?.cause?.code === 'ECONNREFUSED';

    const connMsg = isConnRefused
      ? `Flexbase UniPin backend service is offline or unreachable at ${FLEXBASE_API_URL}. Please ensure the Python API is running ('npm run flexbase').`
      : `Flexbase UniPin connection error: ${err?.message || 'Unknown error'}`;

    return {
      success: false,
      message: connMsg,
      errorReason: 'WORKER_ERROR',
    };
  }
}
