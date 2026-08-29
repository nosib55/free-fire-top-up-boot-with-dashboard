import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import GarenaAccount from '@/models/GarenaAccount';
import SystemSetting from '@/models/SystemSetting';
import {
  testGarenaAccountLogin,
  redeemBulkGarenaShellCards,
  fetchGarenaShellsBalance,
} from '@/lib/automation/garenaShells';

export async function GET() {
  await dbConnect();
  try {
    let accounts = await GarenaAccount.find().sort({ isPrimary: -1, updatedAt: -1 }).lean();

    // If no accounts exist yet, seed a default demo/active account so admin can see immediate UI
    if (accounts.length === 0) {
      const defaultAccount = await GarenaAccount.create({
        username: process.env.GARENA_ACCOUNT_USERNAME || 'garena_master_bd',
        accountNickname: 'Master MY Shell Pool #1',
        region: 'MY',
        shellsBalance: 2400,
        status: 'ACTIVE',
        isPrimary: true,
        notes: 'Primary worker automated top-up account for shop.garena.my',
        lastLoginAt: new Date(),
        lastBalanceSyncAt: new Date(),
      });
      accounts = [defaultAccount.toObject()];
    }

    const totalShells = accounts.reduce((acc, curr) => acc + (curr.shellsBalance || 0), 0);

    return NextResponse.json({
      success: true,
      accounts,
      totalShells,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { action = 'create' } = body;

    // 1. Create New Garena Shell Account
    if (action === 'create') {
      const { username, password, accountNickname, region = 'MY', authCookie, isPrimary, notes } = body;

      if (!username) {
        return NextResponse.json({ success: false, message: 'Garena Account Username/User ID is required.' }, { status: 400 });
      }

      if (isPrimary) {
        await GarenaAccount.updateMany({}, { isPrimary: false });
      }

      const newAccount = await GarenaAccount.create({
        username: username.trim(),
        password: password || '',
        accountNickname: accountNickname || `Garena Pool (${username.trim()})`,
        region,
        authCookie: authCookie || '',
        shellsBalance: 0,
        status: 'ACTIVE',
        isPrimary: Boolean(isPrimary),
        notes: notes || '',
        lastLoginAt: new Date(),
        lastBalanceSyncAt: new Date(),
      });

      // Update SystemSetting if primary
      if (isPrimary) {
        await SystemSetting.findOneAndUpdate({}, { activeGarenaAccountId: newAccount._id.toString() });
      }

      return NextResponse.json({
        success: true,
        message: `Garena Shell account '${newAccount.accountNickname}' created successfully.`,
        account: newAccount,
      });
    }

    // 2. Update Existing Account
    if (action === 'update') {
      const { id, username, password, accountNickname, region, authCookie, isPrimary, notes, status, shellsBalance } = body;

      if (!id) {
        return NextResponse.json({ success: false, message: 'Account ID is required.' }, { status: 400 });
      }

      if (isPrimary) {
        await GarenaAccount.updateMany({ _id: { $ne: id } }, { isPrimary: false });
        await SystemSetting.findOneAndUpdate({}, { activeGarenaAccountId: id });
      }

      const updateData: any = {};
      if (username) updateData.username = username.trim();
      if (password !== undefined) updateData.password = password;
      if (accountNickname) updateData.accountNickname = accountNickname;
      if (region) updateData.region = region;
      if (authCookie !== undefined) updateData.authCookie = authCookie;
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

      await GarenaAccount.findByIdAndDelete(id);
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
        const acc = await GarenaAccount.findById(id);
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

      // If tested an existing account, update its state in DB
      if (id) {
        await GarenaAccount.findByIdAndUpdate(id, {
          status: testResult.status,
          shellsBalance: testResult.balance,
          lastLoginAt: new Date(),
          lastBalanceSyncAt: new Date(),
          lastErrorMessage: testResult.success ? '' : testResult.message,
        });

        // Also update SystemSetting live balance
        await SystemSetting.findOneAndUpdate({}, {
          garenaShellsBalance: testResult.balance,
          lastBalanceSyncAt: new Date(),
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

      await GarenaAccount.updateMany({}, { isPrimary: false });
      const acc = await GarenaAccount.findByIdAndUpdate(id, { isPrimary: true }, { new: true });
      await SystemSetting.findOneAndUpdate({}, { activeGarenaAccountId: id });

      return NextResponse.json({
        success: true,
        message: `'${acc?.accountNickname}' is now set as the Primary Garena Account for top-up automation.`,
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
