import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';
import ApiLog from '@/models/ApiLog';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    const resellerUserId = url.searchParams.get('resellerUserId');
    const statusFilter = url.searchParams.get('status');
    const searchUid = url.searchParams.get('uid');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    if (!resellerUserId) {
      return NextResponse.json({ success: false, message: 'resellerUserId query parameter is required.' }, { status: 400 });
    }

    // 1. Find all sub-keys and own keys belonging to this Reseller
    const resellerKeys = await ApiKey.find({
      $or: [
        { resellerId: new mongoose.Types.ObjectId(resellerUserId) },
        { ownerId: new mongoose.Types.ObjectId(resellerUserId) },
      ],
    }).select('key name ownerId');

    const keyStrings = resellerKeys.map(k => k.key);

    if (keyStrings.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        total: 0,
        subKeysCount: 0,
      });
    }

    // 2. Build isolated query
    const query: any = {
      apiKey: { $in: keyStrings },
    };

    if (statusFilter && statusFilter !== 'ALL') {
      query.status = statusFilter;
    }

    if (searchUid) {
      query.uid = { $regex: searchUid.trim(), $options: 'i' };
    }

    // 3. Fetch logs and transactions
    const logs = await ApiLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      transactions: logs,
      total: logs.length,
      subKeysCount: resellerKeys.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
