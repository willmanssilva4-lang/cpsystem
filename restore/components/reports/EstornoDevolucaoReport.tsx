'use client';

import React from 'react';
import { useERP } from '@/lib/context';
import { Return } from '@/lib/types';

export function EstornoDevolucaoReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { returns, products } = useERP();

  const filteredReturns = returns.filter(r => {
    const d = r.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-slate-800">Relatório de Estorno e Devolução</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Data</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Tipo</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Método Reembolso</th>
              <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredReturns.map((ret) => (
              <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 text-sm font-medium text-slate-600">{new Date(ret.date).toLocaleDateString('pt-BR')}</td>
                <td className="py-4 text-sm font-bold text-slate-800">{ret.type}</td>
                <td className="py-4 text-sm font-medium text-slate-600">{ret.refundMethod}</td>
                <td className="py-4 text-right text-sm font-black text-brand-danger">{formatCurrency(ret.total)}</td>
              </tr>
            ))}
            {filteredReturns.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 italic">Nenhum estorno ou devolução encontrado no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
