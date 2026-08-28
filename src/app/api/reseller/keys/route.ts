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

    let resellerDoc = await Reseller.findOne({ userId: resellerUserId });
    if (!resellerDoc) {
      const user = await User.findById(resellerUserId);
      if (user) {
        const cleanTag = (user.name || 'RSLR').replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'RSLR';
        try {
          resellerDoc = await Reseller.create({
            userId: user._id,
            brandingTag: `${cleanTag}_${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
            masterQuotaBalance: user.hitBalance && user.hitBalance > 0 ? user.hitBalance : 1000,
            allocatedQuota: 0,
            discountRate: 15,
          });
        } catch {
          resellerDoc = await Reseller.findOne({ userId: resellerUserId });
        }
      }
    }

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
