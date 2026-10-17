'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  LogOut,
  Copy,
  Check,
  Zap,
  Search,
  Package,
  ShieldAlert,
  Code2,
  Terminal,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  Globe,
  Lock,
  RefreshCw,
  Clock,
  Sparkles,
  Server,
  FileCode,
  Sliders,
  HelpCircle,
  Menu,
  X,
  Flame,
  CreditCard,
  Database,
  Coins
} from 'lucide-react';

export default function ApiDocsPage() {
  // Navigation state
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Code snippets language state
  const [unipinLang, setUnipinLang] = useState<'curl' | 'node' | 'python' | 'php'>('curl');
  const [shellLang, setShellLang] = useState<'curl' | 'node' | 'python' | 'php'>('curl');
  const [accountLang, setAccountLang] = useState<'curl' | 'node' | 'python' | 'php'>('curl');
  const [balanceLang, setBalanceLang] = useState<'curl' | 'node' | 'python' | 'php'>('curl');
  const [redeemLang, setRedeemLang] = useState<'curl' | 'node' | 'python' | 'php'>('curl');
  const [checkLang, setCheckLang] = useState<'curl' | 'node' | 'python' | 'php'>('curl');

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auth / Session state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [baseUrl, setBaseUrl] = useState('https://your-domain.com/api/v1');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(`${window.location.origin}/api/v1`);
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
  }, []);

  function handleSignOut() {
    document.cookie = 'admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setIsLoggedIn(false);
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Nav items list
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Zap, badge: 'Gateway' },
    { id: 'unipin', label: 'UniPin TopUp (BD)', icon: Flame, badge: 'UPBD / BDMB' },
    { id: 'unipin-check', label: 'UniPin Voucher Check', icon: Search, badge: 'Status/History' },
    { id: 'player-check', label: 'Player Check (UID)', icon: Search, badge: 'FREE 100%' },
    { id: 'auth', label: 'Authentication', icon: Lock, badge: 'API Keys' },
    { id: 'credits', label: 'Credits & /status', icon: ShieldCheck, badge: 'Quota' },
    { id: 'callback', label: 'Callbacks & Webhooks', icon: RefreshCw, badge: 'Async' },
    { id: 'errors', label: 'Error Codes', icon: ShieldAlert, badge: 'Zero-Loss' },
    { id: 'notes', label: 'Key Notes & Rules', icon: HelpCircle, badge: 'Important' },
  ];

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems;
    const q = searchQuery.toLowerCase();
    return navItems.filter((i) => i.label.toLowerCase().includes(q) || i.badge.toLowerCase().includes(q));
  }, [searchQuery]);

  const dashboardHref = userRole === 'admin' ? '/admin' : '/userDashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased">
      {/* Top Main Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-black text-xs text-white shadow-lg shadow-cyan-600/30">
                AMS
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  AMS Topup API Docs
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                  BD Region V2.5
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Base URL:</span>
              <span className="text-cyan-300 select-all">{baseUrl}</span>
              <button
                onClick={() => copyToClipboard(baseUrl, 'base-url-top')}
                className="text-slate-400 hover:text-white ml-1"
                title="Copy Base URL"
              >
                {copiedKey === 'base-url-top' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <Link href="/" className="text-slate-400 hover:text-cyan-400 transition-colors hidden sm:block">
              Home
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href={dashboardHref}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md shadow-cyan-600/30 transition-all hover:scale-105"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
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
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-semibold text-white shadow-md shadow-cyan-600/30 transition-all hover:scale-105"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Top Server Selection Bar */}
      <div className="border-b border-slate-800/80 bg-slate-950/95 sticky top-16 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1 shrink-0">
              <Globe className="w-3.5 h-3.5 text-cyan-400" /> Server:
            </span>

            <div className="px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>BD (Bangladesh - UniPin Automation)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              High-Speed Engine (2–5s)
            </span>
            <span className="hidden lg:inline text-slate-500">|</span>
            <span className="text-slate-400 font-sans text-xs">
              Uptime: <strong className="text-cyan-400 font-mono">99.98%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Container with Sticky Left Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ==================== LEFT SIDEBAR ==================== */}
          <aside
            className={`lg:col-span-3 lg:sticky lg:top-36 space-y-4 ${
              mobileMenuOpen ? 'block mb-6' : 'hidden lg:block'
            }`}
          >
            {/* Search filter in sidebar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search endpoints & docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Navigation Links */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>API Navigation</span>
                <span className="text-[10px] text-cyan-400 font-mono">V2.5</span>
              </div>

              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      isSelected
                        ? 'bg-cyan-600/15 text-cyan-400 border border-cyan-500/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>

            {/* Reseller Quick Help Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/20 border border-cyan-900/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Reseller Automation</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Execute instant UniPin voucher top-ups (UPBD & BDMB) with high concurrency, rate-limit protection, and zero quota loss on errors.
              </p>
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold text-[11px] pt-1"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* ==================== MAIN CONTENT AREA ==================== */}
          <main className="lg:col-span-9 space-y-12">
            {/* ==================== SECTION: OVERVIEW ==================== */}
            <section id="overview" className="scroll-mt-36 space-y-4">
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-slate-800 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono tracking-wider uppercase">
                      BANGLADESH (BD) FREE FIRE API
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      STEALTH ENGINE READY (2–5s)
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    BD UniPin Automation Gateway
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                    High-speed programmatic gateway for Free Fire top-ups in Bangladesh. Supports instant <strong>UniPin Vouchers (BDMB / UPBD)</strong> with batch execution, <strong>Automatic format detection</strong>, and <strong>100% Free Live Player UID lookup</strong>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-mono text-slate-400">Execution Speed</div>
                      <div className="text-sm font-bold text-white">2–5 Seconds Execution</div>
                      <div className="text-[11px] text-cyan-400">Direct engine automation</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-mono text-slate-400">Voucher Auto-Detect</div>
                      <div className="text-sm font-bold text-white">UPBD &amp; BDMB Supported</div>
                      <div className="text-[11px] text-emerald-400">Zero manual denomination config</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <div className="text-[11px] font-mono text-slate-400">Zero Quota Loss</div>
                      <div className="text-sm font-bold text-white">100% Quota Protected</div>
                      <div className="text-[11px] text-amber-400">0 Hits Deducted on Any Error</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== SECTION: UNIPIN TOPUP ==================== */}
            <section id="unipin" className="scroll-mt-36 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <Flame className="w-6 h-6 text-cyan-400" />
                    <span>UniPin TopUp (BD Server)</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Redeem BD UniPin physical vouchers and digital codes (BDMB / UPBD) directly into BD region player accounts.
                  </p>
                </div>
                <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">
                  POST /api/v1/topup
                </span>
              </div>

              {/* Notice regarding BD Region */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <span className="font-bold text-white block">BD Region Only Requirement:</span>
                  <span>
                    UniPin codes (BDMB and UPBD) can strictly only be redeemed on Free Fire accounts located in the <strong>Bangladesh region</strong>. Attempting to top-up accounts registered in other regions will return <code className="text-rose-400 font-mono">ONLY_FOR_BD_REGION</code> without consuming your voucher.
                  </span>
                </div>
              </div>

              {/* Endpoint Card */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs">POST</span>
                  <code className="text-sm font-mono text-cyan-300 font-bold">/api/v1/topup</code>
                  <span className="text-slate-500">or</span>
                  <code className="text-xs font-mono text-slate-400">/api/topup</code>
                  <span className="ml-auto text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    1 Hit Deducted on Success
                  </span>
                </div>
              </div>

              {/* Request Parameters Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Request Body Parameters (JSON)</h3>
                <div className="rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Field</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Required</th>
                        <th className="p-3">Description &amp; Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      <tr>
                        <td className="p-3 text-cyan-400 font-bold">playerid <span className="font-sans text-slate-500">(or uid)</span></td>
                        <td className="p-3 text-slate-400">string</td>
                        <td className="p-3 text-emerald-400 font-sans font-bold">Yes</td>
                        <td className="p-3 font-sans text-slate-300">
                          Target Free Fire player UID (e.g. <code className="text-slate-300">"5162333961"</code>).
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-cyan-400 font-bold">code <span className="font-sans text-slate-500">(or voucherCode)</span></td>
                        <td className="p-3 text-slate-400">string | array</td>
                        <td className="p-3 text-emerald-400 font-sans font-bold">Yes</td>
                        <td className="p-3 font-sans text-slate-300">
                          UniPin voucher code(s). Supports up to 5 codes comma-separated (e.g. <code className="text-slate-300">"BDMB-01...,BDMB-02..."</code>) or an array of strings. Auto-detects package denomination.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-400">orderid</td>
                        <td className="p-3 text-slate-400">string</td>
                        <td className="p-3 text-slate-400 font-sans">Optional</td>
                        <td className="p-3 font-sans text-slate-300">
                          Your unique order reference for idempotency and tracking (e.g. <code className="text-slate-300">"ORDER-10029"</code>).
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Code Snippets for UniPin */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
                <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white">UniPin TopUp Example:</span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {(['curl', 'node', 'python', 'php'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setUnipinLang(lang)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                          unipinLang === lang ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const code =
                        unipinLang === 'curl'
                          ? `curl -X POST "${baseUrl}/topup" \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: YOUR_API_KEY_HERE" \\\n  -d '{\n    "orderid": "test-001",\n    "playerid": "5162333961",\n    "code": "BDMB-T-S-00123456"\n  }'`
                          : `const axios = require('axios');\n\nconst res = await axios.post('${baseUrl}/topup', {\n  orderid: 'test-001',\n  playerid: '5162333961',\n  code: 'BDMB-T-S-00123456'\n}, { headers: { 'X-API-Key': 'YOUR_API_KEY' } });\nconsole.log(res.data);`;
                      copyToClipboard(code, `unipin-${unipinLang}`);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold transition-colors"
                  >
                    {copiedKey === `unipin-${unipinLang}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === `unipin-${unipinLang}` ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto bg-slate-950/80 leading-relaxed">
{unipinLang === 'curl' &&
`curl -X POST "${baseUrl}/topup" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -d '{
    "orderid": "test-001",
    "playerid": "5162333961",
    "code": "BDMB-T-S-00123456,BDMB-T-S-00123457"
  }'`}
{unipinLang === 'node' &&
`const axios = require('axios');

async function topupUniPin() {
  const response = await axios.post(
    '${baseUrl}/topup',
    {
      orderid: 'test-001',
      playerid: '5162333961',
      code: 'BDMB-T-S-00123456,BDMB-T-S-00123457'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY_HERE'
      }
    }
  );
  console.log(response.data);
}

topupUniPin();`}
{unipinLang === 'python' &&
`import requests

url = "${baseUrl}/topup"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "YOUR_API_KEY_HERE"
}
payload = {
    "orderid": "test-001",
    "playerid": "5162333961",
    "code": "BDMB-T-S-00123456"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
{unipinLang === 'php' &&
`<?php
$curl = curl_init();

$payload = json_encode([
    "orderid" => "test-001",
    "playerid" => "5162333961",
    "code" => "BDMB-T-S-00123456"
]);

curl_setopt_array($curl, [
    CURLOPT_URL => "${baseUrl}/topup",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => "POST",
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "X-API-Key: YOUR_API_KEY_HERE"
    ],
]);

$response = curl_exec($curl);
curl_close($curl);
echo $response;`}
                </pre>
              </div>
            </section>

            {/* ==================== SECTION: UNIPIN VOUCHER CHECK ==================== */}
            <section id="unipin-check" className="scroll-mt-36 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <Search className="w-6 h-6 text-cyan-400" />
                    <span>UniPin Voucher Status &amp; History Check</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Check if a voucher has been consumed, verify its denomination, and retrieve its exact redemption timestamp if processed through the gateway.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">
                  POST /api/v1/unipin/check (0 QUOTA)
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Request Payload (JSON)
                  </span>
                  <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "code": "BDMB-T-S-00123456"
}`}
                  </pre>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Status Response (200 OK)
                  </span>
                  <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "success": true,
  "status": "VALID",
  "isConsumed": false,
  "code": "BDMB-T-S-00123456",
  "voucherType": "BDMB (UniPin Mobile)",
  "denomination": "115 Diamonds",
  "estimatedDiamonds": 115,
  "redeemedAt": null,
  "redeemedByUid": null,
  "message": "Voucher is valid and ready for top-up redemption."
}`}
                  </pre>
                </div>
              </div>
            </section>



            {/* ==================== SECTION: PLAYER CHECK / UID ==================== */}
            <section id="player-check" className="scroll-mt-36 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <Search className="w-6 h-6 text-emerald-400" />
                    <span>Player Check / UID Lookup</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Query live Free Fire game servers to retrieve the real in-game player name and region prior to taking client money.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                  100% FREE (0 QUOTA)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs">POST</span>
                  <code className="text-sm font-mono text-emerald-300 font-bold">/api/v1/validate-uid</code>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Request Payload (JSON)
                  </span>
                  <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "uid": "5162333961"
}`}
                  </pre>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Success Response (200 OK)
                  </span>
                  <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "success": true,
  "valid": true,
  "data": {
    "uid": "5162333961",
    "playerName": "🔥_ProShooter_BD_🔥",
    "region": "BD",
    "status": "ACTIVE_PLAYER"
  }
}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* ==================== SECTION: AUTHENTICATION ==================== */}
            <section id="auth" className="scroll-mt-36 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <Lock className="w-6 h-6 text-cyan-400" />
                    <span>Authentication (ALL SERVERS)</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Secure programmatic access via API keys.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" /> Method 1: Custom Header (Recommended)
                  </div>
                  <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
