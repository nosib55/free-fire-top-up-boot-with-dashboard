import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';
import User from '@/models/User';
import { generateAdminKey, generateResellerKey, generateClientKey } from '@/lib/auth/apiKeyAuth';
import { notifyNewKeyGenerated } from '@/lib/telegram/bot';

export async function GET() {
  await dbConnect();
  try {
    const keys = await ApiKey.find().populate('ownerId', 'name email role').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, keys });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { keyType, username, resellerTag, clientName, totalQuota, rateLimitRPS, durationDays, userEmail, webhookUrl } = body;

    let targetUser = await User.findOne({ email: userEmail });
    if (!targetUser) {
      targetUser = await User.create({
        name: username || clientName || 'API Client',
        email: userEmail || `client_${Date.now()}@platform.com`,
        password: 'password123',
        role: keyType === 'ADMIN' ? 'admin' : keyType === 'RESELLER' ? 'reseller' : 'user',
        requestLimit: totalQuota || 1000,
      });
    }

    let generatedKey = '';
    let keyRole: 'admin' | 'reseller' | 'client' = 'client';

    if (keyType === 'ADMIN') {
      generatedKey = generateAdminKey(username || targetUser.name);
      keyRole = 'admin';
    } else if (keyType === 'RESELLER') {
      generatedKey = generateResellerKey(resellerTag || 'NEXUS', clientName || targetUser.name);
      keyRole = 'reseller';
    } else {
      generatedKey = generateClientKey(username || targetUser.name);
      keyRole = 'client';
    }

    const quota = parseInt(totalQuota || '1000', 10);
    const rps = parseInt(rateLimitRPS || '5', 10);
    const days = parseInt(durationDays || '30', 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const apiKeyDoc = await ApiKey.create({
      key: generatedKey,
      name: `${keyRole.toUpperCase()} Key - ${targetUser.name}`,
      ownerId: targetUser._id,
      role: keyRole,
      totalHits: quota,
      remainingHits: quota,
      usedHits: 0,
      rateLimitRPS: rps,
      expiresAt,
      status: 'active',
      webhookUrl: webhookUrl || '',
    });

    // Notify Telegram Admin
    await notifyNewKeyGenerated({
      key: generatedKey,
      role: keyRole,
      quota,
      owner: targetUser.name,
    });

    return NextResponse.json({
      success: true,
      message: 'API Key generated successfully',
      apiKey: apiKeyDoc,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Key generation failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { keyId, action, additionalQuota } = body;

    const keyDoc = await ApiKey.findById(keyId);
    if (!keyDoc) {
      return NextResponse.json({ success: false, message: 'Key not found' }, { status: 404 });
    }

    if (action === 'TOGGLE_STATUS') {
      keyDoc.status = keyDoc.status === 'active' ? 'suspended' : 'active';
    } else if (action === 'RECHARGE_QUOTA' && additionalQuota) {
      const extra = parseInt(additionalQuota, 10);
      keyDoc.remainingHits += extra;
      keyDoc.totalHits += extra;
      if (keyDoc.status === 'expired') keyDoc.status = 'active';
    }

    await keyDoc.save();
    return NextResponse.json({ success: true, message: `Key updated successfully`, apiKey: keyDoc });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
