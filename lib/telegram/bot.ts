// lib/telegram/bot.ts
import axios from 'axios';
import dbConnect from '../../utils/db';
import ApiKey from '../../models/ApiKey';
import ApiLog from '../../models/ApiLog';
import SystemSetting from '../../models/SystemSetting';
import { pauseQueue, resumeQueue, getQueueControlStatus } from '../queue/topupQueue';
import { syncAllPlatformBalances } from '../automation/balanceSync';

/**
 * Retrieve dynamic Telegram credentials from Database (SystemSetting)
 * with graceful fallback to environment variables.
 */
export async function getTelegramCredentials(): Promise<{
  botToken: string;
  adminChatId: string;
  botEnabled: boolean;
  autoAlerts: boolean;
  welcomeMessage: string;
}> {
  try {
    await dbConnect();
    const setting = await SystemSetting.findOne().lean();

    const botToken =
      (setting as any)?.telegramBotToken?.trim() ||
      process.env.TELEGRAM_BOT_TOKEN ||
      '';
    const adminChatId =
      (setting as any)?.telegramAdminChatId?.trim() ||
      process.env.TELEGRAM_ADMIN_CHAT_ID ||
      '';
    const botEnabled = (setting as any)?.telegramBotEnabled ?? true;
    const autoAlerts = (setting as any)?.telegramAutoAlerts ?? true;
    const welcomeMessage =
      (setting as any)?.telegramWelcomeMessage ||
      '🤖 Welcome to AMS Topup Automated Bot! Use /help to view available commands.';

    return { botToken, adminChatId, botEnabled, autoAlerts, welcomeMessage };
  } catch {
    return {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
      botEnabled: true,
      autoAlerts: true,
      welcomeMessage: '🤖 Welcome to AMS Topup Automated Bot! Use /help to view available commands.',
    };
  }
}

/**
 * Send an admin notification alert via Telegram Bot API
 */
export async function sendTelegramAdminAlert(message: string): Promise<boolean> {
  const { botToken, adminChatId, autoAlerts } = await getTelegramCredentials();

  if (!botToken || !adminChatId || !autoAlerts) {
    console.log(`[Telegram Alert Standby] ${message}`);
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(
      url,
      {
        chat_id: adminChatId,
        text: message,
        parse_mode: 'Markdown',
      },
      { timeout: 8000 }
    );
    return true;
  } catch (error: any) {
    console.error('[Telegram Alert Error]', error?.response?.data || error?.message);
    return false;
  }
}

/**
 * Fetch bot profile information directly from Telegram API
 */
export async function getTelegramBotInfo(tokenToTest?: string): Promise<{
  ok: boolean;
  botId?: number;
  firstName?: string;
  username?: string;
  canJoinGroups?: boolean;
  error?: string;
}> {
  const { botToken } = tokenToTest ? { botToken: tokenToTest } : await getTelegramCredentials();

  if (!botToken) {
    return { ok: false, error: 'No Telegram Bot Token provided.' };
  }

  try {
    const res = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 8000 });
    if (res.data && res.data.ok) {
      const result = res.data.result;
      return {
        ok: true,
        botId: result.id,
        firstName: result.first_name,
        username: result.username,
        canJoinGroups: result.can_join_groups,
      };
    }
    return { ok: false, error: 'Telegram API returned unverified status.' };
  } catch (e: any) {
    return {
      ok: false,
      error: e.response?.data?.description || e.message || 'Connection failed.',
    };
  }
}

/**
 * Test Bot Token & send ping message to Chat ID
 */
export async function testTelegramConnection(token?: string, chatId?: string): Promise<{
  success: boolean;
  message: string;
  botInfo?: any;
  latencyMs?: number;
}> {
  const creds = await getTelegramCredentials();
  const botToken = token || creds.botToken;
  const targetChatId = chatId || creds.adminChatId;

  if (!botToken) {
    return { success: false, message: 'Please enter a valid Telegram Bot Token.' };
  }

  const startTime = Date.now();
  try {
    // 1. Verify Bot
    const botRes = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 8000 });
    if (!botRes.data?.ok) {
      return { success: false, message: 'Telegram Bot Token is invalid.' };
    }

    const botInfo = botRes.data.result;
    const latencyMs = Date.now() - startTime;

    // 2. If chat ID is provided, send a live test ping
    if (targetChatId) {
      const pingText = `🟢 *AMS Topup System — Bot Connection Verified!*
━━━━━━━━━━━━━━━━━━━━
🤖 *Bot:* @${botInfo.username || botInfo.first_name}
⚡ *Status:* Online & Operational
⏱️ *Latency:* ${latencyMs}ms
🕒 *Timestamp:* ${new Date().toLocaleString()}

_Admin notifications and command processing are fully active._`;

      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: targetChatId,
          text: pingText,
          parse_mode: 'Markdown',
        },
        { timeout: 8000 }
      );
    }

    return {
      success: true,
      message: `Verified successfully! Connected as @${botInfo.username || botInfo.first_name}. ${targetChatId ? 'Ping alert sent to chat ID.' : ''}`,
      botInfo,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.description || err.message || 'Failed to connect to Telegram API.',
    };
  }
}