X-API-Key: YOUR_API_KEY
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" /> Method 2: Bearer Token
                  </div>
                  <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
Authorization: Bearer YOUR_API_KEY
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" /> Method 3: Query Param
                  </div>
                  <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
?apiKey=YOUR_API_KEY
                  </pre>
                </div>
              </div>
            </section>

            {/* ==================== SECTION: CREDITS & /STATUS ==================== */}
            <section id="credits" className="scroll-mt-36 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <ShieldCheck className="w-6 h-6 text-cyan-400" />
                    <span>Credits &amp; /status (Quota Inquiries)</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Check your live remaining quota balance, plan tier, and active concurrency limits.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">
                  GET /api/user/status
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  Status Response (200 OK)
                </span>
                <pre className="text-xs font-mono text-cyan-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "status": "success",
  "keyName": "Primary Reseller Bot",
  "remainingHits": 14920,
  "totalHits": 20000,
  "rateLimitRps": 10,
  "activePlan": "ENTERPRISE_VIP",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "uptime": "99.98%"
}`}
                </pre>
              </div>
            </section>

            {/* ==================== SECTION: ERROR CODES ==================== */}
            <section id="errors" className="scroll-mt-36 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <ShieldAlert className="w-6 h-6 text-rose-400" />
                    <span>Error Codes &amp; Quota Protection Rules</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Strict Zero-Loss Quota Guarantee: Quota hits are deducted <strong>ONLY</strong> upon confirmed success on UniPin gateways.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900 shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Error Message / Reason</th>
                        <th className="p-3.5">Quota Cost</th>
                        <th className="p-3.5">Explanation &amp; Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 text-emerald-400 font-bold">200 OK</td>
                        <td className="p-3.5 text-white font-semibold">SUCCESS</td>
                        <td className="p-3.5 text-emerald-400 font-bold">1 Hit</td>
                        <td className="p-3.5 font-sans text-slate-300">Diamonds or package confirmed via UniPin.</td>
                      </tr>

                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 text-amber-400 font-bold">401 Unauthorized</td>
                        <td className="p-3.5 text-amber-300 font-semibold">INVALID_API_KEY</td>
                        <td className="p-3.5 text-slate-400 font-bold">0 Hits</td>
                        <td className="p-3.5 font-sans text-slate-300">X-API-Key header is missing, incorrect, or key was revoked.</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 text-amber-400 font-bold">429 Rate Limit</td>
                        <td className="p-3.5 text-amber-300 font-semibold">QUOTA_EXHAUSTED</td>
                        <td className="p-3.5 text-slate-400 font-bold">0 Hits</td>
                        <td className="p-3.5 font-sans text-slate-300">Assigned quota has 0 remaining hits or RPS rate limit exceeded.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ==================== SECTION: KEY NOTES ==================== */}
            <section id="notes" className="scroll-mt-36 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <HelpCircle className="w-6 h-6 text-amber-400" />
                    <span>Key Notes &amp; Integration Guidelines</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Crucial rules and recommendations modeled after ucbot.net documentation notes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Flame className="w-4 h-4" />
                    <span>1. UniPin Batch Execution (Max 5)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    You can pass up to <strong>5 UniPin codes</strong> in a single request, comma-separated (e.g. <code className="text-cyan-300">"code": "BDMB1,BDMB2"</code>). Any invalid or used codes will fail individually without failing the entire order.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Layers className="w-4 h-4" />
                    <span>2. Voucher Formats Supported</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Our platform automatically detects and processes both <strong>BDMB</strong> (UniPin Mobile) and <strong>UPBD</strong> voucher serials and PINs instantly with zero manual configuration.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>3. HTTP Timeout Settings (30 Seconds)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Our stealth automation engine performs real-time browser interaction with UniPin gateways in <strong>2–5 seconds</strong>. Set your client HTTP request timeout to at least <strong>30 seconds</strong> to avoid premature dropoffs.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>4. Idempotency with orderid</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Always generate and transmit a unique <code className="text-purple-300">orderid</code> with every top-up request. If a network disruption occurs, retrying the identical <code className="text-purple-300">orderid</code> prevents double-charging or duplicate voucher redemption.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
