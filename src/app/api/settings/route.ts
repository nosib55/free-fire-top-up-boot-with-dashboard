import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import SystemSetting from '@/models/SystemSetting';

export async function GET() {
  await dbConnect();
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const {
      siteName,
      description,
      logoUrl,
      upstreamServerUrl,
      upstreamApiKey,
      telegramAlertChatId,
      telegramBotToken,
      telegramAdminChatId,
      telegramBotEnabled,
      telegramAutoAlerts,
      telegramWelcomeMessage,
    } = body;

    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting({});
    }

    if (siteName) settings.siteName = siteName;
    if (description !== undefined) settings.description = description;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (upstreamServerUrl) settings.upstreamServerUrl = upstreamServerUrl;
    if (upstreamApiKey) settings.upstreamApiKey = upstreamApiKey;
    if (telegramAlertChatId !== undefined) settings.telegramAlertChatId = telegramAlertChatId;
    if (telegramBotToken !== undefined) settings.telegramBotToken = telegramBotToken.trim();
    if (telegramAdminChatId !== undefined) settings.telegramAdminChatId = telegramAdminChatId.trim();
    if (telegramBotEnabled !== undefined) settings.telegramBotEnabled = Boolean(telegramBotEnabled);
    if (telegramAutoAlerts !== undefined) settings.telegramAutoAlerts = Boolean(telegramAutoAlerts);
    if (telegramWelcomeMessage !== undefined) settings.telegramWelcomeMessage = telegramWelcomeMessage;

    await settings.save();

    return NextResponse.json({ success: true, message: 'Settings updated successfully', settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
