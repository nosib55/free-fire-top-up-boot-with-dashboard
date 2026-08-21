'use client';

import React from 'react';

export default function GlobalLoadingPage() {
  return (
    <div
      className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-white relative overflow-hidden"
      suppressHydrationWarning
    >
      {/* Ambient Neon Glow */}
      <div className="absolute w-72 h-72 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Pure Textless Minimalist Spinner & Pulse */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing Outer Neon Ring */}
        <div className="absolute w-24 h-24 rounded-3xl bg-cyan-500/20 animate-ping opacity-60" />

        {/* Spinning Gradient Border Ring */}
        <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-cyan-500 via-transparent to-cyan-400 animate-spin shadow-2xl shadow-cyan-500/30">
          <div className="w-full h-full rounded-[14px] bg-slate-950" />
        </div>

        {/* Central Pure Glowing Brand Emblem (Textless) */}
        <div className="absolute w-8 h-8 rounded-xl bg-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-600/50">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
        </div>
      </div>
    </div>
  );
}
