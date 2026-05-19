'use client';

import React, { useMemo, useState } from 'react';
import { useERP } from '@/lib/context';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SalesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, customers, systemUsers, paymentMethods } = useERP();
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = s.date.substring(0, 10);
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

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const currentSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-600/60 uppercase italic tracking-widest">Lucro Estimado</p>
          <p className="text-xl font-black text-emerald-600">{formatCurrency(estimatedProfit)}</p>
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
        <div className="grid grid-cols-1 gap-4">
          <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl">
            <span className="text-sm font-bold text-brand-text-main uppercase italic">Loja Física (PDV)</span>
            <span className="text-sm font-black text-brand-blue">{formatCurrency(totalRevenue)} (100%)</span>
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
              {currentSales.length > 0 ? currentSales.map((sale) => {
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
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-brand-text-main uppercase italic">
                                          {product ? product.name : 'Produto Desconhecido'}
                                        </span>
                                        {(item.promotionId || (item.discount && item.discount > 0) || (item.originalPrice && item.price < item.originalPrice)) && (
                                          <span className="bg-blue-100 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase italic">Oferta</span>
                                        )}
                                      </div>
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

        {filteredSales.length > 0 && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
            <p className="text-sm text-slate-500 font-medium">
              Mostrando {currentSales.length} de {filteredSales.length} vendas
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
    </div>
  );
}
