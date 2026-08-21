import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Reseller from '@/models/Reseller';
import ApiKey from '@/models/ApiKey';
import User from '@/models/User';
import { generateResellerKey } from '@/lib/auth/apiKeyAuth';

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { resellerUserId, clientName, clientEmail, quotaHits, rateLimitRPS } = body;

    const resellerDoc = await Reseller.findOne({ userId: resellerUserId });
    if (!resellerDoc) {
      return NextResponse.json({ success: false, message: 'Reseller account profile not found.' }, { status: 404 });
    }

    const quotaNeeded = parseInt(quotaHits || '500', 10);
    if (resellerDoc.masterQuotaBalance < quotaNeeded) {
      return NextResponse.json({
        success: false,
        message: `Insufficient Master Quota balance. You have ${resellerDoc.masterQuotaBalance} hits available.`,
      }, { status: 400 });
    }

    let clientUser = await User.findOne({ email: clientEmail });
    if (!clientUser) {
      clientUser = await User.create({
        name: clientName || 'Sub-Client',
        email: clientEmail || `client_${Date.now()}@reseller.com`,
        password: 'password123',
        role: 'user',
      });
    }

    // Generate Sub-Key pattern: {RESELLER_TAG}_{CLIENT_NAME}_{RANDOM_6}
    const subKey = generateResellerKey(resellerDoc.brandingTag, clientName || clientUser.name);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const apiKeyDoc = await ApiKey.create({
      key: subKey,
      name: `Sub-Key: ${clientUser.name} (${resellerDoc.brandingTag})`,
      ownerId: clientUser._id,
      resellerId: resellerUserId,
      role: 'client',
      totalHits: quotaNeeded,
      remainingHits: quotaNeeded,
      usedHits: 0,
      rateLimitRPS: parseInt(rateLimitRPS || '5', 10),
      expiresAt,
      status: 'active',
    });

    // Deduct from Reseller Master Balance & update allocated quota
    resellerDoc.masterQuotaBalance -= quotaNeeded;
    resellerDoc.allocatedQuota += quotaNeeded;
    await resellerDoc.save();

    return NextResponse.json({
      success: true,
      message: `Downstream Sub-Key generated successfully for ${clientUser.name}`,
      apiKey: apiKeyDoc,
      remainingMasterBalance: resellerDoc.masterQuotaBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Sub-key creation failed' }, { status: 500 });
  }
}
