import type {Metadata} from 'next';
import './globals.css';
import { ERPProvider } from '@/lib/context';
import { AppLayout } from '@/components/AppLayout';

export const metadata: Metadata = {
  title: 'StoreFlow ERP Pro',
  description: 'Sistema de gestão empresarial completo',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-slate-50 dark:bg-slate-950">
        <ERPProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </ERPProvider>
      </body>
    </html>
  );
}
