'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <h1 className="text-6xl font-black italic uppercase text-slate-300">404</h1>
      <h2 className="text-2xl font-black italic uppercase text-slate-800 mt-4">Página Não Encontrada</h2>
      <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm font-medium">A página que você está procurando não existe, foi movida ou você não tem permissão para acessá-la.</p>
      <Link href="/" className="mt-8 px-6 py-3 bg-brand-blue hover:bg-blue-700 text-white rounded-2xl font-bold transition-all uppercase italic text-xs tracking-wider inline-block">
        Voltar para o Início
      </Link>
    </div>
  );
}
