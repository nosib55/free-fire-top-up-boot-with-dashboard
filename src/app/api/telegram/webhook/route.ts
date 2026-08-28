import { NextResponse } from 'next/server';
import { handleTelegramBotCommand } from '@/lib/telegram/bot';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body?.message;

    if (message && message.text) {
      const replyText = await handleTelegramBotCommand(message.text);
      const chatId = message.chat.id;

      // If Bot Token is configured, dispatch directly via Telegram Bot API
      if (TELEGRAM_BOT_TOKEN) {
        try {
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
