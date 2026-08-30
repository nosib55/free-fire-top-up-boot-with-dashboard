'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PackagePricingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-400">
      Redirecting to Admin Overview...
    </div>
  );
}
