import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/apiKeyAuth';
import { getRealPlayerName } from '@/lib/automation/playerLookup';

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  let apiKeyStr = request.headers.get('x-api-key') || '';
  if (!apiKeyStr) {
    const url = new URL(request.url);
    apiKeyStr = url.searchParams.get('apiKey') || '';
  }

  const auth = await validateApiKey(apiKeyStr, clientIp);
  if (!auth.valid || !auth.apiKeyDoc) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ success: false, message: 'Player UID is required.' }, { status: 400 });
    }

    const cleanUid = uid.toString().trim();

    // Fast numerical validation against Free Fire UID format (8 to 12 digits)
    const isNumeric = /^\d{8,12}$/.test(cleanUid);
    if (!isNumeric) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          message: `Player UID '${cleanUid}' is invalid. Free Fire UIDs must consist of 8 to 12 digits.`,
        },
        { status: 400 }
      );
    }

    // Query Garena Live Server using Stealth Automation Engine
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
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'UID validation failed' }, { status: 500 });
  }
}
