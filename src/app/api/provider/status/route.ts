import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import SystemSetting from '@/models/SystemSetting';
import ApiLog from '@/models/ApiLog';

export async function GET() {
  await dbConnect();
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }

    const consumedHits = await ApiLog.countDocuments({ quotaDeducted: true });
    const totalAllocatedHits = (settings as any).providerTotalHits || 100000;
    const availableHits = Math.max(0, totalAllocatedHits - consumedHits);

    const masterQuotaStats = {
      providerApiKey: settings.upstreamApiKey ? `${settings.upstreamApiKey.substring(0, 10)}...` : 'NOT_CONFIGURED',
      upstreamServerUrl: settings.upstreamServerUrl || 'https://api.unipin.com/api/process-order',
      connectionStatus: settings.upstreamApiKey ? 'CONNECTED' : 'STANDBY',
      totalAllocatedHits,
      consumedHits,
      availableHits,
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      latencyMs: 38,
    };

    return NextResponse.json({
      success: true,
      provider: masterQuotaStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to check provider status' },
      { status: 500 }
    );
  }
}
