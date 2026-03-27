import type {Metadata} from 'next';
import './globals.css';
import { ERPProvider } from '@/lib/context';
import { AppLayout } from '@/components/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'CPSystem PDV',
  description: 'Gestão Financeira Inteligente e PDV em Tempo Real',
  applicationName: 'CPSystem PDV',
  authors: [{ name: 'CPSystem' }],
  keywords: ['ERP', 'PDV', 'Gestão', 'Financeiro'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html id="cpsystem-app" name="cpsystem-app" data-id="cpsystem-app" data-name="cpsystem-app" lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="CPSystem PDV" />
        <meta name="apple-mobile-web-app-title" content="CPSystem PDV" />
      </head>
      <body id="app-body" name="app-body" data-id="app-body" data-name="app-body" suppressHydrationWarning className="bg-brand-bg">
        <ERPProvider>
          <ErrorBoundary>
            <AppLayout>
              {children}
            </AppLayout>
          </ErrorBoundary>
        </ERPProvider>
      </body>
    </html>
  );
}
