import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';
import ApiLog from '@/models/ApiLog';
import { executeTopupDirect } from '@/lib/queue/topupQueue';

export async function POST(request: Request) {
  const startTime = Date.now();
  const apiKeyStr = request.headers.get('X-API-KEY') || request.headers.get('x-api-key') || '';
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  if (!apiKeyStr) {
    return NextResponse.json(
      { success: false, message: 'Missing required authentication header: X-API-KEY' },
      { status: 401 }
    );
  }

  await dbConnect();
  const apiKeyDoc = await ApiKey.findOne({ key: apiKeyStr });

  if (!apiKeyDoc) {
    return NextResponse.json({ success: false, message: 'Invalid X-API-KEY provided.' }, { status: 401 });
  }

  if (!apiKeyDoc.isActive || apiKeyDoc.status === 'suspended') {
    return NextResponse.json({ success: false, message: 'API Key is currently suspended or revoked.' }, { status: 403 });
  }

  if (new Date() > new Date(apiKeyDoc.expiresAt)) {
    apiKeyDoc.status = 'expired';
    apiKeyDoc.isActive = false;
    await apiKeyDoc.save();
    return NextResponse.json({ success: false, message: 'API Key has expired.' }, { status: 403 });
  }

  const remaining = (apiKeyDoc.totalLimit || apiKeyDoc.totalHits || 1000) - (apiKeyDoc.usedCount || apiKeyDoc.usedHits || 0);
  if (remaining <= 0) {
    return NextResponse.json({ success: false, message: 'Quota limit exhausted (0 available hits).' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { uid, voucherCode, serial, pin, pipeline } = body;

    if (!uid) {
      return NextResponse.json({ success: false, message: 'Player UID is required.' }, { status: 400 });
    }

    const effectiveCode = voucherCode || `${serial || ''}${pin || ''}`;

    // Forward to execution engine worker
    const result = await executeTopupDirect({
      jobId: `ORDER_${Date.now()}`,
      pipeline: pipeline || 'UNIPIN_VOUCHER',
      uid,
      voucherCode: effectiveCode,
      serial,
      pin,
      apiKey: apiKeyDoc.key,
    });

    const latencyMs = Date.now() - startTime;

    if (result.success) {
      // Deduct exactly 1 unit on confirmed redemption
      apiKeyDoc.usedCount = (apiKeyDoc.usedCount || 0) + 1;
      apiKeyDoc.usedHits = (apiKeyDoc.usedHits || 0) + 1;
      apiKeyDoc.remainingHits = Math.max(0, (apiKeyDoc.totalLimit || 1000) - apiKeyDoc.usedCount);
      apiKeyDoc.lastUpdated = new Date();
      await apiKeyDoc.save();

      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.userRef || apiKeyDoc.ownerId,
        endpoint: '/api/process-order',
        uid,
        voucherCode: effectiveCode ? `${effectiveCode.substring(0, 4)}****` : undefined,
        status: 'SUCCESS',
        latencyMs,
        quotaDeducted: true,
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        orderId: result.orderId,
        playerName: result.playerName,
        consumed: 1,
        availableRequests: (apiKeyDoc.totalLimit || 1000) - (apiKeyDoc.usedCount || 0),
        latencyMs,
      });
    }

    // Invalid UID / Voucher / Failure handling
    await ApiLog.create({
      apiKey: apiKeyDoc.key,
      userId: apiKeyDoc.userRef || apiKeyDoc.ownerId,
      endpoint: '/api/process-order',
      uid,
      status: result.errorReason === 'INVALID_UID' ? 'FAILED_INVALID_UID' : 'FAILED_INVALID_VOUCHER',
      latencyMs,
      quotaDeducted: false,
      ipAddress: clientIp,
      errorDetails: result.message,
    });

    return NextResponse.json(
      {
        success: false,
        message: result.message,
        errorReason: result.errorReason,
        quotaDeducted: false,
      },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error processing order' },
      { status: 500 }
    );
  }
}
