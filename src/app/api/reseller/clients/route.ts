import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';
import Reseller from '@/models/Reseller';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    const resellerUserId = url.searchParams.get('resellerUserId');

    const query = resellerUserId ? { resellerId: resellerUserId } : { role: 'client' };
    const clients = await ApiKey.find(query).populate('ownerId', 'name email').sort({ createdAt: -1 });
    const resellerProfile = resellerUserId ? await Reseller.findOne({ userId: resellerUserId }) : null;

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
