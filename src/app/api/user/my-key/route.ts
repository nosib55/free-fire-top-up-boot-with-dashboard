import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import ApiKey from '@/models/ApiKey';

import Reseller from '@/models/Reseller';

export async function GET() {
  await dbConnect();
  try {
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get('admin_session')?.value;

    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const user = await User.findById(sessionUserId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let resellerProfile = await Reseller.findOne({ userId: user._id });
    if (!resellerProfile && (user.role === 'reseller' || user.role === 'admin')) {
      const cleanTag = (user.name || 'RSLR').replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'RSLR';
      try {
        resellerProfile = await Reseller.create({
          userId: user._id,
          brandingTag: `${cleanTag}_${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          masterQuotaBalance: user.hitBalance && user.hitBalance > 0 ? user.hitBalance : 1000,
          allocatedQuota: 0,
          discountRate: 15,
        });
      } catch {
        resellerProfile = await Reseller.findOne({ userId: user._id });
      }
    }

    // Find the real API key assigned by Admin for this specific user
    const keyDoc = await ApiKey.findOne({
      $or: [{ ownerId: user._id }, { userRef: user._id }],
      status: 'active',
    }).sort({ createdAt: -1 });

    if (!keyDoc) {
      return NextResponse.json({
        success: true,
        hasKey: false,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance || 0,
          hitBalance: user.hitBalance || 0,
        },
        resellerProfile: resellerProfile ? {
          brandingTag: resellerProfile.brandingTag,
          masterQuotaBalance: resellerProfile.masterQuotaBalance,
          allocatedQuota: resellerProfile.allocatedQuota,
          discountRate: resellerProfile.discountRate,
        } : null,
      });
    }

    if (resellerProfile && keyDoc) {
      if (resellerProfile.masterQuotaBalance !== keyDoc.remainingHits) {
        resellerProfile.masterQuotaBalance = keyDoc.remainingHits;
        await resellerProfile.save();
      }
    }

    return NextResponse.json({
      success: true,
      hasKey: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: user.balance || 0,
        hitBalance: user.hitBalance || 0,
      },
      resellerProfile: resellerProfile ? {
        brandingTag: resellerProfile.brandingTag,
        masterQuotaBalance: resellerProfile.masterQuotaBalance,
        allocatedQuota: resellerProfile.allocatedQuota,
        discountRate: resellerProfile.discountRate,
      } : null,
      key: {
        key: keyDoc.key,
        name: keyDoc.name,
        totalHits: keyDoc.totalHits ?? 1000,
        remainingHits: keyDoc.remainingHits ?? 0,
        usedHits: keyDoc.usedHits ?? 0,
        expiresAt: keyDoc.expiresAt,
        status: keyDoc.status,
        rateLimitRPS: keyDoc.rateLimitRPS ?? 5,
        webhookUrl: keyDoc.webhookUrl || '',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch user API key' },
      { status: 500 }
    );
  }
}
