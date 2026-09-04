import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import GarenaAccount from '@/models/GarenaAccount';
import { validateApiKey } from '@/lib/auth/apiKeyAuth';

// Helper to extract API key and authenticate reseller
async function authenticateReseller(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  let apiKeyStr = request.headers.get('x-api-key') || '';
  if (!apiKeyStr) {
    const url = new URL(request.url);
    apiKeyStr = url.searchParams.get('apiKey') || '';
  }

  const auth = await validateApiKey(apiKeyStr, clientIp);
  return auth;
}

/**
 * GET /api/v1/garena/accounts
 * List all saved Garena accounts for the authenticated reseller
 */
export async function GET(request: Request) {
  const auth = await authenticateReseller(request);
  if (!auth.valid || !auth.apiKeyDoc) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.statusCode || 401 });
  }

  await dbConnect();
  try {
    const userId = auth.apiKeyDoc.ownerId;
    const accounts = await GarenaAccount.find({ userId })
      .sort({ isPrimary: -1, updatedAt: -1 })
      .lean();

    // Mask passwords for security
    const safeAccounts = accounts.map((acc) => ({
      id: (acc as any)._id.toString(),
      username: acc.username,
      accountNickname: acc.accountNickname,
      region: acc.region,
      shellsBalance: acc.shellsBalance,
      status: acc.status,
      isPrimary: acc.isPrimary,
      hasPassword: Boolean(acc.password),
      hasAuthCookie: Boolean(acc.authCookie),
      lastBalanceSyncAt: acc.lastBalanceSyncAt,
      createdAt: acc.createdAt,
    }));

    const totalShells = safeAccounts.reduce((sum, a) => sum + (a.shellsBalance || 0), 0);

    return NextResponse.json({
      success: true,
      count: safeAccounts.length,
      totalShells,
      accounts: safeAccounts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/garena/accounts
 * Reseller saves a new Garena account to DB
 */
export async function POST(request: Request) {
  const auth = await authenticateReseller(request);
  if (!auth.valid || !auth.apiKeyDoc) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.statusCode || 401 });
  }

  await dbConnect();
  try {
    const userId = auth.apiKeyDoc.ownerId;
    const body = await request.json();
    const { username, password, authCookie, accountNickname, region = 'MY', isPrimary = false, notes } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ success: false, message: 'username is required.' }, { status: 400 });
    }

    if (isPrimary) {
      await GarenaAccount.updateMany({ userId }, { isPrimary: false });
    }

    // Check if account already exists for this reseller
    const existing = await GarenaAccount.findOne({ userId, username: username.trim() });
    if (existing) {
      if (password) existing.password = password;
      if (authCookie) existing.authCookie = authCookie;
      if (accountNickname) existing.accountNickname = accountNickname;
      if (region) existing.region = region;
      if (isPrimary !== undefined) existing.isPrimary = Boolean(isPrimary);
      if (notes !== undefined) existing.notes = notes;
      existing.status = 'ACTIVE';
      await existing.save();

      return NextResponse.json({
        success: true,
        message: `Garena account '${username}' updated successfully for your reseller profile.`,
        accountId: existing._id.toString(),
      });
    }

    const created = await GarenaAccount.create({
      userId,
      username: username.trim(),
      password: password || '',
      authCookie: authCookie || '',
      accountNickname: accountNickname || `Garena (${username.trim()})`,
      region,
      shellsBalance: 0,
      status: 'ACTIVE',
      isPrimary: Boolean(isPrimary),
      notes: notes || '',
      lastLoginAt: new Date(),
      lastBalanceSyncAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Garena account '${created.username}' saved successfully. Top-up orders will now use this account.`,
      accountId: created._id.toString(),
      accountNickname: created.accountNickname,
      shellsBalance: created.shellsBalance,
      isPrimary: created.isPrimary,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/garena/accounts
 * Update reseller Garena account details or set primary
 */
export async function PATCH(request: Request) {
  const auth = await authenticateReseller(request);
  if (!auth.valid || !auth.apiKeyDoc) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.statusCode || 401 });
  }

  await dbConnect();
  try {
    const userId = auth.apiKeyDoc.ownerId;
    const body = await request.json();
    const { id, accountNickname, password, authCookie, isPrimary, region } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Account id is required.' }, { status: 400 });
    }

    if (isPrimary) {
      await GarenaAccount.updateMany({ userId, _id: { $ne: id } }, { isPrimary: false });
    }

    const updateFields: any = {};
    if (accountNickname) updateFields.accountNickname = accountNickname;
    if (password !== undefined) updateFields.password = password;
    if (authCookie !== undefined) updateFields.authCookie = authCookie;
    if (isPrimary !== undefined) updateFields.isPrimary = Boolean(isPrimary);
    if (region) updateFields.region = region;

    const updated = await GarenaAccount.findOneAndUpdate({ _id: id, userId }, updateFields, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Garena account not found under your profile.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Garena account updated successfully.',
      account: {
        id: updated._id.toString(),
        username: updated.username,
        accountNickname: updated.accountNickname,
        region: updated.region,
        shellsBalance: updated.shellsBalance,
        isPrimary: updated.isPrimary,
        status: updated.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/garena/accounts
 * Delete a reseller's saved Garena account
 */
export async function DELETE(request: Request) {
  const auth = await authenticateReseller(request);
  if (!auth.valid || !auth.apiKeyDoc) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.statusCode || 401 });
  }

  await dbConnect();
  try {
    const userId = auth.apiKeyDoc.ownerId;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Query parameter ?id= is required.' }, { status: 400 });
    }

    const deleted = await GarenaAccount.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Garena account not found under your profile.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Account '${deleted.username}' deleted successfully.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
