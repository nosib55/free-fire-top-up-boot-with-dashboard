'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Plus,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Coins,
  Globe,
  Trash2,
  Edit2,
  Lock,
  User,
  CreditCard,
  ExternalLink,
  Activity,
  Star,
  Eye,
  EyeOff,
} from 'lucide-react';

interface IGarenaAccountUI {
  _id: string;
  username: string;
  password?: string;
  accountNickname: string;
  region: 'MY' | 'SG' | 'ID' | 'TH' | 'BD' | 'GLOBAL';
  authCookie?: string;
  shellsBalance: number;
  status: 'ACTIVE' | 'LOGGED_OUT' | 'SESSION_EXPIRED' | 'AUTHENTICATION_FAILED' | 'LOCKED';
  isPrimary: boolean;
  lastLoginAt?: string;
  lastBalanceSyncAt?: string;
  lastErrorMessage?: string;
  notes?: string;
}

export default function GarenaAccountsPage() {
  const [accounts, setAccounts] = useState<IGarenaAccountUI[]>([]);
  const [totalShells, setTotalShells] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<IGarenaAccountUI | null>(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);

  // Form Fields
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState<'MY' | 'SG' | 'ID' | 'TH' | 'BD' | 'GLOBAL'>('MY');
  const [authCookie, setAuthCookie] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  // Card Redemption Form
  const [cardsText, setCardsText] = useState('');
  const [redeemResult, setRedeemResult] = useState<any>(null);

  // Notification Banner
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  function showBanner(type: 'success' | 'error', text: string) {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  }

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/garena-accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
        setTotalShells(data.totalShells || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingAccount(null);
    setNickname('');
    setUsername('');
    setPassword('');
    setRegion('MY');
    setAuthCookie('');
    setIsPrimary(accounts.length === 0);
    setNotes('');
    setModalOpen(true);
  }

  function openEditModal(account: IGarenaAccountUI) {
    setEditingAccount(account);
    setNickname(account.accountNickname);
    setUsername(account.username);
    setPassword(account.password || '');
    setRegion(account.region || 'MY');
    setAuthCookie(account.authCookie || '');
    setIsPrimary(account.isPrimary);
    setNotes(account.notes || '');
    setModalOpen(true);
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      showBanner('error', 'Please enter a Garena username or account ID.');
      return;
    }

    setSavingAccount(true);
    try {
      const action = editingAccount ? 'update' : 'create';
      const payload: any = {
        action,
        username: username.trim(),
        password,
        accountNickname: nickname.trim() || `Garena Account (${username.trim()})`,
        region,
        authCookie,
        isPrimary,
        notes,
      };

      if (editingAccount) {
        payload.id = editingAccount._id;
      }

      const res = await fetch('/api/admin/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showBanner('success', data.message || 'Account saved successfully.');
        setModalOpen(false);
        fetchAccounts();
      } else {
        showBanner('error', data.message || 'Failed to save account.');
      }
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleDeleteAccount(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove the Garena account '${name}'?`)) return;

    try {
      const res = await fetch('/api/admin/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (data.success) {
        showBanner('success', 'Account removed successfully.');
        fetchAccounts();
      } else {
        showBanner('error', data.message || 'Failed to delete account.');
      }
    } catch (err: any) {
      showBanner('error', err.message);
    }
  }

  async function handleTestLogin(account: IGarenaAccountUI) {
    setTestingId(account._id);
    try {
      const res = await fetch('/api/admin/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_login',
          id: account._id,
          username: account.username,
          password: account.password,
          authCookie: account.authCookie,
          region: account.region,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showBanner('success', `Login Verified! ${account.accountNickname} has ${data.balance} Shells.`);
        fetchAccounts();
      } else {
        showBanner('error', data.message || 'Garena login test failed.');
      }
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setTestingId(null);
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      const res = await fetch('/api/admin/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_primary', id }),
      });
      const data = await res.json();
      if (data.success) {
        showBanner('success', data.message);
        fetchAccounts();
      }
    } catch (err: any) {
      showBanner('error', err.message);
    }
  }

  async function handleRedeemCards(e: React.FormEvent) {
    e.preventDefault();
    const cards = cardsText
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cards.length === 0) {
      showBanner('error', 'Please enter at least one prepaid card code.');
      return;
    }

    setRedeeming(true);
    setRedeemResult(null);

    try {
      const res = await fetch('/api/admin/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem_cards',
          cards,
        }),
      });

      const data = await res.json();
      setRedeemResult(data.result);
      if (data.success) {
        showBanner('success', data.message);
        fetchAccounts();
      } else {
        showBanner('error', data.message || 'Prepaid card redemption failed');
      }
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest font-mono">
              GARENA SHELL POOL
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Garena Shell Account Login & Automation Pool
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage Garena master login sessions, test authentication, sync live shell balances, and load prepaid shell cards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRedeemModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-amber-400 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Redeem Cards</span>
          </button>
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-xs text-white shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Garena Account</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs px-2 py-0.5">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Total Garena Shells</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-400">
            {totalShells.toLocaleString()} <span className="text-xs font-normal text-slate-400">Shells</span>
          </p>
          <p className="text-[11px] text-slate-500">Across all authenticated worker accounts</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Connected Accounts</span>
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black font-mono text-white">
            {accounts.length} <span className="text-xs font-normal text-slate-400">Pool Accounts</span>
          </p>
          <p className="text-[11px] text-emerald-400">
            {accounts.filter((a) => a.status === 'ACTIVE').length} Active & Ready
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Primary Automation Worker</span>
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-sm font-bold text-white truncate">
            {accounts.find((a) => a.isPrimary)?.accountNickname || 'None Set'}
          </p>
          <p className="text-[11px] text-cyan-400 font-mono truncate">
            {accounts.find((a) => a.isPrimary)?.username || 'N/A'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Target Upstream Shop</span>
            <Globe className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-slate-200">shop.garena.my</p>
          <p className="text-[11px] text-slate-500 font-mono">Malaysia / Global SSO</p>
        </div>
      </div>

      {/* Accounts List Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Configured Garena Shell Accounts ({accounts.length})
          </h2>
        </div>

        {accounts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
              <Coins className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-300">No Garena Shell Accounts Configured</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add your Garena master account username and credentials to enable automatic Level Up Pass, Weekly Lite, and Shell Free Fire top-ups.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-slate-950 transition-colors"
            >
              Add First Garena Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account) => {
              const isTestingThis = testingId === account._id;
              const isActive = account.status === 'ACTIVE';

              return (
                <div
                  key={account._id}
                  className={`p-5 rounded-2xl bg-slate-900 border transition-all space-y-4 ${
                    account.isPrimary
                      ? 'border-amber-500/50 shadow-lg shadow-amber-500/5 bg-gradient-to-b from-slate-900 to-slate-950'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Account Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-white">{account.accountNickname}</h3>
                        {account.isPrimary && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                            <Star className="w-2.5 h-2.5 fill-amber-300" /> PRIMARY WORKER
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                          {account.region}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" /> {account.username}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {account.status}
                    </span>
                  </div>

                  {/* Balance Display */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">SHELL BALANCE</span>
                      <p className="text-lg font-black font-mono text-amber-400">
                        {account.shellsBalance?.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Shells</span>
                      </p>
                    </div>

                    <div className="text-right text-[10px] text-slate-400 space-y-0.5">
                      <p>
                        Synced: {account.lastBalanceSyncAt ? new Date(account.lastBalanceSyncAt).toLocaleTimeString() : 'N/A'}
                      </p>
                      <p className="text-slate-500">
                        Session: {account.authCookie ? 'Cookie Stored' : 'Direct SSO'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestLogin(account)}
                        disabled={isTestingThis}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isTestingThis ? 'animate-spin' : ''}`} />
                        <span>{isTestingThis ? 'Verifying...' : 'Test Login & Sync'}</span>
                      </button>

                      {!account.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(account._id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        >
                          Set Primary
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(account)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account._id, account.accountNickname)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                {editingAccount ? 'Edit Garena Shell Account' : 'Add New Garena Shell Account'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Account Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Master Malaysia Shell Pool #1"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Garena Username / User ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="garena_username"
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Region / Shop</label>
                  <select
                    value={region}
                    onChange={(e: any) => setRegion(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="MY">Malaysia (shop.garena.my)</option>
                    <option value="SG">Singapore (shop.garena.sg)</option>
                    <option value="ID">Indonesia (kiosgamer.co.id)</option>
                    <option value="TH">Thailand (termgame.com)</option>
                    <option value="BD">Bangladesh (BDGamesBazar)</option>
                    <option value="GLOBAL">Global SSO</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold">Garena Account Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-amber-400 text-[11px] flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Session Cookie (Optional / 2FA Bypass)
                </label>
                <textarea
                  value={authCookie}
                  onChange={(e) => setAuthCookie(e.target.value)}
                  rows={2}
                  placeholder="sso_token=...; session_key=..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px] focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Optional: If your account has 2FA enabled, you can paste cookies exported from shop.garena.my.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white">Set as Primary Worker Account</span>
                    <p className="text-[11px] text-slate-400">Automated top-up requests will consume Shells from this account</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {savingAccount ? 'Saving...' : 'Save Garena Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prepaid Shell Cards Redemption Modal */}
      {redeemModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Redeem Garena Prepaid Shell Cards
              </h3>
              <button
                onClick={() => setRedeemModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRedeemCards} className="space-y-4 text-xs">
              <p className="text-slate-400">
                Paste Garena Prepaid Card PINs (up to 5 cards, one per line). The automation engine will authenticate with Garena and deposit the Shells into your primary account.
              </p>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Prepaid Card PINs (One per line)</label>
                <textarea
                  value={cardsText}
                  onChange={(e) => setCardsText(e.target.value)}
                  rows={5}
                  placeholder={`1234567890123456\n9876543210987654\n5555666677778888`}
                  required
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-amber-500 focus:outline-none text-xs"
                />
              </div>

              {redeemResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Redemption Summary:</span>
                    <span className="text-emerald-400 font-bold">
                      {redeemResult.totalLoaded} Cards Loaded
                    </span>
                  </div>
                  {redeemResult.successfulCards?.length > 0 && (
                    <p className="text-emerald-400 font-mono text-[11px]">
                      ✅ Successful: {redeemResult.successfulCards.join(', ')}
                    </p>
                  )}
                  {redeemResult.failedCards?.length > 0 && (
                    <p className="text-rose-400 font-mono text-[11px]">
                      ❌ Failed: {redeemResult.failedCards.map((f: any) => `${f.card} (${f.reason})`).join(', ')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRedeemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={redeeming}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {redeeming ? 'Loading Cards...' : 'Redeem Cards Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
