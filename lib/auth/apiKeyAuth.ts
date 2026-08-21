import dbConnect from '../../utils/db';
import ApiKey, { IApiKey } from '../../models/ApiKey';
import Transaction from '../../models/Transaction';
import crypto from 'crypto';

function random6(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export function generateAdminKey(username: string): string {
  const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `ADMIN_${cleanUsername}_${random6()}`;
}

export function generateResellerKey(resellerTag: string, clientName: string): string {
  const cleanTag = resellerTag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanClient = clientName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${cleanTag}_${cleanClient}_${random6()}`;
}

export function generateClientKey(username: string): string {
  const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `DEV_${cleanUsername}_${random6()}`;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  statusCode?: number;
  apiKeyDoc?: IApiKey;
}

// In-memory sliding window for RPS rate limiting (fallback / fast check)
const rpsTracker = new Map<string, number[]>();

export async function validateApiKey(keyString: string, clientIp?: string): Promise<ValidationResult> {
  if (!keyString) {
    return { valid: false, message: 'API key is required in X-API-Key header or query parameter.', statusCode: 401 };
  }

  await dbConnect();
  let apiKeyDoc = await ApiKey.findOne({ key: keyString });

  if (!apiKeyDoc && (keyString === 'DEV_DEMO_9X8Y7Z' || keyString.startsWith('DEV_DEMO_'))) {
    // Auto-seed developer sandbox key for friction-free testing
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);
    try {
      apiKeyDoc = await ApiKey.create({
        key: keyString,
        name: 'Developer Sandbox Key',
        role: 'client',
        totalHits: 1000,
        remainingHits: 1000,
        usedHits: 0,
        rateLimitRPS: 10,
        expiresAt,
        status: 'active',
      });
    } catch {
      apiKeyDoc = await ApiKey.findOne({ key: keyString });
    }
  }

  if (!apiKeyDoc) {
    return { valid: false, message: 'Invalid API Key provided. Please create or copy a valid key from Admin/Reseller dashboard.', statusCode: 401 };
  }

  if (apiKeyDoc.status !== 'active') {
    return { valid: false, message: `API Key is currently ${apiKeyDoc.status}.`, statusCode: 403 };
  }

  if (new Date() > new Date(apiKeyDoc.expiresAt)) {
    apiKeyDoc.status = 'expired';
    await apiKeyDoc.save();
    return { valid: false, message: 'API Key has expired. Please recharge quota.', statusCode: 403 };
  }

  if ((apiKeyDoc.remainingHits ?? 0) <= 0) {
    return { valid: false, message: 'Quota pool exhausted (0 hits remaining). Please top up your API plan.', statusCode: 429 };
  }

  // Optional IP whitelist validation
  if (apiKeyDoc.allowedIPs && apiKeyDoc.allowedIPs.length > 0 && clientIp) {
    const isAllowed = apiKeyDoc.allowedIPs.includes(clientIp) || apiKeyDoc.allowedIPs.includes('*');
    if (!isAllowed) {
      return { valid: false, message: `IP Address ${clientIp} is not whitelisted for this API key.`, statusCode: 403 };
    }
  }

  // Rate Limiting (RPS check)
  const now = Date.now();
  const timestamps = rpsTracker.get(keyString) || [];
  const validTimestamps = timestamps.filter(t => now - t < 1000);

  if (validTimestamps.length >= (apiKeyDoc.rateLimitRPS || 5)) {
    return { valid: false, message: `Rate limit exceeded. Maximum ${apiKeyDoc.rateLimitRPS || 5} requests per second allowed.`, statusCode: 429 };
  }

  validTimestamps.push(now);
  rpsTracker.set(keyString, validTimestamps);

  return { valid: true, apiKeyDoc };
}

export async function deductQuotaOnSuccess(apiKeyId: string): Promise<void> {
  await dbConnect();
  await ApiKey.findByIdAndUpdate(apiKeyId, {
    $inc: { remainingHits: -1, usedHits: 1 },
    $set: { consecutiveInvalidVouchers: 0 },
  });
}

export async function handleAbuseDefense(apiKeyDoc: IApiKey): Promise<{ penaltyDeducted: boolean }> {
  await dbConnect();
  const now = new Date();
  const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);

  let consecutive = apiKeyDoc.consecutiveInvalidVouchers || 0;
  const lastInvalid = apiKeyDoc.lastInvalidVoucherAt;

  // Reset counter if last invalid voucher was more than 5 mins ago
  if (!lastInvalid || new Date(lastInvalid) < fiveMinsAgo) {
    consecutive = 1;
  } else {
    consecutive += 1;
  }

  let penaltyDeducted = false;

  if (consecutive >= 3) {
    // 3 consecutive invalid vouchers within 5 minutes -> deduct 1 hit penalty
    if ((apiKeyDoc.remainingHits ?? 0) > 0) {
      apiKeyDoc.remainingHits = (apiKeyDoc.remainingHits ?? 0) - 1;
      apiKeyDoc.usedHits = (apiKeyDoc.usedHits ?? 0) + 1;
      penaltyDeducted = true;

      // Log transaction penalty
      await Transaction.create({
        txId: `PENALTY_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        userId: apiKeyDoc.ownerId,
        type: 'ABUSE_PENALTY',
        amount: 0,
        hits: 1,
        status: 'COMPLETED',
        proof: 'Deducted 1 hit penalty for 3 consecutive invalid voucher submissions in 5 minutes.',
      });
    }
    consecutive = 0;
  }

  apiKeyDoc.consecutiveInvalidVouchers = consecutive;
  apiKeyDoc.lastInvalidVoucherAt = now;
  await apiKeyDoc.save();

  return { penaltyDeducted };
}
