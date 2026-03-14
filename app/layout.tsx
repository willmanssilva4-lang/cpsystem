import type {Metadata} from 'next';
import './globals.css';
import { ERPProvider } from '@/lib/context';
import { AppLayout } from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'Cpsystem',
  description: 'Gestão Financeira Inteligente',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-brand-bg">
        <ERPProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </ERPProvider>
      </body>
    </html>
  );
}
