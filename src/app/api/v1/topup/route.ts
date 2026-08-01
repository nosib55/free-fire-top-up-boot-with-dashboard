import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/utils/db';
import User from '@/models/User';
import ApiLog from '@/models/ApiLog';
import { runGarenaAutomation } from '@/lib/automation/puppeteerScript'; // আমদানিকৃত অটোমেশন ফাংশন

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'API Key is missing' },
        { status: 401 },
      );
    }

    const user = await User.findOne({ apiKey });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid API Key' },
        { status: 403 },
      );
    }

    const { uid, voucherCode } = await req.json();
    if (!uid || !voucherCode) {
      return NextResponse.json(
        { success: false, message: 'UID and Voucher Code required' },
        { status: 400 },
      );
    }

    // সরাসরি আপনার lib-এর Puppeteer স্ক্রিপ্ট কল করা হলো
    const automationResult = await runGarenaAutomation(uid, voucherCode);

    // ডেটাবেসে লগ সেভ করা
    await ApiLog.create({
      userId: user._id,
      endpoint: '/api/v1/topup',
      requestData: { uid, voucherCode },
      responseData: automationResult,
      status: automationResult.success ? 'SUCCESS' : 'FAILED',
    });

    return NextResponse.json({
      success: automationResult.success,
      data: automationResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
