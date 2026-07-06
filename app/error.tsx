'use client';

import React from 'react';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  React.useEffect(() => {
    console.error('App runtime error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <h1 className="text-6xl font-black italic uppercase text-rose-200">OPS!</h1>
      <h2 className="text-2xl font-black italic uppercase text-slate-800 mt-4">Ocorreu um Erro</h2>
      <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm font-medium">Ocorreu um problema inesperado ao processar sua requisição. Por favor, tente recarregar ou contate o administrador.</p>
      
      <div className="flex justify-center gap-4 mt-8">
        <button 
          onClick={() => reset()} 
          className="px-6 py-3 bg-brand-blue hover:bg-blue-700 text-white rounded-2xl font-bold transition-all uppercase italic text-xs tracking-wider cursor-pointer"
        >
          Tentar Novamente
        </button>
        <button 
          onClick={() => window.location.replace('/')} 
          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-bold transition-all uppercase italic text-xs tracking-wider cursor-pointer"
        >
          Ir para o Início
        </button>
      </div>
    </div>
  );
}
