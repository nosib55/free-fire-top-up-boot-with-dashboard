import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import SystemSetting, { IPackageRate } from '@/models/SystemSetting';

const DEFAULT_PACKAGE_RATES: IPackageRate[] = [
  { packageId: '25_DIAMONDS', name: '25 Diamonds', priceBdt: 20, diamonds: 25, category: 'DIAMOND', isActive: true },
  { packageId: '50_DIAMONDS', name: '50 Diamonds', priceBdt: 40, diamonds: 50, category: 'DIAMOND', isActive: true },
  { packageId: '100_DIAMONDS', name: '100 / 115 Diamonds', priceBdt: 80, diamonds: 100, category: 'DIAMOND', isActive: true },
  { packageId: '240_DIAMONDS', name: '240 / 310 Diamonds', priceBdt: 200, diamonds: 310, category: 'DIAMOND', isActive: true },
  { packageId: '520_DIAMONDS', name: '520 / 610 Diamonds', priceBdt: 400, diamonds: 520, category: 'DIAMOND', isActive: true },
  { packageId: '1240_DIAMONDS', name: '1240 Diamonds', priceBdt: 800, diamonds: 1240, category: 'DIAMOND', isActive: true },
  { packageId: '2530_DIAMONDS', name: '2530 Diamonds', priceBdt: 1600, diamonds: 2530, category: 'DIAMOND', isActive: true },
  { packageId: 'WEEKLY_LITE', name: 'Weekly Lite Membership', priceBdt: 40, diamonds: 0, category: 'MEMBERSHIP', isActive: true },
  { packageId: 'WEEKLY_MEMBERSHIP', name: 'Weekly Membership', priceBdt: 160, diamonds: 0, category: 'MEMBERSHIP', isActive: true },
  { packageId: 'MONTHLY_MEMBERSHIP', name: 'Monthly Membership', priceBdt: 800, diamonds: 0, category: 'MEMBERSHIP', isActive: true },
  { packageId: 'LEVEL_UP_PASS', name: 'Level Up Pass', priceBdt: 160, diamonds: 0, category: 'SPECIAL', isActive: true },
];

export async function GET() {
  await dbConnect();
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({
        siteName: 'AMS Topup',
        packageRates: DEFAULT_PACKAGE_RATES,
      });
    }

    if (!settings.packageRates || settings.packageRates.length === 0) {
      settings.packageRates = DEFAULT_PACKAGE_RATES;
      await settings.save();
    }

    return NextResponse.json({
      success: true,
      packageRates: settings.packageRates,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { packageRates } = body;

    if (!Array.isArray(packageRates)) {
      return NextResponse.json({ success: false, message: 'Invalid format. packageRates must be an array.' }, { status: 400 });
    }

    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({
        siteName: 'AMS Topup',
        packageRates,
      });
    } else {
      settings.packageRates = packageRates;
      await settings.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Package pricing updated successfully',
      packageRates: settings.packageRates,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
