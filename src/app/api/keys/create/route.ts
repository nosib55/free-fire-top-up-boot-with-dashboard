import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';
import User from '@/models/User';
import crypto from 'crypto';

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { key, userEmail, userName, totalLimit, expiryDate, expiryMinutes, expiryDays, expiryMonths } = body;

    let targetUser = userEmail ? await User.findOne({ email: userEmail }) : null;
    if (!targetUser && userEmail) {
      targetUser = await User.create({
        name: userName || userEmail.split('@')[0] || 'API Client',
        email: userEmail,
        password: 'password123',
        role: 'user',
        status: 'active',
      });
    }

    // Generate cryptographic key if not explicitly passed
    let finalKey = key;
    if (!finalKey) {
      const randHash = crypto.randomBytes(16).toString('hex').toUpperCase();
      finalKey = `KEY_${randHash}`;
    }

    // Calculate expiration date
    let expiresAt = new Date();
    if (expiryDate) {
      expiresAt = new Date(expiryDate);
    } else if (expiryMinutes) {
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiryMinutes, 10));
    } else if (expiryDays) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays, 10));
    } else if (expiryMonths) {
      expiresAt.setMonth(expiresAt.getMonth() + parseInt(expiryMonths, 10));
    } else {
      expiresAt.setDate(expiresAt.getDate() + 30); // Default 30 days
    }

    const quota = parseInt(totalLimit || '1000', 10);

    const apiKeyDoc = await ApiKey.create({
      key: finalKey,
      name: `API Key - ${targetUser ? targetUser.name : 'Generated'}`,
      ownerId: targetUser ? targetUser._id : undefined,
      userRef: targetUser ? targetUser._id : undefined,
      totalLimit: quota,
      totalHits: quota,
      remainingHits: quota,
      usedCount: 0,
      usedHits: 0,
      expiresAt,
      isActive: true,
      status: 'active',
      lastUpdated: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'API Key created successfully',
      apiKey: apiKeyDoc,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create API key' },
      { status: 500 }
    );
  }
}
