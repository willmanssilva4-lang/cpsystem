'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Search, 
  TrendingUp, 
  Calendar, 
  ShoppingBag, 
  TrendingDown, 
  ArrowUpRight, 
  Filter, 
  PieChart as PieIcon, 
  Package, 
  SlidersHorizontal,
  Bookmark,
  DollarSign,
  Briefcase,
  Activity,
  Users,
  Copy,
  Check,
  Percent,
  Layers,
  Award,
  CircleDollarSign
} from 'lucide-react';
import { cn, toLocalDateString } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function SalesByProductReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, customers, employees, systemUsers } = useERP();
  
  // States for interactive filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'revenue-desc' | 'qty-desc' | 'profit-desc' | 'name-asc'>('revenue-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New interactive analytics states
  const [chartMetric, setChartMetric] = useState<'revenue' | 'quantity' | 'profit'>('revenue');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy helper for transaction codes
  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Extract all categories for filtering dropdown
  const categories = useMemo(() => {
    const list = new Set<string>();
    products.forEach(p => {
      if (p.category) {
        list.add(p.category);
      }
    });
    return Array.from(list).sort();
  }, [products]);

  // Aggregate stats from sales in the date range
  const rawProductStats = useMemo(() => {
    const stats: Record<string, { qty: number, total: number, totalCost: number, totalTax: number }> = {};

    // Filter sales within the target period
    const filteredSales = sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });

    filteredSales.forEach(sale => {
      const saleTax = sale.taxAmount || 0;
      const itemsSum = sale.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 1;

      sale.items.forEach((item: any) => {
        if (!stats[item.productId]) {
          stats[item.productId] = { qty: 0, total: 0, totalCost: 0, totalTax: 0 };
        }
        const product = products.find(p => p.id === item.productId);
        const cost = product ? (product.costPrice || 0) : 0;
        const itemTotal = item.price * item.quantity;
        
        // Distribution of tax corresponding to items value ratio
        const itemTax = (itemTotal / itemsSum) * saleTax;

        stats[item.productId].qty += item.quantity;
        stats[item.productId].total += itemTotal;
        stats[item.productId].totalCost += cost * item.quantity;
        stats[item.productId].totalTax += itemTax;
      });
    });

    return stats;
  }, [sales, products, startDate, endDate]);

  // Format all product rows with names, categories, and margin ratios
  const processedData = useMemo(() => {
    return Object.entries(rawProductStats)
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        const name = product ? product.name : 'Produto Desconhecido';
        const brand = product ? product.brand || '' : '';
        const sku = product ? product.sku || '' : '';
        const category = product ? product.category || 'Geral' : 'Geral';
        const profit = stats.total - stats.totalCost - stats.totalTax;
        
        // Average actual markup / margin
        const marginPercent = stats.total > 0 ? (profit / stats.total) * 100 : 0;

        return {
          id: productId,
          name,
          sku,
          brand,
          category,
          qty: stats.qty,
          avgPrice: stats.qty > 0 ? stats.total / stats.qty : 0,
          cost: stats.totalCost,
          total: stats.total,
          tax: stats.totalTax,
          profit,
          marginPercent
        };
      });
  }, [rawProductStats, products]);

  // Filter & sort list of products
  const filteredAndSortedData = useMemo(() => {
    let result = [...processedData];

    // 1. Text filter (name, sku, brand)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lowerSearch) ||
        item.sku.toLowerCase().includes(lowerSearch) ||
        item.brand.toLowerCase().includes(lowerSearch)
      );
    }

    // 2. Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(item => item.category === selectedCategory);
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'revenue-desc') return b.total - a.total;
      if (sortBy === 'qty-desc') return b.qty - a.qty;
      if (sortBy === 'profit-desc') return b.profit - a.profit;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [processedData, searchTerm, selectedCategory, sortBy]);

  // Derived KPIs across current filters
  const totals = useMemo(() => {
    return filteredAndSortedData.reduce((acc, curr) => ({
      qty: acc.qty + curr.qty,
      cost: acc.cost + curr.cost,
      revenue: acc.revenue + curr.total,
      profit: acc.profit + curr.profit,
      uniqueCount: acc.uniqueCount + 1
    }), { qty: 0, cost: 0, revenue: 0, profit: 0, uniqueCount: 0 });
  }, [filteredAndSortedData]);

  // Chart data: Top 7 products by selected metric
  const topProductsChart = useMemo(() => {
    return [...filteredAndSortedData]
      .sort((a, b) => {
        if (chartMetric === 'revenue') return b.total - a.total;
        if (chartMetric === 'quantity') return b.qty - a.qty;
        return b.profit - a.profit;
      })
      .slice(0, 7)
      .map(item => ({
        name: item.name.length > 14 ? item.name.substring(0, 14) + '...' : item.name,
        fullName: item.name,
        value: chartMetric === 'revenue' 
          ? item.total 
          : chartMetric === 'quantity' 
            ? item.qty 
            : item.profit,
        qty: item.qty,
        total: item.total,
        profit: item.profit
      }));
  }, [filteredAndSortedData, chartMetric]);

  // Retrieve sales history details for expanded product accordion
  const productSalesHistory = useMemo(() => {
    if (!expandedProductId) return [];

    const stats = filteredAndSortedData.find(item => item.id === expandedProductId);
    if (!stats) return [];

    // Filter sales containing this item within date range
    const matches = sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      const isWithinDate = d >= startDate && d <= endDate;
      const hasItem = s.items.some((item: any) => item.productId === expandedProductId);
      return isWithinDate && hasItem;
    });

    return matches.map(sale => {
      const item = sale.items.find((it: any) => it.productId === expandedProductId)!;
      
      // Resolve operator/seller
      const user = systemUsers.find(u => u.id === sale.userId);
      const employee = employees.find(e => e.id === sale.employeeId);
      const sellerName = employee ? employee.name : (user ? user.name : 'Operador Geral');
      
      // Resolve customer
      const customer = customers.find(c => c.id === sale.customerId);
      const customerName = customer ? customer.name : 'Consumidor Final';

      return {
        saleId: sale.id,
        date: sale.date,
        quantity: item.quantity,
        price: item.price,
        itemTotal: item.price * item.quantity,
        sellerName,
        customerName,
        isClub: customer?.isClubMember || false
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expandedProductId, sales, startDate, endDate, filteredAndSortedData, customers, employees, systemUsers]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const currentPaginatedData = useMemo(() => {
    return filteredAndSortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Reset pagination when filter criteria updates
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, sortBy]);

  return (
    <div className="space-y-8">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-blue font-black uppercase italic tracking-wider text-[10px] mb-1">
            <ShoppingBag size={11} className="text-brand-blue animate-pulse" />
            Performance de Portfólio
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Vendas por Produto</h4>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 leading-relaxed">
            Diagnóstico de faturamento, giro físico de mercadorias, margem líquida e custo de CMV consolidado.
          </p>
        </div>

        {/* Dynamic Period summary indicator */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 py-1.5 px-3 rounded-2xl shrink-0 self-start md:self-center">
          <Calendar size={13} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase text-slate-500 italic">
            Período: {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Volume Revenue */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <TrendingUp size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Faturamento Filtrado</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight text-ellipsis overflow-hidden" title={formatCurrency(totals.revenue)}>
              {formatCurrency(totals.revenue)}
            </h3>
            <span className="text-[10px] font-black text-brand-blue uppercase italic mt-1.5 flex items-center gap-1 font-bold">
              {totals.uniqueCount} <span className="text-slate-400 font-semibold">{totals.uniqueCount === 1 ? 'item diferente' : 'itens diferentes'}</span>
            </span>
          </div>
        </motion.div>

        {/* Units sold volume */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Package size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Unidades Vendidas</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Package size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {totals.qty} <span className="text-sm font-black text-slate-400 uppercase font-sans">un</span>
            </h3>
            <span className="text-[10px] font-black text-purple-600 uppercase italic mt-1.5 block">
              Média de <span className="font-mono font-black">{(totals.uniqueCount > 0 ? (totals.qty / totals.uniqueCount).toFixed(1) : 0)}</span> un. por item
            </span>
          </div>
        </motion.div>

        {/* Estimated Profitability */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Lucro Bruto (Margem)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-605 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight" title={formatCurrency(totals.profit)}>
              {formatCurrency(totals.profit)}
            </h3>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded uppercase mt-1.5 inline-block font-bold">
              {totals.revenue > 0 ? `${Math.round((totals.profit / totals.revenue) * 100)}%` : '0%'} margem consolidada
            </span>
          </div>
        </motion.div>

        {/* Cost of Goods Sold COGS */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Bookmark size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Custo de Aquisição (CMV)</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <Bookmark size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight" title={formatCurrency(totals.cost)}>
              {formatCurrency(totals.cost)}
            </h3>
            <span className="text-[10px] font-black text-red-500 uppercase italic mt-1.5 block">
              Representa <span className="font-mono font-black">{totals.revenue > 0 ? `${Math.round((totals.cost / totals.revenue) * 100)}%` : '0%'}</span> da receita bruta
            </span>
          </div>
        </motion.div>
      </div>

      {/* Analytics Section with nice visual chart and category share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-[2.2rem] border border-slate-200 bg-white shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-4">
            <div>
              <h5 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight flex items-center gap-1.5">
                <Activity size={15} className="text-brand-blue" />
                Curva de Desempenho do Portfólio
              </h5>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Ranking comparativo dos top 7 produtos sob múltiplos pontos analíticos</p>
            </div>

            {/* Metric Toggle Segmented Control with premium pill styles */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-0.5 self-start sm:self-center">
              <button
                onClick={() => setChartMetric('revenue')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  chartMetric === 'revenue' 
                    ? "bg-white text-slate-800 shadow-xs scale-102" 
                    : "text-slate-400 hover:text-slate-600 font-bold"
                )}
              >
                Receita (R$)
              </button>
              <button
                onClick={() => setChartMetric('quantity')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  chartMetric === 'quantity' 
                    ? "bg-white text-slate-800 shadow-xs scale-102" 
                    : "text-slate-400 hover:text-slate-600 font-bold"
                )}
              >
                Unidades (Un)
              </button>
              <button
                onClick={() => setChartMetric('profit')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  chartMetric === 'profit' 
                    ? "bg-white text-slate-800 shadow-xs scale-102" 
                    : "text-slate-400 hover:text-slate-600 font-bold"
                )}
              >
                Lucro (R$)
              </button>
            </div>
          </div>

          <div className="h-68 w-full mt-2">
            {topProductsChart.length > 0 ? (
              <ResponsiveContainer id="rel-product-vendas-chart" width="100%" height="100%" debounce={1}>
                <BarChart data={topProductsChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => chartMetric === 'quantity' ? `${val} un` : formatCurrency(val)}
                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'rgba(255, 255, 255, 0.98)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                    labelClassName="text-[10px] font-black uppercase text-slate-400 mb-1"
                    formatter={(value: any, name: string, props: any) => {
                      const item = props?.payload;
                      const formattedValue = chartMetric === 'quantity' 
                        ? `${value} unidades vendidas` 
                        : formatCurrency(Number(value));

                      return [
                        <div className="flex flex-col font-sans" key={name}>
                          <span className="text-xs font-black text-slate-800 font-mono mb-1">{formattedValue}</span>
                          <span className="text-[9px] text-slate-400 grid grid-cols-2 gap-x-2 font-medium">
                            <span>Faturamento:</span> <strong className="text-slate-700 font-mono">{formatCurrency(item.total)}</strong>
                            <span>Lucro Bruto:</span> <strong className="text-emerald-600 font-mono">{formatCurrency(item.profit)}</strong>
                            <span>Unidades:</span> <strong className="text-purple-600 font-mono">{item.qty} un</strong>
                          </span>
                        </div>,
                        null
                      ];
                    }} 
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {topProductsChart.map((entry, index) => {
                      // Apply beautiful custom gradient colors according to the selected metric
                      let barColor = '#1e5eff'; // default
                      if (chartMetric === 'quantity') barColor = '#8b5cf6'; // purple
                      if (chartMetric === 'profit') barColor = '#10b981'; // emerald
                      
                      // Highlight top #1 performer
                      const fillVal = index === 0 ? barColor : `${barColor}aa`;

                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={fillVal}
                          className="hover:opacity-90 transition-opacity cursor-pointer"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-medium gap-2">
                <PieIcon size={32} className="opacity-30 stroke-1 animate-pulse text-brand-blue" />
                <span className="text-xs italic uppercase text-slate-400">Nenhum dado para exibir no período selecionado.</span>
              </div>
            )}
          </div>
        </div>
 
        {/* Side category metrics brief list */}
        <div className="p-6 rounded-[2.2rem] border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight flex items-center gap-1.5">
              <Layers size={14} className="text-brand-blue" />
              Relevância de Categoria
            </h5>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Share comercial de cada grupo de produtos</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-76 pr-1 mt-5 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
            {useMemo(() => {
              const catMap: Record<string, { total: number, qty: number }> = {};
              filteredAndSortedData.forEach(item => {
                const cat = item.category || 'Geral';
                if (!catMap[cat]) {
                  catMap[cat] = { total: 0, qty: 0 };
                }
                catMap[cat].total += item.total;
                catMap[cat].qty += item.qty;
              });

              return Object.entries(catMap)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.total - a.total);
            }, [filteredAndSortedData]).map((cat, idx) => {
              const percent = totals.revenue > 0 ? (cat.total / totals.revenue) * 100 : 0;
              const barColors = ['bg-brand-blue', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-teal-500'];
              const chosenBarColor = barColors[idx % barColors.length];

              return (
                <div key={idx} className="space-y-1 block hover:bg-slate-50/50 p-1.5 rounded-xl transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 truncate max-w-[150px] uppercase italic">
                      {cat.name}
                    </span>
                    <span className="font-black text-slate-800 font-mono">
                      {formatCurrency(cat.total)} <span className="text-[10px] text-slate-400">({Math.round(percent)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", chosenBarColor)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {filteredAndSortedData.length === 0 && (
              <div className="py-20 text-center text-xs text-slate-300 uppercase italic">Nenhuma categoria encontrada</div>
            )}
          </div>
        </div>
      </div>

      {/* Control panel & Interactive tools */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-4 rounded-[1.6rem] shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-88">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold placeholder:text-slate-450 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all text-slate-700"
            placeholder="Buscar por produto, marca, código SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
          {/* Category drop */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-400 italic">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-[11px] font-black text-slate-700 italic focus:outline-none focus:bg-white"
            >
              <option value="All">Todas</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort order criteria */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-400 italic">Ordenação:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-[11px] font-black text-slate-700 italic focus:outline-none focus:bg-white"
            >
              <option value="revenue-desc">Maior Faturamento</option>
              <option value="qty-desc">Quantidade de Vendas</option>
              <option value="profit-desc">Maior Lucro Bruto (R$)</option>
              <option value="name-asc">Nome Alfabético</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main product stats ledger */}
      <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Rateio de Volume Faturado e Margens</h4>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Clique em um produto da tabela para abrir o diagnóstico executivo e conferir transação por transação no período</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Layers size={14} />
          </div>
        </div>

        {/* Styled table with accordion details integration */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                <th className="py-4 pl-4 min-w-[100px]">ID / SKU</th>
                <th className="py-4 min-w-[210px]">Produto</th>
                <th className="py-4 min-w-[120px]">Categoria</th>
                <th className="py-4 text-center min-w-[80px]">Qtd Física</th>
                <th className="py-4 text-right min-w-[100px]">Preço Médio</th>
                <th className="py-4 text-right min-w-[100px]">Custo (CMV)</th>
                <th className="py-4 text-right min-w-[90px]">Taxas Proporc.</th>
                <th className="py-4 text-right min-w-[120px]">Lucro Bruto</th>
                <th className="py-4 text-right pr-4 min-w-[140px]">Receita Bruta</th>
                <th className="py-4 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {currentPaginatedData.length > 0 ? currentPaginatedData.map((row, idx) => {
                const isExpanded = expandedProductId === row.id;
                const isProfitPositive = row.profit >= 0;
                
                return (
                  <React.Fragment key={row.id}>
                    {/* Primary Row */}
                    <tr 
                      onClick={() => setExpandedProductId(isExpanded ? null : row.id)}
                      className={cn(
                        "hover:bg-slate-50/70 transition-colors cursor-pointer group",
                        isExpanded ? "bg-slate-50/50" : ""
                      )}
                    >
                      {/* SKU / ID */}
                      <td className="py-4 pl-4 text-[10px] text-slate-400 font-mono">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-black text-slate-650 group-hover:text-brand-blue transition-colors">
                            #{row.id.substring(0, 8).toUpperCase()}
                          </span>
                          {row.sku && (
                            <span className="text-[9px] text-slate-400 font-semi">SKU: {row.sku}</span>
                          )}
                        </div>
                      </td>

                      {/* Name with Brand */}
                      <td className="py-4 text-xs font-black text-slate-800">
                        <div className="flex flex-col">
                          <span className="uppercase italic block truncate max-w-[240px]" title={row.name}>
                            {row.name}
                          </span>
                          {row.brand && (
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-tight italic mt-0.5">
                              Marca: {row.brand}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-4">
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase italic tracking-wide bg-slate-150/40 text-slate-500 border border-slate-200">
                          {row.category}
                        </span>
                      </td>

                      {/* Sold Qty */}
                      <td className="py-4 text-center text-xs font-black text-slate-700">
                        {row.qty} <span className="text-[10px] text-slate-400 font-semibold font-sans">un</span>
                      </td>

                      {/* Average price */}
                      <td className="py-4 text-right text-xs font-mono font-bold text-slate-600">
                        {formatCurrency(row.avgPrice)}
                      </td>

                      {/* CMV cost */}
                      <td className="py-4 text-right text-xs font-mono font-bold text-rose-500/80">
                        {formatCurrency(row.cost)}
                      </td>

                      {/* Proportionate fees/taxes */}
                      <td className="py-4 text-right text-xs font-mono font-bold text-slate-400">
                        {formatCurrency(row.tax)}
                      </td>

                      {/* Gross Profit and margin percent */}
                      <td className="py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn("text-xs font-mono font-black", isProfitPositive ? "text-emerald-600" : "text-amber-600")}>
                            {formatCurrency(row.profit)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-black italic mt-0.5 bg-slate-100 px-1 py-0.2 rounded">
                            {row.marginPercent.toFixed(1)}% margem
                          </span>
                        </div>
                      </td>

                      {/* Absolute Revenue sales */}
                      <td className="py-4 text-right pr-4 text-xs text-brand-blue font-black font-mono">
                        {formatCurrency(row.total)}
                      </td>

                      {/* Trigger symbol accordion */}
                      <td className="py-4 text-center w-12">
                        <div className={cn(
                          "w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-200", 
                          isExpanded && "rotate-180 bg-brand-blue/10 text-brand-blue"
                        )}>
                          <ChevronDown size={13} />
                        </div>
                      </td>
                    </tr>

                    {/* Expand Content Panel */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="p-0 border-t border-b border-slate-200 bg-slate-50/20">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 space-y-5 bg-white border-x border-slate-150/40">
                              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-4">
                                <div>
                                  <span className="text-[9px] font-black text-brand-blue uppercase italic flex items-center gap-1">
                                    <Activity size={10} />
                                    Painel Analítico Detalhado
                                  </span>
                                  <h6 className="text-[12px] font-black text-slate-800 uppercase italic mt-0.5">
                                    Dossiê de Transações: <span className="text-slate-500 font-sans font-bold">{row.name}</span>
                                  </h6>
                                </div>

                                {/* Deep-dive KPIs inside accordion drawer */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/60 p-2.5 rounded-2xl border border-slate-100 min-w-xs justify-end">
                                  <div className="px-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none block">Média p/ Ticket</span>
                                    <span className="text-xs font-black text-slate-700 font-mono mt-1 block">
                                      {formatCurrency(row.total / Math.max(1, productSalesHistory.length))}
                                    </span>
                                  </div>
                                  <div className="px-2 border-l border-slate-200">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none block">Markup / Margem</span>
                                    <span className="text-xs font-black text-emerald-600 font-mono mt-1 block">
                                      {row.marginPercent.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="px-2 border-l border-slate-200">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none block">Ocorrências</span>
                                    <span className="text-xs font-black text-purple-600 font-mono mt-1 block">
                                      {productSalesHistory.length}x vendida
                                    </span>
                                  </div>
                                  <div className="px-2 border-l border-slate-200">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none block">Custo Unitário</span>
                                    <span className="text-xs font-black text-rose-500 font-mono mt-1 block">
                                      {formatCurrency(row.cost / Math.max(1, row.qty))}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Transaction list ledger inside details */}
                              <div className="space-y-2.5">
                                <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase italic border-b border-slate-100 pb-2 mb-1 select-none">
                                  <div className="col-span-3">Código Venda</div>
                                  <div className="col-span-2.5 sm:col-span-3">Data e Hora</div>
                                  <div className="col-span-3">Cliente Comprador</div>
                                  <div className="col-span-2.5 sm:col-span-3 text-right">Quantidade Física / Preço / Subtotal</div>
                                </div>

                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                                  {productSalesHistory.length > 0 ? (
                                    productSalesHistory.map((historyItem, subIdx) => {
                                      const histDate = new Date(historyItem.date).toLocaleDateString('pt-BR') + ' ' + new Date(historyItem.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                      const isCurrentCopied = copiedId === historyItem.saleId;

                                      return (
                                        <div key={subIdx} className="grid grid-cols-12 items-center text-xs py-1.5 hover:bg-slate-50/50 rounded-xl px-2 group transition-colors border border-slate-100">
                                          {/* ID + Copy trigger */}
                                          <div className="col-span-3 flex items-center gap-1.5">
                                            <span className="font-mono font-black text-slate-500 uppercase tracking-tighter">
                                              #{historyItem.saleId.substring(0, 8).toUpperCase()}
                                            </span>
                                            <button 
                                              onClick={(e) => handleCopy(historyItem.saleId, e)}
                                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-all"
                                              title="Copiar ID"
                                            >
                                              {isCurrentCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                            </button>
                                          </div>

                                          {/* Time Date */}
                                          <div className="col-span-2.5 sm:col-span-3 font-semibold text-slate-450 font-mono text-[11px]">
                                            {histDate}
                                          </div>

                                          {/* Recipient / Client */}
                                          <div className="col-span-3 font-semibold text-slate-650 truncate pr-2 uppercase text-[10px] flex items-center gap-1 italic">
                                            <span>{historyItem.customerName}</span>
                                            {historyItem.isClub && (
                                              <span className="bg-amber-100 text-amber-700 text-[8px] px-1 py-0.2 rounded font-black uppercase not-italic">
                                                Clube
                                              </span>
                                            )}
                                          </div>

                                          {/* Subtotals and item specs */}
                                          <div className="col-span-3.5 sm:col-span-3 text-right flex items-center justify-end gap-2 text-[11px]">
                                            <span className="font-semibold text-slate-450">
                                              {historyItem.quantity} un x {formatCurrency(historyItem.price)}
                                            </span>
                                            <span className="font-mono font-black text-brand-blue bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded text-[10px] select-none shadow-xs">
                                              {formatCurrency(historyItem.itemTotal)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-center py-6 text-xs text-slate-400 uppercase italic">
                                      Nenhuma transação individual elegível no período selecionado.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-sm font-black text-slate-405 uppercase italic">
                    Nenhum produto correspondente aos filtros ou termos buscados.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Consolidating totals footer row on main list */}
            {filteredAndSortedData.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                <tr className="font-black font-mono text-xs text-slate-800">
                  <td colSpan={3} className="py-5 pl-4 text-left uppercase italic font-black text-slate-700">TOTAIS FILTRADOS</td>
                  <td className="py-5 text-center text-slate-850 font-black">{totals.qty} un</td>
                  <td className="py-5"></td>
                  <td className="py-5 text-right text-rose-550 font-black">{formatCurrency(totals.cost)}</td>
                  <td className="py-5 text-right text-slate-400 font-bold">
                    {formatCurrency(filteredAndSortedData.reduce((s, r) => s + r.tax, 0))}
                  </td>
                  <td className="py-5 text-right text-emerald-600 font-black">{formatCurrency(totals.profit)}</td>
                  <td className="py-5 text-right pr-4 text-brand-blue font-black">{formatCurrency(totals.revenue)}</td>
                  <td className="py-5 w-12"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination component controls */}
      {filteredAndSortedData.length > 0 && (
        <div className="p-4 bg-slate-50/50 border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between rounded-2xl shadow-xs">
          <p className="text-xs text-slate-500 font-bold">
            Mostrando {Math.min(filteredAndSortedData.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredAndSortedData.length, currentPage * itemsPerPage)} de {filteredAndSortedData.length} registros
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {/* Previous page trigger button */}
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-700 transition-colors"
                title="Página Anterior"
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
                            : "text-slate-500 hover:bg-slate-200/50"
                        )}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              {/* Next page trigger button */}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-700 transition-colors"
                title="Próxima Página"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
