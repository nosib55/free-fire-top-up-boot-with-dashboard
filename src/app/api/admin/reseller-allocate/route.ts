import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Reseller from '@/models/Reseller';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import crypto from 'crypto';

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { resellerEmail, brandingTag, quotaHits, discountRate } = body;

    const user = await User.findOne({ email: resellerEmail });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found with this email.' }, { status: 404 });
    }

    user.role = 'reseller';
    await user.save();

    let resellerProfile = await Reseller.findOne({ userId: user._id });
    if (!resellerProfile) {
      resellerProfile = await Reseller.create({
        userId: user._id,
        brandingTag: (brandingTag || 'TAG').toUpperCase(),
        masterQuotaBalance: parseInt(quotaHits || '10000', 10),
        discountRate: parseFloat(discountRate || '15'),
      });
      user.resellerProfile = resellerProfile._id as any;
      await user.save();
    } else {
      resellerProfile.masterQuotaBalance += parseInt(quotaHits || '10000', 10);
      if (brandingTag) resellerProfile.brandingTag = brandingTag.toUpperCase();
      if (discountRate) resellerProfile.discountRate = parseFloat(discountRate);
      await resellerProfile.save();
    }

    // Record Transaction
    await Transaction.create({
      txId: `ALLOC_${Date.now()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      userId: user._id,
      type: 'RESELLER_ALLOCATION',
      amount: 0,
      hits: parseInt(quotaHits || '10000', 10),
      status: 'COMPLETED',
      proof: `Admin Wholesale Quota Allocation under Tag [${resellerProfile.brandingTag}]`,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully allocated ${quotaHits} hits to Reseller ${user.name} (${resellerProfile.brandingTag})`,
      resellerProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Reseller allocation failed' }, { status: 500 });
  }
}
