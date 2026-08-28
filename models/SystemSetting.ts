import mongoose, { Schema, Document } from 'mongoose';

export interface IPackageRate {
  packageId: string;
  name: string;
  priceBdt: number;
  diamonds: number;
  category: 'DIAMOND' | 'MEMBERSHIP' | 'SPECIAL';
  isActive: boolean;
}

export interface ISystemSetting extends Document {
  siteName: string;
  description: string;
  logoUrl: string;
  upstreamServerUrl: string;
  upstreamApiKey: string;
  telegramAlertChatId: string;

  // Dynamic Package Rates
  packageRates?: IPackageRate[];

  // Landing Page Control Fields
  announcementText?: string;
  showAnnouncement?: boolean;
  heroHeadline?: string;
  heroSubtitle?: string;
  supportTelegram?: string;
  supportWhatsapp?: string;
  maintenanceMode?: boolean;
  maintenanceNotice?: string;
  starterPrice?: number;
  proPrice?: number;
  enterprisePrice?: number;

  // Live Worker Balance Sync Fields
  unipinWalletBalance?: number;
  garenaShellsBalance?: number;
  bdgamesbazarBalance?: number;
  lastBalanceSyncAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

const DEFAULT_PACKAGE_RATES: IPackageRate[] = [
  { packageId: '25_DIAMONDS', name: '25 Diamonds (২৫ ডায়মন্ড)', priceBdt: 20, diamonds: 25, category: 'DIAMOND', isActive: true },
  { packageId: '50_DIAMONDS', name: '50 Diamonds (৫০ ডায়মন্ড)', priceBdt: 40, diamonds: 50, category: 'DIAMOND', isActive: true },
  { packageId: '100_DIAMONDS', name: '100 / 115 Diamonds (১০০ ডায়মন্ড)', priceBdt: 80, diamonds: 100, category: 'DIAMOND', isActive: true },
  { packageId: '240_DIAMONDS', name: '240 / 310 Diamonds (৩১০ ডায়মন্ড)', priceBdt: 200, diamonds: 310, category: 'DIAMOND', isActive: true },
  { packageId: '520_DIAMONDS', name: '520 / 610 Diamonds (৫২০ ডায়মন্ড)', priceBdt: 400, diamonds: 520, category: 'DIAMOND', isActive: true },
  { packageId: '1240_DIAMONDS', name: '1240 Diamonds (১২৪০ ডায়মন্ড)', priceBdt: 800, diamonds: 1240, category: 'DIAMOND', isActive: true },
  { packageId: '2530_DIAMONDS', name: '2530 Diamonds (২৫৩০ ডায়মন্ড)', priceBdt: 1600, diamonds: 2530, category: 'DIAMOND', isActive: true },
  { packageId: 'WEEKLY_LITE', name: 'Weekly Lite Membership (উইকলি লাইট)', priceBdt: 40, diamonds: 0, category: 'MEMBERSHIP', isActive: true },
  { packageId: 'WEEKLY_MEMBERSHIP', name: 'Weekly Membership (উইকলি মেম্বারশিপ)', priceBdt: 160, diamonds: 0, category: 'MEMBERSHIP', isActive: true },
  { packageId: 'MONTHLY_MEMBERSHIP', name: 'Monthly Membership (মান্থলি মেম্বারশিপ)', priceBdt: 800, diamonds: 0, category: 'MEMBERSHIP', isActive: true },
  { packageId: 'LEVEL_UP_PASS', name: 'Level Up Pass (লেভেল আপ পাস)', priceBdt: 160, diamonds: 0, category: 'SPECIAL', isActive: true },
];

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    siteName: { type: String, default: 'Apex Top-Up' },
    description: { type: String, default: 'Automated Game & Free Fire Top-Up API-as-a-Service Platform for Developers & Resellers' },
    logoUrl: { type: String, default: '/login-banner.jpg' },
    upstreamServerUrl: { type: String, default: 'https://shop.garena.my/api/process-order' },
    upstreamApiKey: { type: String, default: '' },
    telegramAlertChatId: { type: String, default: '' },

    // Package Rates
    packageRates: {
      type: [
        {
          packageId: { type: String, required: true },
          name: { type: String, required: true },
          priceBdt: { type: Number, required: true, default: 20 },
          diamonds: { type: Number, default: 0 },
          category: { type: String, enum: ['DIAMOND', 'MEMBERSHIP', 'SPECIAL'], default: 'DIAMOND' },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: DEFAULT_PACKAGE_RATES,
    },

    // Landing Page Controls
    announcementText: { type: String, default: '⚡ 100% Instant Delivery • BDMB & UPBD Automation Engine Active' },
    showAnnouncement: { type: Boolean, default: true },
    heroHeadline: { type: String, default: 'Automated Free Fire Top-Up Gateway' },
    heroSubtitle: { type: String, default: 'Sub-second API execution, automated UniPin voucher redemption, live player nickname validation, and multi-pipeline infrastructure for top-up businesses.' },
    supportTelegram: { type: String, default: 'https://t.me/ApexTopUpSupport' },
    supportWhatsapp: { type: String, default: '+8801605409721' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceNotice: { type: String, default: 'Scheduled system maintenance in progress. Services will resume shortly.' },
    starterPrice: { type: Number, default: 500 },
    proPrice: { type: Number, default: 2000 },
    enterprisePrice: { type: Number, default: 5000 },

    // Balance Fields
    unipinWalletBalance: { type: Number, default: 14500 },
    garenaShellsBalance: { type: Number, default: 2400 },
    bdgamesbazarBalance: { type: Number, default: 5200 },
    lastBalanceSyncAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

if (mongoose.models.SystemSetting) {
  delete mongoose.models.SystemSetting;
}

export default mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);
