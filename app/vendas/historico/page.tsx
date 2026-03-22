'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '@/lib/context';
import { Search, Calendar, Filter, Eye, Download, Printer, ShoppingCart, User, CreditCard, ChevronRight, Hash } from 'lucide-react';
import { Sale } from '@/lib/types';

export default function SalesHistoryPage() {
  const { sales, customers, products, hasPermission } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      const matchesDate = saleDate >= startDate && saleDate <= endDate;
      const matchesSearch = 
        sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sale.customerId && sale.customerId.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesDate && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, startDate, endDate, searchQuery]);

  const handlePrintReceipt = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = sale.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>${item.quantity}x ${product?.name || 'Produto'}</span>
          <span>R$ ${(item.quantity * item.price).toFixed(2)}</span>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo - Venda #${sale.id.substring(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .items { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .totals { text-align: right; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>CUPOM NÃO FISCAL</h2>
            <p>Venda #${sale.id.substring(0, 8).toUpperCase()}</p>
            <p>Data: ${new Date(sale.date).toLocaleString('pt-BR')}</p>
          </div>
          
          <div class="items">
            ${itemsHtml}
          </div>
          
          <div class="totals">
            <p>Total: R$ ${sale.total.toFixed(2)}</p>
            <p>Pagamento: ${sale.paymentMethod}</p>
          </div>
          
          <div class="footer">
            <p>Cliente: ${customer?.nome || 'Consumidor Final'}</p>
            <p>Obrigado pela preferência!</p>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (!hasPermission('vendas', 'historico')) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-brand-text-sec font-bold uppercase tracking-widest">Acesso Negado</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black italic text-brand-text-main uppercase tracking-tighter flex items-center gap-3">
              <ShoppingCart className="text-brand-blue" size={40} /> Histórico de Vendas
            </h1>
            <p className="text-brand-text-sec font-bold uppercase text-xs tracking-widest mt-1">Consulta e Gestão de Cupons Emitidos</p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex bg-white border-2 border-brand-border rounded-2xl p-1 shadow-sm">
              <div className="flex items-center px-3 gap-2 border-r border-brand-border">
                <Calendar size={16} className="text-brand-text-sec" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold uppercase outline-none"
                />
              </div>
              <div className="flex items-center px-3 gap-2">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold uppercase outline-none"
                />
              </div>
            </div>
            
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sec" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por ID ou Cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 bg-white border-2 border-brand-border rounded-2xl pl-12 pr-4 py-3 font-bold text-sm focus:border-brand-blue outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sales List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border-2 border-brand-border rounded-3xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-brand-border text-[10px] font-black uppercase text-brand-text-sec tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">Cupom / Data</th>
                      <th className="px-6 py-4 text-left">Cliente</th>
                      <th className="px-6 py-4 text-right">Total</th>
                      <th className="px-6 py-4 text-center">Pagamento</th>
                      <th className="px-6 py-4 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {filteredSales.length > 0 ? (
                      filteredSales.map((sale) => {
                        const customer = customers.find(c => c.id === sale.customerId);
                        return (
                          <tr 
                            key={sale.id} 
                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedSale?.id === sale.id ? 'bg-blue-50/50' : ''}`}
                            onClick={() => setSelectedSale(sale)}
                          >
                            <td className="px-6 py-4">
                              <p className="font-black italic text-brand-text-main uppercase leading-tight">#{sale.id.substring(0, 8).toUpperCase()}</p>
                              <p className="text-[10px] text-brand-text-sec font-bold">{new Date(sale.date).toLocaleString('pt-BR')}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-brand-text-main">{customer?.nome || 'Consumidor Final'}</p>
                              <p className="text-[10px] text-brand-text-sec font-bold uppercase">{customer?.cpf || 'Sem CPF'}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="font-black text-brand-blue">R$ {sale.total.toFixed(2)}</p>
                              <p className="text-[10px] text-brand-text-sec font-bold uppercase">{sale.items.length} Itens</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-text-sec">
                                {sale.paymentMethod}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button className="p-2 hover:bg-white rounded-xl transition-all text-brand-blue border border-transparent hover:border-brand-border">
                                <ChevronRight size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <p className="text-brand-text-sec font-bold uppercase tracking-widest opacity-50">Nenhuma venda encontrada</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sale Details */}
          <div className="lg:col-span-1">
            {selectedSale ? (
              <div className="bg-white border-2 border-brand-border rounded-3xl shadow-xl overflow-hidden flex flex-col sticky top-8">
                <div className="bg-brand-blue px-6 py-4 text-white flex justify-between items-center">
                  <h3 className="font-black italic uppercase flex items-center gap-2">
                    <Hash size={18} /> Detalhes do Cupom
                  </h3>
                  <button onClick={() => setSelectedSale(null)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                    <ChevronRight size={20} className="rotate-90" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b-2 border-dashed border-brand-border pb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-brand-text-sec tracking-widest">Total do Cupom</p>
                        <p className="text-4xl font-black text-brand-blue italic">R$ {selectedSale.total.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-brand-text-sec tracking-widest">Itens</p>
                        <p className="text-xl font-black text-brand-text-main italic">{selectedSale.items.length}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-brand-text-sec tracking-widest">Itens Vendidos</h4>
                      <div className="space-y-2">
                        {selectedSale.items.map((item, idx) => {
                          const product = products.find(p => p.id === item.productId);
                          return (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-brand-border">
                              <div>
                                <p className="font-bold text-sm text-brand-text-main uppercase leading-tight">{product?.name || 'Produto'}</p>
                                <p className="text-[10px] text-brand-text-sec font-bold">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                              </div>
                              <p className="font-black text-brand-blue italic">R$ {(item.quantity * item.price).toFixed(2)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <User size={16} className="text-brand-text-sec" />
                        <span className="font-bold text-brand-text-sec uppercase text-[10px]">Cliente:</span>
                        <span className="font-black italic text-brand-text-main uppercase">
                          {customers.find(c => c.id === selectedSale.customerId)?.nome || 'Consumidor Final'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CreditCard size={16} className="text-brand-text-sec" />
                        <span className="font-bold text-brand-text-sec uppercase text-[10px]">Pagamento:</span>
                        <span className="font-black italic text-brand-text-main uppercase">{selectedSale.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                      onClick={() => handlePrintReceipt(selectedSale)}
                      className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-brand-text-sec py-3 rounded-xl font-black italic uppercase text-[10px] tracking-widest transition-all active:scale-95"
                    >
                      <Printer size={14} /> Imprimir 2ª Via
                    </button>
                    <button className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-brand-text-sec py-3 rounded-xl font-black italic uppercase text-[10px] tracking-widest transition-all active:scale-95">
                      <Download size={14} /> Exportar PDF
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full bg-slate-50 border-2 border-dashed border-brand-border rounded-3xl flex flex-col items-center justify-center p-12 text-center sticky top-8">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                  <Eye size={32} className="text-brand-text-sec opacity-30" />
                </div>
                <h3 className="text-xl font-black italic text-brand-text-main uppercase mb-2">Selecione uma Venda</h3>
                <p className="text-brand-text-sec max-w-xs">Clique em uma venda na lista para visualizar os detalhes completos do cupom.</p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
