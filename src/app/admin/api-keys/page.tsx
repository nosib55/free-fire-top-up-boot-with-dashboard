'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Key,
  Plus,
  RefreshCw,
  Copy,
  Check,
  X,
  Clock,
  Search,
  Edit3,
  Calendar,
  Infinity as InfinityIcon,
  ShieldCheck,
  Zap,
  User,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface ApiKeyItem {
  _id: string;
  key: string;
  name?: string;
  ownerId?: { _id: string; name?: string; email?: string };
  userRef?: { _id: string; name?: string; email?: string };
  totalLimit?: number;
  totalHits?: number;
  usedCount?: number;
  usedHits?: number;
  remainingHits?: number;
  rateLimitRPS?: number;
  expiresAt: string;
  status: string;
  isActive?: boolean;
  createdAt?: string;
}

export default function ApiKeyManagerPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'>('ALL');

  // Generate Key Modal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [totalLimit, setTotalLimit] = useState('500');
  const [expiryDays, setExpiryDays] = useState('30');
  const [keyPrefix, setKeyPrefix] = useState('AMS');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Unified Edit Modal State
  const [editingKey, setEditingKey] = useState<ApiKeyItem | null>(null);
  const [editTotalLimit, setEditTotalLimit] = useState<string>('1000');
  const [editExpiryMode, setEditExpiryMode] = useState<'EXTEND_DAYS' | 'SET_DATE' | 'UNLIMITED'>('EXTEND_DAYS');
  const [editExtendDays, setEditExtendDays] = useState<string>('30');
  const [editTargetDate, setEditTargetDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editRateLimitRPS, setEditRateLimitRPS] = useState<string>('5');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Key Modal State
  const [deletingKey, setDeletingKey] = useState<ApiKeyItem | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys(isSilent = false) {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/keys/list');
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys || []);
      }
    } catch (e) {
      console.error('Failed to fetch keys:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleAutoGenerate16Token() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 16; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = keyPrefix.trim() ? `${keyPrefix.trim().toUpperCase()}_` : '';
    setCustomKey(`${prefix}${rand}`);
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      const res = await fetch('/api/keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: customKey || undefined,
          userEmail,
          totalLimit,
          expiryDays: Number(expiryDays) || 30,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGenerateModalOpen(false);
        setCustomKey('');
        setUserEmail('');
        fetchKeys(true);
      } else {
        alert(data.message || 'Key creation failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingCreate(false);
    }
  }

  // Open Unified Edit Modal
  function openEditModal(keyItem: ApiKeyItem) {
    setEditingKey(keyItem);
    const total = keyItem.totalLimit !== undefined ? keyItem.totalLimit : keyItem.totalHits || 1000;
    setEditTotalLimit(total.toString());
    setEditStatus(keyItem.status || (keyItem.isActive ? 'active' : 'suspended'));
    setEditRateLimitRPS((keyItem.rateLimitRPS || 5).toString());

    const isUnlimited = new Date(keyItem.expiresAt).getFullYear() > 2090;
    if (isUnlimited) {
      setEditExpiryMode('UNLIMITED');
      setEditExtendDays('30');
      setEditTargetDate('');
    } else {
      setEditExpiryMode('EXTEND_DAYS');
      setEditExtendDays('30');
      // Format current expiry date for HTML date picker (YYYY-MM-DD)
      try {
        const d = new Date(keyItem.expiresAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setEditTargetDate(`${yyyy}-${mm}-${dd}`);
      } catch {
        setEditTargetDate('');
      }
    }
  }

  // Save Unified Edit Modal
  async function handleSaveUnifiedEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingKey) return;
    setSubmittingEdit(true);

    try {
      const res = await fetch('/api/keys/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: editingKey._id,
          action: 'EDIT_KEY',
          totalLimit: editTotalLimit,
          expiryMode: editExpiryMode,
          extendDays: editExpiryMode === 'EXTEND_DAYS' ? editExtendDays : undefined,
          targetDate: editExpiryMode === 'SET_DATE' ? editTargetDate : undefined,
          status: editStatus,
          rateLimitRPS: editRateLimitRPS,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingKey(null);
        fetchKeys(true);
      } else {
        alert(data.message || 'Failed to update API key');
      }
    } catch (e: any) {
      alert(e.message || 'An error occurred');
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function confirmDeleteApiKey() {
    if (!deletingKey) return;
    setDeletingLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/keys/list?keyId=${deletingKey._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data.message || 'Failed to delete API key');
        return;
      }

      setKeys((prev) => prev.filter((k) => k._id !== deletingKey._id));
      if (editingKey?._id === deletingKey._id) {
        setEditingKey(null);
      }
      setDeleteSuccessMsg(`API Key '${deletingKey.key}' deleted successfully.`);
      setTimeout(() => setDeleteSuccessMsg(null), 4000);
      setDeletingKey(null);
    } catch (e: any) {
      setDeleteError(e?.message || 'Error deleting key');
    } finally {
      setDeletingLoading(false);
    }
  }

  function copyKeyToClipboard(keyStr: string) {
    navigator.clipboard.writeText(keyStr);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Filtered keys
  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      const isExpired = new Date() > new Date(k.expiresAt);
      const isRevoked = !k.isActive || k.status === 'suspended';

      if (filterStatus === 'ACTIVE' && (isExpired || isRevoked)) return false;
      if (filterStatus === 'EXPIRED' && !isExpired) return false;
      if (filterStatus === 'SUSPENDED' && !isRevoked) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const keyMatch = k.key.toLowerCase().includes(q);
      const emailMatch = (k.userRef?.email || k.ownerId?.email || '').toLowerCase().includes(q);
      const nameMatch = (k.userRef?.name || k.ownerId?.name || '').toLowerCase().includes(q);
      return keyMatch || emailMatch || nameMatch;
    });
  }, [keys, filterStatus, searchQuery]);

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest font-mono">
              KEY MANAGEMENT & QUOTA
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            API Key Manager & Licensing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate cryptographic tokens, allocate quota pools, configure expiration modes, and manage rate limits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => fetchKeys(true)}
            disabled={refreshing || loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              handleAutoGenerate16Token();
              setGenerateModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-xs text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Generate API Key</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by API key, owner name, or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-sans"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto no-scrollbar touch-pan-x">
          {(['ALL', 'ACTIVE', 'EXPIRED', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filterStatus === st
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? `All (${keys.length})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification */}
      {deleteSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteSuccessMsg}</span>
          </div>
          <button onClick={() => setDeleteSuccessMsg(null)} className="text-emerald-400/80 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API Keys Data Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto touch-pan-x">
          <table className="w-full text-left text-xs text-slate-300 min-w-[760px]">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3.5 px-4">API Key Token</th>
                <th className="py-3.5 px-4">Assigned User</th>
                <th className="py-3.5 px-4 text-center">Quota Pool</th>
                <th className="py-3.5 px-4">Expiration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                      <span className="text-xs font-semibold text-slate-400">Loading API keys...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Key className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-300 text-sm">No API keys match your criteria</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery ? 'Try adjusting your search query.' : 'Click "Generate API Key" to issue a new token.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredKeys.map((k) => {
                  const total = k.totalLimit !== undefined && k.totalLimit > 0 ? k.totalLimit : (k.totalHits || 1000);
                  const available = k.remainingHits !== undefined
                    ? k.remainingHits
                    : Math.max(0, total - (k.usedHits !== undefined && k.usedHits > 0 ? k.usedHits : (k.usedCount || 0)));
                  const used = Math.max(k.usedHits || 0, k.usedCount || 0, total - available);
                  const isUnlimited = new Date(k.expiresAt).getFullYear() > 2090;
                  const isExpired = !isUnlimited && new Date() > new Date(k.expiresAt);
                  const isRevoked = !k.isActive || k.status === 'suspended';

                  return (
                    <tr key={k._id} className="hover:bg-slate-800/40 transition-colors">
                      {/* FIX: API Key Token - horizontal one-line with whitespace-nowrap */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                          <code className="font-mono text-cyan-400 font-bold text-xs select-all tracking-wide whitespace-nowrap">
                            {k.key}
                          </code>
                          <button
                            onClick={() => copyKeyToClipboard(k.key)}
                            className="text-slate-500 hover:text-cyan-300 p-1 rounded-md hover:bg-slate-800/80 transition-colors"
                            title="Copy Key to Clipboard"
                          >
                            {copiedKey === k.key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Assigned User */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white truncate max-w-[180px]">
                          {k.userRef?.name || k.ownerId?.name || 'Developer Client'}
                        </div>
                        <span className="block text-[11px] font-mono text-slate-500 truncate max-w-[180px]">
                          {k.userRef?.email || k.ownerId?.email || 'unassigned@portal.local'}
                        </span>
                      </td>

                      {/* Compact Quota Pool */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-emerald-400 font-bold" title="Available Hits">
                            {available.toLocaleString()}
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className="text-slate-400" title="Total Allocated Hits">
                            {total.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-24 bg-slate-950 h-1.5 rounded-full mx-auto mt-1 overflow-hidden border border-slate-800">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all"
                            style={{
                              width: `${total > 0 ? Math.min(100, Math.round((available / total) * 100)) : 0}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Expiration */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isUnlimited ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                            <InfinityIcon className="w-3 h-3" /> Never Expires
                          </span>
                        ) : (
                          <div className="font-mono text-[11px]">
                            <span className={isExpired ? 'text-rose-400 font-bold' : 'text-slate-300 font-medium'}>
                              {new Date(k.expiresAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {new Date(k.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isRevoked
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isExpired
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRevoked ? 'bg-rose-400' : isExpired ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          {isRevoked ? 'Suspended' : isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>

                      {/* Unified Actions Column */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(k)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 hover:border-cyan-500 transition-all shadow-sm"
                            title="Edit Key & Quota"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingKey(k);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs border border-slate-700 hover:border-rose-500 transition-all shadow-sm"
                            title="Delete API Key"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-white" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== UNIFIED EDIT MODAL ==================== */}
      {editingKey && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh] my-auto animate-scaleIn">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Edit API Key & Quota</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Owner: {editingKey.userRef?.email || editingKey.ownerId?.email || 'N/A'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingKey(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnifiedEdit} className="p-4 sm:p-5 space-y-5 text-xs">
              {/* Key Token Readonly Banner */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Token String</span>
                  <code className="font-mono text-cyan-400 font-bold text-xs select-all break-all">
                    {editingKey.key}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyKeyToClipboard(editingKey.key)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1 shrink-0"
                >
                  {copiedKey === editingKey.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === editingKey.key ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* 1. QUOTA / LIMIT MANAGEMENT */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Total Quota Limit (Hits)
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Used so far:{' '}
                    <strong className="text-amber-400">
                      {Math.max(
                        editingKey.usedHits || 0,
                        editingKey.usedCount || 0,
                        (editingKey.totalLimit || editingKey.totalHits || 0) - (editingKey.remainingHits !== undefined ? editingKey.remainingHits : (editingKey.totalLimit || 0))
                      )}
                    </strong>
                  </span>
                </div>

                {/* Preset increments */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 500, 1000, 5000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => {
                        const curr = parseInt(editTotalLimit, 10) || 0;
                        setEditTotalLimit((curr + inc).toString());
                      }}
                      className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 font-mono font-bold text-[11px] transition-all"
                    >
                      +{inc} Hits
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  required
                  min="0"
                  value={editTotalLimit}
                  onChange={(e) => setEditTotalLimit(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. 1000"
                />

                {/* Calculated live remaining */}
                <div className="flex items-center justify-between text-[11px] font-mono px-1">
                  <span className="text-slate-500">Calculated Available Balance:</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.max(
                      0,
                      (parseInt(editTotalLimit, 10) || 0) -
                        Math.max(
                          editingKey.usedHits || 0,
                          editingKey.usedCount || 0,
                          (editingKey.totalLimit || editingKey.totalHits || 0) - (editingKey.remainingHits !== undefined ? editingKey.remainingHits : (editingKey.totalLimit || 0))
                        )
                    ).toLocaleString()}{' '}
                    Hits
                  </span>
                </div>
              </div>

              {/* 2. EXPIRY ACTIONS (3 MODES: EXTEND DAYS, SET DATE, UNLIMITED) */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Expiration & Validity Management
                </label>

                {/* 3 Modes Selector */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditExpiryMode('EXTEND_DAYS')}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                      editExpiryMode === 'EXTEND_DAYS'
                        ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Extend Days</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditExpiryMode('SET_DATE')}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                      editExpiryMode === 'SET_DATE'
                        ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Set Date</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditExpiryMode('UNLIMITED')}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                      editExpiryMode === 'UNLIMITED'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    <InfinityIcon className="w-3.5 h-3.5" />
                    <span>Unlimited</span>
                  </button>
                </div>

                {/* MODE 1: Extend Days */}
                {editExpiryMode === 'EXTEND_DAYS' && (
                  <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Add Days to Current Expiry</span>
                      <span className="text-cyan-400 font-mono font-bold">+{editExtendDays || 0} Days</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {['7', '15', '30', '90'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setEditExtendDays(d)}
                          className={`py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            editExtendDays === d
                              ? 'bg-cyan-600 text-white border-cyan-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          +{d} Days
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min="1"
                      value={editExtendDays}
                      onChange={(e) => setEditExtendDays(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs"
                    />

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Projected New Expiry:</span>
                      <span className="text-emerald-400 font-bold">
                        {(() => {
                          const curr = new Date(editingKey.expiresAt);
                          const now = new Date();
                          const base = curr > now ? curr : now;
                          const future = new Date(base.getTime() + (parseInt(editExtendDays, 10) || 0) * 24 * 60 * 60 * 1000);
                          return future.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          });
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                {/* MODE 2: Set Date Picker */}
                {editExpiryMode === 'SET_DATE' && (
                  <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <label className="block text-[11px] text-slate-400 font-medium">
                      Select Exact Calendar Expiration Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={editTargetDate}
                      onChange={(e) => setEditTargetDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      The key will automatically expire at 23:59:59 on the selected date.
                    </p>
                  </div>
                )}

                {/* MODE 3: Unlimited / Lifetime */}
                {editExpiryMode === 'UNLIMITED' && (
                  <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-300 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <InfinityIcon className="w-4 h-4 text-purple-400" />
                      <span>Lifetime Unlimited Expiry (Never Expires)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      This key will never expire automatically and will remain active until manually revoked by an administrator.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. KEY STATUS & RATE LIMIT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Key Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:border-cyan-500"
                  >
                    <option value="active">Active (Operational)</option>
                    <option value="suspended">Suspended / Revoked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Rate Limit (Requests / Sec)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editRateLimitRPS}
                    onChange={(e) => setEditRateLimitRPS(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs"
                    placeholder="5"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeletingKey(editingKey);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Permanently Delete this Key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Key</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingKey(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-xs text-white shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50"
                  >
                    {submittingEdit ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Update Key Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {deletingKey && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[60] overflow-y-auto">
          <div className="max-w-md w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 animate-scaleIn my-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-white">Delete API Key Token</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete this API key? Any applications or automated workers using this token will immediately lose access.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-semibold">Key Token:</span>
                <code className="font-mono text-cyan-400 font-bold text-xs select-all break-all">{deletingKey.key}</code>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-semibold">Assigned User:</span>
                <span className="text-slate-300 font-medium">
                  {deletingKey.userRef?.email || deletingKey.ownerId?.email || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-semibold">Remaining Quota:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {(deletingKey.remainingHits !== undefined
                    ? deletingKey.remainingHits
                    : Math.max(0, (deletingKey.totalLimit || 0) - (deletingKey.usedHits || deletingKey.usedCount || 0))
                  ).toLocaleString()} hits
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDeletingKey(null);
                  setDeleteError(null);
                }}
                disabled={deletingLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteApiKey}
                disabled={deletingLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {deletingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GENERATE NEW API KEY MODAL ==================== */}
      {generateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="max-w-md w-full bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto animate-scaleIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                Generate New API Key
              </h3>
              <button onClick={() => setGenerateModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-medium">Custom Prefix & Key Token</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerate16Token}
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto-Generate 16-Char Token
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keyPrefix}
                    onChange={(e) => setKeyPrefix(e.target.value)}
                    placeholder="Prefix"
                    className="w-24 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs uppercase"
                  />
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Token (16 characters)"
                    className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Client / User Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>

              {/* Quota Allocation */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Quota Limit (Total Hits / Requests)</label>
                <div className="flex gap-2 mb-1.5">
                  {['100', '300', '500', '1000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTotalLimit(preset)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                        totalLimit === preset
                          ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {preset} Hits
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={totalLimit}
                  onChange={(e) => setTotalLimit(e.target.value)}
                  placeholder="500"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  required
                />
              </div>

              {/* Validity Duration */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-400 font-medium">Validity Duration (Days)</label>
                  <span className="text-[11px] text-cyan-400 font-mono font-bold">{expiryDays || 0} Days</span>
                </div>

                <input
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  placeholder="30"
                  min="1"
                  required
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {['15', '30', '60', '90'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExpiryDays(d)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        expiryDays === d
                          ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm shadow-cyan-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingCreate}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold text-white shadow-md shadow-cyan-600/30 mt-2 transition-all disabled:opacity-50"
              >
                {submittingCreate ? 'Generating Key...' : 'Issue API Key & Activate Quota'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
