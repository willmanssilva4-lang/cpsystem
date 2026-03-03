'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Plus, 
  CheckCircle2,
  RefreshCcw,
  ArrowRight,
  ChevronRight,
  History,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

const MOCK_REPLENISHMENT = [
  {
    id: '1',
    name: 'Arroz Agulhinha 5kg',
    category: 'Mercearia Doce',
    currentStock: 5,
    minStock: 20,
    avgSales: 15, // per week
    suggestedQty: 45,
    lastCost: 'R$ 18,50',
    supplier: 'Distribuidora Alimentos'
  },
  {
    id: '2',
    name: 'Feijão Carioca 1kg',
    category: 'Mercearia Salgada',
    currentStock: 12,
    minStock: 50,
    avgSales: 40,
    suggestedQty: 100,
    lastCost: 'R$ 6,20',
    supplier: 'Grãos do Brasil'
  },
  {
    id: '3',
    name: 'Óleo de Soja 900ml',
    category: 'Mercearia Salgada',
    currentStock: 0,
    minStock: 24,
    avgSales: 18,
    suggestedQty: 48,
    lastCost: 'R$ 5,80',
    supplier: 'Cargill S.A.'
  },
  {
    id: '4',
    name: 'Leite Integral 1L',
    category: 'Laticínios',
    currentStock: 15,
    minStock: 60,
    avgSales: 55,
    suggestedQty: 120,
    lastCost: 'R$ 4,10',
    supplier: 'Laticínios União'
  }
];

export default function ReposicaoPage() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerateOrders = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('Ordens de compra geradas com sucesso para os fornecedores selecionados!');
      setSelectedItems([]);
    }, 2000);
  };

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/compras" className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
            <ArrowLeft size={14} />
            Voltar para Compras
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Sugestão de Reposição</h1>
          <p className="text-brand-blue/60 font-medium">Análise inteligente de estoque baseada em giro e estoque mínimo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-brand-border text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-50 transition-all active:scale-95">
            <RefreshCcw size={20} />
            Recalcular
          </button>
          <button 
            onClick={handleGenerateOrders}
            disabled={selectedItems.length === 0 || isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {isProcessing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <RefreshCcw size={20} />
              </motion.div>
            ) : (
              <ShoppingCart size={20} />
            )}
            Gerar {selectedItems.length} Pedidos
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Itens Críticos', value: '12', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Valor Estimado', value: 'R$ 24.500', icon: TrendingUp, color: 'text-brand-blue', bg: 'bg-slate-50' },
          { label: 'Fornecedores Envolvidos', value: '8', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat) => (
          <div key={stat.label} className="p-6 rounded-[32px] border border-brand-border bg-white flex items-center gap-6">
            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-brand-text-main italic tracking-tight">{stat.value}</div>
              <div className="text-xs text-brand-text-main/40 font-bold uppercase italic tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Produtos que precisam de atenção</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={18} />
              <input 
                type="text" 
                placeholder="Filtrar por nome ou categoria..."
                className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-blue-hover w-64"
              />
            </div>
            <button className="p-2 bg-slate-50 text-brand-text-main rounded-xl hover:bg-brand-border transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-brand-border">
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-brand-border text-brand-blue focus:ring-brand-blue-hover"
                    checked={selectedItems.length === MOCK_REPLENISHMENT.length}
                    onChange={() => {
                      if (selectedItems.length === MOCK_REPLENISHMENT.length) setSelectedItems([]);
                      else setSelectedItems(MOCK_REPLENISHMENT.map(i => i.id));
                    }}
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Estoque Atual</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Estoque Mín.</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Giro Semanal</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Sugestão</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Fornecedor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MOCK_REPLENISHMENT.map((item) => (
                <tr key={item.id} className={`hover:bg-slate-50/30 transition-colors ${selectedItems.includes(item.id) ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-brand-border text-brand-blue focus:ring-brand-blue-hover"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-brand-blue">
                        <Package size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-brand-text-main">{item.name}</div>
                        <div className="text-[10px] font-black text-brand-text-main/40 uppercase italic">{item.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black italic ${item.currentStock <= item.minStock / 2 ? 'text-rose-600' : 'text-brand-text-main'}`}>
                      {item.currentStock} un.
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-brand-text-main/60">{item.minStock} un.</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-brand-text-main/60">{item.avgSales} un.</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-brand-blue italic">+{item.suggestedQty}</span>
                      <button className="p-1 text-brand-text-main/20 hover:text-brand-blue transition-colors">
                        <Plus size={14} className="rotate-45" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-brand-text-main/60 uppercase italic">{item.supplier}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-brand-text-main/40 hover:text-brand-blue transition-colors">
                      <History size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="p-8 bg-slate-50 rounded-[32px] border border-brand-border flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-blue shadow-sm">
            <History size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">Último Cálculo de Reposição</h3>
            <p className="text-xs text-brand-text-main/40 font-bold uppercase italic tracking-widest">Realizado em 01/03/2024 às 09:45</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Total Selecionado</div>
            <div className="text-xl font-black text-brand-text-main italic">R$ 12.450,00</div>
          </div>
          <button 
            onClick={handleGenerateOrders}
            disabled={selectedItems.length === 0 || isProcessing}
            className="px-8 py-4 bg-brand-text-main text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-black transition-all shadow-xl shadow-brand-text-main/20 active:scale-95 disabled:opacity-50"
          >
            Gerar Ordens de Compra
          </button>
        </div>
      </div>
    </div>
  );
}
