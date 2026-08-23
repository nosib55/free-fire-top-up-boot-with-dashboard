'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Key,
  Shield,
  Zap,
  Activity,
  Copy,
  CheckCircle2,
  Lock,
  ExternalLink,
  Code2,
  Clock,
  LogOut,
  AlertCircle,
  RefreshCw,
  Check,
} from 'lucide-react';

export default function UserDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [activeKey, setActiveKey] = useState('');
  const [totalHits, setTotalHits] = useState(0);
  const [remainingHits, setRemainingHits] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [userName, setUserName] = useState('Valued Client');
  const [userEmail, setUserEmail] = useState('');
  const [brandSettings, setBrandSettings] = useState({
    siteName: 'Apex Top-Up',
    logoUrl: '',
  });

  // Playground State
  const [testUid, setTestUid] = useState('');
  const [testPipeline, setTestPipeline] = useState<'UNIPIN_VOUCHER' | 'UNIPIN_WALLET' | 'GARENA_SHELLS'>('UNIPIN_VOUCHER');
  const [testVoucherCode, setTestVoucherCode] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // UID Validation Playground State
  const [valUid, setValUid] = useState('');
  const [valResult, setValResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchMyKey();
    fetchBrandSettings();
  }, []);

  async function fetchBrandSettings() {
    try {
      const res = await fetch('/api/settings');
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.success && data.settings) {
        setBrandSettings({
          siteName: data.settings.siteName || 'Apex Top-Up',
          logoUrl: data.settings.logoUrl || '',
        });
      }
    } catch {
      // Fallback
    }
  }

  async function fetchMyKey() {
    setLoading(true);
    try {
      const res = await fetch('/api/user/my-key');
      const text = await res.text();
      const data = JSON.parse(text);

      if (data.success) {
        if (data.user) {
          setUserName(data.user.name || 'User');
          setUserEmail(data.user.email || '');
        }

        if (data.hasKey && data.key) {
          setHasKey(true);
          setActiveKey(data.key.key);
          setTotalHits(data.key.totalHits || 0);
          setRemainingHits(data.key.remainingHits || 0);
          setExpiresAt(data.key.expiresAt);
          setWebhookUrl(data.key.webhookUrl || '');
        } else {
          setHasKey(false);
          setActiveKey('');
          setTotalHits(0);
          setRemainingHits(0);
          setExpiresAt(null);
        }
      }
    } catch {
      setHasKey(false);
    } finally {
      setLoading(false);
    }
  }


  function copyKey() {
    if (!activeKey) return;
    navigator.clipboard.writeText(activeKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  async function runUidLookup() {
    if (!hasKey || !activeKey) {
      setValResult({ success: false, message: 'Active API key required. Please ask admin to assign an API key.' });
      return;
    }

    setValidating(true);
    setValResult(null);
    try {
      const res = await fetch('/api/v1/validate-uid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': activeKey,
        },
        body: JSON.stringify({ uid: valUid }),
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setValResult(data);
      } catch {
        setValResult({ success: false, message: `Server error (${res.status}): Please retry in a moment.` });
      }
    } catch (e: any) {
      setValResult({ success: false, message: e.message || 'Connection error' });
    } finally {
      setValidating(false);
    }
  }

  async function runTopupTest() {
    if (!hasKey || !activeKey) {
      setTestResult({ success: false, message: 'Active API key required. Please ask admin to assign an API key.' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': activeKey,
        },
        body: JSON.stringify({
          uid: testUid,
          pipeline: testPipeline,
          voucherCode: testVoucherCode,
        }),
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setTestResult(data);
        if (data.success && data.data?.remainingHits !== undefined) {
          setRemainingHits(data.data.remainingHits);
        }
      } catch {
        setTestResult({ success: false, message: `Server error (${res.status}): Please retry in a moment.` });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection error' });
    } finally {
      setTesting(false);
    }
  }

  const quotaPercentage = totalHits > 0 ? Math.round((remainingHits / totalHits) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white" suppressHydrationWarning>
      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandSettings.logoUrl ? (
              <Link href="/" className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-cyan-600/20 shrink-0 border border-slate-700 bg-slate-900">
                <Image src={brandSettings.logoUrl} alt="Brand Logo" fill className="object-cover" />
              </Link>
            ) : (
              <Link href="/" className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-cyan-600/30">
                {brandSettings.siteName.substring(0, 4).toUpperCase()}
              </Link>
            )}
            <span className="font-extrabold text-sm sm:text-lg bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              {brandSettings.siteName} • Client Portal
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
            <Link href="/docs" className="text-slate-400 hover:text-cyan-400 transition-colors">
              API Docs
            </Link>
            <button
              onClick={() => {
                if (typeof document !== 'undefined') {
                  document.cookie = 'admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                  document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                }
                window.location.href = '/login';
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 font-semibold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Welcome, {userName}!</h1>
            <p className="text-xs text-slate-400">{userEmail}</p>
          </div>
          <button
            onClick={fetchMyKey}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Key Status</span>
          </button>
        </div>

        {/* CASE 1: NO API KEY ASSIGNED BY ADMIN */}
        {!hasKey && !loading && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white">No Active API Key Assigned</h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                  Your account currently does not have an active API key assigned by the administrator. Once the admin creates and allocates an API key for your email ({userEmail}), your key, quota balance, and playground will appear here automatically.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">Need an API Key or Quota package?</span>
              <span className="text-cyan-400 font-bold">Contact Administrator for Key Assignment</span>
            </div>
          </div>
        )}

        {/* CASE 2: REAL API KEY ASSIGNED BY ADMIN */}
        {hasKey && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-auto">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Your Assigned API Key</span>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                  <code className="text-sm sm:text-base md:text-xl font-mono font-bold text-white bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 break-all select-all">
                    {activeKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 transition-colors"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400">Expiration Date</span>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">
                  {expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Active'}
                </p>
              </div>
            </div>

            {/* Quota Usage Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Remaining Quota Hits</span>
                <span className="text-cyan-400 font-mono">{remainingHits} / {totalHits} Hits ({quotaPercentage}%)</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                  style={{ width: `${quotaPercentage}%` }}
                />
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex-1 max-w-xl">
                <label className="block text-slate-400 mb-1 font-medium">Webhook Callback URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/api/webhooks/topup"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs"
                />
              </div>
              <button className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold self-end text-xs transition-colors">
                Save Webhook URL
              </button>
            </div>
          </div>
        )}

        {/* Interactive API Playground / Tester */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Form 1: Fast UID Lookup Tester */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-100">🔍 Player UID Validation Tester</h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                FREE (0 Quota)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Free Fire Player UID</label>
                <input
                  type="text"
                  value={valUid}
                  onChange={(e) => setValUid(e.target.value)}
                  placeholder="Enter Player UID (e.g. 4005814084)"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={runUidLookup}
                disabled={validating || !hasKey}
                className={`w-full py-2.5 rounded-lg font-bold text-white shadow-md transition-all ${
                  !hasKey
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {!hasKey
                  ? 'API Key Required to Validate'
                  : validating
                  ? 'Querying Garena Server...'
                  : 'Validate Player UID'}
              </button>

              {valResult && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] overflow-x-auto">
                  <pre className="text-emerald-300">{JSON.stringify(valResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Form 2: Voucher Topup Redemption Tester */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-100">🚀 Top-Up Redemption Playground</h3>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono">
                Deducts 1 Hit on Success
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Player UID</label>
                <input
                  type="text"
                  value={testUid}
                  onChange={(e) => setTestUid(e.target.value)}
                  placeholder="Enter Player UID"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Automation Pipeline</label>
                <select
                  value={testPipeline}
                  onChange={(e: any) => setTestPipeline(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="UNIPIN_VOUCHER">UniPin Voucher / Gift Card</option>
                  <option value="UNIPIN_WALLET">UniPin Direct Wallet Balance</option>
                  <option value="GARENA_SHELLS">Garena Shells</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Voucher Serial / PIN Code</label>
                <input
                  type="text"
                  value={testVoucherCode}
                  onChange={(e) => setTestVoucherCode(e.target.value)}
                  placeholder="Enter Voucher PIN (e.g. BDMB-xxxx-xxxx)"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={runTopupTest}
                disabled={testing || !hasKey}
                className={`w-full py-2.5 rounded-lg font-bold text-white shadow-md transition-all ${
                  !hasKey
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20'
                }`}
              >
                {!hasKey
                  ? 'API Key Required to Top-Up'
                  : testing
                  ? 'Executing Top-Up Automation...'
                  : 'Execute Instant Top-Up API'}
              </button>

              {testResult && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] overflow-x-auto">
                  <pre className={testResult.success ? 'text-cyan-300' : 'text-rose-300'}>
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
