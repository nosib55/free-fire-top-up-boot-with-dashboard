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
    const { keyId, action, totalLimit, extendDays, expiryMode, targetDate, status, isActive, rateLimitRPS } = body;

    const keyDoc = await ApiKey.findById(keyId);
    if (!keyDoc) {
      return NextResponse.json({ success: false, message: 'Key not found' }, { status: 404 });
    }

    // UNIFIED EDIT ACTION
    if (action === 'EDIT_KEY') {
      // 1. Quota Updates
      if (totalLimit !== undefined && totalLimit !== '') {
        const limit = Math.max(0, parseInt(totalLimit, 10));
        keyDoc.totalLimit = limit;
        keyDoc.totalHits = limit;
        const used = keyDoc.usedCount !== undefined ? keyDoc.usedCount : (keyDoc.usedHits || 0);
        const newRemaining = Math.max(0, limit - used);
        keyDoc.remainingHits = newRemaining;

        if (keyDoc.ownerId) {
          const User = (await import('@/models/User')).default;
          await User.findByIdAndUpdate(keyDoc.ownerId, { hitBalance: newRemaining });
          const Reseller = (await import('@/models/Reseller')).default;
          await Reseller.findOneAndUpdate({ userId: keyDoc.ownerId }, { masterQuotaBalance: newRemaining });
        }
      }

      // 2. Expiry Updates (3 Modes: EXTEND_DAYS, SET_DATE, UNLIMITED)
      if (expiryMode === 'EXTEND_DAYS' && extendDays) {
        const currentExpiry = new Date(keyDoc.expiresAt);
        const now = new Date();
        const baseDate = currentExpiry > now ? currentExpiry : now;
        baseDate.setDate(baseDate.getDate() + parseInt(extendDays, 10));
        keyDoc.expiresAt = baseDate;
      } else if (expiryMode === 'SET_DATE' && targetDate) {
        const parsedDate = new Date(targetDate);
        if (!isNaN(parsedDate.getTime())) {
          // Set to end of the chosen day (23:59:59)
          parsedDate.setHours(23, 59, 59, 999);
          keyDoc.expiresAt = parsedDate;
        }
      } else if (expiryMode === 'UNLIMITED') {
        // Far future date representing lifetime unlimited validity
        keyDoc.expiresAt = new Date('2099-12-31T23:59:59.999Z');
      }

      // 3. Status Updates
      if (status !== undefined) {
        keyDoc.status = status;
        keyDoc.isActive = status === 'active';
      } else if (isActive !== undefined) {
        keyDoc.isActive = Boolean(isActive);
        keyDoc.status = Boolean(isActive) ? 'active' : 'suspended';
      }

      // 4. Rate Limit (RPS)
      if (rateLimitRPS !== undefined && rateLimitRPS !== '') {
        keyDoc.rateLimitRPS = Math.max(1, parseInt(rateLimitRPS, 10));
      }
    } else if (action === 'REVOKE' || action === 'TOGGLE_STATUS') {
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

export async function DELETE(request: Request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    let keyId = url.searchParams.get('keyId') || url.searchParams.get('id');

    if (!keyId) {
      try {
        const body = await request.json();
        keyId = body.keyId || body.id;
      } catch {}
    }

    if (!keyId) {
      return NextResponse.json({ success: false, message: 'keyId is required' }, { status: 400 });
    }

    const keyDoc = await ApiKey.findByIdAndDelete(keyId);
    if (!keyDoc) {
      return NextResponse.json({ success: false, message: 'API Key not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `API Key '${keyDoc.key}' permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

