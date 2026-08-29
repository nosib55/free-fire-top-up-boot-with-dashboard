import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import SystemSetting from '@/models/SystemSetting';
import {
  getTelegramCredentials,
  getTelegramBotInfo,
  testTelegramConnection,
  setTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramWebhookInfo,
  sendTelegramAdminAlert,
} from '@/lib/telegram/bot';

export async function GET() {
  await dbConnect();
  try {
    const creds = await getTelegramCredentials();
    const setting = await SystemSetting.findOne().lean();

    let botInfo: any = null;
    let webhookInfo: any = null;

    if (creds.botToken) {
      const infoRes = await getTelegramBotInfo(creds.botToken);
      if (infoRes.ok) {
        botInfo = infoRes;
      }
      webhookInfo = await getTelegramWebhookInfo(creds.botToken);
    }

    return NextResponse.json({
      success: true,
      telegram: {
        botToken: creds.botToken,
        adminChatId: creds.adminChatId,
        botUsername: (setting as any)?.telegramBotUsername || botInfo?.username || '',
        botEnabled: creds.botEnabled,
        autoAlerts: creds.autoAlerts,
        welcomeMessage: creds.welcomeMessage,
      },
      botInfo,
      webhookInfo,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { action = 'save' } = body;

    // 1. Test Connection
    if (action === 'test') {
      const { botToken, adminChatId } = body;
      const result = await testTelegramConnection(botToken, adminChatId);
      return NextResponse.json(result);
    }

    // 2. Set Webhook
    if (action === 'set_webhook') {
      const { webhookUrl, botToken } = body;
      if (!webhookUrl) {
        return NextResponse.json({ success: false, message: 'Webhook URL is required.' }, { status: 400 });
      }
      const result = await setTelegramWebhook(webhookUrl, botToken);
      return NextResponse.json(result);
    }

    // 3. Delete Webhook
    if (action === 'delete_webhook') {
      const { botToken } = body;
      const result = await deleteTelegramWebhook(botToken);
      return NextResponse.json(result);
    }

    // 4. Send Test Admin Alert
    if (action === 'send_test_alert') {
      const { customMessage } = body;
      const message =
        customMessage ||
        `🔔 *Test Notification from Apex Admin Dashboard*
━━━━━━━━━━━━━━━━━━━━
✅ Telegram bot alert dispatch verified.
🕒 Time: ${new Date().toLocaleString()}`;

      const sent = await sendTelegramAdminAlert(message);
      if (sent) {
        return NextResponse.json({ success: true, message: 'Test alert sent to Telegram Admin Chat!' });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Could not send test alert. Please verify Bot Token and Admin Chat ID.',
          },
          { status: 400 }
        );
      }
    }

    // 5. Default: Save Telegram Bot Settings
    const {
      botToken,
      adminChatId,
      botEnabled,
      autoAlerts,
      welcomeMessage,
    } = body;

    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = new SystemSetting({});
    }

    if (botToken !== undefined) setting.telegramBotToken = botToken.trim();
    if (adminChatId !== undefined) setting.telegramAdminChatId = adminChatId.trim();
    if (botEnabled !== undefined) setting.telegramBotEnabled = Boolean(botEnabled);
    if (autoAlerts !== undefined) setting.telegramAutoAlerts = Boolean(autoAlerts);
    if (welcomeMessage !== undefined) setting.telegramWelcomeMessage = welcomeMessage;

    // Verify token to fetch and save bot username
    if (botToken && botToken.trim()) {
      try {
        const botInfo = await getTelegramBotInfo(botToken.trim());
        if (botInfo.ok && botInfo.username) {
          setting.telegramBotUsername = botInfo.username;
        }
      } catch {
        // Continue
      }
    }

    await setting.save();

    return NextResponse.json({
      success: true,
      message: 'Telegram Bot settings saved successfully in database.',
      telegram: {
        botToken: setting.telegramBotToken,
        adminChatId: setting.telegramAdminChatId,
        botUsername: setting.telegramBotUsername,
        botEnabled: setting.telegramBotEnabled,
        autoAlerts: setting.telegramAutoAlerts,
        welcomeMessage: setting.telegramWelcomeMessage,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
