import { NextResponse } from 'next/server';
import { handleTelegramBotCommand } from '@/lib/telegram/bot';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body?.message;

    if (message && message.text) {
      const replyText = await handleTelegramBotCommand(message.text);
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: message.chat.id,
        text: replyText,
        parse_mode: 'Markdown',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
