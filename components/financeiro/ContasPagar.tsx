'use client';

import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Expense } from '@/lib/types';
import { PaymentModal } from './PaymentModal';

export function ContasPagar({ expenses, onAdd }: { expenses: Expense[], onAdd: () => void }) {
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="bg-brand-card rounded-2xl border border-brand-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-brand-border flex justify-between items-center">
        <h3 className="text-lg font-black uppercase italic tracking-tight">Contas a Pagar</h3>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase italic tracking-widest shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover transition-colors">
          <Plus size={16} /> Nova Conta
        </button>
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
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">{e.description}</td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">{e.category}</td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">{e.supplier || '-'}</td>
                <td className="px-6 py-4 text-sm font-black text-right text-rose-600">{formatCurrency(e.amount)}</td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">{new Date(e.dueDate).toLocaleDateString('pt-BR')}</td>
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
          </tbody>
        </table>
      </div>
      {expenseToPay && (
        <PaymentModal expense={expenseToPay} onClose={() => setExpenseToPay(null)} />
      )}
    </div>
  );
}
