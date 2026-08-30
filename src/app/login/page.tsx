'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, Key, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'password' | 'token'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'Apex Top-Up',
    logoUrl: '',
  });

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setSiteSettings({
            siteName: data.settings.siteName || 'Apex Top-Up',
            logoUrl: data.settings.logoUrl || '',
          });
        }
      } catch {}
    }
    loadSettings();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const payload =
        loginMethod === 'password'
          ? { email, password }
          : { apiKey };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/userDashboard');
        }
      } else {
        setErrorMessage(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-10 selection:bg-cyan-500 selection:text-white">
      {/* Outer Card */}
      <div className="relative w-full max-w-4xl">
        <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-r from-cyan-600/20 to-blue-600/20 blur-xl opacity-60 pointer-events-none" />

        <div className="relative w-full rounded-3xl sm:rounded-[32px] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
          
          {/* LEFT SIDE: Artwork */}
          <div className="relative min-h-[180px] sm:min-h-[280px] md:min-h-full overflow-hidden bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 group">
            <Image
              src="/login-banner.jpg"
              alt="Free Fire"
              fill
              priority
              className="object-cover object-center filter brightness-95 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
          </div>

          {/* RIGHT SIDE: Sign In Form */}
          <div className="p-5 sm:p-8 md:p-10 flex flex-col justify-between space-y-5 bg-slate-900/95">
            {/* Website Brand Header */}
            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-black text-xs hover:border-cyan-500 transition-colors shadow-md"
              >
                {siteSettings.logoUrl ? (
                  <div className="relative w-6 h-6 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-900">
                    <Image src={siteSettings.logoUrl} alt="Logo" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-cyan-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-cyan-600/30">
                    {siteSettings.siteName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="tracking-wider text-sm font-extrabold">{siteSettings.siteName.toUpperCase()}</span>
              </Link>

              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Portal Access</h1>
                <p className="text-xs text-slate-400 mt-0.5">Sign in with your email or directly with your API Key token.</p>
              </div>
            </div>

            {/* Login Method Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setErrorMessage('');
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  loginMethod === 'password'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMethod('token');
                  setErrorMessage('');
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  loginMethod === 'token'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>API Token</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
              {loginMethod === 'password' ? (
                <>
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-medium">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-300 font-medium">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="block text-slate-300 font-medium">Your API Key / Secret Token</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="APEX-XXXX-XXXX-XXXX"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono font-bold select-all"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1">
                    Paste your assigned API token to enter your client dashboard instantly without password.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-md shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] mt-2"
              >
                <span>{loading ? 'Authenticating...' : loginMethod === 'token' ? 'Access with Token' : 'Sign In'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <Link href="/" className="hover:text-cyan-400 transition-colors font-medium">
                ← Return Home
              </Link>
              <span className="flex items-center gap-1 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Secure Gateway
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
