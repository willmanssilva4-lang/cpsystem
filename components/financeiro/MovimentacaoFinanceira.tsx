'use client';

import React, { useMemo, useState } from 'react';
import { Search, Filter, ArrowUpRight, ArrowDownRight, Calendar, Download, FileText } from 'lucide-react';
import { cn, formatDateBR, formatTimeBR } from '@/lib/utils';
import { Sale, Expense, StockMovement, CashMovement } from '@/lib/types';

interface Props {
  sales: Sale[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  cashMovements: CashMovement[];
}

export function MovimentacaoFinanceira({ sales, expenses, stockMovements, cashMovements }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const [daysFilter, setDaysFilter] = useState<number>(30);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const transactions = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysFilter);
    cutoffDate.setHours(0, 0, 0, 0);

    const all: any[] = [
      ...sales.map(s => ({
        id: `sale-${s.id}`,
        date: s.date,
        description: `Venda #${s.id.slice(0, 8)}`,
        category: 'Venda PDV',
        type: 'entrada',
        amount: s.total,
        status: 'Concluído',
        source: 'sale'
      })),
      ...expenses.map(e => ({
        id: `exp-${e.id}`,
        date: e.paymentDate || e.date,
        description: e.description,
        category: e.category,
        type: 'saida',
        amount: e.amount,
        status: e.status,
        source: 'expense'
      })),
      ...stockMovements.filter(m => m.type === 'COMPRA').map(m => ({
        id: `stk-${m.id}`,
        date: m.date,
        description: `Compra de Estoque - ${m.productName || 'Produto'}`,
        category: 'Fornecedores',
        type: 'saida',
        amount: m.quantity * (m.cost || 0),
        status: 'Concluído',
        source: 'purchase'
      })),
      ...cashMovements.filter(m => m.type === 'suprimento' || m.type === 'sangria').map(m => ({
        id: `csh-${m.id}`,
        date: m.createdAt,
        description: m.reason || (m.type === 'suprimento' ? 'Suprimento de Caixa' : 'Sangria de Caixa'),
        category: 'Movimentação de Caixa',
        type: m.type === 'suprimento' ? 'entrada' : 'saida',
        amount: m.amount,
        status: 'Concluído',
        source: 'cash'
      }))
    ];

    return all
      .filter(t => new Date(t.date).getTime() >= cutoffDate.getTime())
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, expenses, stockMovements, cashMovements, daysFilter, typeFilter, searchTerm]);

  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.status !== 'Pendente' && t.status !== 'Vencido') {
        if (t.type === 'entrada') acc.entradas += t.amount;
        if (t.type === 'saida') acc.saidas += t.amount;
      }
      return acc;
    }, { entradas: 0, saidas: 0 });
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
        <div className="flex flex-1 w-full max-w-md items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por descrição ou categoria..." 
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest outline-none"
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
          >
            <option value="all">Todas as Movimentações</option>
            <option value="entrada">Apenas Entradas</option>
            <option value="saida">Apenas Saídas</option>
          </select>

          <select 
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest outline-none"
            value={daysFilter}
            onChange={(e: any) => setDaysFilter(Number(e.target.value))}
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={15}>Últimos 15 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          
          <button className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-blue transition-colors">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-card rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-black uppercase italic tracking-tight">Histórico de Movimentações</h3>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entradas (Realizadas)</p>
              <p className="text-sm font-black text-emerald-600">{formatCurrency(totals.entradas)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saídas (Realizadas)</p>
              <p className="text-sm font-black text-rose-600">{formatCurrency(totals.saidas)}</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatDateBR(t.date)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Calendar size={10} /> {formatTimeBR(t.date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        t.type === 'entrada' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {t.type === 'entrada' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">
                    {t.category}
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-black text-right",
                    t.type === 'entrada' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === 'entrada' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black uppercase italic",
                      t.status === 'Concluído' || t.status === 'Pago' ? "bg-emerald-100 text-emerald-600" : 
                      t.status === 'Vencido' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText size={32} className="opacity-20" />
                      <p className="text-sm font-bold italic">Nenhuma movimentação encontrada para os filtros selecionados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
