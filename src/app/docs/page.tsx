'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, LogOut } from 'lucide-react';

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<'topup' | 'uid' | 'errors'>('topup');
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

  const nodeSnippetTopup = `const axios = require('axios');

async function executeFreeFireTopup() {
  try {
    const response = await axios.post(
      'https://your-domain.com/api/v1/topup',
      {
        uid: '284910284',
        pipeline: 'UNIPIN_VOUCHER',
        voucherCode: 'BDMB-8921-9402',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'YOUR_API_KEY_HERE',
        },
      }
    );

    console.log('Top-Up Success:', response.data);
  } catch (error) {
    console.error('Top-Up Failed:', error.response?.data || error.message);
  }
}

executeFreeFireTopup();`;

  const curlSnippetTopup = `curl -X POST https://your-domain.com/api/v1/topup \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -d '{
    "uid": "284910284",
    "pipeline": "UNIPIN_VOUCHER",
    "voucherCode": "BDMB-8921-9402"
  }'`;

  const nodeSnippetUid = `const axios = require('axios');

async function validatePlayerUid() {
  const response = await axios.post(
    'https://your-domain.com/api/v1/validate-uid',
    { uid: '284910284' },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY_HERE',
      },
    }
  );

  console.log('Player Name:', response.data.data.playerName);
}`;

  const curlSnippetUid = `curl -X POST https://your-domain.com/api/v1/validate-uid \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -d '{"uid": "284910284"}'`;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-cyan-600/30">
              APEX
            </Link>
            <span className="font-extrabold text-sm sm:text-lg bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              API Documentation & SDK Reference
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
              <>
                <Link href="/userDashboard" className="text-slate-400 hover:text-cyan-400 transition-colors">
                  User Portal
                </Link>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-semibold text-white shadow-md shadow-cyan-600/30 transition-all hover:scale-105"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-white">Apex Top-Up B2B API Reference</h1>
          <p className="text-slate-400 text-sm mt-1">
            Authenticate your API requests using the <code className="text-cyan-400 font-mono">X-API-Key</code> header or query parameter <code className="text-cyan-400 font-mono">?apiKey=YOUR_KEY</code>.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('topup')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'topup' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            POST /api/v1/topup
          </button>
          <button
            onClick={() => setActiveTab('uid')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'uid' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            POST /api/v1/validate-uid
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'errors' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Error Status Codes & Abuse Defense
          </button>
        </div>

        {/* TAB 1: POST /api/v1/topup */}
        {activeTab === 'topup' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-black text-xs">POST</span>
                <code className="text-sm font-mono text-white">/api/v1/topup</code>
              </div>
              <p className="text-xs text-slate-400">
                Execute automated Free Fire top-up via UniPin Voucher (<code className="text-cyan-300">BDMB</code> / <code className="text-cyan-300">UPBD</code>), UniPin Wallet, or Garena Shells.
              </p>
            </div>

            {/* Request & Response Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-cyan-400 uppercase tracking-wider">Request Payload (JSON)</h3>
                <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "uid": "284910284",
  "pipeline": "UNIPIN_VOUCHER", // "UNIPIN_VOUCHER" | "UNIPIN_WALLET" | "GARENA_SHELLS"
  "voucherCode": "BDMB-8921-9402", // Required for UNIPIN_VOUCHER
  "serial": "BDMB", // Optional if voucherCode provided
  "pin": "89219402"  // Optional if voucherCode provided
}`}
                </pre>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-emerald-400 uppercase tracking-wider">Success Response (200 OK)</h3>
                <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "success": true,
  "message": "Top-up of 100+ Diamonds successfully executed for Player 🔥_ProShooter_BD_🔥.",
  "data": {
    "playerName": "🔥_ProShooter_BD_🔥",
    "orderId": "UP_1740001928_4920",
    "voucherType": "UniPin BD Mobile",
    "remainingHits": 841,
    "latencyMs": 1840
  }
}`}
                </pre>
              </div>
            </div>

            {/* Code Snippets */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-200">Ready-To-Use Ready Code Snippets</h3>

              {/* Node.js (Axios) */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400 font-bold">Node.js (Axios)</span>
                  <button
                    onClick={() => copyToClipboard(nodeSnippetTopup, 'node-topup')}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    {copiedSnippet === 'node-topup' ? '✓ Copied!' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                  {nodeSnippetTopup}
                </pre>
              </div>

              {/* cURL */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400 font-bold">cURL Command</span>
                  <button
                    onClick={() => copyToClipboard(curlSnippetTopup, 'curl-topup')}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    {copiedSnippet === 'curl-topup' ? '✓ Copied!' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                  {curlSnippetTopup}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POST /api/v1/validate-uid */}
        {activeTab === 'uid' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-black text-xs">POST</span>
                <code className="text-sm font-mono text-white">/api/v1/validate-uid</code>
              </div>
              <p className="text-xs text-slate-400">
                Verify player UID and fetch player nickname prior to redeeming vouchers. Does NOT deduct hits from your quota pool.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-cyan-400 uppercase tracking-wider">Request Payload (JSON)</h3>
                <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "uid": "284910284"
}`}
                </pre>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-emerald-400 uppercase tracking-wider">Response Payload (200 OK)</h3>
                <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
{`{
  "success": true,
  "valid": true,
  "data": {
    "uid": "284910284",
    "playerName": "🔥_ProShooter_BD_🔥",
    "region": "BD / MY / SG",
    "status": "ACTIVE_PLAYER"
  }
}`}
                </pre>
              </div>
            </div>

            {/* Code Snippets */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-200">Ready-To-Use Code Snippets</h3>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400 font-bold">Node.js (Axios)</span>
                  <button
                    onClick={() => copyToClipboard(nodeSnippetUid, 'node-uid')}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    {copiedSnippet === 'node-uid' ? '✓ Copied!' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                  {nodeSnippetUid}
                </pre>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400 font-bold">cURL Command</span>
                  <button
                    onClick={() => copyToClipboard(curlSnippetUid, 'curl-uid')}
                    className="text-cyan-400 hover:underline font-semibold"
                  >
                    {copiedSnippet === 'curl-uid' ? '✓ Copied!' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                  {curlSnippetUid}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Error Status Codes & Abuse Defense */}
        {activeTab === 'errors' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">API Error Status Codes & Quota Rules</h2>
              <p className="text-xs text-slate-400 mt-1">
                The API uses standard HTTP response status codes to indicate the outcome of an execution.
              </p>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">HTTP Status Code</th>
                    <th className="p-4">Error Reason</th>
                    <th className="p-4">Quota Deducted?</th>
                    <th className="p-4">Explanation & Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-emerald-400 font-bold">200 OK</td>
                    <td className="p-4 font-semibold text-white">SUCCESS</td>
                    <td className="p-4 font-bold text-emerald-400">Yes (1 Hit)</td>
                    <td className="p-4">Top-up confirmed and credited on Garena servers.</td>
                  </tr>

                  <tr className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-amber-400 font-bold">400 Bad Request</td>
                    <td className="p-4 font-semibold text-white">INVALID_UID</td>
                    <td className="p-4 font-bold text-slate-400">No (0 Hits)</td>
                    <td className="p-4">Player UID does not exist on Garena servers. Quota is preserved.</td>
                  </tr>

                  <tr className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-rose-400 font-bold">400 Bad Request</td>
                    <td className="p-4 font-semibold text-white">INVALID_VOUCHER</td>
                    <td className="p-4 font-bold text-amber-400">Abuse Penalty Only</td>
                    <td className="p-4">
                      Voucher code is invalid/used. No quota deducted for first 2 tries. Deducts 1 hit penalty if 3 consecutive invalid vouchers sent within 5 mins.
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-rose-400 font-bold">401 Unauthorized</td>
                    <td className="p-4 font-semibold text-white">INVALID_API_KEY</td>
                    <td className="p-4 font-bold text-slate-400">No</td>
                    <td className="p-4">API key header missing or invalid key specified.</td>
                  </tr>

                  <tr className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-rose-400 font-bold">429 Too Many Requests</td>
                    <td className="p-4 font-semibold text-white">QUOTA_EXHAUSTED / RATE_LIMIT</td>
                    <td className="p-4 font-bold text-slate-400">No</td>
                    <td className="p-4">Remaining quota hits equal 0 or RPS limit exceeded.</td>
                  </tr>

                  <tr className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-purple-400 font-bold">502 Bad Gateway</td>
                    <td className="p-4 font-semibold text-white">WORKER_ERROR</td>
                    <td className="p-4 font-bold text-slate-400">No (0 Hits)</td>
                    <td className="p-4">Puppeteer worker browser timeout or Garena maintenance. Quota is saved.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
