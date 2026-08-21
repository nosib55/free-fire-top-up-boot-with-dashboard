import { NextResponse } from 'next/server';
import { validateApiKey, deductQuotaOnSuccess, handleAbuseDefense } from '@/lib/auth/apiKeyAuth';
import { executeTopupDirect } from '@/lib/queue/topupQueue';
import ApiLog from '@/models/ApiLog';
import dbConnect from '@/utils/db';
import { notifyWorkerErrorAlert } from '@/lib/telegram/bot';

export async function POST(request: Request) {
  const startTime = Date.now();
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  let apiKeyStr = request.headers.get('x-api-key') || '';
  if (!apiKeyStr) {
    const url = new URL(request.url);
    apiKeyStr = url.searchParams.get('apiKey') || '';
  }

  // 1. Authenticate and validate API key, quota pool, expiry, and RPS rate limits
  const auth = await validateApiKey(apiKeyStr, clientIp);
  if (!auth.valid || !auth.apiKeyDoc) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.statusCode || 401 }
    );
  }

  const apiKeyDoc = auth.apiKeyDoc;

  try {
    const body = await request.json();
    const { uid, voucherCode, serial, pin, pipeline, diamondPackageId, itemType } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: player uid is required.' },
        { status: 400 }
      );
    }

    const targetPipeline = pipeline || 'UNIPIN_VOUCHER';
    const effectiveCode = voucherCode || `${serial || ''}${pin || ''}`;

    if (targetPipeline === 'UNIPIN_VOUCHER' && !effectiveCode) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: voucherCode (or serial & pin) is required for UniPin Voucher pipeline.' },
        { status: 400 }
      );
    }

    // 2. Dispatch job to automation worker / concurrency queue
    const executionResult = await executeTopupDirect({
      jobId: `JOB_${Date.now()}`,
      pipeline: targetPipeline,
      uid,
      voucherCode: effectiveCode,
      serial,
      pin,
      diamondPackageId,
      itemType,
      apiKey: apiKeyDoc.key,
    });

    const latencyMs = Date.now() - startTime;
    await dbConnect();

    // 3. Handle Quota Deduction / Abuse Defense logic based on outcome
    if (executionResult.success) {
      // SUCCESS: Deduct 1 hit on confirmed top-up
      await deductQuotaOnSuccess(apiKeyDoc._id.toString());

      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/v1/topup',
        uid,
        voucherCode: effectiveCode ? `${effectiveCode.substring(0, 4)}****` : undefined,
        requestData: { pipeline: targetPipeline, uid, diamondPackageId, itemType },
        responseData: executionResult,
        status: 'SUCCESS',
        latencyMs,
        quotaDeducted: true,
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        message: executionResult.message,
        data: {
          playerName: executionResult.playerName,
          orderId: executionResult.orderId,
          voucherType: executionResult.voucherType,
          remainingHits: (apiKeyDoc.remainingHits ?? 1) - 1,
          latencyMs,
        },
      });
    }

    // 4. Failure handling (Invalid UID vs Invalid Voucher vs Worker Error)
    if (executionResult.errorReason === 'INVALID_UID') {
      // Invalid UID: Return error without quota deduction
      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/v1/topup',
        uid,
        status: 'FAILED_INVALID_UID',
        latencyMs,
        quotaDeducted: false,
        ipAddress: clientIp,
        errorDetails: executionResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          message: executionResult.message,
          errorReason: 'INVALID_UID',
          quotaDeducted: false,
        },
        { status: 400 }
      );
    }

    if (executionResult.errorReason === 'INVALID_VOUCHER') {
      // Invalid Voucher Code: Apply Abuse Defense Rule
      const { penaltyDeducted } = await handleAbuseDefense(apiKeyDoc);

      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/v1/topup',
        uid,
        voucherCode: effectiveCode ? `${effectiveCode.substring(0, 4)}****` : undefined,
        status: 'FAILED_INVALID_VOUCHER',
        latencyMs,
        quotaDeducted: penaltyDeducted,
        ipAddress: clientIp,
        errorDetails: executionResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          message: executionResult.message,
          errorReason: 'INVALID_VOUCHER',
          quotaDeducted: penaltyDeducted,
          penaltyApplied: penaltyDeducted ? '1 hit penalty deducted due to 3 consecutive invalid vouchers in 5 minutes.' : undefined,
        },
        { status: 400 }
      );
    }

    // Worker Error: Do NOT deduct quota, alert admin Telegram
    await notifyWorkerErrorAlert(uid, executionResult.message);

    await ApiLog.create({
      apiKey: apiKeyDoc.key,
      userId: apiKeyDoc.ownerId,
      endpoint: '/api/v1/topup',
      uid,
      status: 'WORKER_ERROR',
      latencyMs,
      quotaDeducted: false,
      ipAddress: clientIp,
      errorDetails: executionResult.message,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Top-up worker temporary gateway drop. Your quota has NOT been deducted.',
        errorReason: 'WORKER_ERROR',
        quotaDeducted: false,
      },
      { status: 502 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error processing top-up request' },
      { status: 500 }
    );
  }
}
