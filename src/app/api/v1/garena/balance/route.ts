import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import GarenaAccount from '@/models/GarenaAccount';
import { validateApiKey } from '@/lib/auth/apiKeyAuth';
import { fetchGarenaShellsBalance } from '@/lib/automation/garenaShells';

async function handleBalanceRequest(request: Request) {
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
    const userId = auth.apiKeyDoc.ownerId;
    const url = new URL(request.url);
    const forceSync = url.searchParams.get('forceSync') === 'true' || url.searchParams.get('refresh') === 'true';
    const accountId = url.searchParams.get('accountId') || undefined;

    // Find reseller's primary or active Garena account
    let query: any = { userId };
    if (accountId) {
      query._id = accountId;
    } else {
      query.isPrimary = true;
    }

    let account = await GarenaAccount.findOne(query);
    if (!account && !accountId) {
      account = await GarenaAccount.findOne({ userId }).sort({ updatedAt: -1 });
    }

    // If still no account, fallback to global active master pool
    if (!account) {
      account = await GarenaAccount.findOne({ isPrimary: true, status: 'ACTIVE' });
    }

    if (!account) {
      return NextResponse.json({
        success: false,
        message: 'No Garena Shell account registered. Please add an account first via /api/v1/garena/accounts.',
        shellsBalance: 0,
      }, { status: 404 });
    }

    // Check if cached balance is fresh (within last 3 minutes) unless forceSync is requested
    const lastSyncMs = account.lastBalanceSyncAt ? Date.now() - new Date(account.lastBalanceSyncAt).getTime() : Infinity;
    const isFresh = lastSyncMs < 3 * 60 * 1000;

    if (isFresh && !forceSync) {
      return NextResponse.json({
        success: true,
        username: account.username,
        accountNickname: account.accountNickname,
        shellsBalance: account.shellsBalance,
        region: account.region,
        status: account.status,
        lastSync: account.lastBalanceSyncAt,
        cached: true,
      });
    }

    // Run live balance fetch
    const syncResult = await fetchGarenaShellsBalance(userId?.toString(), account._id.toString());

    return NextResponse.json({
      success: syncResult.success,
      username: syncResult.username || account.username,
      accountNickname: syncResult.accountNickname || account.accountNickname,
      shellsBalance: syncResult.balance,
      region: account.region,
      status: account.status,
      lastSync: new Date().toISOString(),
      cached: false,
      message: syncResult.message,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleBalanceRequest(request);
}

export async function POST(request: Request) {
  return handleBalanceRequest(request);
}
