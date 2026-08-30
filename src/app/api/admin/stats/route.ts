import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import ApiKey from '@/models/ApiKey';
import ApiLog from '@/models/ApiLog';
import User from '@/models/User';
import { sendTelegramAdminAlert } from '@/lib/telegram/bot';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'all'; // 'today' | 'yesterday' | '7days' | '30days' | 'all'

    // Determine Date Filter for dynamic logs
    const now = new Date();
    let dateFilter: any = {};

    if (range === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (range === 'yesterday') {
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } };
    } else if (range === '7days') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: past7 } };
    } else if (range === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: past30 } };
    }

    // Global Key & User counts
    const totalKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' } });
    const activeKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' }, status: 'active' });
    const inactiveKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' }, status: 'suspended' });
    const expiredKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' }, expiresAt: { $lt: new Date() } });
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    // Filtered Log Counts
    const totalRequests = await ApiLog.countDocuments(dateFilter);
    const successfulRequests = await ApiLog.countDocuments({
      ...dateFilter,
      status: { $regex: /success/i },
    });
    const failedRequests = await ApiLog.countDocuments({
      ...dateFilter,
      status: { $regex: /fail|error|invalid/i },
    });

    // 7-day traffic chart
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyTraffic = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

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

    // User-wise Usage Breakdown Aggregation
    const users = await User.find({ role: { $ne: 'admin' } }).lean();
    const userBreakdowns = await Promise.all(
      users.map(async (u: any) => {
        const userKey = await ApiKey.findOne({ ownerId: u._id }).lean();
        const keyStr = userKey?.key || '';

        const userTotalReqs = await ApiLog.countDocuments({
          ...dateFilter,
          $or: [{ userId: u._id }, { apiKey: keyStr }],
        });

        const userSuccessReqs = await ApiLog.countDocuments({
          ...dateFilter,
          $or: [{ userId: u._id }, { apiKey: keyStr }],
          status: { $regex: /success/i },
        });

        const userFailedReqs = userTotalReqs - userSuccessReqs;

        const lastLog = await ApiLog.findOne({
          $or: [{ userId: u._id }, { apiKey: keyStr }],
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          userId: u._id,
          name: u.name || 'Client',
          email: u.email,
          apiKey: keyStr ? `${keyStr.substring(0, 10)}...` : 'No Key',
          totalHits: userKey?.totalHits || 0,
          remainingHits: userKey?.remainingHits || 0,
          usedHits: userKey?.usedHits || 0,
          totalRequests: userTotalReqs,
          successRequests: userSuccessReqs,
          failedRequests: userFailedReqs,
          lastActive: lastLog?.createdAt || u.updatedAt || u.createdAt,
        };
      })
    );

    // Recent 10 logs
    const recentLogs = await ApiLog.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      range,
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
      userBreakdowns,
      recentLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to aggregate statistics' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { action, range = 'all' } = body;

    if (action === 'SEND_TELEGRAM_REPORT') {
      const now = new Date();
      let dateFilter: any = {};
      let rangeTitle = 'All-Time';

      if (range === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: startOfDay } };
        rangeTitle = "Today's";
      } else if (range === 'yesterday') {
        const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        dateFilter = { createdAt: { $gte: yStart, $lte: yEnd } };
        rangeTitle = "Yesterday's";
      } else if (range === '7days') {
        const p7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: p7 } };
        rangeTitle = 'Last 7 Days';
      } else if (range === '30days') {
        const p30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: p30 } };
        rangeTitle = 'Last 30 Days (Monthly)';
      }

      const totalRequests = await ApiLog.countDocuments(dateFilter);
      const successfulRequests = await ApiLog.countDocuments({
        ...dateFilter,
        status: { $regex: /success/i },
      });
      const failedRequests = await ApiLog.countDocuments({
        ...dateFilter,
        status: { $regex: /fail|error|invalid/i },
      });

      const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
      const activeKeys = await ApiKey.countDocuments({ role: { $ne: 'admin' }, status: 'active' });

      const successRate = totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : '100.0';

      const reportMessage = `📊 *Platform Analytics Summary Report*
━━━━━━━━━━━━━━━━━━━━
📅 *Period:* ${rangeTitle} Report
👥 *Active Clients:* ${totalUsers} Users (${activeKeys} Active Keys)

⚡ *Total Executions:* ${totalRequests.toLocaleString()}
✅ *Success Requests:* ${successfulRequests.toLocaleString()} (${successRate}%)
❌ *Failed / Skipped:* ${failedRequests.toLocaleString()}
🕒 *Generated At:* ${now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })} (BDT)

_Automated Dispatch from Apex Platform Analytics_`;

      const sent = await sendTelegramAdminAlert(reportMessage);
      return NextResponse.json({
        success: true,
        sent,
        message: sent
          ? 'Analytics summary report sent to Telegram successfully!'
          : 'Report created (Check Telegram bot configuration in settings).',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Error processing report' }, { status: 500 });
  }
}
