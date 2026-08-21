import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSetting extends Document {
  siteName: string;
  description: string;
  logoUrl: string;
  upstreamServerUrl: string;
  upstreamApiKey: string;
  telegramAlertChatId: string;

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

  createdAt?: Date;
  updatedAt?: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    siteName: { type: String, default: 'Apex Top-Up' },
    description: { type: String, default: 'Automated Game & Free Fire Top-Up API-as-a-Service Platform for Developers & Resellers' },
    logoUrl: { type: String, default: '/login-banner.jpg' },
    upstreamServerUrl: { type: String, default: 'https://shop.garena.my/api/process-order' },
    upstreamApiKey: { type: String, default: '' },
    telegramAlertChatId: { type: String, default: '' },

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
  },
  { timestamps: true }
);

if (mongoose.models.SystemSetting) {
  delete mongoose.models.SystemSetting;
}

export default mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);
