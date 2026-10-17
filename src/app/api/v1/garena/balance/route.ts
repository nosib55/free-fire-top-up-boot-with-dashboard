import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'Garena Shells pipeline has been permanently decommissioned. Only UniPin top-up (UNIPIN_VOUCHER & UNIPIN_WALLET) is supported.',
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'Garena Shells pipeline has been permanently decommissioned. Only UniPin top-up (UNIPIN_VOUCHER & UNIPIN_WALLET) is supported.',
    },
    { status: 410 }
  );
}
