'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  Zap,
  Activity,
  Layers,
  DollarSign,
  Users,
  RefreshCw,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({
    totalKeys: 0,
    activeKeys: 0,
    inactiveKeys: 0,
    expiredKeys: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalUsers: 0,
  });

  const [weeklyTraffic, setWeeklyTraffic] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        if (data.stats) setStats(data.stats);
        if (data.weeklyTraffic) setWeeklyTraffic(data.weeklyTraffic);
        if (data.recentLogs) setRecentLogs(data.recentLogs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const successRate =
    stats.totalRequests > 0
      ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
      : '100.0';

  return (
    <div className="space-y-8" suppressHydrationWarning>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">System Telemetry & Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Live database counts, API execution traffic, and platform telemetry.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:border-slate-700 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top 5 Core Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Total Issued Keys</span>
            <Key className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{stats.totalKeys}</div>
            <span className="text-[11px] text-cyan-400 font-medium">{stats.activeKeys} Active Keys</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Registered Clients</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{stats.totalUsers}</div>
            <span className="text-[11px] text-blue-400 font-medium">B2B Users</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Total API Requests</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{stats.totalRequests.toLocaleString()}</div>
            <span className="text-[11px] text-emerald-400 font-medium">{stats.successfulRequests.toLocaleString()} Delivered</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Success Delivery Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{successRate}%</div>
            <span className="text-[11px] text-slate-400 font-medium">{stats.failedRequests} Failed Requests</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold">Expired Keys</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400 font-mono">{stats.expiredKeys}</div>
            <span className="text-[11px] text-slate-400 font-medium">{stats.inactiveKeys} Suspended</span>
          </div>
        </div>
      </div>

      {/* Traffic Chart and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Traffic Breakdown */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Past 7 Days API Traffic Log
            </h2>
            <span className="text-xs font-mono text-slate-400">Real-Time</span>
          </div>

          {weeklyTraffic.length > 0 ? (
            <div className="space-y-3 pt-2">
              {weeklyTraffic.map((day, idx) => {
                const maxVal = Math.max(...weeklyTraffic.map((d) => d.total), 1);
                const percent = Math.min(100, Math.round((day.total / maxVal) * 100));
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between font-mono text-slate-400">
                      <span className="font-bold text-slate-200">{day.day}</span>
                      <span>
                        <span className="text-cyan-400 font-bold">{day.total} Requests</span>
                        <span className="text-slate-600 mx-1.5">•</span>
                        <span className="text-emerald-400">{day.success} OK</span>
                        {day.failed > 0 && (
                          <>
                            <span className="text-slate-600 mx-1.5">•</span>
                            <span className="text-rose-400">{day.failed} Failed</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${day.total > 0 ? Math.max(5, percent) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              No API requests recorded in the past 7 days.
            </div>
          )}
        </div>

        {/* Engine Pipeline Status */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Active Automation Pipelines
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-200 block">UniPin BDMB / UPBD Voucher</span>
                <span className="text-slate-500 text-[11px]">Instant Voucher Redemption</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-200 block">Garena Live UID Resolver</span>
                <span className="text-slate-500 text-[11px]">Player Nickname Verification</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-200 block">UniPin Direct Wallet Balance</span>
                <span className="text-slate-500 text-[11px]">100+ Diamonds Batch Flow</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real Recent Transaction / API Execution Logs Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Recent Top-Up & API Execution Logs
          </h2>
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Live Activity
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">API Key</th>
                <th className="p-4">Player UID</th>
                <th className="p-4">Status</th>
                <th className="p-4">Latency</th>
                <th className="p-4">Quota Deducted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-mono text-xs">
                    No transactions or API calls recorded yet. Clean starting state.
                  </td>
                </tr>
              ) : (
                recentLogs.map((log: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-cyan-400 font-bold">{log.apiKey}</td>
                    <td className="p-4 font-mono text-slate-200 font-bold">{log.uid || '—'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          String(log.status).toLowerCase().includes('success')
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{log.latencyMs ? `${log.latencyMs}ms` : '—'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.quotaDeducted
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {log.quotaDeducted ? '1 Hit Deducted' : '0 Hits (Free / Refund)'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
