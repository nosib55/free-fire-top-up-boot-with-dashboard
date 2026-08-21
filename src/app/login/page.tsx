'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/userDashboard');
        }
      } else {
        setErrorMessage(data.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-cyan-500 selection:text-white">
      {/* Outer Card */}
      <div className="relative w-full max-w-4xl">
        <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-r from-cyan-600/20 to-blue-600/20 blur-xl opacity-60 pointer-events-none" />

        <div className="relative w-full rounded-[32px] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[480px]">
          
          {/* LEFT SIDE: Pure Clean Free Fire Artwork */}
          <div className="relative min-h-[260px] sm:min-h-[340px] md:min-h-full overflow-hidden bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 group">
            <Image
              src="/login-banner.jpg"
              alt="Free Fire"
              fill
              priority
              className="object-cover object-center filter brightness-95 group-hover:scale-105 transition-transform duration-700"
            />
            {/* Subtle Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
          </div>

          {/* RIGHT SIDE: Website Name & Sign In Form */}
          <div className="p-6 sm:p-10 flex flex-col justify-between space-y-6 bg-slate-900/95">
            {/* Website Brand Name on the Right Side */}
            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white font-black text-xs hover:border-cyan-500 transition-colors shadow-md"
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
                <h1 className="text-2xl font-black text-white tracking-tight">Sign In to Account</h1>
                <p className="text-xs text-slate-400 mt-0.5">Enter your email and password to continue.</p>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-md shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] mt-2"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
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
