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
    console.log('[AuthGuard] useEffect running. isAuthReady:', isAuthReady, 'user:', effectiveUser, 'pathname:', pathname);
    // Wait for auth to be ready before making decisions
    if (!isAuthReady) {
      return;
    }

    const isSuperAdminManagement = effectiveUser?.email?.toLowerCase() === 'willmanssilva4@gmail.com';
    const isCaixaCheck = effectiveUser?.role?.trim().toLowerCase() === 'caixa';
    
    let target: string | null = null;
    
    if (!effectiveUser) {
      if (pathname !== '/login' && pathname !== '/consulta-preco') {
        target = '/login';
      }
    } else {
      if (pathname === '/login') {
        target = isCaixaCheck ? '/pdv' : (isSuperAdminManagement ? '/admin/companies' : '/');
      } else if (pathname === '/' && isSuperAdminManagement) {
        target = '/admin/companies';
      } else if (pathname === '/' && isCaixaCheck) {
        target = '/pdv';
      }
    }
    
    if (target && target !== pathname) {
      // If we are already on the target or navigating to it, don't trigger again
      if (redirectingToRef.current === target) {
        console.log('[AuthGuard] Already redirecting to target:', target);
        return;
      }

      console.log(`[AuthGuard] Redirecting from ${pathname} to ${target}`);
      redirectingToRef.current = target;
      
      // Use window.location.replace for ALL redirects to be absolutely sure it works
      // and doesn't get stuck in a router state loop. 
      // This forces a full page load which is more robust for auth state transitions.
      window.location.replace(target);
    } else {
      console.log('[AuthGuard] No redirect target needed.');
      redirectingToRef.current = null;
    }
  }, [user, router, pathname, isAuthReady, effectiveUser]);

  // If we are on a public page, don't show the loading screen if auth is not ready
  // This prevents stuck loading screens on login/price check pages
  const isPublicPage = pathname === '/login' || pathname === '/consulta-preco';

  // Force reload if stuck
  useEffect(() => {
    if (!isAuthReady && !isPublicPage) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isAuthReady, isPublicPage]);

  // Show loading state while auth is initializing or when explicitly loading
  // No longer showing it for redirecting state to prevent stuck UI
  if (!isAuthReady && !isPublicPage) {
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
              Carregando Sistema...
            </span>
            <span className="text-white/60 text-xs mt-2">Se demorar mais de 10s, recarregando automaticamente...</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
