'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  ChevronLeft, 
  ChevronRight, 
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
  DollarSign
} from 'lucide-react';
import { cn, toLocalDateString } from '@/lib/utils';

export function SalesByProductReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  
  // States for interactive filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'revenue-desc' | 'qty-desc' | 'profit-desc' | 'name-asc'>('revenue-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      const itemsSum = sale.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 1;

      sale.items.forEach(item => {
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

  // Chart data: Top 7 products by revenue
  const topProductsChart = useMemo(() => {
    return [...filteredAndSortedData]
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
      .map(item => ({
        name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
        fullName: item.name,
        total: item.total,
        qty: item.qty
      }));
  }, [filteredAndSortedData]);

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
    <div className="space-y-6">
      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-border shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Faturamento Filtrado</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-brand-blue">
              <TrendingUp size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white truncate" title={formatCurrency(totals.revenue)}>
            {formatCurrency(totals.revenue)}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <span className="text-blue-500 font-black">{totals.uniqueCount}</span>
            <span>item(ns) distintos vendidos</span>
          </div>
        </div>

        {/* Units sold volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-border shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Unidades Comercializadas</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Package size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white truncate">
            {totals.qty} <span className="text-xs font-bold text-slate-400 uppercase">un</span>
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-medium">
            Média de <span className="font-extrabold text-purple-500">{totals.uniqueCount > 0 ? (totals.qty / totals.uniqueCount).toFixed(1) : 0}</span> un. por item
          </div>
        </div>

        {/* Estimated Profitability */}
        <div className="p-5 rounded-2xl bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100 dark:border-emerald-950/30 shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450">Lucro Bruto de Produtos</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-605 dark:text-emerald-400">
              <ArrowUpRight size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 truncate" title={formatCurrency(totals.profit)}>
            {formatCurrency(totals.profit)}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <span className="text-emerald-605 dark:text-emerald-450 font-black">
              {totals.revenue > 0 ? `${Math.round((totals.profit / totals.revenue) * 100)}%` : '0%'}
            </span>
            <span>margem bruta consolidada</span>
          </div>
        </div>

        {/* Cost of Goods Sold COGS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-border shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Custo de Aquisição (CMV)</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
              <Bookmark size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white truncate" title={formatCurrency(totals.cost)}>
            {formatCurrency(totals.cost)}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 font-medium">
            Representa <span className="font-extrabold text-red-500">{totals.revenue > 0 ? `${Math.round((totals.cost / totals.revenue) * 100)}%` : '0%'}</span> do faturamento bruto
          </div>
        </div>
      </div>

      {/* Analytics Section with nice visual chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-brand-border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between min-h-[340px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Top 7 Produtos por Faturamento</h5>
              <p className="text-xs text-slate-500 font-medium">Comparativo rápido de performance de receita bruta</p>
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-brand-blue" />
              <span>Receita</span>
            </div>
          </div>

          <div className="h-60 w-full">
            {topProductsChart.length > 0 ? (
              <ResponsiveContainer id="rel-product-vendas-chart" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                <BarChart data={topProductsChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis 
                    dataKey="name" 
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
                      <span className="text-[10px] uppercase text-slate-400" key={name + 'lbl'}>Total Faturamento</span>
                    ]} 
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {topProductsChart.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? '#3b82f6' : '#60a5fa'} 
                        className="hover:opacity-90 transition-opacity"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 font-medium gap-2">
                <PieIcon size={32} className="opacity-40 animate-pulse text-brand-blue" />
                <span className="text-xs italic uppercase text-slate-400">Nenhum dado para exibir no período.</span>
              </div>
            )}
          </div>
        </div>

        {/* Side category metrics brief list */}
        <div className="p-5 rounded-2xl border border-brand-border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Distribuição por Categoria</h5>
            <p className="text-xs text-slate-500 font-medium">Relevância das categorias de produtos no período</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-64 pr-1 mt-4 space-y-3.5 custom-scrollbar">
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
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-350 truncate max-w-[140px] uppercase italic">
                      {cat.name}
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-205 font-mono">
                      {formatCurrency(cat.total)} ({Math.round(percent)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-blue h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {filteredAndSortedData.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 uppercase italic">Nenhuma categoria registrada</div>
            )}
          </div>
        </div>
      </div>

      {/* Control panel & Interactive tools */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 border border-brand-border p-4 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={15} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-brand-border pl-9 pr-4 py-2 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="Pesquisar por produto, código SKU ou marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Category drop */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-400">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
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
            <span className="text-[10px] font-black uppercase text-slate-400">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
            >
              <option value="revenue-desc">Maior Faturamento</option>
              <option value="qty-desc">Quantidade de Vendas</option>
              <option value="profit-desc">Maior Margem (RS)</option>
              <option value="name-asc">Nome Alfabético</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main product stats ledger */}
      <div className="overflow-x-auto min-w-full rounded-2xl border border-brand-border bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-slate-50/50 dark:bg-slate-800/10">
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest pl-6">ID / SKU</th>
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest">Produto</th>
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest">Categoria</th>
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest text-center">Unidades</th>
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest text-right">Preço Médio</th>
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest text-right">Investimento (CMV)</th>
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest text-right">Taxa Maquininha</th>
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest text-right">Lucro Bruto Médio</th>
              <th className="p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest text-right pr-6">Total Faturamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {currentPaginatedData.length > 0 ? currentPaginatedData.map((row, idx) => {
              const isProfitPositive = row.profit >= 0;
              return (
                <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/10 transition-colors">
                  {/* SKU / CODE */}
                  <td className="p-4 pl-6 text-[10px] text-slate-400 font-mono">
                    <div className="flex flex-col">
                      <span className="font-bold">#{row.id.substring(0, 8).toUpperCase()}</span>
                      {row.sku && <span className="text-[9px] text-slate-400 font-medium">SKU: {row.sku}</span>}
                    </div>
                  </td>

                  {/* Name with brand context */}
                  <td className="p-4 text-xs font-black text-slate-800 dark:text-slate-200">
                    <div className="flex flex-col">
                      <span className="uppercase italic block truncate max-w-[210px]" title={row.name}>
                        {row.name}
                      </span>
                      {row.brand && (
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-tight">Marca: {row.brand}</span>
                      )}
                    </div>
                  </td>

                  {/* Category of product tags */}
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase italic tracking-wide bg-blue-50 text-brand-blue border border-blue-100 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-900">
                      {row.category}
                    </span>
                  </td>

                  {/* Sold qty */}
                  <td className="p-4 text-center text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    {row.qty} un
                  </td>

                  {/* Avg sold rate */}
                  <td className="p-4 text-right text-xs font-mono font-bold text-slate-505 dark:text-slate-350">
                    {formatCurrency(row.avgPrice)}
                  </td>

                  {/* Cost price sums */}
                  <td className="p-4 text-right text-xs font-mono font-bold text-rose-500/80">
                    {formatCurrency(row.cost)}
                  </td>

                  {/* Proportional taxes */}
                  <td className="p-4 text-right text-xs font-mono font-bold text-slate-400">
                    {formatCurrency(row.tax)}
                  </td>

                  {/* Profit outcome & percentage context */}
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn("text-xs font-mono font-black", isProfitPositive ? "text-emerald-600" : "text-amber-600")}>
                        {formatCurrency(row.profit)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-extrabold italic">
                        {row.marginPercent.toFixed(1)}% Margem
                      </span>
                    </div>
                  </td>

                  {/* Dynamic absolute Revenue total ticket */}
                  <td className="p-4 text-right pr-6 text-xs text-brand-blue font-black font-mono">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-sm font-black text-slate-400 uppercase italic">
                  Nenhum produto correspondente aos filtros de pesquisa atuais.
                </td>
              </tr>
            )}
          </tbody>

          {/* Consolidating totals footer row on main list */}
          {filteredAndSortedData.length > 0 && (
            <tfoot className="border-t-2 border-brand-border bg-slate-50/50 dark:bg-slate-900/20">
              <tr className="font-extrabold font-mono text-xs">
                <td colSpan={3} className="p-4 pl-6 text-left uppercase italic font-black text-slate-700 dark:text-slate-205">TOTAIS FILTRADOS</td>
                <td className="p-4 text-center text-slate-850 dark:text-white font-black">{totals.qty} un</td>
                <td className="p-4"></td>
                <td className="p-4 text-right text-rose-550 dark:text-rose-400 font-black">{formatCurrency(totals.cost)}</td>
                <td className="p-4"></td>
                <td className="p-4 text-right text-emerald-600 font-black">{formatCurrency(totals.profit)}</td>
                <td className="p-4 text-right pr-6 text-brand-blue font-black">{formatCurrency(totals.revenue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination component controls */}
      {filteredAndSortedData.length > 0 && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-brand-border flex items-center justify-between rounded-2xl shadow-xs">
          <p className="text-xs text-slate-500 font-bold">
            Mostrando {Math.min(filteredAndSortedData.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredAndSortedData.length, currentPage * itemsPerPage)} de {filteredAndSortedData.length} registros
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {/* Previous page trigger button */}
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
              {/* Next page trigger button */}
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
  );
}
