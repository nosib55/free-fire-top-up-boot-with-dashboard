import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiLog from '@/models/ApiLog';
import Voucher from '@/models/Voucher';
import { validateApiKey } from '@/lib/auth/apiKeyAuth';
import { detectUnipinDenomination } from '@/lib/automation/unipinPatterns';

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  let apiKeyStr = request.headers.get('x-api-key') || '';
  if (!apiKeyStr) {
    const url = new URL(request.url);
    apiKeyStr = url.searchParams.get('apiKey') || '';
  }

  const auth = await validateApiKey(apiKeyStr, clientIp);
  if (!auth.valid || !auth.apiKeyDoc) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.statusCode || 401 });
  }

  await dbConnect();
  try {
    const body = await request.json();
    const { code, voucherCode, serial, pin } = body;

    const rawInput = (code || voucherCode || `${serial || ''} ${pin || ''}`).toString().trim();
    if (!rawInput) {
      return NextResponse.json({
        success: false,
        message: 'voucherCode or code parameter is required.',
      }, { status: 400 });
    }

    // Fast pattern parsing
    const cleanUpper = rawInput.toUpperCase();
    const isBDMB = cleanUpper.startsWith('BDMB');
    const isUPBD = cleanUpper.startsWith('UPBD');
    const pattern = detectUnipinDenomination(cleanUpper);

    const diamondLabel = pattern ? pattern.diamondLabel : 'Unknown Denomination';
    const estimatedDiamonds = pattern ? pattern.diamonds : 0;

    // Extract search serial / pin prefix
    const parts = cleanUpper.split(/[\s,]+/);
    const primarySerial = parts[0] || '';

    // Check if previously logged as successful topup in ApiLog
    let previousRedemption = null;
    if (primarySerial.length >= 8) {
      previousRedemption = await ApiLog.findOne({
        voucherCode: { $regex: primarySerial.substring(0, 10), $options: 'i' },
        status: 'SUCCESS',
      }).sort({ createdAt: -1 }).lean();
    }

    // Also check Voucher model if tracked
    let voucherDoc = null;
    if (primarySerial) {
      voucherDoc = await Voucher.findOne({
        $or: [
          { code: cleanUpper },
          { serial: primarySerial },
        ],
      }).lean();
    }

    const isConsumed = Boolean(
      previousRedemption ||
      (voucherDoc && (voucherDoc.status === 'USED' || voucherDoc.status === 'EXPIRED'))
    );

    let status: 'VALID' | 'CONSUMED' | 'INVALID_FORMAT' = 'VALID';
    if (!isBDMB && !isUPBD && !pattern) {
      status = 'INVALID_FORMAT';
    } else if (isConsumed) {
      status = 'CONSUMED';
    }

    return NextResponse.json({
      success: true,
      status,
      isConsumed,
      code: cleanUpper,
      voucherType: isBDMB ? 'BDMB (UniPin Mobile)' : isUPBD ? 'UPBD (Physical Voucher)' : 'Generic Voucher',
      denomination: diamondLabel,
      estimatedDiamonds,
      redeemedAt: previousRedemption?.createdAt || voucherDoc?.usedAt || null,
      redeemedByUid: previousRedemption?.uid || voucherDoc?.usedByUid || null,
      message:
        status === 'CONSUMED'
          ? `Voucher code was already redeemed on ${new Date(previousRedemption?.createdAt || voucherDoc?.usedAt || Date.now()).toLocaleString()}.`
          : status === 'INVALID_FORMAT'
          ? 'Unrecognized UniPin voucher format. Code must start with BDMB or UPBD.'
          : 'Voucher is valid and ready for top-up redemption.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
