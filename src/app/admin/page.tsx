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
  Send,
  Calendar,
  Filter,
  Check,
  Search,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days'>('all');
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
  const [userBreakdowns, setUserBreakdowns] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    fetchStats(range);
  }, [range]);

  async function fetchStats(selectedRange: string = range) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?range=${selectedRange}`);
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success) {
          if (data.stats) setStats(data.stats);
          if (data.weeklyTraffic) setWeeklyTraffic(data.weeklyTraffic);
          if (data.userBreakdowns) setUserBreakdowns(data.userBreakdowns);
          if (data.recentLogs) setRecentLogs(data.recentLogs);
        }
      } catch {}
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTelegramReport() {
    setSendingTelegram(true);
    setTelegramNotice(null);
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_TELEGRAM_REPORT',
          range,
        }),
      });
      const data = await res.json();
      setTelegramNotice(data.message || 'Report sent to Telegram!');
      setTimeout(() => setTelegramNotice(null), 4000);
    } catch (err: any) {
      setTelegramNotice(err.message || 'Failed to dispatch Telegram report.');
      setTimeout(() => setTelegramNotice(null), 4000);
    } finally {
      setSendingTelegram(false);
    }
  }

  const successRate =
    stats.totalRequests > 0
      ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
      : '100.0';

  const filteredUsers = userBreakdowns.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.apiKey.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Calculate bottom totals for user breakdown
  const totalAllocatedHits = userBreakdowns.reduce((acc, u) => acc + (u.totalHits || 0), 0);
  const totalRemainingHits = userBreakdowns.reduce((acc, u) => acc + (u.remainingHits || 0), 0);
  const totalBreakdownReqs = userBreakdowns.reduce((acc, u) => acc + (u.totalRequests || 0), 0);
  const totalBreakdownSuccess = userBreakdowns.reduce((acc, u) => acc + (u.successRequests || 0), 0);
  const totalBreakdownFailed = userBreakdowns.reduce((acc, u) => acc + (u.failedRequests || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8" suppressHydrationWarning>
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            System Telemetry & Client Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time API traffic metrics, user request breakdown, and scheduled report generator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Send Telegram Report Button */}
          <button
            onClick={handleSendTelegramReport}
            disabled={sendingTelegram}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all shadow-sm"
          >
            <Send className={`w-3.5 h-3.5 ${sendingTelegram ? 'animate-bounce' : ''}`} />
            <span>{sendingTelegram ? 'Dispatching...' : 'Send Telegram Report'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:border-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Telegram Notice Toast */}
      {telegramNotice && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{telegramNotice}</span>
        </div>
      )}

      {/* Time Range Filter Bar */}
      <div className="p-1.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 px-3 text-slate-400 font-bold">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span>Filter Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today (আজ)' },
            { id: 'yesterday', label: 'Yesterday (গতকাল)' },
            { id: '7days', label: 'Last 7 Days (৭ দিন)' },
            { id: '30days', label: 'Last 30 Days (১ মাস)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRange(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                range === tab.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 5 Core Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Total Issued Keys</span>
            <Key className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">{stats.totalKeys}</div>
            <span className="text-[10px] sm:text-[11px] text-cyan-400 font-medium">{stats.activeKeys} Active</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Client Users</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">{stats.totalUsers}</div>
            <span className="text-[10px] sm:text-[11px] text-indigo-400 font-medium">Active Accounts</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Filtered Requests</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">{stats.totalRequests.toLocaleString()}</div>
            <span className="text-[10px] sm:text-[11px] text-amber-400 font-medium capitalize">{range} period</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Success Top-Ups</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">{stats.successfulRequests.toLocaleString()}</div>
            <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium">{successRate}% Success Rate</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Failed / Skipped</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">{stats.failedRequests.toLocaleString()}</div>
            <span className="text-[10px] sm:text-[11px] text-rose-400 font-medium">
              {stats.totalRequests > 0
                ? ((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)
                : '0.0'}
              % Error Rate
            </span>
          </div>
        </div>
      </div>

      {/* User-Wise Usage Breakdown Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>User-Wise Usage & Request Breakdown</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive request tally and quota remaining per registered client for {range} period.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user or email..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* User Breakdown Table */}
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300 min-w-[750px]">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">User / Client</th>
                <th className="p-3.5">API Key</th>
                <th className="p-3.5">Quota Remaining</th>
                <th className="p-3.5">Total Requests</th>
                <th className="p-3.5">Success Hits</th>
                <th className="p-3.5">Failed Hits</th>
                <th className="p-3.5">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    No client records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const uSuccessPercent =
                    u.totalRequests > 0 ? Math.round((u.successRequests / u.totalRequests) * 100) : 100;

                  return (
                    <tr key={u.userId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-medium">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-cyan-400 font-bold">
                        {u.apiKey}
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="font-bold text-emerald-400">{u.remainingHits.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500"> / {u.totalHits.toLocaleString()}</span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white">
                        {u.totalRequests.toLocaleString()}
                      </td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">
                        {u.successRequests.toLocaleString()}
                        <span className="text-[10px] text-slate-500 font-normal ml-1">({uSuccessPercent}%)</span>
                      </td>
                      <td className="p-3.5 font-mono text-rose-400 font-bold">
                        {u.failedRequests.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(u.lastActive).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Total Summary Footer Row */}
            <tfoot className="bg-slate-950/90 font-bold text-slate-200 border-t-2 border-slate-700">
              <tr>
                <td className="p-3.5 uppercase tracking-wider text-cyan-400">Total Summary</td>
                <td className="p-3.5 text-slate-400 font-mono">{filteredUsers.length} Users</td>
                <td className="p-3.5 font-mono text-emerald-400">
                  {totalRemainingHits.toLocaleString()} <span className="text-slate-500 text-[10px]">/ {totalAllocatedHits.toLocaleString()}</span>
                </td>
                <td className="p-3.5 font-mono text-white">{totalBreakdownReqs.toLocaleString()}</td>
                <td className="p-3.5 font-mono text-emerald-400">{totalBreakdownSuccess.toLocaleString()}</td>
                <td className="p-3.5 font-mono text-rose-400">{totalBreakdownFailed.toLocaleString()}</td>
                <td className="p-3.5 text-[11px] text-slate-400">Calculated live</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bottom Grid: 7-Day Velocity Chart & Live Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Velocity Chart */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>7-Day Request Velocity</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Daily Execution Volume</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {weeklyTraffic.map((day, idx) => {
              const maxReq = Math.max(...weeklyTraffic.map((d) => d.total), 10);
              const heightPct = Math.max(12, Math.round((day.total / maxReq) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.total}
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:brightness-125 transition-all shadow-md shadow-cyan-500/10"
                  />
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-400 transition-colors">
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Transaction Stream */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Latest Live Executions</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Streamed Records</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
            {recentLogs.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">No recent transactions recorded.</div>
            ) : (
              recentLogs.map((log) => {
                const isSuccess = log.status === 'SUCCESS';
                return (
                  <div
                    key={log._id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSuccess ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                      <span className="font-mono text-cyan-300 font-bold">{log.uid || 'Player UID'}</span>
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                        {log.endpoint || '/api/topup'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[10px]">
                      <span className="text-slate-400">{log.latencyMs ? `${log.latencyMs}ms` : '420ms'}</span>
                      <span className={isSuccess ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
