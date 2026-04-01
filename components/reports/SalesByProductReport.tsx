'use client';

import React from 'react';
import { useERP } from '@/lib/context';

export function SalesByProductReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  
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

  const data = Object.entries(productStats)
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
    .sort((a, b) => b.total - a.total)
    .slice(0, 50);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
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
          {data.length > 0 ? data.map((row, i) => (
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
      </table>
    </div>
  );
}
