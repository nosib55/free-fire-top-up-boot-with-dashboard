'use client';

import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Globe,
  Key,
  Code2,
  Terminal,
  Layers,
} from 'lucide-react';

export default function IntegrationGuidePage() {
  const [baseUrl, setBaseUrl] = useState('https://topup-api.com');
  const [sampleKey, setSampleKey] = useState('KEY_A1B2C3D4E5F67890');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const endpointUrl = `${baseUrl}/api/process-order`;

  const nodeSnippet = `const axios = require('axios');

async function processTopupOrder() {
  try {
    const response = await axios.post(
      '${endpointUrl}',
      {
        uid: '284910284',
        pipeline: 'UNIPIN_VOUCHER',
        voucherCode: 'BDMB-8921-9402'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': '${sampleKey}'
        }
      }
    );

    console.log('Order Processed Successfully:', response.data);
  } catch (error) {
    console.error('Order Failed:', error.response?.data || error.message);
  }
}

processTopupOrder();`;

  const curlSnippet = `curl -X POST ${endpointUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: ${sampleKey}" \\
  -d '{
    "uid": "284910284",
    "pipeline": "UNIPIN_VOUCHER",
    "voucherCode": "BDMB-8921-9402"
  }'`;

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2000);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8" suppressHydrationWarning>
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Downstream Client Integration Guide</h1>
        <p className="text-xs text-slate-400 mt-1">
          Shareable API endpoint documentation, request header specs, and payload builder for downstream buyers and resellers.
        </p>
      </div>

      {/* URL Builder Interactive Tool */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Interactive API Endpoint URL Builder
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Your API SaaS Base Domain</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Sample X-API-KEY</label>
            <input
              type="text"
              value={sampleKey}
              onChange={(e) => setSampleKey(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium whitespace-nowrap">Generated Endpoint:</span>
          <code className="text-cyan-400 font-mono font-bold break-all">{endpointUrl}</code>
        </div>
      </div>

      {/* Payload Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            Request Header Specifications
          </h3>
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-2 text-cyan-400 font-bold">Content-Type</td>
                <td className="py-2 text-slate-300">application/json</td>
              </tr>
              <tr>
                <td className="py-2 text-cyan-400 font-bold">X-API-KEY</td>
                <td className="py-2 text-slate-300">Your assigned API Key</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Supported Top-Up Pipelines
          </h3>
          <ul className="text-xs text-slate-300 space-y-1 font-mono">
            <li>• <code className="text-cyan-300">UNIPIN_VOUCHER</code> (UniPin BDMB & UPBD Voucher / PIN)</li>
          </ul>
        </div>
      </div>

      {/* Code Snippets */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Ready-To-Use Downstream Code Snippets
        </h3>

        {/* Node.js */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-mono text-slate-400 font-bold">Node.js (Axios)</span>
            <button
              onClick={() => copyText(nodeSnippet, 'node')}
              className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              {copiedSnippet === 'node' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSnippet === 'node' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto touch-pan-x">
            {nodeSnippet}
          </pre>
        </div>

        {/* cURL */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-mono text-slate-400 font-bold">cURL Command</span>
            <button
              onClick={() => copyText(curlSnippet, 'curl')}
              className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              {copiedSnippet === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSnippet === 'curl' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto touch-pan-x">
            {curlSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
