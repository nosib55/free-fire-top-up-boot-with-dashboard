'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // demo login check (simulate small delay for real feel)
    setTimeout(() => {
      if (email === 'admin@gmail.com' && password === '123456') {
        document.cookie = 'admin_session=true; path=/; max-age=86400'; // 1 day 
        router.push('/dashboard');
      } else {
        setError('Invalid email or password!');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#120F0D] text-white p-4 sm:p-6 lg:p-8 font-['Manrope',sans-serif]">
      <div className="flex w-full sm:w-4/5 max-w-5xl flex-col lg:flex-row rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#2A2420]">
        {/* Left Banner - hidden on small screens, shown from md up */}
        <div className="hidden md:flex md:w-1/2 relative min-h-[280px] lg:min-h-[550px] bg-black">
          <img
            src="https://assets-prd.ignimgs.com/2023/06/07/freefire-1686171898799.jpg?crop=1%3A1%2Csmart&format=jpg&auto=webp&quality=80"
            alt="Free Fire Gaming Theme"
            className="absolute inset-0 w-full h-full object-cover opacity-70 hover:scale-105 transition duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120F0D] via-black/30 to-black/40" />

          <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 z-10 space-y-2 sm:space-y-3">
            <span className="inline-block px-3 py-1.5 sm:px-3.5 bg-[#FF5F1F]/90 text-[#2A1206] rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-lg font-['JetBrains_Mono',monospace]">
              Free Fire Automation
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide leading-tight font-['Rajdhani',sans-serif]">
              Control & Manage Instantly
            </h2>
            <p className="text-xs sm:text-sm text-[#A89F94] leading-relaxed">
              Manage your Free Fire vouchers and codes with ease. Track,
              validate, and distribute vouchers efficiently — all in one
              dashboard.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full md:w-1/2 bg-[#1C1815] p-6 sm:p-10 lg:p-14 flex flex-col justify-center">
          {/* Mobile-only badge since banner is hidden */}
          <span className="md:hidden self-start mb-4 px-3 py-1.5 bg-[#FF5F1F]/90 text-[#2A1206] rounded-full text-[10px] font-bold tracking-wider uppercase shadow-lg font-['JetBrains_Mono',monospace]">
            Free Fire Automation
          </span>

          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-['Rajdhani',sans-serif] uppercase">
              Admin Portal
            </h1>
            <p className="text-sm text-[#A89F94] mt-2">
              Sign in to access your dashboard
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 sm:p-4 bg-[#D9352C]/10 border border-[#D9352C]/40 text-[#F0847D] rounded-xl text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A89F94] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 sm:px-5 sm:py-4 bg-[#252019] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5F1F] focus:ring-1 focus:ring-[#FF5F1F] transition text-base text-white placeholder-[#6B6259] font-['JetBrains_Mono',monospace]"
                placeholder="admin@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A89F94] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 sm:px-5 sm:py-4 pr-16 bg-[#252019] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5F1F] focus:ring-1 focus:ring-[#FF5F1F] transition text-base text-white placeholder-[#6B6259] font-['JetBrains_Mono',monospace]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A89F94] hover:text-[#F0A93D] transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-[#A89F94]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="accent-[#FF5F1F] w-4 h-4 rounded"
                />
                Remember me
              </label>
              <a
                href="#"
                className="text-[#F0A93D] hover:text-[#FF5F1F] font-medium transition"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-[#FF5F1F] to-[#F0A93D] hover:from-[#FF7A3D] hover:to-[#F5BE5F] disabled:opacity-60 disabled:cursor-not-allowed text-[#1C1815] rounded-xl font-bold shadow-lg shadow-[#FF5F1F]/30 transition duration-200 text-base tracking-wide font-['Rajdhani',sans-serif] uppercase"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
