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
  Users,
  History,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  TrendingUp,
  ShieldCheck,
  Plus,
  Edit2,
  Coins,
  Globe,
  Star,
  Eye,
  EyeOff,
  CreditCard,
  AlertTriangle,
  XCircle,
  User,
} from 'lucide-react';

export default function UserDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'subkeys' | 'transactions' | 'garena'>('overview');
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [activeKey, setActiveKey] = useState('');
  const [totalHits, setTotalHits] = useState(0);
  const [remainingHits, setRemainingHits] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('Valued Client');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [userBalance, setUserBalance] = useState<number>(0);
  const [resellerProfile, setResellerProfile] = useState<any>(null);
  const [brandSettings, setBrandSettings] = useState({
    siteName: 'Apex Top-Up',
    logoUrl: '',
  });

  // Playground State
  const [testUid, setTestUid] = useState('');
  const [testPipeline, setTestPipeline] = useState<'UNIPIN_VOUCHER' | 'GARENA_SHELLS'>('GARENA_SHELLS');
  const [testPackageId, setTestPackageId] = useState('WEEKLY_MEMBERSHIP');
  const [testPlayerLevel, setTestPlayerLevel] = useState('');
  const [testVoucherCode, setTestVoucherCode] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // UID Validation Playground State
  const [valUid, setValUid] = useState('');
  const [valResult, setValResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);

  // Sub-Keys State
  const [subKeys, setSubKeys] = useState<any[]>([]);
  const [loadingSubKeys, setLoadingSubKeys] = useState(false);
  const [subKeyForm, setSubKeyForm] = useState({
    clientName: '',
    clientEmail: '',
    quotaHits: '500',
    rateLimitRPS: '5',
  });
  const [creatingSubKey, setCreatingSubKey] = useState(false);
  const [subKeyNotice, setSubKeyNotice] = useState<string | null>(null);

  // Reseller Isolated Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [txFilterStatus, setTxFilterStatus] = useState('ALL');
  const [txDateFilter, setTxDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY'>('ALL');
  const [txSearchUid, setTxSearchUid] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [copiedLogJson, setCopiedLogJson] = useState<string | null>(null);

  // Garena Shells Setup State (User / Reseller)
  const [garenaAccounts, setGarenaAccounts] = useState<any[]>([]);
  const [totalShells, setTotalShells] = useState<number>(0);
  const [loadingGarena, setLoadingGarena] = useState<boolean>(false);
  const [garenaModalOpen, setGarenaModalOpen] = useState<boolean>(false);
  const [editingGarenaAccount, setEditingGarenaAccount] = useState<any>(null);
  const [garenaNickname, setGarenaNickname] = useState('');
  const [garenaUsername, setGarenaUsername] = useState('');
  const [garenaPassword, setGarenaPassword] = useState('');
  const [garenaRegion, setGarenaRegion] = useState<'MY' | 'SG' | 'ID' | 'TH' | 'BD' | 'GLOBAL'>('MY');
  const [garenaAuthCookie, setGarenaAuthCookie] = useState('');
  const [garenaNotes, setGarenaNotes] = useState('');
  const [garenaIsPrimary, setGarenaIsPrimary] = useState(false);
  const [showGarenaPassword, setShowGarenaPassword] = useState(false);
  const [savingGarenaAccount, setSavingGarenaAccount] = useState(false);
  const [testingGarenaId, setTestingGarenaId] = useState<string | null>(null);
  const [garenaBanner, setGarenaBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Card Load Modal State
  const [garenaRedeemModalOpen, setGarenaRedeemModalOpen] = useState(false);
  const [garenaCardsText, setGarenaCardsText] = useState('');
  const [garenaRedeemResult, setGarenaRedeemResult] = useState<any>(null);
  const [redeemingGarena, setRedeemingGarena] = useState(false);

  useEffect(() => {
    fetchMyKey();
    fetchBrandSettings();
    fetchGarenaAccounts();
  }, []);

  useEffect(() => {
    if (userId && activeTab === 'subkeys') {
      fetchSubKeys();
    }
    if (userId && activeTab === 'transactions') {
      fetchTransactions();
    }
    if (userId && activeTab === 'garena') {
      fetchGarenaAccounts();
    }
  }, [userId, activeTab, txFilterStatus, txSearchUid]);

  function showGarenaBanner(type: 'success' | 'error', text: string) {
    setGarenaBanner({ type, text });
    setTimeout(() => setGarenaBanner(null), 5000);
  }

  async function fetchGarenaAccounts() {
    setLoadingGarena(true);
    try {
      const res = await fetch('/api/user/garena-accounts');
      const data = await res.json();
      if (data.success) {
        setGarenaAccounts(data.accounts || []);
        setTotalShells(data.totalShells || 0);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingGarena(false);
    }
  }

  function openCreateGarenaModal() {
    setEditingGarenaAccount(null);
    setGarenaNickname('');
    setGarenaUsername('');
    setGarenaPassword('');
    setGarenaRegion('MY');
    setGarenaAuthCookie('');
    setGarenaNotes('');
    setGarenaIsPrimary(garenaAccounts.length === 0);
    setShowGarenaPassword(false);
    setGarenaModalOpen(true);
  }

  function openEditGarenaModal(account: any) {
    setEditingGarenaAccount(account);
    setGarenaNickname(account.accountNickname || '');
    setGarenaUsername(account.username || '');
    setGarenaPassword(account.password || '');
    setGarenaRegion(account.region || 'MY');
    setGarenaAuthCookie(account.authCookie || '');
    setGarenaNotes(account.notes || '');
    setGarenaIsPrimary(account.isPrimary || false);
    setShowGarenaPassword(false);
    setGarenaModalOpen(true);
  }

  async function handleSaveGarenaAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!garenaUsername.trim()) {
      showGarenaBanner('error', 'Please enter a Garena username or account ID.');
      return;
    }

    setSavingGarenaAccount(true);
    try {
      const payload: any = {
        action: editingGarenaAccount ? 'update' : 'create',
        id: editingGarenaAccount?._id,
        username: garenaUsername.trim(),
        password: garenaPassword,
        accountNickname: garenaNickname.trim() || `Garena Account (${garenaUsername.trim()})`,
        region: garenaRegion,
        authCookie: garenaAuthCookie.trim(),
        isPrimary: garenaIsPrimary,
        notes: garenaNotes.trim(),
      };

      const res = await fetch('/api/user/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showGarenaBanner('success', data.message || 'Account saved successfully.');
        setGarenaModalOpen(false);
        fetchGarenaAccounts();
      } else {
        showGarenaBanner('error', data.message || 'Failed to save account.');
      }
    } catch (err: any) {
      showGarenaBanner('error', err.message || 'Failed to save account.');
    } finally {
      setSavingGarenaAccount(false);
    }
  }

  async function handleDeleteGarenaAccount(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove the Garena account '${name}'?`)) return;

    try {
      const res = await fetch('/api/user/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (data.success) {
        showGarenaBanner('success', 'Garena account removed.');
        fetchGarenaAccounts();
      } else {
        showGarenaBanner('error', data.message || 'Failed to delete account.');
      }
    } catch (err: any) {
      showGarenaBanner('error', err.message || 'Failed to delete account.');
    }
  }

  async function handleTestGarenaLogin(account: any) {
    setTestingGarenaId(account._id);
    try {
      const res = await fetch('/api/user/garena-accounts', {
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
        showGarenaBanner('success', `Authentication active! Shells balance: ${data.balance.toLocaleString()} Shells`);
        fetchGarenaAccounts();
      } else {
        showGarenaBanner('error', data.message || 'Garena login test failed.');
        fetchGarenaAccounts();
      }
    } catch (err: any) {
      showGarenaBanner('error', err.message || 'Network error during login test.');
    } finally {
      setTestingGarenaId(null);
    }
  }

  async function handleSetPrimaryGarena(id: string) {
    try {
      const res = await fetch('/api/user/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_primary', id }),
      });
      const data = await res.json();
      if (data.success) {
        showGarenaBanner('success', data.message || 'Set as primary account.');
        fetchGarenaAccounts();
      } else {
        showGarenaBanner('error', data.message || 'Failed to update primary account.');
      }
    } catch (err: any) {
      showGarenaBanner('error', err.message || 'Error updating primary account.');
    }
  }

  async function handleBulkRedeemGarenaCards(e: React.FormEvent) {
    e.preventDefault();
    const cards = garenaCardsText
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cards.length === 0) {
      showGarenaBanner('error', 'Please enter at least one card PIN or serial/pin pair.');
      return;
    }

    setRedeemingGarena(true);
    setGarenaRedeemResult(null);

    try {
      const res = await fetch('/api/user/garena-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem_cards',
          cards,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGarenaRedeemResult(data.result);
        showGarenaBanner('success', data.message || 'Card redemption completed.');
        fetchGarenaAccounts();
      } else {
        showGarenaBanner('error', data.message || 'Redemption failed.');
      }
    } catch (err: any) {
      showGarenaBanner('error', err.message || 'Redemption request failed.');
    } finally {
      setRedeemingGarena(false);
    }
  }

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
          setUserId(data.user.id || '');
          setUserName(data.user.name || 'User');
          setUserEmail(data.user.email || '');
          setUserRole(data.user.role || 'user');
          setUserBalance(data.user.balance ?? 0);
        }

        if (data.resellerProfile) {
          setResellerProfile(data.resellerProfile);
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

  async function fetchSubKeys() {
    if (!userId) return;
    setLoadingSubKeys(true);
    try {
      const res = await fetch(`/api/reseller/clients?resellerUserId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setSubKeys(data.clients || []);
        if (data.resellerProfile) setResellerProfile(data.resellerProfile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubKeys(false);
    }
  }

  async function handleCreateSubKey(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setCreatingSubKey(true);
    setSubKeyNotice(null);

    try {
      const res = await fetch('/api/reseller/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resellerUserId: userId,
          ...subKeyForm,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubKeyNotice(`✅ Sub-Key Generated: ${data.apiKey?.key}`);
        setSubKeyForm({ clientName: '', clientEmail: '', quotaHits: '500', rateLimitRPS: '5' });
        fetchSubKeys();
        fetchMyKey();
      } else {
        setSubKeyNotice(`❌ ${data.message || 'Failed to create sub-key'}`);
      }
    } catch (err: any) {
      setSubKeyNotice(`❌ Error: ${err.message}`);
    } finally {
      setCreatingSubKey(false);
    }
  }

  async function handleSubKeyAction(keyId: string, action: 'REVOKE' | 'REPLENISH', hits?: number) {
    if (!userId) return;
    try {
      const res = await fetch('/api/reseller/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId,
          action,
          additionalHits: hits || 500,
          resellerUserId: userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSubKeys();
        fetchMyKey();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchTransactions() {
    if (!userId) return;
    setLoadingTx(true);
    try {
      const url = new URL('/api/reseller/transactions', window.location.origin);
      url.searchParams.set('resellerUserId', userId);
      if (txFilterStatus !== 'ALL') url.searchParams.set('status', txFilterStatus);
      if (txSearchUid) url.searchParams.set('uid', txSearchUid);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTx(false);
    }
  }

  function copyKey(keyText?: string) {
    const textToCopy = keyText || activeKey;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
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
      const res = await fetch('/api/validate-uid', {
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
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': activeKey,
        },
        body: JSON.stringify({
          uid: testUid,
          pipeline: testPipeline,
          voucherCode: testPipeline === 'UNIPIN_VOUCHER' ? testVoucherCode : undefined,
          diamondPackageId: testPackageId,
          itemType: testPackageId,
          playerLevel: testPlayerLevel ? Number(testPlayerLevel) : undefined,
        }),
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setTestResult(data);
        if (data.success) {
          if (data.data?.remainingHits !== undefined) {
            setRemainingHits(data.data.remainingHits);
          }
          if (data.data?.remainingBalanceBdt !== undefined) {
            setUserBalance(data.data.remainingBalanceBdt);
          }
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
              {brandSettings.siteName} • Client & Reseller Suite
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
        {/* Welcome Bar & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Welcome, {userName}!</h1>
              {resellerProfile && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  Tag: {resellerProfile.brandingTag}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{userEmail}</p>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar touch-pan-x w-full md:w-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{userRole === 'reseller' || resellerProfile ? 'API Key & Playground' : 'Manual Top-Up & API'}</span>
            </button>

            <button
              onClick={() => setActiveTab('garena')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'garena' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garena Shells Setup</span>
            </button>

            {(userRole === 'reseller' || resellerProfile) && (
              <button
                onClick={() => setActiveTab('subkeys')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'subkeys' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Reseller Sub-Keys</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'transactions' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{userRole === 'reseller' || resellerProfile ? 'Client Order History' : 'My Orders'}</span>
            </button>
          </div>
        </div>

        {/* ==================== TAB 1: OVERVIEW & PLAYGROUND ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Quick Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400">API Quota Balance</span>
                  <h3 className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
                    {remainingHits} <span className="text-sm font-normal text-slate-400">Hits</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">{totalHits} Total Hits Allocated</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl">
                  ⚡
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Account Role</span>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mt-1">
                    {userRole === 'reseller' || resellerProfile ? 'B2B RESELLER' : 'DEVELOPER CLIENT'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Expires: {expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Active'}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xl">
                  🛡️
                </div>
              </div>
            </div>

            {!hasKey && !loading && (
              <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-white">No Active API Key Assigned</h2>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                      Your account currently does not have an active API key assigned. Once the admin allocates a key for your email ({userEmail}), your key and quota balance will appear here.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                        onClick={() => copyKey()}
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

              {/* Form 2: Topup Redemption Tester */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">🚀 Top-Up Redemption Playground</h3>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono">
                    {testPipeline === 'GARENA_SHELLS' ? 'Uses Garena Shell Account' : 'Deducts 1 Hit on Success'}
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
                      <option value="UNIPIN_VOUCHER">UniPin Voucher / Gift Card (UPBD & BDMB)</option>
                      <option value="GARENA_SHELLS">Garena Shells (Direct Wallet Top-Up & Deals)</option>
                    </select>
                  </div>

                  {testPipeline === 'GARENA_SHELLS' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Garena Shells Special Deals</label>
                        <select
                          value={testPackageId}
                          onChange={(e) => setTestPackageId(e.target.value)}
                          className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                        >
                          <option value="WEEKLY_MEMBERSHIP">Weekly Membership (উইকলি মেম্বারশিপ)</option>
                          <option value="MONTHLY_MEMBERSHIP">Monthly Membership (মান্থলি মেম্বারশিপ)</option>
                          <option value="LEVEL_UP_6">Level Up Package - Level 6 (লেভেল ৬ পাস)</option>
                          <option value="LEVEL_UP_10">Level Up Package - Level 10 (লেভেল ১০ পাস)</option>
                          <option value="LEVEL_UP_15">Level Up Package - Level 15 (লেভেল ১৫ পাস)</option>
                          <option value="LEVEL_UP_20">Level Up Package - Level 20 (লেভেল ২০ পাস)</option>
                          <option value="LEVEL_UP_25">Level Up Package - Level 25 (লেভেল ২৫ পাস)</option>
                          <option value="LEVEL_UP_30">Level Up Package - Level 30 (লেভেল ৩০ পাস)</option>
                          <option value="WEEKLY_LITE">Weekly Lite (উইকলি লাইট)</option>
                        </select>
                      </div>

                      {testPackageId.startsWith('LEVEL_UP_') && (
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Player Current In-Game Level (Validation)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={testPlayerLevel}
                            onChange={(e) => setTestPlayerLevel(e.target.value)}
                            placeholder="Enter player level (e.g. 15)"
                            className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            ⚠️ Garena prevents purchasing if player level is lower than the selected pass level.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {testPipeline === 'UNIPIN_VOUCHER' && (
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Voucher Serial / PIN Code</label>
                      <input
                        type="text"
                        value={testVoucherCode}
                        onChange={(e) => setTestVoucherCode(e.target.value)}
                        placeholder="Enter Voucher PIN (e.g. UPBD-B-S-00123456 1234567890123456)"
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

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
          </div>
        )}

        {/* ==================== TAB 2: RESELLER SUB-KEYS ==================== */}
        {activeTab === 'subkeys' && (
          <div className="space-y-6">
            {/* Master Balance Summary Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Reseller Master Quota</span>
                <h3 className="text-2xl font-black text-white mt-1">
                  {resellerProfile ? Number(resellerProfile.masterQuotaBalance).toLocaleString() : Number(remainingHits).toLocaleString()} <span className="text-sm font-normal text-slate-400">Available Hits</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Branding Tag: <strong className="text-cyan-300 font-mono">{resellerProfile?.brandingTag || 'NEXUS'}</strong> • Sub-keys generated will follow format <code className="text-slate-300 font-mono">[{resellerProfile?.brandingTag || 'TAG'}]_[CLIENT]_[RANDOM]</code>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchSubKeys}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 font-bold transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSubKeys ? 'animate-spin' : ''}`} />
                  <span>Refresh Sub-Keys</span>
                </button>
              </div>
            </div>

            {/* Sub-Key Generator Form */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Generate Downstream Sub-API Key for Client</h3>
              </div>

              <form onSubmit={handleCreateSubKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Client / Website Name</label>
                  <input
                    type="text"
                    required
                    value={subKeyForm.clientName}
                    onChange={(e) => setSubKeyForm({ ...subKeyForm, clientName: e.target.value })}
                    placeholder="e.g. MyTopUpShop"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Client Email (Optional)</label>
                  <input
                    type="email"
                    value={subKeyForm.clientEmail}
                    onChange={(e) => setSubKeyForm({ ...subKeyForm, clientEmail: e.target.value })}
                    placeholder="client@shop.com"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Allocate Hits (Quota)</label>
                  <input
                    type="number"
                    required
                    min="50"
                    value={subKeyForm.quotaHits}
                    onChange={(e) => setSubKeyForm({ ...subKeyForm, quotaHits: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Rate Limit (RPS)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={subKeyForm.rateLimitRPS}
                    onChange={(e) => setSubKeyForm({ ...subKeyForm, rateLimitRPS: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2">
                  {subKeyNotice && (
                    <span className="text-xs font-semibold">{subKeyNotice}</span>
                  )}
                  <button
                    type="submit"
                    disabled={creatingSubKey}
                    className="ml-auto px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 disabled:opacity-50"
                  >
                    {creatingSubKey ? 'Allocating Quota...' : 'Create Sub-Key & Allocate'}
                  </button>
                </div>
              </form>
            </div>

            {/* Active Sub-Keys List */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Active Sub-Keys ({subKeys.length})</h3>
                <span className="text-xs text-slate-400">All keys tagged with your reseller identifier</span>
              </div>

              <div className="overflow-x-auto touch-pan-x">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Key String</th>
                      <th className="p-3.5">Client Name</th>
                      <th className="p-3.5">Remaining / Total</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Expires</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {subKeys.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500 font-sans">
                          No sub-keys generated yet. Use the form above to create your first client API key.
                        </td>
                      </tr>
                    )}
                    {subKeys.map((sk: any) => (
                      <tr key={sk._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-cyan-400 select-all">{sk.key}</span>
                            <button
                              onClick={() => copyKey(sk.key)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 font-sans font-semibold text-slate-200">
                          {sk.name || (sk.ownerId as any)?.name || 'Sub-Client'}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <span className="text-emerald-400 font-bold">{sk.remainingHits}</span> / {sk.totalHits} Hits
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                            sk.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {sk.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 font-sans text-[11px]">
                          {sk.expiresAt ? new Date(sk.expiresAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3.5 text-right font-sans">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSubKeyAction(sk._id, 'REPLENISH', 500)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950/60 text-cyan-400 text-[11px] font-bold"
                            >
                              +500 Hits
                            </button>
                            <button
                              onClick={() => handleSubKeyAction(sk._id, 'REVOKE')}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/60 text-rose-400 text-[11px] font-bold"
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: ISOLATED TRANSACTION LOGS ==================== */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={txSearchUid}
                    onChange={(e) => setTxSearchUid(e.target.value)}
                    placeholder="Search by Player UID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={txDateFilter}
                  onChange={(e: any) => setTxDateFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="ALL">All Dates (সব তারিখ)</option>
                  <option value="TODAY">Today (আজকের লগ)</option>
                  <option value="YESTERDAY">Yesterday (গতকালের)</option>
                </select>

                <select
                  value={txFilterStatus}
                  onChange={(e) => setTxFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCESS">Success Only</option>
                  <option value="FAILED_INVALID_UID">Invalid UID</option>
                  <option value="FAILED_INVALID_VOUCHER">Invalid Voucher</option>
                  <option value="WORKER_ERROR">Worker Error</option>
                </select>

                <button
                  onClick={fetchTransactions}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTx ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Transactions Table with Expandable Full Response Accordion */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Execution & Callback Logs ({transactions.length})</h3>
                  <span className="text-xs text-slate-400">Click any row to inspect complete server response & payload data</span>
                </div>
                {copiedLogJson && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    ✓ {copiedLogJson} Copied!
                  </span>
                )}
              </div>

              <div className="overflow-x-auto touch-pan-x">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Player UID</th>
                      <th className="p-3.5">Pipeline / Item</th>
                      <th className="p-3.5">API Key</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Latency</th>
                      <th className="p-3.5">Time</th>
                      <th className="p-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                          {loadingTx ? 'Loading transaction logs...' : 'No orders found matching your filter.'}
                        </td>
                      </tr>
                    )}
                    {transactions
                      .filter((tx: any) => {
                        if (txDateFilter === 'TODAY') {
                          const today = new Date().toDateString();
                          return new Date(tx.createdAt).toDateString() === today;
                        }
                        if (txDateFilter === 'YESTERDAY') {
                          const y = new Date();
                          y.setDate(y.getDate() - 1);
                          return new Date(tx.createdAt).toDateString() === y.toDateString();
                        }
                        return true;
                      })
                      .map((tx: any) => {
                        const isExpanded = expandedTxId === tx._id;
                        const responsePayload = tx.responseData || {
                          success: tx.status === 'SUCCESS',
                          status: tx.status,
                          uid: tx.uid,
                          errorDetails: tx.errorDetails,
                          latencyMs: tx.latencyMs,
                        };

                        return (
                          <React.Fragment key={tx._id}>
                            <tr
                              onClick={() => setExpandedTxId(isExpanded ? null : tx._id)}
                              className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                            >
                              <td className="p-3.5 font-bold text-white flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${tx.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                <span>{tx.uid || 'N/A'}</span>
                              </td>
                              <td className="p-3.5 font-sans text-slate-300">
                                {tx.requestData?.pipeline || tx.pipeline || 'UNIPIN_VOUCHER'}
                              </td>
                              <td className="p-3.5 text-cyan-400 text-[11px]">
                                {tx.apiKey ? `${tx.apiKey.substring(0, 10)}...` : 'System'}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                                    tx.status === 'SUCCESS'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {tx.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-slate-400">{tx.latencyMs || 0}ms</td>
                              <td className="p-3.5 font-sans text-[11px] text-slate-400">
                                {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="p-3.5 text-right font-sans">
                                <button className="text-cyan-400 hover:text-cyan-300 font-bold text-xs">
                                  {isExpanded ? '▲ Hide' : '▼ View Payload'}
                                </button>
                              </td>
                            </tr>

                            {/* Collapsible Inspection Drawer */}
                            {isExpanded && (
                              <tr className="bg-slate-950/80">
                                <td colSpan={7} className="p-4 sm:p-5 border-t border-b border-slate-800 space-y-3 font-sans">
                                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                      <Code2 className="w-4 h-4 text-cyan-400" />
                                      <span className="font-bold text-white">Full Server Response & Execution Telemetry:</span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(JSON.stringify(responsePayload, null, 2));
                                        setCopiedLogJson(tx._id);
                                        setTimeout(() => setCopiedLogJson(null), 2500);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs transition-colors"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Response JSON</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                    {/* Request Payload Data */}
                                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                                        Incoming Request Payload
                                      </span>
                                      <pre className="text-[11px] text-slate-300 overflow-x-auto p-2.5 rounded bg-slate-950">
                                        {JSON.stringify(
                                          tx.requestData || { uid: tx.uid, pipeline: tx.pipeline, voucherCode: tx.voucherCode },
                                          null,
                                          2
                                        )}
                                      </pre>
                                    </div>

                                    {/* Server Response Payload */}
                                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block font-sans">
                                        Server Response / Callback
                                      </span>
                                      <pre className="text-[11px] text-emerald-300 overflow-x-auto p-2.5 rounded bg-slate-950">
                                        {JSON.stringify(responsePayload, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: GARENA SHELLS SETUP ==================== */}
        {activeTab === 'garena' && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Banner Notifications */}
            {garenaBanner && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  garenaBanner.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {garenaBanner.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{garenaBanner.text}</span>
                </div>
                <button onClick={() => setGarenaBanner(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>
            )}

            {/* Header & Quick Action Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-black text-white">Garena Shell Account Setup</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Configure your personal Garena master account, test live login status, inspect Shell balance, and load prepaid Shell cards directly from your panel.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGarenaRedeemModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-amber-500/30 transition-all shadow-md"
                >
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Bulk Load Cards</span>
                </button>
                <button
                  onClick={openCreateGarenaModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Garena Account</span>
                </button>
              </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Total Live Shells</span>
                  <h3 className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                    {totalShells.toLocaleString()} <span className="text-xs font-sans text-slate-400">Shells</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Sum across your configured accounts</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                  🐚
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Configured Accounts</span>
                  <h3 className="text-2xl font-black text-white font-mono mt-0.5">
                    {garenaAccounts.length} <span className="text-xs font-sans text-slate-400">Pools</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Ready for automated worker top-up</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl">
                  <User className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Configured Accounts Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Your Garena Accounts</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400">
                    {garenaAccounts.length}
                  </span>
                </h3>
                <button
                  onClick={fetchGarenaAccounts}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingGarena ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {garenaAccounts.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl">
                    🐚
                  </div>
                  <h4 className="text-sm font-bold text-white">No Garena Accounts Configured Yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Add your Garena Shell account credentials or session cookie so your account can execute automated Garena Shell top-ups and Level-Up Pass orders.
                  </p>
                  <button
                    onClick={openCreateGarenaModal}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Garena Account</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {garenaAccounts.map((acc: any) => (
                    <div
                      key={acc._id}
                      className={`p-5 rounded-2xl bg-slate-900 border transition-all ${
                        acc.isPrimary ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white">{acc.accountNickname}</span>
                            {acc.isPrimary && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black">
                                <Star className="w-3 h-3 fill-amber-400" />
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">UID / User: {acc.username}</p>
                        </div>

                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300">
                          {acc.region || 'MY'} Server
                        </span>
                      </div>

                      {/* Balance & Status Row */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Current Balance</span>
                          <span className="text-base font-black text-amber-400 font-mono">
                            {(acc.shellsBalance || 0).toLocaleString()} <span className="text-[11px] font-sans text-slate-400">Shells</span>
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Auth Status</span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              acc.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {acc.status}
                          </span>
                        </div>
                      </div>

                      {acc.notes && (
                        <p className="text-[11px] text-slate-400 mt-3 bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                          {acc.notes}
                        </p>
                      )}

                      {/* Card Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <button
                          onClick={() => handleTestGarenaLogin(acc)}
                          disabled={testingGarenaId === acc._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold border border-amber-500/20 transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${testingGarenaId === acc._id ? 'animate-spin' : ''}`} />
                          <span>{testingGarenaId === acc._id ? 'Testing...' : 'Test Login & Sync'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {!acc.isPrimary && (
                            <button
                              onClick={() => handleSetPrimaryGarena(acc._id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all"
                            >
                              Make Primary
                            </button>
                          )}
                          <button
                            onClick={() => openEditGarenaModal(acc)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                            title="Edit Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGarenaAccount(acc._id, acc.accountNickname)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-all"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal 1: Add / Edit Garena Account */}
            {garenaModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl animate-scaleIn my-auto">
                  <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white">
                        {editingGarenaAccount ? 'Edit Garena Account' : 'Add New Garena Account'}
                      </h3>
                    </div>
                    <button onClick={() => setGarenaModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveGarenaAccount} className="p-4 sm:p-5 space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Account Nickname</label>
                      <input
                        type="text"
                        value={garenaNickname}
                        onChange={(e) => setGarenaNickname(e.target.value)}
                        placeholder="e.g. My Master MY Account"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">
                          Garena Username / UID <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={garenaUsername}
                          onChange={(e) => setGarenaUsername(e.target.value)}
                          placeholder="garena_username"
                          required
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Region / Server</label>
                        <select
                          value={garenaRegion}
                          onChange={(e) => setGarenaRegion(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 font-bold"
                        >
                          <option value="MY">Malaysia (shop.garena.my)</option>
                          <option value="SG">Singapore (shop.garena.sg)</option>
                          <option value="BD">Bangladesh Server</option>
                          <option value="ID">Indonesia (kiosgamer.co.id)</option>
                          <option value="TH">Thailand</option>
                          <option value="GLOBAL">Global</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Garena Password</label>
                      <div className="relative">
                        <input
                          type={showGarenaPassword ? 'text' : 'password'}
                          value={garenaPassword}
                          onChange={(e) => setGarenaPassword(e.target.value)}
                          placeholder="Account password (stored encrypted)"
                          className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGarenaPassword(!showGarenaPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                        >
                          {showGarenaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        Auth Session Cookie <span className="text-slate-500 font-normal">(Recommended to bypass captcha)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={garenaAuthCookie}
                        onChange={(e) => setGarenaAuthCookie(e.target.value)}
                        placeholder="sso_key=...; session_key=..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Notes / Description</label>
                      <input
                        type="text"
                        value={garenaNotes}
                        onChange={(e) => setGarenaNotes(e.target.value)}
                        placeholder="e.g. 5,000 Shells reserve account"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="primaryCheckbox"
                        checked={garenaIsPrimary}
                        onChange={(e) => setGarenaIsPrimary(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-800 text-amber-500 focus:ring-0 bg-slate-950"
                      />
                      <label htmlFor="primaryCheckbox" className="text-slate-300 font-bold cursor-pointer">
                        Set as Primary Account for Automated Top-Ups
                      </label>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setGarenaModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingGarenaAccount}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 disabled:opacity-50"
                      >
                        {savingGarenaAccount ? 'Saving...' : editingGarenaAccount ? 'Update Account' : 'Save Account'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal 2: Bulk Redeem Garena Prepaid Shell Cards */}
            {garenaRedeemModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl animate-scaleIn my-auto">
                  <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white">Bulk Load Garena Shell Cards</h3>
                    </div>
                    <button onClick={() => setGarenaRedeemModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleBulkRedeemGarenaCards} className="p-4 sm:p-5 space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        Prepaid Shell Cards / PINs <span className="text-slate-500">(1 per line)</span>
                      </label>
                      <textarea
                        rows={6}
                        value={garenaCardsText}
                        onChange={(e) => setGarenaCardsText(e.target.value)}
                        placeholder="Paste PINs or Serial:PIN lines here...&#10;GPC1234567890&#10;GPC9876543210"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                      />
                    </div>

                    {garenaRedeemResult && (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-emerald-400">
                            Loaded: {garenaRedeemResult.totalLoaded} Cards
                          </span>
                          <span className="text-rose-400">
                            Failed: {garenaRedeemResult.failedCards?.length || 0}
                          </span>
                        </div>
                        {garenaRedeemResult.failedCards?.length > 0 && (
                          <div className="text-[10px] text-rose-400 space-y-1 font-mono max-h-24 overflow-y-auto">
                            {garenaRedeemResult.failedCards.map((f: any, i: number) => (
                              <div key={i}>• {f.card}: {f.reason}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setGarenaRedeemModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        disabled={redeemingGarena}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 disabled:opacity-50"
                      >
                        {redeemingGarena ? 'Redeeming Cards...' : 'Redeem Cards Now'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
