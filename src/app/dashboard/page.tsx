'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Read role from cookie if set
    const cookies = document.cookie.split('; ').reduce((acc: any, current) => {
      const [name, value] = current.split('=');
      acc[name] = value;
      return acc;
    }, {});

    const role = cookies['user_role'];

    if (role === 'admin') {
      router.replace('/admin');
    } else if (role === 'user' || role === 'reseller') {
      router.replace('/userDashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center" suppressHydrationWarning>
      <div className="text-center space-y-3" suppressHydrationWarning>
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-400">Redirecting to your dashboard portal...</p>
      </div>
    </div>
  );
}
