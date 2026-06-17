import React from 'react';
import './globals.css';
import { ERPProvider } from '@/lib/context';
import { AppLayout } from '@/components/AppLayout';

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
      </body>
    </html>
  );
}
