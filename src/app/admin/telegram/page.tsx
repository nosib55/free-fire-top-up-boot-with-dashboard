'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Globe,
  Radio,
  Eye,
  EyeOff,
  Bell,
  Save,
  MessageSquare,
  Activity,
  Trash2,
  Copy,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function TelegramBotSetupPage() {
  const [botToken, setBotToken] = useState('');
  const [adminChatId, setAdminChatId] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [botEnabled, setBotEnabled] = useState(true);
  const [autoAlerts, setAutoAlerts] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    '🤖 Welcome to AMS Topup Automated Bot! Use /help to view available commands.'
  );

  const [botInfo, setBotInfo] = useState<any>(null);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testLog, setTestLog] = useState<any>(null);

  useEffect(() => {
    fetchTelegramSettings();
  }, []);

  async function fetchTelegramSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/telegram');
      const data = await res.json();
      if (data.success) {
        setBotToken(data.telegram.botToken || '');
        setAdminChatId(data.telegram.adminChatId || '');
        setBotUsername(data.telegram.botUsername || '');
        setBotEnabled(data.telegram.botEnabled ?? true);
        setAutoAlerts(data.telegram.autoAlerts ?? true);
        if (data.telegram.welcomeMessage) {
          setWelcomeMessage(data.telegram.welcomeMessage);
        }
        setBotInfo(data.botInfo);
        setWebhookInfo(data.webhookInfo);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function showBanner(type: 'success' | 'error', text: string) {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  }

  async function handleSaveSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          botToken,
          adminChatId,
          botEnabled,
          autoAlerts,
          welcomeMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showBanner('success', 'Telegram Bot settings saved successfully in database!');
        fetchTelegramSettings();
      } else {
        showBanner('error', data.message || 'Failed to save settings');
      }
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestLog(null);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          botToken,
          adminChatId,
        }),
      });
      const data = await res.json();
      setTestLog(data);
      if (data.success) {
        showBanner('success', data.message);
        fetchTelegramSettings();
      } else {
        showBanner('error', data.message || 'Connection test failed');
      }
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleSetWebhook() {
    if (!botToken) {
      showBanner('error', 'Please enter and save a Telegram Bot Token first.');
      return;
    }
    setRegisteringWebhook(true);
    try {
      const currentOrigin = window.location.origin;
      const targetWebhook = `${currentOrigin}/api/telegram/webhook`;

      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_webhook',
          webhookUrl: targetWebhook,
          botToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showBanner('success', `Webhook set to: ${targetWebhook}`);
        fetchTelegramSettings();
      } else {
        showBanner('error', data.message || 'Failed to register webhook');
      }
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setRegisteringWebhook(false);
    }
  }

  async function handleDeleteWebhook() {
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_webhook',
          botToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showBanner('success', 'Webhook deleted successfully.');
        fetchTelegramSettings();
      } else {
        showBanner('error', data.message);
      }
    } catch (err: any) {
      showBanner('error', err.message);
    }
  }

  async function handleSendTestAlert() {
    setSendingAlert(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test_alert',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showBanner('success', 'Test alert message dispatched to Admin Telegram Chat!');
      } else {
        showBanner('error', data.message || 'Failed to send test alert');
      }
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setSendingAlert(false);
    }
  }

  const isConnected = Boolean(botInfo?.ok || botUsername);

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest font-mono">
              TELEGRAM INTEGRATION
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Telegram Bot Setup & Notification Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure Telegram bot token, admin chat alerts, instant two-way interactive commands, and webhook synchronization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchTelegramSettings}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testing || !botToken}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-xs text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Verifying...' : 'Test Connection'}</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
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
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Bot Status Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Bot className="w-7 h-7" />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                  isConnected && botEnabled ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-white">
                  {botInfo?.firstName || botUsername || 'AMS Telegram Bot'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                    isConnected && botEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {isConnected && botEnabled ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {isConnected && botEnabled ? 'CONNECTED & ACTIVE' : botToken ? 'STANDBY / NOT VERIFIED' : 'UNCONFIGURED'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                {botInfo?.username ? (
                  <a
                    href={`https://t.me/${botInfo.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    @{botInfo.username} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span>@{botUsername || 'your_bot_username'}</span>
                )}
                {botInfo?.botId && <span>• ID: {botInfo.botId}</span>}
                {adminChatId && <span>• Admin Chat: {adminChatId}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTestAlert}
              disabled={sendingAlert || !botToken || !adminChatId}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${sendingAlert ? 'animate-pulse' : ''}`} />
              <span>{sendingAlert ? 'Sending...' : 'Send Test Alert'}</span>
            </button>
          </div>
        </div>

        {/* Webhook & Telemetry Subcard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" /> Webhook Status
            </span>
            <p className="font-mono text-white truncate text-[11px]">
              {webhookInfo?.url ? (
                <span className="text-emerald-400 truncate block">Active: {webhookInfo.url}</span>
              ) : (
                <span className="text-slate-500">No Webhook Registered (Direct/Polling mode)</span>
              )}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" /> Automated Alerts
            </span>
            <p className="font-mono font-bold text-white">
              {autoAlerts ? (
                <span className="text-emerald-400">ENABLED (Keys, Balance & Failures)</span>
              ) : (
                <span className="text-slate-500">DISABLED</span>
              )}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Two-Way Interactive
            </span>
            <p className="font-mono font-bold text-cyan-400">
              7 Admin Commands Ready
            </p>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Credentials & Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Bot className="w-4 h-4 text-cyan-400" />
                Telegram Bot Credentials & Access
              </h2>

              <div className="space-y-4 text-xs">
                {/* Bot Token Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-bold flex items-center gap-1">
                      Telegram Bot Token <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-slate-400 hover:text-cyan-400 text-[11px] flex items-center gap-1 transition-colors"
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showToken ? 'Hide Token' : 'Show Token'}</span>
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Obtained from <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-semibold">@BotFather</a> on Telegram when creating your bot.
                  </p>
                </div>

                {/* Admin Chat ID Input */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Telegram Admin Chat ID / Channel ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminChatId}
                    onChange={(e) => setAdminChatId(e.target.value)}
                    placeholder="e.g. 123456789 or -100123456789 or @YourAdminChannel"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Send a message to <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-semibold">@userinfobot</a> or <a href="https://t.me/getmyid_bot" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-semibold">@getmyid_bot</a> to get your numeric Telegram ID.
                  </p>
                </div>

                {/* Welcome Message Input */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    Bot /start Welcome Message
                  </label>
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={2}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Toggles */}
                <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Enable Bot Toggle */}
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="font-bold text-white text-xs">Enable Bot Processing</p>
                      <p className="text-[11px] text-slate-400">Allow bot to respond to commands</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={botEnabled}
                      onChange={(e) => setBotEnabled(e.target.checked)}
                      className="w-4 h-4 text-cyan-500 rounded border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  {/* Auto Alerts Toggle */}
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="font-bold text-white text-xs">Automated Admin Alerts</p>
                      <p className="text-[11px] text-slate-400">Send alerts on key/balance events</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoAlerts}
                      onChange={(e) => setAutoAlerts(e.target.checked)}
                      className="w-4 h-4 text-cyan-500 rounded border-slate-700 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-md shadow-cyan-600/30 transition-all text-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Settings...' : 'Save Bot Settings'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Webhook Control Panel */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Radio className="w-4 h-4 text-cyan-400" />
              Webhook Auto-Registration & Management
            </h2>

            <p className="text-xs text-slate-400">
              Registering a Webhook allows Telegram to push user commands and queries directly to your Next.js server endpoint (<code className="text-cyan-400 font-mono">/api/telegram/webhook</code>) in sub-second real time without polling.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSetWebhook}
                disabled={registeringWebhook || !botToken}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <Globe className="w-4 h-4" />
                <span>{registeringWebhook ? 'Registering Webhook...' : 'Auto-Register Webhook'}</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteWebhook}
                disabled={!botToken}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700 text-slate-300 font-semibold text-xs transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Webhook</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Commands Reference & Live Test Output */}
        <div className="space-y-6">
          {/* Telegram Commands Cheatsheet */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              Interactive Bot Commands
            </h3>
            <p className="text-[11px] text-slate-400">
              Admins and authorized users can send these commands in Telegram anytime:
            </p>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400 font-bold">/balance</span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">View live UniPin balance</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400 font-bold">/key_info &lt;KEY&gt;</span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">Check API key quota, expiry & security stats</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400 font-bold">/recent</span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">Display last 5 automated transactions</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-amber-400 font-bold">/pause_queue</span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">Pause top-up workers for maintenance</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-emerald-400 font-bold">/resume_queue</span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">Resume top-up automation workers</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400 font-bold">/health</span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">Platform memory, uptime & queue locks</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-cyan-400 font-bold">/sync_balance</span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">Force scrape fresh provider balances</p>
              </div>
            </div>
          </div>

          {/* Test Log Terminal Output */}
          {testLog && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Connection Test Output
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-56">
                <pre>{JSON.stringify(testLog, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
