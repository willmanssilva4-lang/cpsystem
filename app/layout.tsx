import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Sistema ERP Integrado',
  description: 'Uma plataforma moderna e integrada de gestão empresarial (ERP)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
