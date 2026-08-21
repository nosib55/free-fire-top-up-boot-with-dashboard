'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  RefreshCw,
  Copy,
  Check,
  X,
  Sparkles,
  Clock,
} from 'lucide-react';

export default function ApiKeyManagerPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Generate Key Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [totalLimit, setTotalLimit] = useState('500');
  const [expiryDays, setExpiryDays] = useState('30');
  const [keyPrefix, setKeyPrefix] = useState('APEX');
  const [submitting, setSubmitting] = useState(false);

  // Edit Quota / Extend Expiry Modal State
  const [actionKeyId, setActionKeyId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'EDIT_QUOTA' | 'EXTEND_EXPIRY' | null>(null);
  const [newTotalLimit, setNewTotalLimit] = useState('1000');
  const [extendDays, setExtendDays] = useState('30');

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch('/api/keys/list');
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
    setSubmitting(true);
    try {
      const res = await fetch('/api/keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: customKey || undefined,
          userEmail,
          userName,
          totalLimit,
          expiryDays: Number(expiryDays) || 30,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setCustomKey('');
        setUserEmail('');
        setUserName('');
        fetchKeys();
      } else {
        alert(data.message || 'Key creation failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actionKeyId || !actionType) return;

    try {
      const res = await fetch('/api/keys/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: actionKeyId,
          action: actionType,
          totalLimit: newTotalLimit,
          extendDays,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionKeyId(null);
        setActionType(null);
        fetchKeys();
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!confirm('Are you sure you want to revoke/toggle this API key status?')) return;
    try {
      const res = await fetch('/api/keys/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId,
          action: 'REVOKE',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchKeys();
      }
    } catch (e) {
      console.error(e);
    }
  }

  function copyKeyToClipboard(keyStr: string) {
    navigator.clipboard.writeText(keyStr);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">API Key Generator & Quota Licensing</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate 16-character cryptographic tokens, allocate quota pools, and manage granular expiration dates.
          </p>
        </div>

        <button
          onClick={() => {
            handleAutoGenerate16Token();
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white shadow-md shadow-cyan-600/30 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Generate API Key</span>
        </button>
      </div>

      {/* Interactive Key List Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">API Key Token</th>
                <th className="p-4">Owner User</th>
                <th className="p-4">Total Quota</th>
                <th className="p-4">Used Hits</th>
                <th className="p-4">Available Hits</th>
                <th className="p-4">Expiration</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    {loading ? 'Loading API keys...' : 'No API keys created yet. Click "Generate API Key" to issue one.'}
                  </td>
                </tr>
              ) : (
                keys.map((k) => {
                  const used = k.usedCount !== undefined ? k.usedCount : k.usedHits || 0;
                  const total = k.totalLimit !== undefined ? k.totalLimit : k.totalHits || 1000;
                  const available = Math.max(0, total - used);
                  const isExpired = new Date() > new Date(k.expiresAt);
                  const isRevoked = !k.isActive || k.status === 'suspended';

                  return (
                    <tr key={k._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-cyan-400 font-bold text-xs bg-slate-950 px-2.5 py-1 rounded border border-slate-800 break-all select-all">
                            {k.key}
                          </code>
                          <button
                            onClick={() => copyKeyToClipboard(k.key)}
                            className="text-slate-500 hover:text-cyan-400 p-1"
                            title="Copy Key"
                          >
                            {copiedKey === k.key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-white">
                        {k.userRef?.name || k.ownerId?.name || 'API Client'}
                        <span className="block text-[10px] font-normal text-slate-500">
                          {k.userRef?.email || k.ownerId?.email || ''}
                        </span>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-200">{total}</td>
                      <td className="p-4 font-mono text-amber-400">{used}</td>
                      <td className="p-4 font-mono text-emerald-400 font-bold">{available}</td>

                      <td className="p-4 font-mono text-[11px] text-slate-400">
                        {new Date(k.expiresAt).toLocaleString()}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isRevoked
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isExpired
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setActionKeyId(k._id);
                            setActionType('EDIT_QUOTA');
                            setNewTotalLimit(total.toString());
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-[11px]"
                        >
                          Quota
                        </button>

                        <button
                          onClick={() => {
                            setActionKeyId(k._id);
                            setActionType('EXTEND_EXPIRY');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold text-[11px]"
                        >
                          Extend
                        </button>

                        <button
                          onClick={() => handleRevokeKey(k._id)}
                          className={`px-2.5 py-1 rounded font-semibold text-[11px] ${
                            isRevoked
                              ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60'
                              : 'bg-rose-950/60 text-rose-400 hover:bg-rose-900/60'
                          }`}
                        >
                          {isRevoked ? 'Enable' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATE API KEY MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                Generate New API Key
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-3 text-xs">
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
                    className="w-24 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs uppercase"
                  />
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Token (16 characters)"
                    className="flex-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs"
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
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
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
                      className={`px-3 py-1 rounded-md text-[11px] font-mono font-bold border transition-all ${
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
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Initial usedHits counter bound to 0</span>
              </div>

              {/* Simple Validity Duration (Days) Picker with Auto-Calculated Date */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-400 font-medium">Validity Duration (Days)</label>
                  <span className="text-[11px] text-cyan-400 font-mono font-bold">{expiryDays || 0} Days</span>
                </div>

                <input
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
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

                {/* Auto Calculated Future Expiration Date Live Box */}
                {Number(expiryDays) > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px] font-mono mt-2">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" /> Auto-Calculated Expiry:
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {new Date(Date.now() + (Number(expiryDays) || 0) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-md shadow-cyan-600/30 mt-2 transition-all"
              >
                {submitting ? 'Generating...' : 'Issue API Key & Activate Quota'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT QUOTA / EXTEND EXPIRY MODAL */}
      {actionKeyId && actionType && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-sm w-full bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white">
                {actionType === 'EDIT_QUOTA' ? 'Update Quota Limit' : 'Extend Expiry Date'}
              </h3>
              <button
                onClick={() => {
                  setActionKeyId(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-4 text-xs">
              {actionType === 'EDIT_QUOTA' ? (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">New Total Limit (Hits)</label>
                  <input
                    type="number"
                    value={newTotalLimit}
                    onChange={(e) => setNewTotalLimit(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Extend Expiration By (Days)</label>
                  <input
                    type="number"
                    value={extendDays}
                    onChange={(e) => setExtendDays(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-md shadow-cyan-600/20"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
