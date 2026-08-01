import { NextResponse, NextRequest } from 'next/server';
import dbConnect from './../../../../../utils/db';
import User from '../../../../../models/User';
import ApiLog from '../../../../../models/ApiLog';
import Voucher from '../../../../../models/Voucher';
import { runGarenaAutomation } from '../../../../../lib/automation/puppeteerScript';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // api key authentication
    const authHeader = req.headers.get('authorization');
    console.log('Received Auth Header:', authHeader); 

    const apiKey = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    console.log('Extracted API Key:', apiKey); 

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'API Key is missing' },
        { status: 401 },
      );
    }

    const user = await User.findOne({ apiKey });
    console.log('Found User from DB:', user);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid API Key' },
        { status: 403 },
      );
    }

    // take uid and amount from the request body
    const { uid, amount } = await req.json();
    if (!uid || !amount) {
      return NextResponse.json(
        { success: false, message: 'UID and Diamond Amount are required' },
        { status: 400 },
      );
    }

    // find an unused voucher for the requested amount
    const voucher = await Voucher.findOne({
      amount: Number(amount),
      isUsed: false,
    });

    if (!voucher) {
      return NextResponse.json(
        {
          success: false,
          message: 'Stock out! No vouchers available for this amount.',
        },
        { status: 404 },
      );
    }

    // run Garena automation by serial and pin
    const automationResult = await runGarenaAutomation(
      uid,
      voucher.serial,
      voucher.pin,
    );

    // after successful automation, mark the voucher as used and save the user ID who used it
    if (automationResult.success) {
      voucher.isUsed = true;
      voucher.usedBy = user._id;
      await voucher.save();
    }

    // save the API request and response in ApiLog collection
    await ApiLog.create({
      userId: user._id,
      endpoint: '/api/v1/topup',
      requestData: { uid, amount },
      responseData: automationResult,
      status: automationResult.success ? 'SUCCESS' : 'FAILED',
    });

    return NextResponse.json({
      success: automationResult.success,
      data: automationResult,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}
