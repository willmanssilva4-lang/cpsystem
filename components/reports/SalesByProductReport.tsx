'use client';

import React, { useState } from 'react';
import { useERP } from '@/lib/context';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SalesByProductReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const productStats: Record<string, { qty: number, total: number, totalCost: number, totalTax: number }> = {};

  filteredSales.forEach(sale => {
    const saleTax = sale.taxAmount || 0;
    const itemsSum = sale.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 1;

    sale.items.forEach(item => {
      if (!productStats[item.productId]) {
        productStats[item.productId] = { qty: 0, total: 0, totalCost: 0, totalTax: 0 };
      }
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.costPrice : 0;
      const itemTotal = item.price * item.quantity;
      
      // Distribuição proporcional da taxa da venda baseada no valor bruto dos itens
      const itemTax = (itemTotal / itemsSum) * saleTax;

      productStats[item.productId].qty += item.quantity;
      productStats[item.productId].total += itemTotal;
      productStats[item.productId].totalCost += cost * item.quantity;
      productStats[item.productId].totalTax += itemTax;
    });
  });

  const allData = Object.entries(productStats)
    .map(([productId, stats]) => {
      const product = products.find(p => p.id === productId);
      return {
        name: product ? product.name : 'Produto Desconhecido',
        qty: stats.qty,
        price: stats.qty > 0 ? stats.total / stats.qty : 0,
        total: stats.total,
        tax: stats.totalTax,
        profit: stats.total - stats.totalCost - stats.totalTax
      };
    })
    .sort((a, b) => b.total - a.total);

  const totalPages = Math.ceil(allData.length / itemsPerPage);
  const currentData = allData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totals = allData.reduce((acc, curr) => ({
    qty: acc.qty + curr.qty,
    total: acc.total + curr.total,
    profit: acc.profit + curr.profit
  }), { qty: 0, total: 0, profit: 0 });

  return (
    <div className="space-y-6">
      {/* Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bruto Vendido</p>
          <h3 className="text-2xl font-black text-brand-blue italic">{formatCurrency(totals.total)}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">Soma de todos os produtos</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantidade Total</p>
          <h3 className="text-2xl font-black text-brand-text-main italic">{totals.qty} <span className="text-sm">unidades</span></h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">Volume total de saída</p>
        </div>
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Lucro Líquido Total</p>
          <h3 className="text-2xl font-black text-emerald-600 italic">{formatCurrency(totals.profit)}</h3>
          <p className="text-[10px] font-bold text-emerald-600/40 mt-1 uppercase italic">Após custos e taxas</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Qtd Vendida</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Preço Médio</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Taxas</th>
              <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Lucro Líquido</th>
              <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Total Bruto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {currentData.length > 0 ? currentData.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 text-sm font-black text-brand-text-main uppercase italic">{row.name}</td>
                <td className="py-4 text-sm font-bold text-brand-text-main">{row.qty} un</td>
                <td className="py-4 text-xs font-black text-brand-blue/60 uppercase italic">{formatCurrency(row.price)}</td>
                <td className="py-4 text-xs font-black text-brand-danger/60 uppercase italic">{formatCurrency(row.tax)}</td>
                <td className="py-4 text-right text-sm font-black text-emerald-600">
                  <div className="flex flex-col items-end">
                    <span>{formatCurrency(row.profit)}</span>
                    <span className="text-[9px] text-slate-400 font-medium italic">pós taxas</span>
                  </div>
                </td>
                <td className="py-4 text-right text-sm font-black text-brand-blue">{formatCurrency(row.total)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm font-medium text-brand-blue/60">
                  Nenhuma venda encontrada para o período selecionado.
                </td>
              </tr>
            )}
          </tbody>
          {allData.length > 0 && (
            <tfoot className="bg-slate-50/50 border-t-2 border-slate-200">
              <tr>
                <td className="py-4 px-2 text-sm font-black text-brand-text-main uppercase italic">TOTAIS</td>
                <td className="py-4 text-sm font-black text-brand-text-main">{totals.qty} un</td>
                <td className="py-4"></td>
                <td className="py-4"></td>
                <td className="py-4 text-right text-sm font-black text-emerald-600">{formatCurrency(totals.profit)}</td>
                <td className="py-4 text-right text-sm font-black text-brand-blue">{formatCurrency(totals.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {allData.length > 0 && (
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
          <p className="text-sm text-slate-500 font-medium">
            Mostrando {currentData.length} de {allData.length} produtos
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
