'use client';

import React, { useState } from 'react';
import { useERP } from '@/lib/context';
import { Return } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, toLocalDateString } from '@/lib/utils';

export function EstornoDevolucaoReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { returns, products } = useERP();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredReturns = returns.filter(r => {
    const d = toLocalDateString(r.date);
    return d >= startDate && d <= endDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const currentReturns = filteredReturns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            {currentReturns.map((ret) => (
              <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 text-sm font-medium text-slate-600">{new Date(ret.date).toLocaleDateString('pt-BR')}</td>
                <td className="py-4 text-sm font-bold text-slate-800">{ret.type}</td>
                <td className="py-4 text-sm font-medium text-slate-600">{ret.refundMethod}</td>
                <td className="py-4 text-right text-sm font-black text-brand-danger">{formatCurrency(ret.total)}</td>
              </tr>
            ))}
            {currentReturns.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 italic">Nenhum estorno ou devolução encontrado no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredReturns.length > 0 && (
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
          <p className="text-sm text-slate-500 font-medium">
            Mostrando {currentReturns.length} de {filteredReturns.length} registros
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="text-slate-400 px-1">...</span>
                      )}
                      <button 
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                          page === currentPage ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
