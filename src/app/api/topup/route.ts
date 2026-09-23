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
    const effectiveItemType = (itemType || diamondPackageId || '').toUpperCase();

    if (targetPipeline === 'UNIPIN_VOUCHER') {
      if (!effectiveCode) {
        return NextResponse.json(
          { success: false, message: 'Missing required field: voucherCode (or serial & pin) is required for UniPin Voucher pipeline.' },
          { status: 400 }
        );
      }

      // Instant DB Pre-Check: If voucher is already used or invalid in DB, reject immediately without browser launch
      const { isVoucherConsumedOrInvalid } = await import('@/lib/services/voucherService');
      const voucherCheck = await isVoucherConsumedOrInvalid(effectiveCode, serial, pin);
      if (voucherCheck.isBlocked) {
        return NextResponse.json(
          {
            success: false,
            message: 'UniPin Voucher redemption failed: Voucher is invalid, expired, or already used.',
            errorReason: 'INVALID_VOUCHER',
            quotaDeducted: false,
          },
          { status: 400 }
        );
      }
    }

    // 1.5 Validate Garena Shells packages & Level Up requirements
    if (targetPipeline === 'GARENA_SHELLS') {
      const { ALLOWED_GARENA_SHELL_PACKAGES, LEVEL_UP_REQUIRED_LEVELS } = await import('@/lib/automation/garenaShells');
      if (!ALLOWED_GARENA_SHELL_PACKAGES.includes(effectiveItemType)) {
        return NextResponse.json(
          {
            success: false,
            errorReason: 'UNSUPPORTED_PACKAGE',
            message: `Only Special Deals (WEEKLY_MEMBERSHIP, MONTHLY_MEMBERSHIP, WEEKLY_LITE, LEVEL_UP_6, LEVEL_UP_10, LEVEL_UP_15, LEVEL_UP_20, LEVEL_UP_25, LEVEL_UP_30) are available via Garena Shells. '${effectiveItemType}' is not supported.`,
            quotaDeducted: false,
          },
          { status: 400 }
        );
      }

      const reqLevel = LEVEL_UP_REQUIRED_LEVELS[effectiveItemType];
      const currentLevel = Number(body.playerLevel ?? body.level);
      if (reqLevel && currentLevel && currentLevel < reqLevel) {
        return NextResponse.json(
          {
            success: false,
            errorReason: 'INSUFFICIENT_LEVEL',
            message: `Player level (${currentLevel}) is less than the required Level Up Package level (${reqLevel}). Cannot purchase.`,
            quotaDeducted: false,
          },
          { status: 400 }
        );
      }
    }

    // 2. Dispatch job to automation worker / concurrency queue
    const executionResult = await executeTopupDirect({
      jobId: `JOB_${Date.now()}`,
      pipeline: targetPipeline,
      uid,
      voucherCode: effectiveCode,
      serial,
      pin,
      diamondPackageId: effectiveItemType,
      itemType: effectiveItemType as any,
      playerLevel: body.playerLevel ? Number(body.playerLevel) : body.level ? Number(body.level) : undefined,
      apiKey: apiKeyDoc.key,
      resellerUserId: apiKeyDoc.ownerId ? apiKeyDoc.ownerId.toString() : undefined,
    });

    const latencyMs = Date.now() - startTime;
    await dbConnect();

    // 3. Handle Quota Deduction based on outcome
    if (executionResult.success) {
      // Deduct 1 API hit
      await deductQuotaOnSuccess(apiKeyDoc._id.toString());

      if (targetPipeline === 'UNIPIN_VOUCHER') {
        const { recordVoucherOutcome } = await import('@/lib/services/voucherService');
        await recordVoucherOutcome({
          voucherCode: effectiveCode,
          serial,
          pin,
          uid,
          status: 'USED',
          reason: 'Redeemed successfully',
          orderId: executionResult.orderId,
          apiKey: apiKeyDoc.key,
        });
      }

      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/v1/topup',
        uid,
        voucherCode: effectiveCode ? `${effectiveCode.substring(0, 4)}****` : undefined,
        requestData: { pipeline: targetPipeline, uid, diamondPackageId: effectiveItemType, itemType: effectiveItemType },
        responseData: executionResult,
        status: 'SUCCESS',
        latencyMs,
        quotaDeducted: true,
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        message: executionResult.message || 'Free Fire top-up executed successfully.',
        data: {
          uid,
          pipeline: targetPipeline,
          transactionId: executionResult.orderId || `TX_${Date.now()}`,
          playerName: executionResult.playerName,
          remainingHits: Math.max(0, (apiKeyDoc.remainingHits ?? 1) - 1),
          latencyMs,
        },
      });
    }

    // 4. Failure handling: NOT_ENOUGH_SHELLS
    if (executionResult.errorReason === 'NOT_ENOUGH_SHELLS') {
      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/topup',
        uid,
        status: 'FAILED_NOT_ENOUGH_SHELLS',
        latencyMs,
        quotaDeducted: false,
        ipAddress: clientIp,
        errorDetails: executionResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          errorReason: 'NOT_ENOUGH_SHELLS',
          message: executionResult.message || 'Not enough shell: Garena account balance is insufficient. Please recharge shells.',
          quotaDeducted: false,
        },
        { status: 400 }
      );
    }

    // 5. Failure handling (Insufficient Level vs Invalid UID vs Invalid Voucher vs Worker Error)
    if (executionResult.errorReason === 'INSUFFICIENT_LEVEL' || executionResult.errorReason === 'UNSUPPORTED_PACKAGE') {
      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/topup',
        uid,
        status: `FAILED_${executionResult.errorReason}`,
        latencyMs,
        quotaDeducted: false,
        ipAddress: clientIp,
        errorDetails: executionResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          message: executionResult.message,
          errorReason: executionResult.errorReason,
          quotaDeducted: false,
        },
        { status: 400 }
      );
    }

    // 4. Failure handling: CONSUMED_VOUCHER & ONLY_FOR_BD_REGION
    if (executionResult.errorReason === 'CONSUMED_VOUCHER') {
      if (targetPipeline === 'UNIPIN_VOUCHER') {
        const { recordVoucherOutcome } = await import('@/lib/services/voucherService');
        await recordVoucherOutcome({
          voucherCode: effectiveCode,
          serial,
          pin,
          uid,
          status: 'USED',
          reason: executionResult.message || 'Already consumed voucher',
          apiKey: apiKeyDoc.key,
        });
      }

      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/v1/topup',
        uid,
        status: 'FAILED_CONSUMED_VOUCHER',
        latencyMs,
        quotaDeducted: false,
        ipAddress: clientIp,
        errorDetails: executionResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          errorReason: 'INVALID_VOUCHER',
          message: 'UniPin Voucher redemption failed: Voucher is invalid, expired, or already used.',
          quotaDeducted: false,
        },
        { status: 400 }
      );
    }

    if (executionResult.errorReason === 'ONLY_FOR_BD_REGION') {
      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/topup',
        uid,
        status: 'FAILED_ONLY_FOR_BD_REGION',
        latencyMs,
        quotaDeducted: false,
        ipAddress: clientIp,
        errorDetails: executionResult.message,
      });

      return NextResponse.json(
        {
          success: false,
          errorReason: 'ONLY_FOR_BD_REGION',
          message: 'Only For BD Region! Target Free Fire account is not registered in Bangladesh.',
          quotaDeducted: false,
        },
        { status: 400 }
      );
    }

    // 4. Failure handling (Invalid UID vs Invalid Voucher vs Worker Error)
    if (executionResult.errorReason === 'INVALID_UID') {
      // Invalid UID: Return error without quota deduction
      await ApiLog.create({
        apiKey: apiKeyDoc.key,
        userId: apiKeyDoc.ownerId,
        endpoint: '/api/topup',
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
      if (targetPipeline === 'UNIPIN_VOUCHER') {
        const { recordVoucherOutcome } = await import('@/lib/services/voucherService');
        await recordVoucherOutcome({
          voucherCode: effectiveCode,
          serial,
          pin,
          uid,
          status: 'INVALID',
          reason: executionResult.message || 'Invalid voucher code',
          apiKey: apiKeyDoc.key,
        });
      }

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
      endpoint: '/api/topup',
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
