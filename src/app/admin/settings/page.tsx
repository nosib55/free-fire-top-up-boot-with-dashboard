'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Settings,
  Globe,
  Server,
  Send,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Key,
  ShieldAlert,
  Upload,
  RefreshCw,
} from 'lucide-react';

export default function SystemSettingsPage() {
  const [siteName, setSiteName] = useState('Apex Top-Up B2B SaaS');
  const [description, setDescription] = useState(
    'Automated Game & Free Fire Top-Up API-as-a-Service Platform for Developers & Resellers'
  );
  const [logoUrl, setLogoUrl] = useState('/login-banner.jpg');
  const [upstreamServerUrl, setUpstreamServerUrl] = useState('https://shop.garena.my/api/process-order');
  const [upstreamApiKey, setUpstreamApiKey] = useState('PROV_MASTER_9X8Y7Z6A');
  const [telegramAlertChatId, setTelegramAlertChatId] = useState('@GarenaTopupAlerts');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSiteName(data.settings.siteName || 'Apex Top-Up B2B SaaS');
        setDescription(data.settings.description || '');
        setLogoUrl(data.settings.logoUrl || '/login-banner.jpg');
        setUpstreamServerUrl(data.settings.upstreamServerUrl || 'https://shop.garena.my/api/process-order');
        setUpstreamApiKey(data.settings.upstreamApiKey || '');
        setTelegramAlertChatId(data.settings.telegramAlertChatId || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const [uploadProvider, setUploadProvider] = useState('');
  const [uploadError, setUploadError] = useState('');

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setUploadSuccess(false);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setLogoUrl(data.url);
        setUploadProvider(data.provider || 'Storage');
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 4000);
      } else {
        setUploadError(data.message || 'Image upload failed');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading image');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName,
          description,
          logoUrl,
          upstreamServerUrl,
          upstreamApiKey,
          telegramAlertChatId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.message || 'Failed to save settings');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8" suppressHydrationWarning>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">System Settings & Gateway Credentials</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure platform branding, logo uploads, upstream provider credentials, and Telegram notifications.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>System settings updated and saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: General Platform Branding & SEO */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-cyan-400" />
            General Branding & SEO Metadata
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Platform Site Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">SEO Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            {/* Brand Logo Upload & URL */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-cyan-400" /> Brand Logo
                </label>
                {uploadSuccess && (
                  <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded successfully!
                  </span>
                )}
                {uploadError && (
                  <span className="text-rose-400 font-bold text-[11px]">
                    {uploadError}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/login-banner.jpg or https://..."
                  className="flex-1 w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                </button>
              </div>

              {/* Logo Preview Thumbnail */}
              {logoUrl && (
                <div className="pt-2 flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">Live Preview:</span>
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                    <Image src={logoUrl} alt="Logo Preview" fill className="object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Telegram Support Link & Quick Setup */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-cyan-400" /> Telegram Admin Alert Setup
                </label>
                <a
                  href="/admin/telegram"
                  className="text-cyan-400 hover:underline font-bold text-xs flex items-center gap-1"
                >
                  Open Full Telegram Bot Manager →
                </a>
              </div>
              <input
                type="text"
                value={telegramAlertChatId}
                onChange={(e) => setTelegramAlertChatId(e.target.value)}
                placeholder="@GarenaTopupAlerts or Chat ID"
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                You can configure your Telegram Bot Token, Webhooks, and interactive commands directly in the <a href="/admin/telegram" className="text-cyan-400 hover:underline font-semibold">Telegram Bot Setup</a> panel.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Upstream Provider Gateway Credentials */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-cyan-400" />
            Master Upstream Provider Credentials
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Upstream Server Endpoint URL</label>
              <input
                type="url"
                value={upstreamServerUrl}
                onChange={(e) => setUpstreamServerUrl(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-slate-500" /> Upstream Provider API Key (X-API-KEY)
              </label>
              <input
                type="password"
                value={upstreamApiKey}
                onChange={(e) => setUpstreamApiKey(e.target.value)}
                placeholder="PROV_MASTER_9X8Y7Z6A"
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-md shadow-cyan-600/30 transition-all text-xs w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
