'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ShoppingBag,
  Plus,
  Trash2,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function MinhasListasPage() {
  const [savedLists, setSavedLists] = useState<any[]>([]);

  useEffect(() => {
    const lists = JSON.parse(localStorage.getItem('saved_shopping_lists') || '[]');
    setSavedLists(lists);
  }, []);

  const deleteList = (listId: string) => {
    const updatedLists = savedLists.filter(l => l.id !== listId);
    setSavedLists(updatedLists);
    localStorage.setItem('saved_shopping_lists', JSON.stringify(updatedLists));
  };

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/compras" className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
            <ArrowLeft size={14} /> Voltar para Compras
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Minhas Listas</h1>
        </div>
        <Link 
          href="/compras/lista-compras"
          className="flex items-center gap-2 px-8 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-blue-hover transition-all shadow-md"
        >
          <Plus size={20} />
          Nova Lista
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedLists.map((list) => (
          <div key={list.id} className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-brand-blue" />
                <h3 className="font-bold text-lg text-brand-text-main">{list.name || 'Lista Sem Nome'}</h3>
              </div>
              <button onClick={() => deleteList(list.id)} className="text-rose-400 hover:text-rose-600">
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 italic">Criado em: {new Date(list.createdAt).toLocaleDateString()}</p>
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400">{list.items.length} itens</span>
              <Link href={`/compras/lista-compras/${list.id}`} className="text-brand-blue font-bold text-sm">Visualizar</Link>
            </div>
          </div>
        ))}
        {savedLists.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-400 font-bold italic">Nenhuma lista salva.</div>
        )}
      </div>
    </div>
  );
}
