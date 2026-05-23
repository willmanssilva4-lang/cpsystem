'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  ChevronDown, 
  ChevronUp, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Award, 
  ArrowUpRight, 
  BarChart3, 
  Tag, 
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  UserCheck
} from 'lucide-react';
import { cn, toLocalDateString } from '@/lib/utils';

export function SalesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, customers, systemUsers, paymentMethods } = useERP();
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  
  // Interactive filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string>('All');
  const [selectedSeller, setSelectedSeller] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');
  
  // Tab for breakdown insights
  const [activeInsightTab, setActiveInsightTab] = useState<'payments' | 'products' | 'sellers'>('payments');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter & sort list of sales
  const processedSales = useMemo(() => {
    // 1. Initial date filter
    let result = sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });

    // 2. Search box text (ID, client name, item names)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s => {
        const idMatches = s.id.toLowerCase().includes(lowerSearch);
        const customerObj = customers.find(c => c.id === s.customerId);
        const nameMatches = customerObj ? customerObj.name.toLowerCase().includes(lowerSearch) : false;
        const fallbackNameMatches = s.customerId === 'final' ? 'consumidor final'.includes(lowerSearch) : false;
        
        // Search in items
        const itemMatches = s.items.some(item => {
          const p = products.find(prod => prod.id === item.productId);
          return p ? p.name.toLowerCase().includes(lowerSearch) : false;
        });

        return idMatches || nameMatches || fallbackNameMatches || itemMatches;
      });
    }

    // 3. Payment Method filter
    if (selectedPayment !== 'All') {
      result = result.filter(s => s.paymentMethod === selectedPayment);
    }

    // 4. Seller filter
    if (selectedSeller !== 'All') {
      result = result.filter(s => s.userId === selectedSeller);
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'total-desc') {
        return b.total - a.total;
      }
      if (sortBy === 'total-asc') {
        return a.total - b.total;
      }
      return 0;
    });

    return result;
  }, [sales, startDate, endDate, searchTerm, selectedPayment, selectedSeller, sortBy, customers, products]);

  // Aggregate stats over filtered period
  const totalRevenue = useMemo(() => processedSales.reduce((acc, s) => acc + s.total, 0), [processedSales]);
  const totalOrders = processedSales.length;
  const ticketMedio = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const estimatedProfit = useMemo(() => {
    return processedSales.reduce((acc, sale) => {
      const saleCost = sale.items.reduce((itemAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        return itemAcc + ((product?.costPrice || 0) * item.quantity);
      }, 0);
      const saleTax = sale.taxAmount || 0;
      return acc + (sale.total - saleCost - saleTax);
    }, 0);
  }, [processedSales, products]);

  // Chart data formatting
  const chartData = useMemo(() => {
    const chartDataMap = new Map<string, { date: string, rawDate: string, total: number, orders: number }>();
    
    processedSales.forEach(sale => {
      const date = new Date(sale.date);
      const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const isoYMD = toLocalDateString(sale.date);
      
      if (!chartDataMap.has(dateStr)) {
        chartDataMap.set(dateStr, { date: dateStr, rawDate: isoYMD, total: 0, orders: 0 });
      }
      const existing = chartDataMap.get(dateStr)!;
      existing.total += sale.total;
      existing.orders += 1;
    });

    return Array.from(chartDataMap.values()).sort((a, b) => {
      return a.rawDate.localeCompare(b.rawDate);
    });
  }, [processedSales]);

  // Insights computations
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { name: string, total: number, count: number }>();
    processedSales.forEach(s => {
      const methodObj = paymentMethods.find(m => m.id === s.paymentMethod);
      const name = methodObj ? methodObj.name : (s.paymentMethod || 'Outros');
      const current = map.get(name) || { name, total: 0, count: 0 };
      current.total += s.total;
      current.count += 1;
      map.set(name, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [processedSales, paymentMethods]);

  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { name: string, qty: number, total: number }>();
    processedSales.forEach(s => {
      s.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const name = prod ? prod.name : 'Produto Desconhecido';
        const current = map.get(item.productId) || { name, qty: 0, total: 0 };
        current.qty += item.quantity;
        current.total += item.price * item.quantity;
        map.set(item.productId, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [processedSales, products]);

  const topSellersRanking = useMemo(() => {
    const map = new Map<string, { name: string, total: number, count: number }>();
    processedSales.forEach(s => {
      const seller = systemUsers.find(u => u.id === s.userId);
      const name = seller ? (seller.full_name || seller.username) : 'Sistema';
      const current = map.get(name) || { name, total: 0, count: 0 };
      current.total += s.total;
      current.count += 1;
      map.set(name, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [processedSales, systemUsers]);

  // Pagination bounds
  const totalPages = Math.ceil(processedSales.length / itemsPerPage);
  const currentSales = useMemo(() => {
    return processedSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [processedSales, currentPage]);

  // Reset pagination when page size or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPayment, selectedSeller, sortBy]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-border shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Vendas Brutas</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-brand-blue">
              <TrendingUp size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white truncate" title={formatCurrency(totalRevenue)}>
            {formatCurrency(totalRevenue)}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <span className="text-emerald-500 font-black">100%</span>
            <span>faturamento do período</span>
          </div>
        </div>

        {/* Profitability */}
        <div className="p-5 rounded-2xl bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100 dark:border-emerald-950/30 shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450">Lucro Líquido Estimado</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 truncate" title={formatCurrency(estimatedProfit)}>
            {formatCurrency(estimatedProfit)}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-black">
              {totalRevenue > 0 ? `${Math.round((estimatedProfit / totalRevenue) * 100)}%` : '0%'}
            </span>
            <span>margem média estimada</span>
          </div>
        </div>

        {/* Number of orders */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-border shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Pedidos</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ShoppingBag size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white truncate">
            {totalOrders}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <span>Volume total de transações de venda</span>
          </div>
        </div>

        {/* ticket medio */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-border shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Ticket Médio</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Tag size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white truncate" title={formatCurrency(ticketMedio)}>
            {formatCurrency(ticketMedio)}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <span>Valor médio por compra no período</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Chart View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-brand-border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between min-h-[340px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Evolução do Faturamento</h5>
              <p className="text-xs text-slate-500 font-medium">Histórico diário de receitas brutas no período filtrado</p>
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Calendar size={12} />
              <span>Gráfico de Área</span>
            </div>
          </div>

          <div className="h-60 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer id="rel-sales-evolution-chart" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesBlueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}
                    labelClassName="text-[10px] font-black uppercase text-slate-400"
                    formatter={(value: any, name: string) => [
                      <span className="text-xs font-black text-slate-800 font-mono" key={name}>{formatCurrency(Number(value))}</span>,
                      <span className="text-[10px] uppercase text-slate-400" key={name + 'lbl'}>Total Vendido</span>
                    ]} 
                  />
                  <Area 
                    name="Receita" 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fill="url(#salesBlueGradient)" 
                    activeDot={{ r: 6 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-medium gap-2">
                <BarChart3 size={32} className="opacity-40 animate-pulse text-brand-blue" />
                <span className="text-xs italic uppercase">Nenhum faturamento registrado neste período.</span>
              </div>
            )}
          </div>
        </div>

        {/* Segment / Breakdown Insights card */}
        <div className="p-5 rounded-2xl border border-brand-border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Indicadores de Desempenho</h5>
            <p className="text-xs text-slate-500 font-medium">Métricas de canais e segmentos</p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-brand-border mb-4">
            <button
              onClick={() => setActiveInsightTab('payments')}
              className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition-all",
                activeInsightTab === 'payments' 
                  ? "bg-white dark:bg-slate-800 text-brand-blue shadow-sm" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
              )}
            >
              Meios Pagto
            </button>
            <button
              onClick={() => setActiveInsightTab('products')}
              className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition-all",
                activeInsightTab === 'products' 
                  ? "bg-white dark:bg-slate-800 text-brand-blue shadow-sm" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
              )}
            >
              Top Produtos
            </button>
            <button
              onClick={() => setActiveInsightTab('sellers')}
              className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition-all",
                activeInsightTab === 'sellers' 
                  ? "bg-white dark:bg-slate-800 text-brand-blue shadow-sm" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
              )}
            >
              Vendedores
            </button>
          </div>

          {/* Tab content displays */}
          <div className="flex-1 overflow-y-auto max-h-52 pr-1 space-y-3 custom-scrollbar">
            {activeInsightTab === 'payments' && (
              <>
                {paymentBreakdown.length > 0 ? paymentBreakdown.map((item, index) => {
                  const percent = totalRevenue > 0 ? (item.total / totalRevenue) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <CreditCard size={11} className="text-slate-400" />
                          {item.name}
                        </span>
                        <span className="font-black text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.total)} ({Math.round(percent)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-105 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-blue h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center text-xs text-slate-400 uppercase italic">Nenhum pagamento registrado</div>
                )}
              </>
            )}

            {activeInsightTab === 'products' && (
              <>
                {topSellingProducts.length > 0 ? topSellingProducts.map((item, index) => {
                  const percent = totalRevenue > 0 ? (item.total / totalRevenue) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block truncate max-w-[140px] uppercase italic" title={item.name}>
                          {item.name}
                        </span>
                        <span className="font-black text-slate-800 dark:text-slate-200 text-right shrink-0">
                          {item.qty} un • {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-105 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center text-xs text-slate-400 uppercase italic">Nenhum produto relevante no período</div>
                )}
              </>
            )}

            {activeInsightTab === 'sellers' && (
              <>
                {topSellersRanking.length > 0 ? topSellersRanking.map((item, index) => {
                  const percent = totalRevenue > 0 ? (item.total / totalRevenue) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 uppercase italic">
                          <Award size={11} className={index === 0 ? "text-amber-500" : "text-slate-400"} />
                          {item.name}
                        </span>
                        <span className="font-black text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.total)} ({item.count} ped.)
                        </span>
                      </div>
                      <div className="w-full bg-slate-105 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center text-xs text-slate-400 uppercase italic">Nenhum registro de operador no período</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search and interactive Control center */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 border border-brand-border p-4 rounded-2xl shadow-sm">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={15} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-brand-border pl-9 pr-4 py-2 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="Pesquisar por ID, cliente ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown selectors for precision filtering */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Payment method selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Meio:</span>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
            >
              <option value="All">Todos</option>
              {paymentMethods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Seller / User selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Vendedor:</span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
            >
              <option value="All">Todos</option>
              {systemUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
              ))}
            </select>
          </div>

          {/* Sorting list option */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Ordem:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
            >
              <option value="date-desc">Recentes</option>
              <option value="date-asc">Antigas</option>
              <option value="total-desc">Maior Valor</option>
              <option value="total-asc">Menor Valor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Ledger Table Details */}
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-slate-50/50 dark:bg-slate-800/10">
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest pl-6">Data/Hora de Emissão</th>
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest">ID Pedido / Cupom</th>
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest">Contatos do Cliente</th>
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest">Operador Responsável</th>
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest">Forma Pagto</th>
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest text-right">Resultado Líquido</th>
                <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest text-right">Total Transacionado</th>
                <th className="p-4 w-10 pr-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
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
                      className={cn(
                        "hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition-colors cursor-pointer",
                        isExpanded ? "bg-slate-50/20 dark:bg-slate-950/20" : ""
                      )}
                      onClick={() => toggleExpand(sale.id)}
                    >
                      {/* Date details */}
                      <td className="p-4 pl-6 text-xs text-slate-500 font-mono">
                        {new Date(sale.date).toLocaleString('pt-BR')}
                      </td>

                      {/* Sale unique reference code */}
                      <td className="p-4 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                        #{sale.id.slice(0, 8)}
                      </td>

                      {/* Customer contact names */}
                      <td className="p-4 text-xs font-bold text-slate-800 dark:text-slate-250 uppercase italic">
                        {customer ? customer.name : 'Consumidor Final'}
                      </td>

                      {/* Assigned operator details */}
                      <td className="p-4 text-xs font-bold text-slate-500 uppercase italic">
                        {seller ? (seller.full_name || seller.username) : 'Sistema / PDV'}
                      </td>

                      {/* Payment method badge status */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase italic tracking-wide bg-slate-50 text-slate-600 border border-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-900">
                          {method ? method.name : (sale.paymentMethod || 'N/A')}
                        </span>
                      </td>

                      {/* Computed Net profit margin for specific ticket */}
                      <td className="p-4 text-right text-xs font-black text-emerald-600">
                        {formatCurrency(saleNetProfit)}
                      </td>

                      {/* Real grand total ticket */}
                      <td className="p-4 text-right text-xs font-black text-brand-blue">
                        {formatCurrency(sale.total)}
                      </td>

                      {/* Accordion expand triggers icon indicator */}
                      <td className="p-4 text-center pr-6">
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </td>
                    </tr>

                    {/* Expand drawer contents items inside invoice list order */}
                    {isExpanded && (
                      <tr className="bg-slate-50/30 dark:bg-slate-950/10">
                        <td colSpan={8} className="p-6 border-l-4 border-brand-blue">
                          <div className="space-y-4 max-w-4xl">
                            <div className="flex items-center gap-2 pb-2 border-b border-brand-border">
                              <Package size={14} className="text-brand-blue" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Itemização do Cupom Fiscal</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {sale.items.map((item, idx) => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                  <div key={idx} className="flex justify-between items-center p-3.5 bg-white dark:bg-slate-900 border border-brand-border rounded-xl shadow-xs transition-shadow hover:shadow-sm">
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase italic truncate max-w-[200px]" title={product ? product.name : 'Desconhecido'}>
                                          {product ? product.name : 'Produto Desconhecido'}
                                        </span>
                                        {(item.promotionId || (item.discount && item.discount > 0) || (item.originalPrice && item.price < item.originalPrice)) && (
                                          <span className="bg-blue-50 text-brand-blue text-[8px] font-black px-1.5 py-0.5 rounded border border-blue-100 uppercase italic">Oferta</span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                                        Qtd: {item.quantity} x {formatCurrency(item.price)}
                                      </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-xs font-black text-brand-blue font-mono">
                                        {formatCurrency(item.price * item.quantity)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Additional adjustments summaries for layout correctness */}
                            <div className="flex flex-wrap gap-4 pt-2">
                              {(sale.discount || 0) > 0 && (
                                <div className="flex-1 min-w-[200px] flex justify-between items-center px-4 py-2.5 bg-brand-danger/5 dark:bg-red-950/10 rounded-xl border border-brand-danger/10">
                                  <span className="text-[10px] font-black text-brand-danger uppercase italic">Descontos Concedidos</span>
                                  <span className="text-xs font-black text-brand-danger font-mono">-{formatCurrency(sale.discount || 0)}</span>
                                </div>
                              )}
                              
                              {(sale.taxAmount || 0) > 0 && (
                                <div className="flex-1 min-w-[200px] flex justify-between items-center px-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl border border-brand-border">
                                  <span className="text-[10px] font-black text-slate-500 uppercase italic">Taxa Maquininha</span>
                                  <span className="text-xs font-black text-slate-600 dark:text-slate-350 font-mono">{formatCurrency(sale.taxAmount || 0)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm font-black text-slate-400 uppercase italic">
                    Nenhuma venda localizada com base nos critérios estabelecidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination to mimic standard premium lists design */}
        {processedSales.length > 0 && (
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-brand-border flex items-center justify-between rounded-2xl">
            <p className="text-xs text-slate-500 font-bold">
              Mostrando {Math.min(processedSales.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(processedSales.length, currentPage * itemsPerPage)} de {processedSales.length} transações
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {/* Previous Button Page */}
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-slate-400 px-1 font-mono">...</span>
                        )}
                        <button 
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-xs font-black transition-all",
                            page === currentPage 
                              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" 
                              : "text-slate-505 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                {/* Next Button Page */}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 disabled:opacity-40 disabled:cursor-not-allowed text-slate-504 hover:text-slate-700 dark:text-slate-400"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
