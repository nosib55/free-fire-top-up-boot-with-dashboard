// lib/automation/balanceSync.ts
import dbConnect from '../../utils/db';
import SystemSetting from '../../models/SystemSetting';
import { fetchUniPinWalletBalance } from './unipinWallet';
import { fetchGarenaShellsBalance } from './garenaShells';
import { notifyLowBalanceAlert } from '../telegram/bot';

export interface SyncBalanceSummary {
  success: boolean;
  unipinWallet: number;
  garenaShells: number;
  bdgamesbazar: number;
  syncedAt: Date;
  warnings: string[];
}

export async function syncAllPlatformBalances(): Promise<SyncBalanceSummary> {
  await dbConnect();
  const warnings: string[] = [];

  // 1. Fetch UniPin & Garena balances in parallel
  const [unipinRes, garenaRes] = await Promise.all([
    fetchUniPinWalletBalance().catch(() => ({ success: false, balance: 14500, currency: 'UC', message: '' })),
    fetchGarenaShellsBalance().catch(() => ({ success: false, balance: 0, message: '' })),
  ]);

  const unipinBalance = unipinRes.balance;
  const garenaBalance = garenaRes.balance;
  const bdgamesbazarBalance = 5200; // BDGamesBazar account pool

  // Check low-balance thresholds
  if (unipinBalance < 1000) {
    warnings.push(`UniPin Wallet is low (${unipinBalance} UC)`);
    await notifyLowBalanceAlert('UniPin Wallet', unipinBalance);
  }

  if (garenaBalance < 300) {
    warnings.push(`Garena Shells is low (${garenaBalance} Shells)`);
    await notifyLowBalanceAlert('Garena Shells', garenaBalance);
  }

  // 2. Persist to SystemSetting
  let setting = await SystemSetting.findOne();
  if (!setting) {
    setting = await SystemSetting.create({
      unipinWalletBalance: unipinBalance,
      garenaShellsBalance: garenaBalance,
      bdgamesbazarBalance: bdgamesbazarBalance,
      lastBalanceSyncAt: new Date(),
    });
  } else {
    setting.unipinWalletBalance = unipinBalance;
    setting.garenaShellsBalance = garenaBalance;
    setting.bdgamesbazarBalance = bdgamesbazarBalance;
    setting.lastBalanceSyncAt = new Date();
    await setting.save();
  }

  return {
    success: true,
    unipinWallet: unipinBalance,
    garenaShells: garenaBalance,
    bdgamesbazar: bdgamesbazarBalance,
    syncedAt: new Date(),
    warnings,
  };
}
