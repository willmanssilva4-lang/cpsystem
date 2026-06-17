'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ViewListaComprasPage() {
  const { id } = useParams();
  const [list, setList] = useState<any>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('saved_shopping_lists') || '[]');
    const found = saved.find((l: any) => l.id.toString() === id?.toString());
    setList(found);
  }, [id]);

  if (!list) {
    return <div className="p-8">Lista não encontrada ou carregando...</div>;
  }

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/compras/minhas-listas" className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-tight text-xs hover:gap-3 transition-all">
          <ArrowLeft size={14} /> Voltar para Minhas Listas
        </Link>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">{list.name}</h1>
        <span className="text-sm text-slate-500 italic">Criado em: {new Date(list.createdAt).toLocaleDateString()}</span>
      </div>
      
      <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-brand-border">
              <th className="px-8 py-4 text-[10px] font-black uppercase italic text-brand-text-main/40">Produto</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase italic text-brand-text-main/40 text-center">Qtd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.items.map((item: any) => (
              <tr key={item.id}>
                <td className="px-8 py-4 text-sm font-bold text-brand-text-main">{item.name}</td>
                <td className="px-8 py-4 text-sm font-bold text-brand-text-main text-center">{item.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
