'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  FileText,
  Truck,
  DollarSign,
  ArrowRight,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

const MOCK_COTATIONS = [
  {
    id: 'COT-2024-001',
    title: 'Cotação Semanal - Bebidas',
    date: '01/03/2024',
    status: 'Em Aberto',
    suppliers: ['Ambev', 'Coca-Cola', 'Heineken'],
    items: 12,
    bestPrice: 'R$ 15.400,00'
  },
  {
    id: 'COT-2024-002',
    title: 'Reposição Hortifruti',
    date: '28/02/2024',
    status: 'Finalizada',
    suppliers: ['Distribuidora Sol', 'Horta Viva', 'Agro Campo'],
    items: 8,
    bestPrice: 'R$ 4.200,00'
  },
  {
    id: 'COT-2024-003',
    title: 'Limpeza e Higiene',
    date: '25/02/2024',
    status: 'Finalizada',
    suppliers: ['Unilever', 'P&G', 'Limpa Tudo'],
    items: 25,
    bestPrice: 'R$ 8.900,00'
  }
];

export default function CotacoesPage() {
  const [view, setView] = useState<'list' | 'create'>('list');

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/compras" className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
            <ArrowLeft size={14} />
            Voltar para Compras
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Cotações de Preços</h1>
          <p className="text-brand-blue/60 font-medium">Compare preços entre fornecedores e garanta a melhor margem.</p>
        </div>
        <button 
          onClick={() => setView('create')}
          className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
        >
          <Plus size={20} />
          Nova Cotação
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30 p-4 rounded-[24px] border border-brand-border">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar cotação por título ou ID..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:ring-2 focus:ring-brand-blue-hover"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold text-brand-text-main hover:bg-slate-50 transition-all">
                  <Filter size={18} />
                  Filtros
                </button>
                <select className="flex-1 md:flex-none px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue-hover appearance-none">
                  <option>Todas as Cotações</option>
                  <option>Em Aberto</option>
                  <option>Finalizadas</option>
                </select>
              </div>
            </div>

            {/* Cotations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_COTATIONS.map((cot, index) => (
                <motion.div
                  key={cot.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white border border-brand-border rounded-[32px] p-6 hover:border-brand-blue-hover hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-tight ${
                      cot.status === 'Em Aberto' ? 'bg-amber-100 text-amber-700' : 'bg-brand-border text-brand-text-main'
                    }`}>
                      {cot.status}
                    </span>
                    <button className="text-brand-text-main/20 group-hover:text-brand-blue transition-colors">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-1 mb-6">
                    <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight leading-tight">{cot.title}</h3>
                    <p className="text-xs font-bold text-brand-text-main/40 uppercase italic tracking-widest">{cot.id} • {cot.date}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-50 text-brand-blue p-2 rounded-lg">
                          <Truck size={16} />
                        </div>
                        <span className="text-xs font-bold text-brand-text-main/60 uppercase italic">Fornecedores</span>
                      </div>
                      <span className="text-sm font-black text-brand-text-main italic">{cot.suppliers.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-50 text-brand-blue p-2 rounded-lg">
                          <DollarSign size={16} />
                        </div>
                        <span className="text-xs font-bold text-brand-text-main/60 uppercase italic">Melhor Preço</span>
                      </div>
                      <span className="text-sm font-black text-brand-blue italic">{cot.bestPrice}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {cot.suppliers.map((s, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-brand-border border-2 border-white flex items-center justify-center text-[10px] font-black text-brand-blue italic uppercase">
                          {s[0]}
                        </div>
                      ))}
                    </div>
                    <button className="flex items-center gap-2 text-xs font-black text-brand-blue uppercase italic tracking-widest hover:gap-3 transition-all">
                      Detalhes
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Create Cotation UI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Basic Info */}
                <div className="p-8 rounded-[32px] border border-brand-border bg-slate-50/30 space-y-6">
                  <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Informações Básicas</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Título da Cotação</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Cotação Bebidas Março"
                        className="w-full px-4 py-4 bg-white border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Data Limite</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-4 bg-white border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Selection */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Produtos para Cotar</h2>
                    <button className="flex items-center gap-2 px-4 py-2 bg-brand-border text-brand-text-main rounded-xl text-xs font-black uppercase italic tracking-tight hover:bg-brand-border transition-all">
                      <Plus size={16} />
                      Adicionar Produto
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-brand-border">
                          <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Produto</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Qtd. Estimada</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Último Custo</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {[
                          { name: 'Arroz Agulhinha 5kg', qty: 500, lastCost: 'R$ 18,50' },
                          { name: 'Feijão Carioca 1kg', qty: 1000, lastCost: 'R$ 6,20' },
                          { name: 'Óleo de Soja 900ml', qty: 240, lastCost: 'R$ 5,80' },
                        ].map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-brand-text-main">{item.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-black text-brand-text-main italic">{item.qty} un.</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-brand-text-main/60">{item.lastCost}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-rose-300 hover:text-rose-600 transition-colors">
                                <Plus size={18} className="rotate-45" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Suppliers Selection */}
              <div className="space-y-8">
                <div className="p-8 rounded-[32px] border border-brand-border bg-white space-y-6">
                  <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Fornecedores Participantes</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={16} />
                      <input 
                        type="text" 
                        placeholder="Buscar fornecedor..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                    <div className="space-y-2">
                      {['Ambev S.A.', 'Nestlé Brasil', 'Unilever', 'Coca-Cola FEMSA'].map((s) => (
                        <label key={s} className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                          <input type="checkbox" className="w-4 h-4 rounded border-brand-border text-brand-blue focus:ring-brand-blue-hover" />
                          <span className="text-sm font-bold text-brand-text-main group-hover:text-brand-blue transition-colors">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => setView('list')}
                    className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight shadow-xl shadow-brand-blue/20 hover:bg-brand-text-main transition-all active:scale-95"
                  >
                    Lançar Cotação
                  </button>
                  <button 
                    onClick={() => setView('list')}
                    className="w-full py-4 bg-white border border-brand-border text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
