import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Garena Shells pipeline has been decommissioned. Only UniPin top-up is supported.',
    accounts: [],
    totalShells: 0,
  });
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'Garena Shells pipeline has been decommissioned. Only UniPin top-up is supported.',
    },
    { status: 410 }
  );
}
