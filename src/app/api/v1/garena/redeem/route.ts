import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import { validateApiKey } from '@/lib/auth/apiKeyAuth';
import { redeemBulkGarenaShellCards } from '@/lib/automation/garenaShells';

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  let apiKeyStr = request.headers.get('x-api-key') || '';
  if (!apiKeyStr) {
    const url = new URL(request.url);
    apiKeyStr = url.searchParams.get('apiKey') || '';
  }

  const auth = await validateApiKey(apiKeyStr, clientIp);
  if (!auth.valid || !auth.apiKeyDoc) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.statusCode || 401 });
  }

  await dbConnect();
  try {
    const userId = auth.apiKeyDoc.ownerId;
    const body = await request.json();
    const { cards, pins, pin, card, accountId } = body;

    // Normalise cards array
    let cardList: string[] = [];
    if (Array.isArray(cards)) {
      cardList = cards;
    } else if (Array.isArray(pins)) {
      cardList = pins;
    } else if (typeof pin === 'string') {
      cardList = pin.split(/[\s,]+/);
    } else if (typeof card === 'string') {
      cardList = card.split(/[\s,]+/);
    }

    cardList = cardList.map((c) => c.trim()).filter((c) => c.length > 0);

    if (cardList.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Missing required field: card pin(s) are required under `pins` or `pin`.',
      }, { status: 400 });
    }

    if (cardList.length > 20) {
      return NextResponse.json({
        success: false,
        message: 'Maximum 20 prepaid cards can be redeemed in a single batch.',
      }, { status: 400 });
    }

    console.log(`[Garena Shell Redeem API] Processing ${cardList.length} prepaid cards for Reseller ${userId}...`);

    const result = await redeemBulkGarenaShellCards(cardList, userId?.toString(), accountId);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Successfully processed ${cardList.length} card(s). Loaded: ${result.totalLoaded} card(s).`
        : 'Failed to redeem prepaid cards. Check failedCards for details.',
      totalLoaded: result.totalLoaded,
      totalCards: cardList.length,
      currentShellsBalance: result.currentShellsBalance,
      successfulCards: result.successfulCards,
      failedCards: result.failedCards,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
