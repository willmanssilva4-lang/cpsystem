'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, MoreHorizontal, CheckCircle2, User, Calendar, DollarSign } from 'lucide-react';
import { cn, formatDateBR } from '@/lib/utils';
import { Sale, Customer } from '@/lib/types';
import { useERP } from '@/lib/context';

export function ContasReceber({ sales, customers }: { sales: Sale[], customers: Customer[] }) {
  const { updateSale, addCashMovement, cashRegisters } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received'>('pending');
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const receivables = useMemo(() => {
    // In this simplified model, we consider 'Fiado' sales as receivables
    // We can use a custom property or just the paymentMethod
    return sales
      .filter(s => s.paymentMethod === 'Fiado')
      .map(s => {
        const customer = customers.find(c => c.id === s.customerId);
        return {
          ...s,
          customerName: customer?.name || 'Cliente não identificado',
          // For now, let's assume if it's in sales it's "pending" if it was fiado
          // In a real app we'd have a 'paid' flag on the sale or a linked payment
          status: s.netAmount && s.netAmount >= s.total ? 'Recebido' : 'Pendente'
        };
      })
      .filter(r => {
        const matchesSearch = r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'pending' && r.status === 'Pendente') ||
                             (statusFilter === 'received' && r.status === 'Recebido');
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, customers, searchTerm, statusFilter]);

  const handleReceive = async (sale: any) => {
    const openRegister = cashRegisters.find(r => r.status === 'open');
    if (!openRegister) {
      alert('É necessário ter um caixa aberto para receber pagamentos.');
      return;
    }

    if (confirm(`Confirmar recebimento de ${formatCurrency(sale.total)} de ${sale.customerName}?`)) {
      // Update sale to mark as paid
      await updateSale({ 
        ...sale, 
        paymentMethod: 'Dinheiro' // Change from 'Fiado' to 'Dinheiro' to mark as paid
      });

      // Add cash movement
      await addCashMovement({
        cashRegisterId: openRegister.id,
        type: 'suprimento',
        amount: sale.total,
        reason: `Recebimento de Fiado - Venda #${sale.id.slice(0, 6)} - ${sale.customerName}`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
        <div className="flex flex-1 w-full max-w-md items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou código..." 
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest outline-none"
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendentes</option>
            <option value="received">Recebidos</option>
          </select>
          
          <button className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-blue transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-card rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border flex justify-between items-center">
          <h3 className="text-lg font-black uppercase italic tracking-tight">Contas a Receber (Fiado)</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pendente</p>
              <p className="text-lg font-black text-rose-600">
                {formatCurrency(receivables.filter(r => r.status === 'Pendente').reduce((acc, r) => acc + r.total, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Venda / Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {receivables.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">#{r.id.slice(0, 8)}</span>
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Calendar size={10} /> {formatDateBR(r.date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <User size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.customerName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-right text-emerald-600">{formatCurrency(r.total)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black uppercase italic",
                      r.status === 'Recebido' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {r.status === 'Recebido' ? '🟢 Recebido' : '🟡 Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {r.status === 'Pendente' && (
                      <button 
                        onClick={() => handleReceive(r)}
                        className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-black uppercase italic tracking-widest transition-colors"
                      >
                        <CheckCircle2 size={12} /> Receber
                      </button>
                    )}
                    {r.status === 'Recebido' && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase italic">Liquidado</span>
                    )}
                  </td>
                </tr>
              ))}
              {receivables.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <DollarSign size={32} className="opacity-20" />
                      <p className="text-sm font-bold italic">Nenhuma conta a receber encontrada.</p>
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
