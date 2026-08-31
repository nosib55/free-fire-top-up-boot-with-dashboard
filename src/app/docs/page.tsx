'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<'topup' | 'uid' | 'packages' | 'errors'>('topup');
  const [activePipelineTab, setActivePipelineTab] = useState<'UNIPIN_VOUCHER' | 'GARENA_SHELLS'>('UNIPIN_VOUCHER');
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'node' | 'python' | 'php'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');

  useEffect(() => {
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
  }, []);

  function handleSignOut() {
    document.cookie = 'admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setIsLoggedIn(false);
  }

  const dashboardHref = userRole === 'admin' ? '/admin' : '/userDashboard';

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2000);
  }

  // Code snippet generators based on selected pipeline & language
  const codeSnippets = {
    UNIPIN_VOUCHER: {
      curl: `curl -X POST https://your-domain.com/api/topup \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -d '{
    "uid": "PLAYER_UID_HERE",
    "pipeline": "UNIPIN_VOUCHER",
    "voucherCode": "YOUR_VOUCHER_CODE"
  }'`,
      node: `const axios = require('axios');

async function executeTopup() {
  try {
    const response = await axios.post(
      'https://your-domain.com/api/topup',
      {
        uid: 'PLAYER_UID_HERE',
        pipeline: 'UNIPIN_VOUCHER',
        voucherCode: 'YOUR_VOUCHER_CODE' // UPBD or BDMB format
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'YOUR_API_KEY_HERE'
        }
      }
    );
    console.log('Top-Up Success:', response.data);
  } catch (error) {
    console.error('Top-Up Failed:', error.response?.data || error.message);
  }
}

executeTopup();`,
      python: `import requests

url = "https://your-domain.com/api/topup"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "YOUR_API_KEY_HERE"
}
payload = {
    "uid": "PLAYER_UID_HERE",
    "pipeline": "UNIPIN_VOUCHER",
    "voucherCode": "YOUR_VOUCHER_CODE"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
      php: `<?php
$curl = curl_init();

$payload = json_encode([
    "uid" => "PLAYER_UID_HERE",
    "pipeline" => "UNIPIN_VOUCHER",
    "voucherCode" => "YOUR_VOUCHER_CODE"
]);

curl_setopt_array($curl, [
    CURLOPT_URL => "https://your-domain.com/api/topup",
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
echo $response;`,
    },
    GARENA_SHELLS: {
      curl: `curl -X POST https://your-domain.com/api/topup \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -d '{
    "uid": "PLAYER_UID_HERE",
    "pipeline": "GARENA_SHELLS",
    "diamondPackageId": "WEEKLY_MEMBERSHIP"
  }'`,
      node: `const axios = require('axios');

async function buyGarenaDeals() {
  try {
    const response = await axios.post(
      'https://your-domain.com/api/topup',
      {
        uid: 'PLAYER_UID_HERE',
        pipeline: 'GARENA_SHELLS',
        diamondPackageId: 'WEEKLY_MEMBERSHIP', // WEEKLY_MEMBERSHIP | MONTHLY_MEMBERSHIP | LEVEL_UP_15
        playerLevel: 15 // Required only if buying LEVEL_UP passes
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'YOUR_API_KEY_HERE'
        }
      }
    );
    console.log('Garena Shell Order Success:', response.data);
  } catch (error) {
    console.error('Order Failed:', error.response?.data || error.message);
  }
}

buyGarenaDeals();`,
      python: `import requests

url = "https://your-domain.com/api/topup"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "YOUR_API_KEY_HERE"
}
payload = {
    "uid": "PLAYER_UID_HERE",
    "pipeline": "GARENA_SHELLS",
    "diamondPackageId": "WEEKLY_MEMBERSHIP"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
      php: `<?php
$curl = curl_init();

$payload = json_encode([
    "uid" => "PLAYER_UID_HERE",
    "pipeline" => "GARENA_SHELLS",
    "diamondPackageId" => "WEEKLY_MEMBERSHIP"
]);

curl_setopt_array($curl, [
    CURLOPT_URL => "https://your-domain.com/api/topup",
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
echo $response;`,
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white" suppressHydrationWarning>
      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-cyan-600/30">
              APEX
            </Link>
            <span className="font-extrabold text-sm sm:text-lg bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              API Documentation & Developer Guide
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
            <Link href="/" className="text-slate-400 hover:text-cyan-400 transition-colors">
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header Hero */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20 border border-slate-800 space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest font-mono">
            B2B AUTOMATION GATEWAY V2.4
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Free Fire Instant Top-Up API Reference
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Integrate high-speed automated diamond top-ups, voucher redemption (UniPin BDMB & UPBD), Garena Shells special deals, and free player UID nickname validation.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
            <span className="text-slate-400">Authentication:</span>
            <code className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-cyan-400 font-bold">
              X-API-Key: YOUR_API_KEY
            </code>
            <span className="text-slate-500">or query:</span>
            <code className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-300">
              ?apiKey=YOUR_API_KEY
            </code>
          </div>
        </div>

        {/* Main Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar touch-pan-x">
          <button
            onClick={() => setActiveTab('topup')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'topup' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>POST /api/topup (Top-Up Engine)</span>
          </button>

          <button
            onClick={() => setActiveTab('uid')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'uid' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>POST /api/validate-uid (Free UID Lookup)</span>
          </button>

          <button
            onClick={() => setActiveTab('packages')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'packages' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Package IDs & Deals Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'errors' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Error Status Codes & Rules</span>
          </button>
        </div>

        {/* ==================== TAB 1: POST /api/topup ==================== */}
        {activeTab === 'topup' && (
          <div className="space-y-6">
            {/* Endpoint Summary Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-black text-xs">POST</span>
                <code className="text-sm font-mono text-white font-bold">/api/topup</code>
                <span className="text-[11px] text-slate-400 font-mono">Deducts 1 Quota Hit strictly on confirmed success</span>
              </div>
              <p className="text-xs text-slate-400">
                Execute diamond redemptions for Free Fire players via 3 automated pipelines.
              </p>
            </div>

            {/* Pipeline Selector Sub-Tabs */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Select Pipeline to View Specs & Code:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setActivePipelineTab('UNIPIN_VOUCHER')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activePipelineTab === 'UNIPIN_VOUCHER'
                      ? 'bg-cyan-600/10 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">1. UniPin Voucher / PIN</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      UPBD / BDMB
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Redeem BDMB & UPBD physical voucher cards & PINs automatically into player account.
                  </p>
                </button>

                <button
                  onClick={() => setActivePipelineTab('GARENA_SHELLS')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    activePipelineTab === 'GARENA_SHELLS'
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">2. Garena Shells Deals</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Special Deals
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Weekly / Monthly Memberships & Level Up passes directly via Garena Shells balance.
                  </p>
                </button>
              </div>
            </div>

            {/* Request Payload and Response Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Specification */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-4 h-4" /> Request Payload (JSON)
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">POST /api/topup</span>
                </div>

                {activePipelineTab === 'UNIPIN_VOUCHER' && (
                  <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "uid": "PLAYER_UID_HERE",
  "pipeline": "UNIPIN_VOUCHER",
  "voucherCode": "YOUR_VOUCHER_CODE" 
  // Supports:
  // 1. Full string: "UPBD-B-S-00123456 1234567890123456"
  // 2. BDMB format: "BDMB-8921-9402"
  // 3. Or split: "serial": "BDMB", "pin": "89219402"
}`}
                  </pre>
                )}

                {activePipelineTab === 'GARENA_SHELLS' && (
                  <pre className="text-xs font-mono text-amber-200 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "uid": "PLAYER_UID_HERE",
  "pipeline": "GARENA_SHELLS",
  "diamondPackageId": "WEEKLY_MEMBERSHIP"
  // Options:
  // "WEEKLY_MEMBERSHIP"
  // "MONTHLY_MEMBERSHIP"
  // "WEEKLY_LITE"
  // "LEVEL_UP_6"  (Requires playerLevel >= 6)
  // "LEVEL_UP_10" (Requires playerLevel >= 10)
  // "LEVEL_UP_15" (Requires playerLevel >= 15)
  // "LEVEL_UP_20" (Requires playerLevel >= 20)
  // "LEVEL_UP_25" (Requires playerLevel >= 25)
  // "LEVEL_UP_30" (Requires playerLevel >= 30)
}`}
                  </pre>
                )}
              </div>

              {/* Success Response */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Success Response (200 OK)
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    1 Quota Deducted
                  </span>
                </div>

                <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "success": true,
  "message": "Free Fire top-up executed successfully.",
  "data": {
    "uid": "PLAYER_UID_HERE",
    "pipeline": "${activePipelineTab}",
    "transactionId": "TX_1740001928492",
    "playerName": "🔥_ProShooter_BD_🔥",
    "remainingHits": 949,
    "latencyMs": 1420
  }
}`}
                </pre>
              </div>
            </div>

            {/* Ready-To-Use Multi-Language Code Snippets */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white">Execute Request in Code:</span>
                </div>

                {/* Language Selectors */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['curl', 'node', 'python', 'php'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        selectedLanguage === lang
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(codeSnippets[activePipelineTab][selectedLanguage], `${activePipelineTab}-${selectedLanguage}`)
                  }
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold transition-colors"
                >
                  {copiedSnippet === `${activePipelineTab}-${selectedLanguage}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSnippet === `${activePipelineTab}-${selectedLanguage}` ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="p-4 sm:p-5 text-xs font-mono text-slate-200 overflow-x-auto touch-pan-x bg-slate-950/60 leading-relaxed">
                {codeSnippets[activePipelineTab][selectedLanguage]}
              </pre>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: POST /api/validate-uid ==================== */}
        {activeTab === 'uid' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-black text-xs">POST</span>
                <code className="text-sm font-mono text-white font-bold">/api/validate-uid</code>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  100% FREE (0 Quota Deducted)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verify whether a Free Fire player UID is genuine and retrieve their live in-game nickname prior to taking customer payments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-cyan-400 uppercase tracking-wider">Request Payload (JSON)</h3>
                <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "uid": "PLAYER_UID_HERE"
}`}
                </pre>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-emerald-400 uppercase tracking-wider">Response (200 OK)</h3>
                <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "success": true,
  "valid": true,
  "data": {
    "uid": "PLAYER_UID_HERE",
    "playerName": "🔥_ProShooter_BD_🔥",
    "region": "BD / SG / MY",
    "status": "ACTIVE_PLAYER"
  }
}`}
                </pre>
              </div>
            </div>

            {/* Quick cURL for validate-uid */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs">
                <span className="font-mono text-slate-400 font-bold">cURL Command</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST https://your-domain.com/api/validate-uid \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: YOUR_API_KEY" \\\n  -d '{"uid": "PLAYER_UID_HERE"}'`,
                      'curl-uid'
                    )
                  }
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  {copiedSnippet === 'curl-uid' ? '✓ Copied!' : 'Copy Code'}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto">
{`curl -X POST https://your-domain.com/api/validate-uid \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"uid": "PLAYER_UID_HERE"}'`}
              </pre>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: PACKAGE CATALOG & IDENTIFIERS ==================== */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Supported Package Identifiers (`diamondPackageId` / `itemType`)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Pass these exact string values in your JSON request under <code className="text-cyan-400 font-mono">diamondPackageId</code>.
              </p>
            </div>

            {/* Garena Shells Special Deals Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Pipeline: GARENA_SHELLS (Memberships & Level Up Passes)
              </h3>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
                <div className="overflow-x-auto touch-pan-x">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Item / Deal Name</th>
                        <th className="p-3.5">diamondPackageId (JSON Value)</th>
                        <th className="p-3.5">Level Requirement</th>
                        <th className="p-3.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Weekly Membership</td>
                        <td className="p-3.5 text-amber-400 font-bold">WEEKLY_MEMBERSHIP</td>
                        <td className="p-3.5 text-slate-400 font-sans">None</td>
                        <td className="p-3.5 font-sans text-slate-400">Delivers weekly membership benefits to player</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Monthly Membership</td>
                        <td className="p-3.5 text-amber-400 font-bold">MONTHLY_MEMBERSHIP</td>
                        <td className="p-3.5 text-slate-400 font-sans">None</td>
                        <td className="p-3.5 font-sans text-slate-400">Delivers monthly membership benefits to player</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Weekly Lite</td>
                        <td className="p-3.5 text-amber-400 font-bold">WEEKLY_LITE</td>
                        <td className="p-3.5 text-slate-400 font-sans">None</td>
                        <td className="p-3.5 font-sans text-slate-400">Lite weekly subscription tier</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Level Up Pass - Level 6</td>
                        <td className="p-3.5 text-cyan-400 font-bold">LEVEL_UP_6</td>
                        <td className="p-3.5 text-emerald-400 font-sans font-bold">Player Level &ge; 6</td>
                        <td className="p-3.5 font-sans text-slate-400">Requires player in-game level to be 6 or higher</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Level Up Pass - Level 10</td>
                        <td className="p-3.5 text-cyan-400 font-bold">LEVEL_UP_10</td>
                        <td className="p-3.5 text-emerald-400 font-sans font-bold">Player Level &ge; 10</td>
                        <td className="p-3.5 font-sans text-slate-400">Requires player in-game level to be 10 or higher</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Level Up Pass - Level 15</td>
                        <td className="p-3.5 text-cyan-400 font-bold">LEVEL_UP_15</td>
                        <td className="p-3.5 text-emerald-400 font-sans font-bold">Player Level &ge; 15</td>
                        <td className="p-3.5 font-sans text-slate-400">Requires player in-game level to be 15 or higher</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Level Up Pass - Level 20</td>
                        <td className="p-3.5 text-cyan-400 font-bold">LEVEL_UP_20</td>
                        <td className="p-3.5 text-emerald-400 font-sans font-bold">Player Level &ge; 20</td>
                        <td className="p-3.5 font-sans text-slate-400">Requires player in-game level to be 20 or higher</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Level Up Pass - Level 25</td>
                        <td className="p-3.5 text-cyan-400 font-bold">LEVEL_UP_25</td>
                        <td className="p-3.5 text-emerald-400 font-sans font-bold">Player Level &ge; 25</td>
                        <td className="p-3.5 font-sans text-slate-400">Requires player in-game level to be 25 or higher</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-sans font-bold text-white">Level Up Pass - Level 30</td>
                        <td className="p-3.5 text-cyan-400 font-bold">LEVEL_UP_30</td>
                        <td className="p-3.5 text-emerald-400 font-sans font-bold">Player Level &ge; 30</td>
                        <td className="p-3.5 font-sans text-slate-400">Requires player in-game level to be 30 or higher</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: ERROR CODES & RULES ==================== */}
        {activeTab === 'errors' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">HTTP Error Status Codes & Quota Protection Rules</h2>
              <p className="text-xs text-slate-400 mt-1">
                The gateway guarantees that quota hits are only deducted when the top-up order is successfully confirmed on Garena.
              </p>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
              <div className="overflow-x-auto touch-pan-x">
                <table className="w-full text-left text-xs text-slate-300 min-w-[680px]">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-4">HTTP Status</th>
                      <th className="p-4">errorReason</th>
                      <th className="p-4">Quota Deducted?</th>
                      <th className="p-4">Platform Behavior & Handling</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-emerald-400 font-bold">200 OK</td>
                      <td className="p-4 font-semibold text-white">SUCCESS</td>
                      <td className="p-4 font-bold text-emerald-400">Yes (1 Hit)</td>
                      <td className="p-4 text-slate-300">Diamonds or special deal successfully credited on Garena.</td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-amber-400 font-bold">400 Bad Request</td>
                      <td className="p-4 font-semibold text-white">INVALID_UID</td>
                      <td className="p-4 font-bold text-slate-400">No (0 Hits)</td>
                      <td className="p-4 text-slate-300">Player UID does not exist on Garena servers. Quota is saved.</td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-amber-400 font-bold">400 Bad Request</td>
                      <td className="p-4 font-semibold text-white">INSUFFICIENT_LEVEL</td>
                      <td className="p-4 font-bold text-slate-400">No (0 Hits)</td>
                      <td className="p-4 text-slate-300">Player level is below the required level for the selected Level-Up Pass.</td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-rose-400 font-bold">400 Bad Request</td>
                      <td className="p-4 font-semibold text-white">INVALID_VOUCHER</td>
                      <td className="p-4 font-bold text-amber-400">Anti-Abuse Rule</td>
                      <td className="p-4 text-slate-300">Voucher code is already used or invalid. No quota deducted for first 2 failed attempts.</td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-rose-400 font-bold">401 Unauthorized</td>
                      <td className="p-4 font-semibold text-white">INVALID_API_KEY</td>
                      <td className="p-4 font-bold text-slate-400">No</td>
                      <td className="p-4 text-slate-300">X-API-Key header is missing, incorrect, or key is revoked.</td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-rose-400 font-bold">429 Too Many Requests</td>
                      <td className="p-4 font-semibold text-white">QUOTA_EXHAUSTED</td>
                      <td className="p-4 font-bold text-slate-400">No</td>
                      <td className="p-4 text-slate-300">Your assigned API key has 0 remaining hits or exceeded rate limits (RPS).</td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="p-4 font-mono text-purple-400 font-bold">502 Bad Gateway</td>
                      <td className="p-4 font-semibold text-white">WORKER_ERROR</td>
                      <td className="p-4 font-bold text-slate-400">No (0 Hits)</td>
                      <td className="p-4 text-slate-300">Puppeteer worker gateway drop or Garena maintenance. Quota is preserved.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
