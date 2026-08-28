'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Gem,
  Save,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Tag,
  AlertCircle,
} from 'lucide-react';

interface PackageRate {
  packageId: string;
  name: string;
  priceBdt: number;
  diamonds: number;
  category: 'DIAMOND' | 'MEMBERSHIP' | 'SPECIAL';
  isActive: boolean;
}

export default function PackagePricingPage() {
  const [packages, setPackages] = useState<PackageRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  async function fetchPackages() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/packages');
      const data = await res.json();
      if (data.success && data.packageRates) {
        setPackages(data.packageRates);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to load package pricing');
    } finally {
      setLoading(false);
    }
  }

  function handlePriceChange(packageId: string, newPrice: number) {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.packageId === packageId ? { ...pkg, priceBdt: Math.max(0, newPrice) } : pkg
      )
    );
  }

  function handleToggleActive(packageId: string) {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.packageId === packageId ? { ...pkg, isActive: !pkg.isActive } : pkg
      )
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageRates: packages }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMsg(data.message || 'Failed to save changes');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving packages');
    } finally {
      setSaving(false);
    }
  }

  const diamondPackages = packages.filter((p) => p.category === 'DIAMOND');
  const membershipPackages = packages.filter((p) => p.category === 'MEMBERSHIP');
  const specialPackages = packages.filter((p) => p.category === 'SPECIAL');

  return (
    <div className="space-y-8" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Package Pricing & Wallet Rates (প্যাকেজ মূল্য নির্ধারণ)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Set custom BDT prices (৳) for each diamond package and membership. When a user/reseller executes a Garena Shells top-up, this exact amount will be deducted from their BDT Wallet Balance in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchPackages}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Rates</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white shadow-md shadow-cyan-600/30 transition-all hover:scale-105 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving Pricing...' : 'Save All Pricing (মূল্য সংরক্ষণ)'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>All package prices saved successfully! Live deductions will now use these updated rates.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Free Fire Diamond Packages */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Gem className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Free Fire Diamond Packages (ডায়মন্ড টপ-আপ)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {diamondPackages.map((pkg) => (
            <div
              key={pkg.packageId}
              className={`p-5 rounded-2xl border transition-all ${
                pkg.isActive
                  ? 'bg-slate-900 border-slate-800 hover:border-cyan-500/50'
                  : 'bg-slate-950 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-black text-cyan-400 font-mono tracking-wider">{pkg.packageId}</span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(pkg.packageId)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    pkg.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {pkg.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>

              <h3 className="text-sm font-bold text-white mb-3">{pkg.name}</h3>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-400">Reseller Price (BDT ৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-amber-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pkg.priceBdt}
                    onChange={(e) => handlePriceChange(pkg.packageId, parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Memberships */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Tag className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Memberships (মেম্বারশিপ প্যাকেজ)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {membershipPackages.map((pkg) => (
            <div
              key={pkg.packageId}
              className={`p-5 rounded-2xl border transition-all ${
                pkg.isActive
                  ? 'bg-slate-900 border-slate-800 hover:border-purple-500/50'
                  : 'bg-slate-950 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-black text-purple-400 font-mono tracking-wider">{pkg.packageId}</span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(pkg.packageId)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    pkg.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {pkg.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>

              <h3 className="text-sm font-bold text-white mb-3">{pkg.name}</h3>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-400">Reseller Price (BDT ৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-amber-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pkg.priceBdt}
                    onChange={(e) => handlePriceChange(pkg.packageId, parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Special Passes & Deals */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Special Deals & Passes (লেভেল আপ পাস ও স্পেশাল)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {specialPackages.map((pkg) => (
            <div
              key={pkg.packageId}
              className={`p-5 rounded-2xl border transition-all ${
                pkg.isActive
                  ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50'
                  : 'bg-slate-950 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-black text-amber-400 font-mono tracking-wider">{pkg.packageId}</span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(pkg.packageId)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    pkg.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {pkg.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>

              <h3 className="text-sm font-bold text-white mb-3">{pkg.name}</h3>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-400">Reseller Price (BDT ৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-amber-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pkg.priceBdt}
                    onChange={(e) => handlePriceChange(pkg.packageId, parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
