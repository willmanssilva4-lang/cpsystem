'use client';

import React, { useMemo, useState } from 'react';
import { useERP } from '@/lib/context';
import { ArrowDown, ArrowUp, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { toLocalDateString } from '@/lib/utils';
import { motion } from 'motion/react';

export function SalesMoreLessReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  const [topCount, setTopCount] = useState(10);

  const productStats = useMemo(() => {
    const stats: Record<string, { qty: number, total: number }> = {};
    
    const filteredSales = sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });

    filteredSales.forEach(sale => {
      (sale.items || []).forEach((item: any) => {
        const prodId = item.productId || item.product_id;
        if (!prodId) return;
        if (!stats[prodId]) stats[prodId] = { qty: 0, total: 0 };
        stats[prodId].qty += (item.quantity || 0);
        stats[prodId].total += (item.price || 0) * (item.quantity || 0);
      });
    });

    return Object.entries(stats).map(([id, stat]) => ({
      id,
      name: products.find(p => p.id === id)?.name || 'Produto Desconhecido',
      qty: stat.qty,
      total: stat.total
    }));
  }, [sales, products, startDate, endDate]);

  const topSold = useMemo(() => [...productStats].sort((a,b) => b.qty - a.qty).slice(0, topCount), [productStats, topCount]);
  const bottomSold = useMemo(() => [...productStats].sort((a,b) => a.qty - b.qty).slice(0, topCount), [productStats, topCount]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* HEADER & SUMMARY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 font-black uppercase italic tracking-wider text-[10px] mb-1">
            <BarChart3 size={11} />
            Estatísticas de Inventário
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Produtos Mais e Menos Vendidos</h4>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={topCount} 
            onChange={(e) => setTopCount(Number(e.target.value))} 
            className="bg-white border text-xs font-bold p-2.5 rounded-xl border-slate-200 text-slate-700 outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
          >
            <option value={5}>Top/Bottom 5</option>
            <option value={10}>Top/Bottom 10</option>
            <option value={20}>Top/Bottom 20</option>
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Total de Produtos</span>
          <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{productStats.length}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Total Itens Vendidos</span>
          <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{productStats.reduce((a, b) => a + b.qty, 0)}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Top Performer</span>
          <span className="text-sm font-black text-emerald-700 truncate">{topSold[0]?.name || '-'}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase italic mb-2">Bottom Performer</span>
          <span className="text-sm font-black text-rose-700 truncate">{bottomSold[0]?.name || '-'}</span>
        </div>
      </div>

      {/* DATA GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Sold */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-5 text-emerald-700 font-black uppercase text-[10px] italic tracking-widest pl-1">
            <TrendingUp size={14} /> Mais Vendidos (Top {topCount})
          </div>
          <div className="space-y-2">
            {topSold.map((p, i) => (
              <div 
                key={p.id} 
                className="flex justify-between items-center text-xs p-3 hover:bg-emerald-50/50 rounded-xl transition-colors cursor-default"
              >
                 <span className="font-bold text-slate-700 truncate mr-4">{i + 1}. {p.name}</span>
                 <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono font-bold text-[10px]">{formatCurrency(p.total)}</span>
                    <span className="font-mono font-black text-emerald-700 w-16 text-right">{p.qty} un</span>
                 </div>
              </div>
            ))}
            {topSold.length === 0 && <p className="text-slate-400 text-xs italic p-3">Nenhum dado disponível.</p>}
          </div>
        </div>

        {/* Bottom Sold */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-5 text-rose-700 font-black uppercase text-[10px] italic tracking-widest pl-1">
            <TrendingDown size={14} /> Menos Vendidos (Bottom {topCount})
          </div>
          <div className="space-y-2">
            {bottomSold.map((p, i) => (
              <div 
                key={p.id} 
                className="flex justify-between items-center text-xs p-3 hover:bg-rose-50/50 rounded-xl transition-colors cursor-default"
              >
                 <span className="font-bold text-slate-700 truncate mr-4">{i + 1}. {p.name}</span>
                 <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono font-bold text-[10px]">{formatCurrency(p.total)}</span>
                    <span className="font-mono font-black text-rose-700 w-16 text-right">{p.qty} un</span>
                 </div>
              </div>
            ))}
            {bottomSold.length === 0 && <p className="text-slate-400 text-xs italic p-3">Nenhum dado disponível.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
