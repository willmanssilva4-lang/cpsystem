'use client';

import React, { useEffect } from 'react';
import { useERP } from '@/lib/context';
import { useRouter, usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useERP();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user && pathname !== '/login') {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }
  }, [user, router, pathname]);

  // If we're on the login page, just show it
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If we're not logged in and not on login page, show nothing while redirecting
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
