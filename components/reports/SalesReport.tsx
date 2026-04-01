'use client';

import React, { useMemo, useState } from 'react';
import { useERP } from '@/lib/context';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';

export function SalesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, customers, systemUsers, paymentMethods } = useERP();
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = s.date.split('T')[0];
      return d >= startDate && d <= endDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, startDate, endDate]);

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalOrders = filteredSales.length;
  const ticketMedio = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const estimatedProfit = filteredSales.reduce((acc, sale) => {
    const saleCost = sale.items.reduce((itemAcc, item) => {
      const product = products.find(p => p.id === item.productId);
      return itemAcc + ((product?.costPrice || 0) * item.quantity);
    }, 0);
    const saleTax = sale.taxAmount || 0;
    return acc + (sale.total - saleCost - saleTax);
  }, 0);

  const chartData = useMemo(() => {
    const chartDataMap = new Map<string, { date: string, total: number }>();
    
    filteredSales.forEach(sale => {
      const date = new Date(sale.date);
      const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!chartDataMap.has(dateStr)) {
        chartDataMap.set(dateStr, { date: dateStr, total: 0 });
      }
      chartDataMap.get(dateStr)!.total += sale.total;
    });

    return Array.from(chartDataMap.values()).sort((a, b) => {
      const [d1, m1] = a.date.split('/');
      const [d2, m2] = b.date.split('/');
      return new Date(2020, Number(m1)-1, Number(d1)).getTime() - new Date(2020, Number(m2)-1, Number(d2)).getTime();
    });
  }, [filteredSales]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-brand-border">
          <p className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Vendas Brutas</p>
          <p className="text-xl font-black text-brand-text-main">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-brand-border">
          <p className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Ticket Médio</p>
          <p className="text-xl font-black text-brand-text-main">{formatCurrency(ticketMedio)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-brand-border">
          <p className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Total Pedidos</p>
          <p className="text-xl font-black text-brand-text-main">{totalOrders}</p>
        </div>
        <div className="p-4 rounded-2xl bg-brand-text-main text-white">
          <p className="text-[10px] font-black text-brand-text-sec/60 uppercase italic tracking-widest">Lucro Estimado</p>
          <p className="text-xl font-black text-brand-text-sec">{formatCurrency(estimatedProfit)}</p>
        </div>
      </div>
      
      <div className="h-64 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer id="rel-sales-area-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#00E676', fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#00E676', fontWeight: 700}} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
              <Area name="Vendas" type="monotone" dataKey="total" stroke="#00E676" strokeWidth={4} fill="#00E676" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-blue/60 font-medium">
            Nenhum dado para exibir no gráfico neste período.
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h5 className="text-sm font-black text-brand-text-main uppercase italic">Resumo por Canal</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl">
            <span className="text-sm font-bold text-brand-text-main uppercase italic">Loja Física (PDV)</span>
            <span className="text-sm font-black text-brand-blue">{formatCurrency(totalRevenue)} (100%)</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl">
            <span className="text-sm font-bold text-brand-text-main uppercase italic">Delivery / Online</span>
            <span className="text-sm font-black text-brand-blue">R$ 0,00 (0%)</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h5 className="text-sm font-black text-brand-text-main uppercase italic">Detalhamento de Vendas</h5>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Data/Hora</th>
                <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">ID</th>
                <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Cliente</th>
                <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Vendedor</th>
                <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Pagamento</th>
                <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Lucro Líquido</th>
                <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Total</th>
                <th className="py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.length > 0 ? filteredSales.map((sale) => {
                const customer = customers.find(c => c.id === sale.customerId);
                const seller = systemUsers.find(u => u.id === sale.userId);
                const method = paymentMethods.find(m => m.id === sale.paymentMethod);
                const isExpanded = expandedSaleId === sale.id;
                
                // Calculate Net Profit for this specific sale
                const saleCost = sale.items.reduce((itemAcc, item) => {
                  const product = products.find(p => p.id === item.productId);
                  return itemAcc + ((product?.costPrice || 0) * item.quantity);
                }, 0);
                const saleTax = sale.taxAmount || 0;
                const saleNetProfit = sale.total - saleCost - saleTax;
                
                return (
                  <React.Fragment key={sale.id}>
                    <tr 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(sale.id)}
                    >
                      <td className="py-4 text-xs font-bold text-brand-text-main">
                        {new Date(sale.date).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        #{sale.id.slice(0, 8)}
                      </td>
                      <td className="py-4 text-xs font-bold text-brand-text-main uppercase italic">
                        {customer ? customer.name : 'Consumidor Final'}
                      </td>
                      <td className="py-4 text-xs font-bold text-brand-text-main uppercase italic">
                        {seller ? (seller.full_name || seller.username) : 'Sistema'}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black uppercase italic">
                          {method ? method.name : (sale.paymentMethod || 'N/A')}
                        </span>
                      </td>
                      <td className="py-4 text-right text-sm font-black text-emerald-600">
                        {formatCurrency(saleNetProfit)}
                      </td>
                      <td className="py-4 text-right text-sm font-black text-brand-blue">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="py-4 text-center">
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={8} className="py-4 px-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Package size={14} className="text-brand-blue" />
                              <span className="text-[10px] font-black text-brand-text-main/60 uppercase italic tracking-widest">Itens da Venda</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {sale.items.map((item, idx) => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-brand-text-main uppercase italic">
                                        {product ? product.name : 'Produto Desconhecido'}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">
                                        Qtd: {item.quantity} un x {formatCurrency(item.price)}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-black text-brand-blue">
                                        {formatCurrency(item.price * item.quantity)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {(sale.discount || 0) > 0 && (
                              <div className="flex justify-between items-center px-3 py-2 bg-brand-danger/5 rounded-lg border border-brand-danger/10">
                                <span className="text-[10px] font-black text-brand-danger uppercase italic">Desconto Aplicado</span>
                                <span className="text-xs font-black text-brand-danger">-{formatCurrency(sale.discount || 0)}</span>
                              </div>
                            )}
                            {(sale.taxAmount || 0) > 0 && (
                              <div className="flex justify-between items-center px-3 py-2 bg-slate-100 rounded-lg">
                                <span className="text-[10px] font-black text-slate-500 uppercase italic">Taxas / Encargos</span>
                                <span className="text-xs font-black text-slate-600">{formatCurrency(sale.taxAmount || 0)}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm font-medium text-brand-blue/60">
                    Nenhuma venda encontrada para o período selecionado.
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
