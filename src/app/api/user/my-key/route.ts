import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import ApiKey from '@/models/ApiKey';

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
        },
      });
    }

    return NextResponse.json({
      success: true,
      hasKey: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
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
