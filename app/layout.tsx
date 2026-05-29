import React from 'react';
import './globals.css';
import { ERPProvider } from '@/lib/context';
import { AppLayout } from '@/components/AppLayout';

export const metadata = {
  title: 'CPSystem ERP - Gestão Integrada',
  description: 'Sistema ERP Profissional para Gestão de Vendas, Estoque e Financeiro.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
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
