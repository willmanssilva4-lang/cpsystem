'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Calendar, ArrowDownCircle } from 'lucide-react';
import { cn, formatDateBR } from '@/lib/utils';
import { Expense } from '@/lib/types';
import { useERP } from '@/lib/context';
import * as XLSX from 'xlsx';

export function Despesas({ expenses }: { expenses: Expense[] }) {
  const { setCustomAlert } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => e.status === 'Pago')
      .filter(e => 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.paymentDate || b.date).getTime() - new Date(a.paymentDate || a.date).getTime());
  }, [expenses, searchTerm]);

  const totalPaid = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      setCustomAlert({ message: 'Não há despesas para exportar.', type: 'warning' });
      return;
    }

    setCustomAlert({ message: 'Exportando despesas...', type: 'info' });

    const dataToExport = filteredExpenses.map(e => ({
      'Data Pagto': formatDateBR(e.paymentDate || e.date),
      'Descrição': e.description,
      'Categoria': e.category,
      'Forma': e.paymentMethod || '-',
      'Valor': e.amount,
      'Origem': e.origin || 'Lançamento Manual'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas");
    XLSX.writeFile(workbook, "despesas_pagas.xlsx");
    
    setCustomAlert({ message: 'Exportação concluída!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
        <div className="flex flex-1 w-full max-w-md items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar despesas pagas..." 
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase italic tracking-widest hover:bg-brand-blue/90 transition-all shadow-md shadow-brand-blue/10"
          >
            <Download size={16} /> Exportar
          </button>
          <button className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-blue transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Pago no Período</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalPaid)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-brand-card rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border">
          <h3 className="text-lg font-black uppercase italic tracking-tight">Histórico de Despesas (Pagas)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Pagto</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Forma</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    {formatDateBR(e.paymentDate || e.date)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">{e.description}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">{e.category}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">{e.paymentMethod || '-'}</td>
                  <td className="px-6 py-4 text-sm font-black text-right text-rose-600">{formatCurrency(e.amount)}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {e.origin || 'Lançamento Manual'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={32} className="opacity-20" />
                      <p className="text-sm font-bold uppercase italic tracking-widest">Nenhuma despesa paga encontrada</p>
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
