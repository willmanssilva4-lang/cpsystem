'use client';

import React, { useEffect } from 'react';
import { useERP } from '@/lib/context';
import { useRouter, usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthReady, isLoading } = useERP();
  const router = useRouter();
  const pathname = usePathname();
  const redirectingToRef = React.useRef<string | null>(null);

  // We rely on the user from context, which is now loaded in a useEffect in ERPProvider.
  // This ensures that the initial render on client matches server (both will have user=null initially).
  const effectiveUser = user;

  useEffect(() => {
    // Wait for auth to be ready before making decisions
    if (!isAuthReady) {
      return;
    }

    const target = !effectiveUser ? '/login' : (pathname === '/login' ? '/' : null);
    
    if (target) {
      // If we are already on the target or navigating to it, don't trigger again
      if (pathname === target || redirectingToRef.current === target) {
        return;
      }

      console.log(`[AuthGuard] Redirecting from ${pathname} to ${target}`);
      redirectingToRef.current = target;
      
      // Use window.location.replace for ALL redirects to be absolutely sure it works
      // and doesn't get stuck in a router state loop. 
      // This forces a full page load which is more robust for auth state transitions.
      window.location.replace(target);
    } else {
      redirectingToRef.current = null;
    }
  }, [user, router, pathname, isAuthReady, effectiveUser]);

  // Show loading state while auth is initializing or when explicitly loading
  // Also show it when we are about to redirect (to avoid white screen or stuck state)
  const isRedirecting = isAuthReady && ((!effectiveUser && pathname !== '/login') || (effectiveUser && pathname === '/login'));

  if (!isAuthReady || isRedirecting) {
    return (
      <div 
        id="auth-loading-screen" 
        data-id="auth-loading-screen"
        data-name="auth-loading-screen"
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: '#1E5EFF' }}
      >
        <div className="flex flex-col items-center gap-8">
          <Logo size="lg" theme="dark" className="animate-pulse" />
          <div className="flex flex-col items-center gap-4">
            <div id="loading-spinner" data-id="loading-spinner" className="w-12 h-12 border-4 border-white/20 border-t-brand-green rounded-full animate-spin" />
            <span id="loading-text" data-id="loading-text" className="text-white font-bold uppercase italic tracking-widest">
              {!isAuthReady ? 'Carregando Sistema...' : 'Redirecionando...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
