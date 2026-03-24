'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, MoreHorizontal, AlertCircle } from 'lucide-react';
import { cn, formatDateBR } from '@/lib/utils';
import { Expense } from '@/lib/types';
import { PaymentModal } from './PaymentModal';

export function ContasPagar({ expenses, onAdd }: { expenses: Expense[], onAdd: () => void }) {
  console.log('Expenses in ContasPagar:', expenses);
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [expenses, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
        <div className="flex flex-1 w-full max-w-md items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por descrição, categoria ou fornecedor..." 
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase italic tracking-widest shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover transition-colors">
            <Plus size={16} /> Nova Conta
          </button>
          
          <button className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-blue transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-brand-card rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border flex justify-between items-center">
          <h3 className="text-lg font-black uppercase italic tracking-tight">Contas a Pagar</h3>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pendente</p>
            <p className="text-lg font-black text-rose-600">
              {formatCurrency(filteredExpenses.filter((e: any) => e.status !== 'Pago').reduce((acc: number, e: any) => acc + e.amount, 0))}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map((e: any) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">{e.description}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">{e.category}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">{e.supplier || '-'}</td>
                  <td className="px-6 py-4 text-sm font-black text-right text-rose-600">{formatCurrency(e.amount)}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">{formatDateBR(e.dueDate)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black uppercase italic",
                      e.status === 'Pago' ? "bg-emerald-100 text-emerald-600" : 
                      e.status === 'Vencido' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {e.status === 'Pago' ? '🟢 Pago' : e.status === 'Vencido' ? '🔴 Vencido' : '🟡 A vencer'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {e.status !== 'Pago' && (
                      <button onClick={() => setExpenseToPay(e)} className="text-xs font-bold text-brand-blue hover:text-brand-blue-hover uppercase italic">Pagar</button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={32} className="opacity-20" />
                      <p className="text-sm font-bold italic">Nenhum lançamento encontrado.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {expenseToPay && (
        <PaymentModal expense={expenseToPay} onClose={() => setExpenseToPay(null)} />
      )}
    </div>
  );
}
