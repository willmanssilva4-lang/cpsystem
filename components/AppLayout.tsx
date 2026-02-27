'use client';

import React from 'react';
import { useERP } from '@/lib/context';
import { Sidebar } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';
import { usePathname } from 'next/navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useERP();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isPdvPage = pathname === '/pdv';

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        {!isLoginPage && !isPdvPage && user && <Sidebar />}
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
