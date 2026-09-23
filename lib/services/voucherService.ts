// lib/services/voucherService.ts
import dbConnect from '@/utils/db';
import Voucher from '@/models/Voucher';
import { detectUnipinDenomination } from '../automation/unipinPatterns';

// Fast in-memory cache for consumed/invalid voucher identifiers to avoid DB overhead on rapid duplicate hits
const blockedVoucherCache = new Set<string>();

/**
 * Normalizes voucher inputs into standard parts:
 * - serial: The UniPin serial (e.g. BDMB-01-S-12345678 or UPBD-B-S-12345678)
 * - pin: The numeric or alphanumeric PIN
 * - cleanCode: Standardized combined string "SERIAL PIN" or trimmed uppercase
 */
export function normalizeVoucherDetails(
  rawCode?: string,
  rawSerial?: string,
  rawPin?: string
): {
  serial: string;
  pin: string;
  cleanCode: string;
} {
  const full = (rawCode || `${rawSerial || ''} ${rawPin || ''}`).trim();
  let serial = (rawSerial || '').trim().toUpperCase();
  let pin = (rawPin || '').trim();

  // Try extracting standard UniPin serial pattern (BDMB-XX-S-XXXXXXXX or UPBD-X-S-XXXXXXXX)
  const sMatch = full.match(/((?:BDMB|UPBD)-[A-Z0-9]-S-\d{8})/i);
  if (sMatch) {
    serial = sMatch[1].toUpperCase();
    const rest = full.replace(sMatch[0], '').trim();
    if (rest) {
      pin = rest.replace(/[^0-9]/g, '');
    }
  } else if (!serial) {
    const parts = full.split(/[\s,]+/);
    if (parts[0]) serial = parts[0].toUpperCase();
    if (parts[1]) pin = parts[1].replace(/[^0-9]/g, '');
  }

  const cleanCode = (serial && pin ? `${serial} ${pin}` : full).toUpperCase();
  return { serial, pin, cleanCode };
}

/**
 * Checks if a voucher has already been marked as USED or INVALID in the database.
 * Returns { isBlocked: true } if the voucher was previously consumed, expired, or invalid.
 */
export async function isVoucherConsumedOrInvalid(
  voucherCode?: string,
  serial?: string,
  pin?: string
): Promise<{ isBlocked: boolean; reason?: string }> {
  const { serial: normSerial, cleanCode } = normalizeVoucherDetails(voucherCode, serial, pin);

  // 1. Instant check in in-memory cache
  if (cleanCode && blockedVoucherCache.has(cleanCode)) {
    return { isBlocked: true, reason: 'Found in memory blocklist' };
  }
  if (normSerial && normSerial.length >= 8 && blockedVoucherCache.has(normSerial)) {
    return { isBlocked: true, reason: 'Found in memory blocklist' };
  }

  // 2. Check MongoDB database
  try {
    await dbConnect();

    const queryOr: any[] = [];
    if (cleanCode) {
      queryOr.push({ code: cleanCode });
    }
    if (normSerial && normSerial.length >= 8) {
      queryOr.push({ serial: normSerial });
    }

    if (queryOr.length === 0) {
      return { isBlocked: false };
    }

    const existing = await Voucher.findOne({
      $or: queryOr,
      $and: [
        {
          $or: [
            { isUsed: true },
            { status: { $in: ['USED', 'INVALID', 'EXPIRED'] } },
          ],
        },
      ],
    }).lean();

    if (existing) {
      // Add to fast in-memory cache
      if (cleanCode) blockedVoucherCache.add(cleanCode);
      if (normSerial) blockedVoucherCache.add(normSerial);

      return {
        isBlocked: true,
        reason: existing.reason || 'Voucher was already recorded as used or invalid',
      };
    }
  } catch (err: any) {
    console.warn('[VoucherService] DB check warning:', err?.message);
  }

  return { isBlocked: false };
}

/**
 * Records a voucher into the database when used, consumed, or invalid.
 */
export async function recordVoucherOutcome(params: {
  voucherCode?: string;
  serial?: string;
  pin?: string;
  uid?: string;
  status: 'USED' | 'INVALID' | 'EXPIRED';
  reason?: string;
  orderId?: string;
  apiKey?: string;
}): Promise<void> {
  const { serial: normSerial, pin: normPin, cleanCode } = normalizeVoucherDetails(
    params.voucherCode,
    params.serial,
    params.pin
  );

  if (!cleanCode && !normSerial) return;

  // Add to fast in-memory cache
  if (cleanCode) blockedVoucherCache.add(cleanCode);
  if (normSerial) blockedVoucherCache.add(normSerial);

  const pattern = detectUnipinDenomination(cleanCode || normSerial);
  const denomination = pattern ? pattern.diamondLabel : undefined;
  const amount = pattern ? pattern.diamonds : 0;

  try {
    await dbConnect();

    const filter: any = {};
    if (normSerial && normSerial.length >= 8) {
      filter.serial = normSerial;
    } else if (cleanCode) {
      filter.code = cleanCode;
    }

    await Voucher.findOneAndUpdate(
      filter,
      {
        $set: {
          code: cleanCode,
          serial: normSerial || undefined,
          pin: normPin || undefined,
          status: params.status,
          isUsed: true,
          reason: params.reason || (params.status === 'USED' ? 'Redeemed successfully' : 'Invalid or already consumed'),
          usedByUid: params.uid || null,
          redeemedBy: params.uid || null,
          redeemedAt: new Date(),
          orderId: params.orderId || null,
          resellerApiKey: params.apiKey || null,
          denomination,
          amount,
        },
      },
      { upsert: true, new: true }
    );

    console.log(
      `[VoucherService] 💾 Saved voucher to DB: [${params.status}] ${normSerial || cleanCode} (Reason: ${params.reason || 'N/A'})`
    );
  } catch (err: any) {
    console.error('[VoucherService] Failed to record voucher to DB:', err?.message);
  }
}
