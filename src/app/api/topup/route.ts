import { NextResponse } from 'next/server';
import { executeGarenaTopup } from '../../../../lib/automation/stealthTopup';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, serial, pin } = body;

    if (!uid || !serial || !pin) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 },
      );
    }

    // run the automation function to perform the top-up
    const result = await executeGarenaTopup({ uid, serial, pin });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Server error during automation',
      },
      { status: 500 },
    );
  }
}
