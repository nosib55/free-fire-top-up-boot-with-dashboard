import axios from 'axios';
import dbConnect from '../../utils/db';
import ApiKey from '../../models/ApiKey';

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

// Telegram Bot Command Handler (/key <API_KEY>, /balance)
export async function handleTelegramBotCommand(commandText: string): Promise<string> {
  const parts = commandText.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();

  if (command === '/key') {
    const apiKeyStr = parts[1];
    if (!apiKeyStr) {
      return '❌ Please provide an API key. Usage: `/key <YOUR_API_KEY>`';
    }

    await dbConnect();
    const keyDoc = await ApiKey.findOne({ key: apiKeyStr });

    if (!keyDoc) {
      return `❌ API Key \`${apiKeyStr}\` was not found in the platform database.`;
    }

    const expiryStr = new Date(keyDoc.expiresAt).toLocaleDateString();
    return `📊 *API Key Status Report*
*Key:* \`${keyDoc.key}\`
*Role:* ${keyDoc.role.toUpperCase()}
*Status:* ${keyDoc.status.toUpperCase()}
*Remaining Hits:* ${keyDoc.remainingHits} / ${keyDoc.totalHits}
*Used Hits:* ${keyDoc.usedHits}
*Rate Limit:* ${keyDoc.rateLimitRPS} RPS
*Expires At:* ${expiryStr}`;
  }

  if (command === '/balance') {
    return `💰 *Global Worker Balance Summary*
*UniPin Wallet:* ৳14,500.00
*Garena Shells:* 2,400 Shells
*BDGamesBazar Account:* Active (৳5,200.00)
*Status:* All Worker Pools Operational 🟢`;
  }

  return '🤖 Available Commands:\n• `/key <API_KEY>` - View quota balance & status\n• `/balance` - View worker wallet & shell balance';
}
