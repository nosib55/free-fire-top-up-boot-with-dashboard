'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Megaphone,
  AlertTriangle,
  Send,
  CheckCircle2,
  Zap,
  Shield,
  Layers,
  MessageCircle,
} from 'lucide-react';

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');

  // Landing page dynamic settings state
  const [settings, setSettings] = useState({
    siteName: 'Apex Top-Up',
    logoUrl: '',
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
    // 1. Check session cookie in browser
    if (typeof document !== 'undefined') {
      const cookies = document.cookie;
      if (cookies.includes('admin_session=')) {
        setIsLoggedIn(true);
        if (cookies.includes('user_role=admin')) {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      }
    }

    // 2. Fetch live customized landing page settings from Admin
    async function loadLandingSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
          }));
        }
      } catch {
        // Fallback to defaults
      }
    }
    loadLandingSettings();
  }, []);

  function handleSignOut() {
    document.cookie = 'admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setIsLoggedIn(false);
  }

  const dashboardHref = userRole === 'admin' ? '/admin' : '/userDashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white flex flex-col justify-between">
      <div>
        {/* Emergency Maintenance Mode Banner */}
        {settings.maintenanceMode && (
          <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg">
            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
            <span>{settings.maintenanceNotice}</span>
          </div>
        )}

        {/* Top Announcement Bar (Controlled by Admin) */}
        {settings.showAnnouncement && !settings.maintenanceMode && (
          <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border-b border-cyan-500/20 text-cyan-300 px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <Megaphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{settings.announcementText}</span>
          </div>
        )}

        {/* Top Navbar */}
        <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {settings.logoUrl ? (
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-md shadow-cyan-600/20 shrink-0 border border-slate-700 bg-slate-900">
                  <Image src={settings.logoUrl} alt="Brand Logo" fill className="object-cover" />
                </div>
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-600 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-md shadow-cyan-600/30 shrink-0">
                  {settings.siteName ? settings.siteName.substring(0, 4).toUpperCase() : 'APEX'}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
                  {settings.siteName || 'Apex Top-Up'}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
                  B2B Enterprise
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-5 text-xs font-semibold">
              <Link href="/docs" className="text-slate-300 hover:text-cyan-400 transition-colors">
                API Docs
              </Link>
              {settings.supportTelegram && (
                <a
                  href={settings.supportTelegram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Telegram Support</span>
                </a>
              )}

              {isLoggedIn ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md shadow-cyan-600/30 transition-all hover:scale-105"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Go to Dashboard</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors px-2 py-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold text-white shadow-md shadow-cyan-600/30 transition-all hover:scale-105"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Navigation Controls */}
            <div className="flex md:hidden items-center gap-2">
              {isLoggedIn ? (
                <Link
                  href={dashboardHref}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs text-white shadow-md shadow-cyan-600/30"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs text-white shadow-md shadow-cyan-600/30"
                >
                  Sign In
                </Link>
              )}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Toggle Menu"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileNavOpen && (
            <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-4 space-y-3">
              <Link
                href="/docs"
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium"
              >
                API Documentation
              </Link>
              {settings.supportTelegram && (
                <a
                  href={settings.supportTelegram}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-3 py-2 rounded-lg text-cyan-400 hover:bg-slate-800 text-sm font-medium"
                >
                  Telegram Support
                </a>
              )}

              {isLoggedIn ? (
                <>
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileNavOpen(false)}
                    className="block px-3 py-2 rounded-lg bg-cyan-600 text-white font-bold text-sm"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileNavOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-slate-800 text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="block px-3 py-2 rounded-lg text-cyan-400 font-bold hover:bg-slate-800 text-sm"
                >
                  Sign In to Account
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* Hero Section (Controlled by Admin) */}
        <section className="relative overflow-hidden pt-16 sm:pt-20 pb-12 sm:pb-16 px-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950 -z-10" />
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Garena & UniPin Automation Gateway v2.4 Online
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
              {settings.heroHeadline}
            </h1>

            <p className="text-slate-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              {settings.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/docs"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-lg shadow-cyan-600/30 transition-all text-center text-sm hover:scale-105"
              >
                Explore API Documentation
              </Link>
              <Link
                href={isLoggedIn ? dashboardHref : '/login'}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 font-bold text-slate-200 transition-all text-center text-sm"
              >
                {isLoggedIn ? 'Access My Dashboard' : 'Sign In to Portal'}
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm hover:border-cyan-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl mb-4 font-bold">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Automated UniPin & Garena Pipelines</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Auto-detect code prefixes (<code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">BDMB</code> vs <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">UPBD</code>), verify UID on Garena, and execute instant diamond top-ups.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm hover:border-blue-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-4 font-bold">
                🛡️
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Quota Guard & Anti-Abuse</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Deduct hits strictly on confirmed top-up success. Invalid player UIDs do not deduct quota hits.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm hover:border-indigo-500/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mb-4 font-bold">
                🌐
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Sub-Second Execution</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Multi-worker concurrency handles thousands of concurrent top-up requests with zero race conditions.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Packages (Controlled by Admin) */}
        <section className="max-w-7xl mx-auto px-4 py-12 sm:py-16 border-t border-slate-800">
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-2xl sm:text-4xl font-black text-white">B2B API Quota Packages</h2>
            <p className="text-xs sm:text-sm text-slate-400">Choose the quota volume that fits your top-up scale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Starter Tier */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white">Starter Package</h3>
              <div className="text-3xl font-black text-cyan-400 font-mono">
                ৳{settings.starterPrice?.toLocaleString()}
                <span className="text-xs text-slate-400 font-normal"> / 500 Hits</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li>• 500 Automated Top-Up Requests</li>
                <li>• Free Unlimited UID Lookups</li>
                <li>• UniPin BDMB & UPBD Support</li>
                <li>• 30 Days API Key Expiration</li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-bold text-cyan-400"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Reseller Tier */}
            <div className="p-6 rounded-2xl bg-slate-900 border-2 border-cyan-500 shadow-xl shadow-cyan-950/50 space-y-4 relative">
              <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-cyan-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                Popular
              </span>
              <h3 className="text-lg font-bold text-white">Pro Reseller</h3>
              <div className="text-3xl font-black text-white font-mono">
                ৳{settings.proPrice?.toLocaleString()}
                <span className="text-xs text-slate-400 font-normal"> / 2,500 Hits</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li>• 2,500 Automated Top-Up Requests</li>
                <li>• Free Unlimited UID Lookups</li>
                <li>• Webhook Callbacks & Telemetry</li>
                <li>• 60 Days API Key Expiration</li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-center text-xs font-bold text-white shadow-md shadow-cyan-600/30"
              >
                Choose Pro Plan
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white">Enterprise Tier</h3>
              <div className="text-3xl font-black text-purple-400 font-mono">
                ৳{settings.enterprisePrice?.toLocaleString()}
                <span className="text-xs text-slate-400 font-normal"> / 10,000 Hits</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li>• 10,000 Automated Top-Up Requests</li>
                <li>• Dedicated Worker Queue Isolation</li>
                <li>• Priority Upstream Route</li>
                <li>• 90 Days API Key Expiration</li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-bold text-purple-400"
              >
                Contact Enterprise
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-extrabold text-white">Apex Top-Up B2B Gateway</span> • All rights reserved © 2026
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            {settings.supportTelegram && (
              <a href={settings.supportTelegram} target="_blank" rel="noreferrer" className="hover:text-cyan-400">
                Telegram Channel
              </a>
            )}
            <Link href="/docs" className="hover:text-cyan-400">
              API Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
