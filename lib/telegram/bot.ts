// lib/telegram/bot.ts
import axios from 'axios';
import dbConnect from '../../utils/db';
import ApiKey from '../../models/ApiKey';
import ApiLog from '../../models/ApiLog';
import SystemSetting from '../../models/SystemSetting';
import { pauseQueue, resumeQueue, getQueueControlStatus } from '../queue/topupQueue';
import { syncAllPlatformBalances } from '../automation/balanceSync';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

export async function sendTelegramAdminAlert(message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.log(`[Telegram Alert Mock] ${message}`);
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_ADMIN_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
    return true;
  } catch (error: any) {
    console.error('[Telegram Alert Error]', error?.message);
    return false;
  }
}

export async function notifyNewKeyGenerated(keyDetails: {
  key: string;
  role: string;
  quota: number;
  owner: string;
}): Promise<void> {
  const text = `🔑 *New API Key Created!*
*Key:* \`${keyDetails.key}\`
*Role:* ${keyDetails.role.toUpperCase()}
*Owner:* ${keyDetails.owner}
*Quota:* ${keyDetails.quota} Hits
*Timestamp:* ${new Date().toLocaleString()}`;

  await sendTelegramAdminAlert(text);
}

export async function notifyLowBalanceAlert(type: string, balance: number): Promise<void> {
  const text = `⚠️ *Low Balance Warning!*
*Type:* ${type}
*Remaining Balance:* ৳${balance} / Shells: ${balance}
*Action Required:* Please recharge wallet/shell balance to prevent API automation downtime.`;

  await sendTelegramAdminAlert(text);
}

export async function notifyWorkerErrorAlert(uid: string, errorMsg: string): Promise<void> {
  const text = `🚨 *Automation Worker Failure!*
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

  // 1. /balance — View synced worker balances
  if (command === '/balance') {
    const setting = await SystemSetting.findOne().lean();
    const unipin = (setting as any)?.unipinWalletBalance ?? 14500;
    const shells = (setting as any)?.garenaShellsBalance ?? 2400;
    const bdgames = (setting as any)?.bdgamesbazarBalance ?? 5200;
    const syncTime = (setting as any)?.lastBalanceSyncAt
      ? new Date((setting as any).lastBalanceSyncAt).toLocaleTimeString()
      : 'Just now';

    return `💰 *Global Worker Balance Summary*
━━━━━━━━━━━━━━━━━━━━
💳 *UniPin Wallet:* ৳${Number(unipin).toLocaleString()} UC
🐚 *Garena Shells:* ${Number(shells).toLocaleString()} Shells
🏪 *BDGamesBazar:* ৳${Number(bdgames).toLocaleString()} BDT
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
🐚 *Garena Shells:* ${res.garenaShells} Shells
🏪 *BDGamesBazar:* ৳${res.bdgamesbazar} BDT
🕒 *Updated:* ${res.syncedAt.toLocaleTimeString()}`;
    } catch (e: any) {
      return `❌ Balance sync encountered an issue: ${e?.message}`;
    }
  }

  // Default Help Menu
  return `🤖 *Apex Top-Up Telegram Bot Commands*
━━━━━━━━━━━━━━━━━━━━
• \`/balance\` — View live UniPin & Garena Shell balance
• \`/key_info <API_KEY>\` — Check key quota, expiry & security stats
• \`/recent\` — View latest 5 transaction statuses
• \`/pause_queue\` — Pause top-up automation workers
• \`/resume_queue\` — Resume top-up workers
• \`/health\` — Server telemetry & memory usage
• \`/sync_balance\` — Force refresh wallet & shell balances`;
}
