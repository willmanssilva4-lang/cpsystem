'use client';

import React, { useEffect, useState } from 'react';
import { useERP } from '@/lib/context';
import { useRouter, usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { AlertCircle, RefreshCw, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthReady, isLoading, hasPermission } = useERP();
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname || '';
  const redirectingToRef = React.useRef<string | null>(null);

  // States for diagnostic assistance and loading bypass
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [forcedReady, setForcedReady] = useState(false);
  const [envCheck, setEnvCheck] = useState({ url: 'Verificando...', key: 'Verificando...' });

  const effectiveUser = user;

  // Perform quick env inspection on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      setEnvCheck({
        url: hasUrl ? 'Disponível' : 'Ausente',
        key: hasKey ? 'Disponível' : 'Ausente'
      });
    }
  }, []);

  // Synchronously compute the redirection target
  let computedTarget: string | null = null;
  const isSuperAdminManagement = effectiveUser?.email?.toLowerCase() === 'willmanssilva4@gmail.com';
  const userRole = effectiveUser?.role?.trim().toLowerCase() || '';
  const isCaixaCheck = userRole === 'caixa' || 
                       userRole === 'operador de caixa' || 
                       userRole === 'operador caixa' || 
                       userRole === 'fiscal de caixa' ||
                       userRole.includes('caixa') ||
                       userRole.includes('operador') ||
                       userRole.includes('atendente');

  if (isAuthReady && !forcedReady) {
    if (!effectiveUser) {
      if (currentPath !== '/login' && currentPath !== '/consulta-preco') {
        computedTarget = '/login';
      }
    } else {
      // User is logged in
      if (isSuperAdminManagement) {
        if (currentPath !== '/admin/companies' && currentPath !== '/consulta-preco') {
          computedTarget = '/admin/companies';
        }
      } else {
        // For non-super-admins, wait for data/permissions to be loaded before deciding redirects
        if (!isLoading) {
          // 1. Determine the module for currentPath
          let requiredModule: string | null = null;
          if (currentPath === '/') {
            requiredModule = 'Dashboard';
          } else if (currentPath.startsWith('/pdv') || currentPath.startsWith('/vendas') || currentPath.startsWith('/promocoes')) {
            requiredModule = 'Vendas';
          } else if (currentPath.startsWith('/produtos')) {
            requiredModule = 'Estoque';
          } else if (currentPath.startsWith('/financeiro')) {
            requiredModule = 'Financeiro';
          } else if (currentPath.startsWith('/compras')) {
            requiredModule = 'Compras';
          } else if (currentPath.startsWith('/clientes')) {
            requiredModule = 'Clientes';
          } else if (currentPath.startsWith('/relatorios')) {
            requiredModule = 'Relatórios';
          } else if (currentPath.startsWith('/configuracoes')) {
            requiredModule = 'Configurações';
          } else if (currentPath.startsWith('/cadastros')) {
            requiredModule = 'Cadastros';
          }

          // 2. Check if they have view permission for current module
          const hasViewPermission = requiredModule ? hasPermission(requiredModule, 'view') : true;

          // 3. Find their preferred landing page based on allowed modules
          const fallbackModules = [
            { module: 'Dashboard', path: '/' },
            { module: 'Vendas', path: '/pdv' },
            { module: 'Estoque', path: '/produtos' },
            { module: 'Financeiro', path: '/financeiro' },
            { module: 'Compras', path: '/compras' },
            { module: 'Clientes', path: '/clientes' },
            { module: 'Relatórios', path: '/relatorios' },
            { module: 'Configurações', path: '/configuracoes' },
            { module: 'Cadastros', path: '/cadastros' }
          ];
          const firstAllowedModule = fallbackModules.find(m => hasPermission(m.module, 'view'));
          const allowedLandingPath = firstAllowedModule ? firstAllowedModule.path : '/pdv';

          if (currentPath === '/login') {
            computedTarget = allowedLandingPath;
          } else if (currentPath.startsWith('/admin')) {
            computedTarget = allowedLandingPath;
          } else if (!hasViewPermission) {
            // Trying to access an unauthorized module or '/' when they don't have Dashboard permission
            computedTarget = allowedLandingPath;
          } else if (isCaixaCheck && currentPath !== '/pdv' && currentPath !== '/consulta-preco') {
            // Keep hardcoded caixa fallback for extra security
            computedTarget = '/pdv';
          }
        }
      }
    }
  }

  useEffect(() => {
    console.log('[AuthGuard] useEffect running. isAuthReady:', isAuthReady, 'user:', effectiveUser, 'pathname:', currentPath, 'computedTarget:', computedTarget);
    
    // If the user forced entry, we skip the redirections unless we find auth has actually loaded later
    if (forcedReady && !isAuthReady) {
      console.log('[AuthGuard] Entry forced. Skipping auth check for now.');
      return;
    }

    if (computedTarget && computedTarget !== currentPath) {
      // If we are already on the target or navigating to it, don't trigger again
      if (redirectingToRef.current === computedTarget) {
        console.log('[AuthGuard] Already redirecting to target:', computedTarget);
        return;
      }

      console.log(`[AuthGuard] Redirecting from ${currentPath} to ${computedTarget}`);
      redirectingToRef.current = computedTarget;
      
      // Use Next.js client-side router to redirect smoothly without full-page reloads,
      // avoiding annoying visual flickers/flashes while retaining auth state in context.
      router.replace(computedTarget);
    } else {
      console.log('[AuthGuard] No redirect target needed.');
      redirectingToRef.current = null;
    }
  }, [currentPath, isAuthReady, effectiveUser, forcedReady, computedTarget]);

  // If we are on a public page, don't show the loading screen if auth is not ready
  // This prevents stuck loading screens on login/price check pages
  const isPublicPage = currentPath === '/login' || currentPath === '/consulta-preco';
  const needsRedirect = computedTarget !== null && computedTarget !== currentPath;

  // Toggle troubleshooting panel after 4 seconds of loading
  useEffect(() => {
    if (!isAuthReady && !isPublicPage && !forcedReady) {
      const timer = setTimeout(() => {
        console.warn('[AuthGuard] Auth taking long. Showing troubleshooting helper.');
        setShowTroubleshooting(true);
      }, 4000); // 4 seconds before offering bypass
      return () => clearTimeout(timer);
    }
  }, [isAuthReady, isPublicPage, forcedReady]);

  // Clear cache helper action
  const handleClearCacheAndReload = () => {
    try {
      if (typeof window !== 'undefined') {
        console.log('[AuthGuard] Resetting local caches and doing page reload...');
        
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let r of registrations) {
              r.unregister();
            }
          });
        }
        
        // Remove storage caches
        localStorage.clear();
        sessionStorage.clear();
        
        // Reload page
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  // Show loading state while auth is initializing OR when a redirect is pending/in-progress
  if ((!isAuthReady && !isPublicPage && !forcedReady) || needsRedirect) {
    console.log('[AuthGuard] Rendering loading screen. isAuthReady:', isAuthReady, 'needsRedirect:', needsRedirect);
    return (
      <div 
        id="auth-loading-screen" 
        data-id="auth-loading-screen"
        data-name="auth-loading-screen"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-y-auto p-4 md:p-8"
        style={{ backgroundColor: '#1E5EFF' }}
      >
        <div className="flex flex-col items-center gap-8 max-w-md w-full text-center">
          <Logo size="lg" theme="dark" className="animate-pulse" />
          
          <div className="flex flex-col items-center gap-4 w-full">
            <div id="loading-spinner" data-id="loading-spinner" className="w-12 h-12 border-4 border-white/20 border-t-brand-green rounded-full animate-spin" />
            
            <span id="loading-text" data-id="loading-text" className="text-white font-bold uppercase italic tracking-widest text-sm md:text-base">
              {needsRedirect ? 'Redirecionando...' : 'Carregando Sistema...'}
            </span>
            
            <span className="text-white/60 text-xs mt-1">
              Status: {isAuthReady ? 'Pronto' : 'Aguardando'} | {needsRedirect ? 'Calculando acesso seguro' : 'Aguardando dados'}
            </span>
          </div>

          {/* Diagnostics and Troubleshooting recovery section */}
          {showTroubleshooting && (
            <div 
              className="mt-4 p-5 bg-white/10 rounded-2xl border border-white/10 text-left w-full space-y-4 animate-fadeIn shadow-xl backdrop-blur-md"
              style={{ animation: 'fadeIn 0.5s ease-out' }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-300 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-white font-semibold text-sm leading-none">Precisa de Ajuda?</h4>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">
                    A inicialização está demorando mais do que o comum. Você pode acessar diretamente ou reiniciar o ambiente.
                  </p>
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="border-t border-white/10 pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Conexão do Servidor:</span>
                  <span className="text-brand-green font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} /> OK
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Supabase Config URL:</span>
                  <span className={envCheck.url === 'Disponível' ? "text-brand-green font-medium" : "text-yellow-300 font-medium"}>
                    {envCheck.url}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Supabase Config Key:</span>
                  <span className={envCheck.key === 'Disponível' ? "text-brand-green font-medium" : "text-yellow-300 font-medium"}>
                    {envCheck.key}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    console.log('[AuthGuard] Entry forced by user.');
                    setForcedReady(true);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-brand-green hover:bg-brand-green/90 text-slate-900 rounded-xl font-bold text-xs transition-colors shadow-lg active:scale-95 duration-100 cursor-pointer"
                >
                  <Play size={14} fill="currentColor" />
                  Forçar Entrada
                </button>
                
                <button
                  type="button"
                  onClick={handleClearCacheAndReload}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-xs transition-colors active:scale-95 duration-100 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  Limpar e Reiniciar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
