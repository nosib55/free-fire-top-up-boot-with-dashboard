'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Key,
  Server,
  Settings,
  FileCode,
  Shield,
  LogOut,
  ChevronRight,
  Globe,
  Zap,
  Menu,
  X,
  Coins,
  Bot,
  ShieldCheck,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'Apex Top-Up',
    logoUrl: '',
  });

  // Close mobile sidebar on route change & fetch site settings
  useEffect(() => {
    setMobileMenuOpen(false);
    async function loadBrandSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setSiteSettings({
            siteName: data.settings.siteName || 'Apex Top-Up',
            logoUrl: data.settings.logoUrl || '',
          });
        }
      } catch {
        // Fallback
      }
    }
    loadBrandSettings();
  }, [pathname]);

  const navItems = [
    { name: 'Analytics Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'API Key Manager', href: '/admin/api-keys', icon: Key },
    { name: 'Telegram Bot Setup', href: '/admin/telegram', icon: Bot },
    { name: 'Provider Gateway', href: '/admin/provider', icon: Server },
    { name: 'Landing Controls', href: '/admin/landing', icon: Globe },
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
    { name: 'Integration Guide', href: '/admin/docs', icon: FileCode },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased" suppressHydrationWarning>
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 lg:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-Over Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 z-50 flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3">
              {siteSettings.logoUrl ? (
                <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-cyan-600/20 shrink-0 border border-slate-700 bg-slate-950">
                  <Image src={siteSettings.logoUrl} alt="Brand Logo" fill sizes="40px" className="object-cover" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-cyan-600/30 shrink-0">
                  {siteSettings.siteName.substring(0, 4).toUpperCase()}
                </div>
              )}
              <div>
                <span className="font-extrabold text-base text-white block truncate max-w-[140px]">
                  {siteSettings.siteName}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  ADMIN_PANEL
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Nav Links */}
          <nav className="space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-400 border border-cyan-500/30 font-bold shadow-md shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Sidebar Footer */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="overflow-hidden text-xs">
              <p className="font-bold text-white truncate">Master Admin</p>
              <p className="text-[10px] text-slate-500 truncate">admin@platform.com</p>
            </div>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Desktop Static Sidebar (Visible only on lg: screens) */}
      <aside
        className="hidden lg:flex w-64 transition-all duration-300 border-r border-slate-800 bg-slate-900/90 backdrop-blur-md flex-col justify-between sticky top-0 h-screen z-40 shrink-0"
        suppressHydrationWarning
      >
        <div className="p-4 space-y-6" suppressHydrationWarning>
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-2">
            {siteSettings.logoUrl ? (
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-cyan-600/20 shrink-0 border border-slate-700 bg-slate-950">
                <Image src={siteSettings.logoUrl} alt="Brand Logo" fill sizes="40px" className="object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-cyan-600/30 shrink-0">
                {siteSettings.siteName.substring(0, 4).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <span className="font-extrabold text-base bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent block truncate">
                {siteSettings.siteName}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                ADMIN_PANEL
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1 text-xs font-semibold" suppressHydrationWarning>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-400 border border-cyan-500/30 font-bold shadow-md shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3" suppressHydrationWarning>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="overflow-hidden text-xs">
              <p className="font-bold text-white truncate">Master Admin</p>
              <p className="text-[10px] text-slate-500 truncate">admin@platform.com</p>
            </div>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 w-full" suppressHydrationWarning>
        {/* Top App Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
              aria-label="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-slate-400 truncate">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:block" />
              <span className="hidden sm:inline">Admin Suite</span>
              <ChevronRight className="w-3 h-3 text-slate-600 hidden sm:inline" />
              <span className="text-slate-200 font-bold capitalize truncate">
                {pathname.split('/')[2]?.replace('-', ' ') || 'Analytics'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] sm:text-xs">
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse shrink-0" />
              <span className="hidden md:inline">Gateway Connected</span>
              <span className="md:hidden">Connected</span>
            </div>
          </div>
        </header>

        <main className="p-3.5 sm:p-6 lg:p-8 flex-1 overflow-y-auto w-full max-w-full" suppressHydrationWarning>
          {children}
        </main>
      </div>
    </div>
  );
}
