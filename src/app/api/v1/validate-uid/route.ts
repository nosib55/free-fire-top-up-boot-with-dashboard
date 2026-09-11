import { NextResponse } from 'next/server';
import { getRealPlayerName } from '@/lib/automation/playerLookup';

async function handleUidValidation(uid: string) {
  const cleanUid = uid.toString().trim().replace(/[^0-9]/g, '');

  if (!cleanUid || cleanUid.length < 8 || cleanUid.length > 12) {
    return NextResponse.json(
      {
        success: false,
        valid: false,
        message: `Player UID '${cleanUid}' is invalid. Free Fire UIDs must consist of 8 to 12 digits.`,
      },
      { status: 400 }
    );
  }

  const result = await getRealPlayerName(cleanUid);

  if (!result.success && result.message?.includes('does not exist')) {
    return NextResponse.json(
      {
        success: false,
        valid: false,
        message: result.message,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    valid: true,
    data: {
      uid: cleanUid,
      playerName: result.playerName || `Free Fire Player (${cleanUid})`,
      region: result.region || 'BD',
      openId: result.openId || undefined,
      status: 'ACTIVE_PLAYER',
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const uid = url.searchParams.get('uid') || '';

  if (!uid) {
    return NextResponse.json({ success: false, message: 'Player UID parameter is required (?uid=...).' }, { status: 400 });
  }

  return handleUidValidation(uid);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const uid = body.uid || '';

    if (!uid) {
      return NextResponse.json({ success: false, message: 'Player UID is required.' }, { status: 400 });
    }

    return handleUidValidation(uid);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'UID validation failed' }, { status: 500 });
  }
}
