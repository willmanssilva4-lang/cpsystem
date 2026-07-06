import React from 'react';
import './globals.css';
import { ERPProvider } from '@/lib/context';
import { AppLayout } from '@/components/AppLayout';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'CPSystem ERP - Gestão Integrada',
  description: 'Sistema ERP Profissional para Gestão de Vendas, Estoque e Financeiro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CPSystem',
  },
};

export const viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg?v=3" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg?v=3" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Unregister stale service workers and clear caches to fix Next.js webpack compilation freezes
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  var unregisteredAny = false;
                  for (var i = 0; i < registrations.length; i++) {
                    registrations[i].unregister().then(function(success) {
                      if (success) console.log('[ServiceWorker] Stale worker unregistered successfully.');
                    });
                    unregisteredAny = true;
                  }
                  if (unregisteredAny && 'caches' in window) {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(key) {
                        caches.delete(key).then(function() {
                          console.log('[CacheStorage] Cleared stale cache:', key);
                        });
                      });
                    });
                  }
                });
              }
              
              // Automatically catch chunk loading errors and reload the page
              window.addEventListener('error', function(e) {
                var message = (e.message || '').toLowerCase();
                if (message.indexOf('chunk') > -1 || message.indexOf('cannot find module') > -1 || message.indexOf('loading css chunk') > -1) {
                  console.warn('[Webpack] Chunk load failure detected. Performing page refresh...', e);
                  window.location.reload();
                }
              }, true);
            `,
          }}
        />
      </head>
      <body className="h-full text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <ERPProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </ERPProvider>

        {/* Landscape Mobile Blocker Overlay */}
        <div className="hidden mobile-landscape-block fixed inset-0 z-[99999] bg-slate-950 text-white flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" transform="rotate(-90 12 12)" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <h1 className="text-lg font-black uppercase italic tracking-wider text-slate-100 mb-2">Por favor, use o modo retrato</h1>
          <p className="text-xs text-slate-400 font-bold max-w-xs leading-relaxed uppercase">Este sistema foi otimizado para visualização em pé no celular. Gire o seu aparelho para continuar.</p>
        </div>
      </body>
    </html>
  );
}
