'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

export default function GarenaAccountsPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Pipeline Decommissioned</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Garena Shells pipeline has been decommissioned. This platform now operates exclusively with{' '}
          <span className="text-cyan-400 font-semibold">UniPin Automation Gateway</span>.
        </p>
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>UniPin Voucher Automation (Active)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>UniPin Wallet Direct Top-Up (Active)</span>
          </div>
        </div>
        <div className="pt-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Admin Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
