import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-white"
      suppressHydrationWarning
    >
      <div
        className="max-w-md w-full text-center space-y-6 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl"
        suppressHydrationWarning
      >
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black text-3xl flex items-center justify-center mx-auto">
          404
        </div>

        <div className="space-y-2" suppressHydrationWarning>
          <h1 className="text-2xl font-black text-white">Page Not Found</h1>
          <p className="text-xs text-slate-400">
            The endpoint or portal page you requested does not exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2" suppressHydrationWarning>
          <Link
            href="/"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-xs text-white shadow-lg shadow-cyan-500/20"
          >
            Return to SaaS Landing Page
          </Link>
          <Link
            href="/login"
            className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-300"
          >
            Sign In to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
