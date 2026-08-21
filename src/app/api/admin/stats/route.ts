import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';
import ApiLog from '@/models/ApiLog';
import User from '@/models/User';

export async function GET() {
  await dbConnect();
  try {
    const totalKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' } });
    const activeKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' }, status: 'active' });
    const inactiveKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' }, status: 'suspended' });
    const expiredKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' }, expiresAt: { $lt: new Date() } });

    const totalRequests = await ApiLog.countDocuments();
    const successfulRequests = await ApiLog.countDocuments({
      status: { $regex: /success/i },
    });
    const failedRequests = await ApiLog.countDocuments({
      status: { $regex: /fail/i },
    });

    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    // Calculate dynamic 7-day traffic from real logs
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weeklyTraffic = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      const total = await ApiLog.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });
      const success = await ApiLog.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $regex: /success/i },
      });
      const failed = total - success;

      weeklyTraffic.push({
        day: days[startOfDay.getDay()],
        total,
        success,
        failed,
      });
    }

    const recentLogs = await ApiLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      stats: {
        totalKeys,
        activeKeys,
        inactiveKeys,
        expiredKeys,
        totalRequests,
        successfulRequests,
        failedRequests,
        totalUsers,
      },
      weeklyTraffic,
      recentLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to aggregate statistics' },
      { status: 500 }
    );
  }
}
