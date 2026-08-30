import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import GarenaAccount from '@/models/GarenaAccount';
import {
  testGarenaAccountLogin,
  redeemBulkGarenaShellCards,
} from '@/lib/automation/garenaShells';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get('admin_session')?.value;
  if (!sessionUserId) return null;
  return await User.findById(sessionUserId);
}

export async function GET() {
  await dbConnect();
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Find accounts belonging to this specific user or reseller
    let accounts = await GarenaAccount.find({
      $or: [{ userId: user._id }, { userId: { $exists: false } }],
    })
      .sort({ isPrimary: -1, updatedAt: -1 })
      .lean();

    // If user has no accounts yet, return empty list cleanly
    const userSpecificAccounts = accounts.filter(
      (acc: any) => !acc.userId || acc.userId.toString() === user._id.toString()
    );

    const totalShells = userSpecificAccounts.reduce((acc, curr) => acc + (curr.shellsBalance || 0), 0);

    return NextResponse.json({
      success: true,
      accounts: userSpecificAccounts,
      totalShells,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { action = 'create' } = body;

    // 1. Create New Garena Shell Account
    if (action === 'create') {
      const { username, password, accountNickname, region = 'MY', authCookie, isPrimary, notes } = body;

      if (!username) {
        return NextResponse.json({ success: false, message: 'Garena Account Username/User ID is required.' }, { status: 400 });
      }

      // Check existing accounts count for this user
      const existingCount = await GarenaAccount.countDocuments({ userId: user._id });
      const makePrimary = isPrimary || existingCount === 0;

      if (makePrimary) {
        await GarenaAccount.updateMany({ userId: user._id }, { isPrimary: false });
      }

      const newAccount = await GarenaAccount.create({
        userId: user._id,
        username: username.trim(),
        password: password || '',
        accountNickname: accountNickname ? accountNickname.trim() : `Garena Account (${username.trim()})`,
        region,
        authCookie: authCookie ? authCookie.trim() : '',
        shellsBalance: 0,
        status: 'ACTIVE',
        isPrimary: makePrimary,
        notes: notes || '',
        lastLoginAt: new Date(),
        lastBalanceSyncAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: `Garena Shell account '${newAccount.accountNickname}' configured successfully.`,
        account: newAccount,
      });
    }

    // 2. Update Existing Account
    if (action === 'update') {
      const { id, username, password, accountNickname, region, authCookie, isPrimary, notes, status, shellsBalance } = body;

      if (!id) {
        return NextResponse.json({ success: false, message: 'Account ID is required.' }, { status: 400 });
      }

      // Ensure account belongs to user
      const existingAcc = await GarenaAccount.findOne({ _id: id, $or: [{ userId: user._id }, { userId: { $exists: false } }] });
      if (!existingAcc) {
        return NextResponse.json({ success: false, message: 'Garena account not found.' }, { status: 404 });
      }

      if (isPrimary) {
        await GarenaAccount.updateMany({ userId: user._id, _id: { $ne: id } }, { isPrimary: false });
      }

      const updateData: any = { userId: user._id };
      if (username) updateData.username = username.trim();
      if (password !== undefined) updateData.password = password;
      if (accountNickname) updateData.accountNickname = accountNickname.trim();
      if (region) updateData.region = region;
      if (authCookie !== undefined) updateData.authCookie = authCookie.trim();
      if (isPrimary !== undefined) updateData.isPrimary = isPrimary;
      if (notes !== undefined) updateData.notes = notes;
      if (status) updateData.status = status;
      if (shellsBalance !== undefined) updateData.shellsBalance = Number(shellsBalance);

      const updated = await GarenaAccount.findByIdAndUpdate(id, updateData, { new: true });

      return NextResponse.json({
        success: true,
        message: 'Garena Shell account updated successfully.',
        account: updated,
      });
    }

    // 3. Delete Account
    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, message: 'Account ID is required.' }, { status: 400 });
      }

      await GarenaAccount.findOneAndDelete({ _id: id, $or: [{ userId: user._id }, { userId: { $exists: false } }] });
      return NextResponse.json({ success: true, message: 'Garena account removed successfully.' });
    }

    // 4. Test Login & Scrape Shell Balance
    if (action === 'test_login') {
      const { id, username, password, authCookie, region } = body;

      let targetUsername = username;
      let targetPassword = password;
      let targetCookie = authCookie;
      let targetRegion = region || 'MY';

      if (id) {
        const acc = await GarenaAccount.findOne({ _id: id, $or: [{ userId: user._id }, { userId: { $exists: false } }] });
        if (acc) {
          targetUsername = targetUsername || acc.username;
          targetPassword = targetPassword !== undefined ? targetPassword : acc.password;
          targetCookie = targetCookie !== undefined ? targetCookie : acc.authCookie;
          targetRegion = targetRegion || acc.region;
        }
      }

      const testResult = await testGarenaAccountLogin({
        username: targetUsername,
        password: targetPassword,
        authCookie: targetCookie,
        region: targetRegion,
      });

      // Update state in DB
      if (id) {
        await GarenaAccount.findByIdAndUpdate(id, {
          userId: user._id,
          status: testResult.status,
          shellsBalance: testResult.balance,
          lastLoginAt: new Date(),
          lastBalanceSyncAt: new Date(),
          lastErrorMessage: testResult.success ? '' : testResult.message,
        });
      }

      return NextResponse.json(testResult);
    }

    // 5. Set Primary Worker Account
    if (action === 'set_primary') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, message: 'Account ID is required.' }, { status: 400 });
      }

      await GarenaAccount.updateMany({ userId: user._id }, { isPrimary: false });
      const acc = await GarenaAccount.findOneAndUpdate(
        { _id: id, $or: [{ userId: user._id }, { userId: { $exists: false } }] },
        { isPrimary: true, userId: user._id },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: `'${acc?.accountNickname}' is now set as your primary Garena Account for top-up automation.`,
        account: acc,
      });
    }

    // 6. Bulk Redeem Garena Prepaid Cards
    if (action === 'redeem_cards') {
      const { cards } = body;
      if (!cards || !Array.isArray(cards) || cards.length === 0) {
        return NextResponse.json({ success: false, message: 'Please provide an array of card PINs.' }, { status: 400 });
      }

      const redeemResult = await redeemBulkGarenaShellCards(cards);
      return NextResponse.json({
        success: redeemResult.success,
        result: redeemResult,
        message: `Processed ${cards.length} cards. Successfully loaded: ${redeemResult.totalLoaded} cards.`,
      });
    }

    return NextResponse.json({ success: false, message: `Unknown action '${action}'.` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