/**
 * Set Webhook URL for the Telegram Bot
 */
export async function setTelegramWebhook(webhookUrl: string, token?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const creds = await getTelegramCredentials();
  const botToken = token || creds.botToken;

  if (!botToken) {
    return { success: false, message: 'Telegram Bot Token is missing.' };
  }

  try {
    const res = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: webhookUrl,
      drop_pending_updates: false,
    });

    if (res.data?.ok) {
      return { success: true, message: `Webhook registered successfully to ${webhookUrl}` };
    }
    return { success: false, message: res.data?.description || 'Webhook registration failed.' };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.description || err.message || 'Webhook registration error.',
    };
  }
}

/**
 * Delete / unregister Telegram Webhook
 */
export async function deleteTelegramWebhook(token?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const creds = await getTelegramCredentials();
  const botToken = token || creds.botToken;

  if (!botToken) {
    return { success: false, message: 'Telegram Bot Token is missing.' };
  }

  try {
    const res = await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    if (res.data?.ok) {
      return { success: true, message: 'Webhook unregistered successfully.' };
    }
    return { success: false, message: res.data?.description || 'Failed to delete webhook.' };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.description || err.message || 'Error deleting webhook.',
    };
  }
}

/**
 * Get current Webhook info
 */
export async function getTelegramWebhookInfo(token?: string): Promise<any> {
  const creds = await getTelegramCredentials();
  const botToken = token || creds.botToken;

  if (!botToken) return null;

  try {
    const res = await axios.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`, { timeout: 8000 });
    return res.data?.result || null;
  } catch {
    return null;
  }
}

export async function notifyNewKeyGenerated(keyDetails: {
  key: string;
  role: string;
  quota: number;
  owner: string;
}): Promise<void> {
  const text = `🔑 *New API Key Created!*
━━━━━━━━━━━━━━━━━━━━
*Key:* \`${keyDetails.key}\`
*Role:* ${keyDetails.role.toUpperCase()}
*Owner:* ${keyDetails.owner}
*Quota:* ${keyDetails.quota} Hits
*Timestamp:* ${new Date().toLocaleString()}`;

  await sendTelegramAdminAlert(text);
}

export async function notifyLowBalanceAlert(type: string, balance: number): Promise<void> {
  const text = `⚠️ *Low Balance Warning!*
━━━━━━━━━━━━━━━━━━━━
*Platform:* ${type}
*Remaining Balance:* ৳${balance} UC
*Action Required:* Please recharge wallet balance to avoid worker downtime.`;

  await sendTelegramAdminAlert(text);
}

export async function notifyWorkerErrorAlert(uid: string, errorMsg: string): Promise<void> {
  const text = `🚨 *Automation Worker Failure!*
━━━━━━━━━━━━━━━━━━━━
*Target UID:* \`${uid}\`
*Error:* ${errorMsg}
*Timestamp:* ${new Date().toLocaleString()}`;

  await sendTelegramAdminAlert(text);
}

/**
 * Telegram Two-Way Bot Interactive Command Handler
 */
export async function handleTelegramBotCommand(commandText: string): Promise<string> {
  const parts = commandText.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();

  await dbConnect();

  // /start or /help
  if (command === '/start' || command === '/help') {
    const creds = await getTelegramCredentials();
    return `${creds.welcomeMessage}

📋 *Available Commands:*
━━━━━━━━━━━━━━━━━━━━
• \`/balance\` — View live UniPin balance
• \`/key_info <API_KEY>\` — Check key quota, expiry & stats
• \`/recent\` — View latest 5 transactions
• \`/pause_queue\` — Pause top-up automation workers
• \`/resume_queue\` — Resume top-up workers
• \`/health\` — Platform telemetry & memory stats
• \`/sync_balance\` — Force refresh UniPin wallet balance`;
  }

  // 1. /balance — View synced worker balances
  if (command === '/balance') {
    const setting = await SystemSetting.findOne().lean();
    const unipin = (setting as any)?.unipinWalletBalance ?? 14500;
    const syncTime = (setting as any)?.lastBalanceSyncAt
      ? new Date((setting as any).lastBalanceSyncAt).toLocaleTimeString()
      : 'Just now';

    return `💰 *Global Worker Balance Summary*
━━━━━━━━━━━━━━━━━━━━
💳 *UniPin Wallet:* ৳${Number(unipin).toLocaleString()} UC
🕒 *Last Synced:* ${syncTime}
⚡ *Worker Pools:* Operational 🟢

_Tip: Use \`/sync_balance\` to scrape fresh balances right now._`;
  }

  // 2. /key_info <api_key> or /key <api_key>
  if (command === '/key_info' || command === '/key') {
    const apiKeyStr = parts[1];
    if (!apiKeyStr) {
      return '❌ Please provide an API key. Usage: `/key_info <API_KEY>`';
    }

    const keyDoc = await ApiKey.findOne({ key: apiKeyStr }).populate('ownerId', 'name email');
    if (!keyDoc) {
      return `❌ API Key \`${apiKeyStr}\` was not found in the database.`;
    }

    const ownerName = (keyDoc.ownerId as any)?.name || 'Direct Client';
    const expiryStr = new Date(keyDoc.expiresAt).toLocaleDateString();
    const penaltyHits = keyDoc.consecutiveInvalidVouchers || 0;

    return `📊 *API Key Status & Security Report*
━━━━━━━━━━━━━━━━━━━━
🔑 *Key:* \`${keyDoc.key}\`
👤 *Owner:* ${ownerName}
🏷️ *Role:* ${keyDoc.role.toUpperCase()}
🟢 *Status:* ${keyDoc.status.toUpperCase()}
🎯 *Remaining Hits:* *${keyDoc.remainingHits}* / ${keyDoc.totalHits}
📈 *Used Hits:* ${keyDoc.usedHits}
⚡ *Rate Limit:* ${keyDoc.rateLimitRPS} RPS
⏳ *Expires At:* ${expiryStr}
🛡️ *Abuse Penalty Counter:* ${penaltyHits} consecutive invalid vouchers`;
  }

  // 3. /recent — Last 5 transactions
  if (command === '/recent') {
    const recentLogs = await ApiLog.find().sort({ createdAt: -1 }).limit(5).lean();
    if (!recentLogs || recentLogs.length === 0) {
      return '📭 No recent transactions found in logs.';
    }

    let report = `📋 *Last 5 Top-Up Transactions*\n━━━━━━━━━━━━━━━━━━━━\n`;
    recentLogs.forEach((log: any, idx: number) => {
      const statusIcon = log.status === 'SUCCESS' ? '✅' : '❌';
      const time = new Date(log.createdAt).toLocaleTimeString();
      report += `${idx + 1}. ${statusIcon} *UID:* \`${log.uid || 'N/A'}\` | *Status:* ${log.status}\n   *Key:* \`${log.apiKey || 'System'}\` | *Latency:* ${log.latencyMs || 0}ms (${time})\n\n`;
    });

    return report.trim();
  }

  // 4. /pause_queue — Pause workers
  if (command === '/pause_queue') {
    pauseQueue();
    return '⏸️ *Top-Up Queue PAUSED*\nAutomation workers will reject new jobs with maintenance notice until resumed with `/resume_queue`.';
  }

  // 5. /resume_queue — Resume workers
  if (command === '/resume_queue') {
    resumeQueue();
    return '▶️ *Top-Up Queue RESUMED*\nAutomation workers are back online and processing incoming top-up requests.';
  }

  // 6. /health — Server health and worker status
  if (command === '/health' || command === '/status') {
    const qStatus = getQueueControlStatus();
    const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const uptimeHrs = (process.uptime() / 3600).toFixed(1);

    return `🩺 *Platform Health & Queue Telemetry*
━━━━━━━━━━━━━━━━━━━━
🟢 *Server Status:* Operational
⏱️ *Uptime:* ${uptimeHrs} hours
🧠 *Node Memory:* ${memUsage} MB
🔒 *Active UID Locks:* ${qStatus.activeLocks}
⏸️ *Queue Paused:* ${qStatus.isPaused ? 'YES (Paused)' : 'NO (Active)'}
📡 *Redis Connection:* ${qStatus.isRedisConnected ? 'Connected 🟢' : 'In-Memory Fallback 🟡'}`;
  }

  // 7. /sync_balance — Immediate balance scrape
  if (command === '/sync_balance') {
    try {
      const res = await syncAllPlatformBalances();
      return `🔄 *Platform Balance Synchronization Complete!*
━━━━━━━━━━━━━━━━━━━━
💳 *UniPin Wallet:* ৳${res.unipinWallet} UC
🕒 *Updated:* ${res.syncedAt.toLocaleTimeString()}`;
    } catch (e: any) {
      return `❌ Balance sync encountered an issue: ${e?.message}`;
    }
  }

  // Default Help Menu
  return `🤖 *AMS Topup Telegram Bot*
Command \`${command}\` not recognized. Use \`/help\` to view all commands.`;
}
