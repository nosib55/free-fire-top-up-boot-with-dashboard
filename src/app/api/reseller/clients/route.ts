import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';
import Reseller from '@/models/Reseller';
import User from '@/models/User';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    const resellerUserId = url.searchParams.get('resellerUserId');

    const query = resellerUserId ? { resellerId: resellerUserId } : { role: 'client' };
    const clients = await ApiKey.find(query).populate('ownerId', 'name email').sort({ createdAt: -1 });
    let resellerProfile = resellerUserId ? await Reseller.findOne({ userId: resellerUserId }) : null;

    if (resellerUserId && !resellerProfile) {
      const user = await User.findById(resellerUserId);
      if (user && (user.role === 'reseller' || user.role === 'admin')) {
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
          resellerProfile = await Reseller.findOne({ userId: resellerUserId });
        }
      }
    }

    if (resellerUserId && resellerProfile) {
      const activeKey = await ApiKey.findOne({ ownerId: resellerUserId, status: 'active' }).sort({ createdAt: -1 });
      if (activeKey && resellerProfile.masterQuotaBalance !== activeKey.remainingHits) {
        resellerProfile.masterQuotaBalance = activeKey.remainingHits;
        await resellerProfile.save();
      }
    }

    return NextResponse.json({
      success: true,
      clients,
      resellerProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { keyId, action, additionalHits, resellerUserId } = body;

    const apiKey = await ApiKey.findById(keyId);
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Sub-key not found' }, { status: 404 });
    }

    if (action === 'REVOKE') {
      apiKey.status = 'suspended';
      await apiKey.save();
      return NextResponse.json({ success: true, message: 'Sub-key suspended/revoked successfully.', apiKey });
    }

    if (action === 'REPLENISH' && additionalHits && resellerUserId) {
      const hits = parseInt(additionalHits, 10);
      const resellerDoc = await Reseller.findOne({ userId: resellerUserId });

      if (!resellerDoc || resellerDoc.masterQuotaBalance < hits) {
        return NextResponse.json({ success: false, message: 'Insufficient Master Quota balance to replenish client.' }, { status: 400 });
      }

      resellerDoc.masterQuotaBalance -= hits;
      resellerDoc.allocatedQuota += hits;
      await resellerDoc.save();

      apiKey.remainingHits += hits;
      apiKey.totalHits += hits;
      if (apiKey.status === 'expired') apiKey.status = 'active';
      await apiKey.save();

      return NextResponse.json({
        success: true,
        message: `Replenished ${hits} hits to client sub-key.`,
        apiKey,
        remainingMasterBalance: resellerDoc.masterQuotaBalance,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
