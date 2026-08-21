'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sliders,
  Megaphone,
  AlertTriangle,
  Send,
  Save,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Tag,
  Sparkles,
} from 'lucide-react';

export default function LandingControlPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState({
    showAnnouncement: true,
    announcementText: '⚡ 100% Instant Delivery • BDMB & UPBD Automation Engine Active',
    heroHeadline: 'Automated Free Fire Top-Up Gateway',
    heroSubtitle: 'Sub-second API execution, automated UniPin voucher redemption, live player nickname validation, and multi-pipeline infrastructure for top-up businesses.',
    supportTelegram: 'https://t.me/ApexTopUpSupport',
    supportWhatsapp: '+8801605409721',
    maintenanceMode: false,
    maintenanceNotice: 'Scheduled system maintenance in progress. Services will resume shortly.',
    starterPrice: 500,
    proPrice: 2000,
    enterprisePrice: 5000,
  });

  useEffect(() => {
    fetchLandingSettings();
  }, []);

  async function fetchLandingSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setForm((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }
    } catch {
      // Fallback to defaults
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setErrorMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to save landing page settings.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Landing Page Control System</h1>
          <p className="text-xs text-slate-400 mt-1">
            Customize announcements, hero headlines, maintenance modes, support channels, and pricing displayed on the public landing page.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:border-slate-700 transition-colors shadow-sm"
        >
          <span>View Live Landing Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Landing page settings saved and updated live successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Live Announcement & Notice Bar */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" />
              Top Announcement / Notice Banner
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.showAnnouncement}
                onChange={(e) => setForm({ ...form, showAnnouncement: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
              <span className="ml-2 text-xs font-semibold text-slate-400">
                {form.showAnnouncement ? 'Active' : 'Hidden'}
              </span>
            </label>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="block text-slate-400 font-medium">Banner Announcement Text</label>
            <input
              type="text"
              value={form.announcementText}
              onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
              placeholder="⚡ 100% Instant Delivery • BDMB & UPBD Automation Active"
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Section 2: Hero Headlines & Description */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Hero Section Text & Branding
          </h2>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-medium">Main Hero Headline</label>
              <input
                type="text"
                value={form.heroHeadline}
                onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-400 font-medium">Hero Sub-Headline Description</label>
              <textarea
                rows={3}
                value={form.heroSubtitle}
                onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 transition-colors leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Maintenance Mode Switch */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Emergency Maintenance Mode
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.maintenanceMode}
                onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              <span className="ml-2 text-xs font-semibold text-slate-400">
                {form.maintenanceMode ? 'Maintenance ON' : 'Normal Operation'}
              </span>
            </label>
          </div>

          {form.maintenanceMode && (
            <div className="space-y-1.5 text-xs animate-fadeIn">
              <label className="block text-rose-400 font-medium">Maintenance Notice for Visitors</label>
              <input
                type="text"
                value={form.maintenanceNotice}
                onChange={(e) => setForm({ ...form, maintenanceNotice: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-950 border border-rose-500/30 text-rose-300 font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
          )}
        </div>

        {/* Section 4: Reseller Support Channels */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            Support Channels & Contact Info
          </h2>

          <div className="text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-medium">Telegram Support Channel / Link</label>
              <input
                type="text"
                value={form.supportTelegram}
                onChange={(e) => setForm({ ...form, supportTelegram: e.target.value })}
                placeholder="https://t.me/ApexTopUpSupport"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Section 5: B2B Pricing Packages Control */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            Landing Page Pricing Tiers (BDT ৳)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400 font-semibold block">Starter Tier (500 Hits)</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold text-sm">৳</span>
                <input
                  type="number"
                  value={form.starterPrice}
                  onChange={(e) => setForm({ ...form, starterPrice: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400 font-semibold block">Pro Reseller (2,500 Hits)</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-400 font-bold text-sm">৳</span>
                <input
                  type="number"
                  value={form.proPrice}
                  onChange={(e) => setForm({ ...form, proPrice: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400 font-semibold block">Enterprise (10,000 Hits)</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-purple-400 font-bold text-sm">৳</span>
                <input
                  type="number"
                  value={form.enterprisePrice}
                  onChange={(e) => setForm({ ...form, enterprisePrice: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-lg shadow-cyan-600/30 transition-all hover:scale-[1.02] text-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Landing Page Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
