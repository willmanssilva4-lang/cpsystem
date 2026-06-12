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
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="icon" href="/icon.svg?v=3" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg?v=3" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
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
