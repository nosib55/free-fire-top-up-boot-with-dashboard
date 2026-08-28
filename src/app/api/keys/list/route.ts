import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const keys = await ApiKey.find()
      .populate('userRef', 'name email role status')
      .populate('ownerId', 'name email role status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalKeys = await ApiKey.countDocuments();
    const activeKeys = await ApiKey.countDocuments({ status: 'active', isActive: true });
    const expiredKeys = await ApiKey.countDocuments({ status: 'expired' });

    return NextResponse.json({
      success: true,
      keys,
      pagination: {
        page,
        limit,
        totalKeys,
        totalPages: Math.ceil(totalKeys / limit),
      },
      stats: {
        totalKeys,
        activeKeys,
        expiredKeys,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to list API keys' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { keyId, action, totalLimit, extendDays } = body;

    const keyDoc = await ApiKey.findById(keyId);
    if (!keyDoc) {
      return NextResponse.json({ success: false, message: 'Key not found' }, { status: 404 });
    }

    if (action === 'REVOKE' || action === 'TOGGLE_STATUS') {
      const newActiveState = !keyDoc.isActive;
      keyDoc.isActive = newActiveState;
      keyDoc.status = newActiveState ? 'active' : 'suspended';
    } else if (action === 'EDIT_QUOTA' && totalLimit !== undefined) {
      const limit = parseInt(totalLimit, 10);
      keyDoc.totalLimit = limit;
      keyDoc.totalHits = limit;
      const newRemaining = Math.max(0, limit - (keyDoc.usedCount || keyDoc.usedHits || 0));
      keyDoc.remainingHits = newRemaining;

      if (keyDoc.ownerId) {
        const User = (await import('@/models/User')).default;
        await User.findByIdAndUpdate(keyDoc.ownerId, { hitBalance: newRemaining });
        const Reseller = (await import('@/models/Reseller')).default;
        await Reseller.findOneAndUpdate({ userId: keyDoc.ownerId }, { masterQuotaBalance: newRemaining });
      }
    } else if (action === 'EXTEND_EXPIRY' && extendDays) {
      const currentExpiry = new Date(keyDoc.expiresAt);
      const now = new Date();
      const baseDate = currentExpiry > now ? currentExpiry : now;
      baseDate.setDate(baseDate.getDate() + parseInt(extendDays, 10));
      keyDoc.expiresAt = baseDate;
      keyDoc.status = 'active';
      keyDoc.isActive = true;
    }

    keyDoc.lastUpdated = new Date();
    await keyDoc.save();

    return NextResponse.json({
      success: true,
      message: 'API Key updated successfully',
      apiKey: keyDoc,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update API key' },
      { status: 500 }
    );
  }
}
