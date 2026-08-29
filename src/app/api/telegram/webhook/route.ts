import { NextResponse } from 'next/server';
import { handleTelegramBotCommand, getTelegramCredentials } from '@/lib/telegram/bot';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body?.message;

    if (message && message.text) {
      const { botToken, botEnabled } = await getTelegramCredentials();

      if (!botEnabled) {
        return NextResponse.json({ ok: true, message: 'Bot currently disabled in settings.' });
      }

      const replyText = await handleTelegramBotCommand(message.text);
      const chatId = message.chat.id;

      // If Bot Token is configured, dispatch directly via Telegram Bot API
      if (botToken) {
        try {
          await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
          });
        } catch (e: any) {
          console.error('[Telegram Webhook Post Error]', e?.message);
        }
      }

      // Also return webhook payload format
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: replyText,
        parse_mode: 'Markdown',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
