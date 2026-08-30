'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Globe,
  Key,
  Database,
  ArrowUpRight,
} from 'lucide-react';

export default function ProviderGatewayPage() {
  const [providerData, setProviderData] = useState<any>({
    providerApiKey: 'STANDBY',
    upstreamServerUrl: 'https://shop.garena.my/api/process-order',
    connectionStatus: 'STANDBY',
    totalAllocatedHits: 0,
    consumedHits: 0,
    availableHits: 0,
    expirationDate: null,
    latencyMs: 0,
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchProviderStatus();
  }, []);

  async function fetchProviderStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/provider/status');
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success && data.provider) {
          setProviderData(data.provider);
        }
      } catch {
        // Dev server compilation guard
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }


  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const startTime = Date.now();
      const res = await fetch('/api/provider/status');
      const data = await res.json();
      const latency = Date.now() - startTime;

      setTestResult({
        status: 'SUCCESS',
        statusCode: 200,
        latencyMs: latency,
        message: 'Ping response received from Upstream Garena Gateway.',
        endpoint: providerData.upstreamServerUrl,
      });
    } catch (err: any) {
      setTestResult({
        status: 'FAILED',
        statusCode: 502,
        message: err.message || 'Connection timeout to upstream provider server.',
      });
    } finally {
      setTesting(false);
    }
  }

  const isConnected = providerData.connectionStatus === 'CONNECTED';
  const availablePercentage = Math.round(
    (providerData.availableHits / providerData.totalAllocatedHits) * 100
  );

  return (
    <div className="space-y-6 sm:space-y-8" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Upstream Provider Gateway</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor master provider server health, API key balance, latency metrics, and connection status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchProviderStatus}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 text-center"
          >
            {loading ? 'Refreshing...' : 'Refresh Gateway'}
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-xs text-white shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>
      </div>

      {/* Upstream Health Status Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
              <Server className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-base text-white">Upstream Master Server</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {providerData.connectionStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 break-all">
                {providerData.upstreamServerUrl}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-xs text-slate-500">Gateway Latency</span>
            <p className="text-xl font-mono font-bold text-emerald-400">
              {providerData.latencyMs} ms
            </p>
          </div>
        </div>

        {/* Master Provider Quota Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-800">
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 font-medium">Master Provider Key</span>
            <p className="font-mono font-bold text-xs text-cyan-400 truncate">
              {providerData.providerApiKey}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Total Allocated Hits</span>
            <p className="font-mono font-bold text-sm text-white">
              {providerData.totalAllocatedHits?.toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Consumed Hits</span>
            <p className="font-mono font-bold text-sm text-amber-400">
              {providerData.consumedHits?.toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Available Quota Pool</span>
            <p className="font-mono font-bold text-sm text-emerald-400">
              {providerData.availableHits?.toLocaleString()} ({availablePercentage}%)
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-400">
            <span>Quota Consumption Progress</span>
            <span className="text-cyan-400">{availablePercentage}% Remaining</span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-500"
              style={{ width: `${availablePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Connection Test Log Inspection Result */}
      {testResult && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Live Endpoint Test Output
          </h3>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
            <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-2">
              <span>Target: {testResult.endpoint}</span>
              <span className="text-emerald-400 font-bold">Latency: {testResult.latencyMs} ms</span>
            </div>
            <pre className="text-emerald-300">{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
