'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  ArrowDownRight,
  BarChart3, 
  Tag, 
  ShoppingBag, 
  Copy,
  Check,
  DollarSign,
  Activity,
  Percent,
  SlidersHorizontal,
  Sliders,
  Filter,
  Flame,
  LineChart,
  UserCheck,
  Download,
  Printer,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { cn, toLocalDateString } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function SalesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, customers, systemUsers, paymentMethods, categorias, subcategorias, pricingSettings, returns } = useERP();
  
  // Accordion unique state
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  
  // Interactive filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string>('All');
  const [selectedSeller, setSelectedSeller] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');
  
  // Tab for breakdown insights
  const [activeInsightTab, setActiveInsightTab] = useState<'payments' | 'products' | 'sellers'>('payments');
  
  // Interactive trend chart dynamic toggles
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');
  
  // Copy to clipboard notification feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filter & sort list of sales
  const processedSales = useMemo(() => {
    // 1. Initial date and status filter
    let result = sales.filter(s => {
      if (!s.date) return false;

      // Filter out returned/cancelled/reversed sales
      const isReturned = returns.some(r => {
        const rId = String(r.saleId || r.sale_id || '').toLowerCase().replace('#', '').trim();
        const sId = String(s.id || '').toLowerCase().replace('#', '').trim();
        return rId === sId || (rId.length > 4 && sId.includes(rId)) || (sId.length > 4 && rId.includes(sId));
      });
      if (isReturned) return false;

      const rawStatus = s.status;
      const status = rawStatus?.toLowerCase().trim();
      
      // More robust check
      const cancelledStatuses = ['cancelada', 'estornada', 'cancelado', 'reversão', 'estorno', 'cancelar', 'reverter', 'devolução', 'devolvida'];
      
      if (status && cancelledStatuses.includes(status)) {
        return false;
      }
      
      // Also filter by type if it indicates reversal
      const sType = s.type?.toLowerCase().trim();
      if (sType === 'devolução' || sType === 'estorno' || sType === 'reversão') {
        return false;
      }
      
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
        const itemMatches = s.items.some((item: any) => {
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

    // 4.1 Product Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(s => {
        return s.items.some((item: any) => {
          const product = products.find(p => p.id === item.productId);
          if (product && product.subcategoria_id) {
            const sub = subcategorias?.find(sc => sc.id === product.subcategoria_id);
            if (sub && sub.categoria_id === selectedCategory) {
              return true;
            }
          }
          return false;
        });
      });
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
  }, [sales, startDate, endDate, searchTerm, selectedPayment, selectedSeller, selectedCategory, sortBy, customers, products, subcategorias]);

  // Aggregate stats over filtered period
  const totalRevenue = useMemo(() => processedSales.reduce((acc, s) => acc + s.total, 0), [processedSales]);
  const totalOrders = processedSales.length;
  const ticketMedio = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Calculate Peak / Record invoice transaction
  const peakSaleValue = useMemo(() => {
    if (processedSales.length === 0) return 0;
    return Math.max(...processedSales.map(s => s.total));
  }, [processedSales]);

  // Calculate overall discounts applied in period
  const totalDiscounts = useMemo(() => {
    return processedSales.reduce((acc, s) => acc + (s.discount || 0), 0);
  }, [processedSales]);

  // Comparative analysis with previous period
  const comparisonStats = useMemo(() => {
    try {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - diffDays);

      const prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - diffDays);

      const toYMD = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const prevStartStr = toYMD(prevStart);
      const prevEndStr = toYMD(prevEnd);

      const prevPeriodSales = sales.filter(s => {
        if (!s.date) return false;
        const d = toLocalDateString(s.date);
        return d >= prevStartStr && d <= prevEndStr;
      });

      const prevRevenue = prevPeriodSales.reduce((acc, s) => acc + s.total, 0);
      const prevOrders = prevPeriodSales.length;

      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;

      return {
        prevRevenue,
        prevOrders,
        revenueGrowth,
        ordersGrowth,
        diffDays
      };
    } catch (e) {
      return {
        prevRevenue: 0,
        prevOrders: 0,
        revenueGrowth: 0,
        ordersGrowth: 0,
        diffDays: 0
      };
    }
  }, [sales, startDate, endDate, totalRevenue, totalOrders]);

  const estimatedProfit = useMemo(() => {
    return processedSales.reduce((acc, sale) => {
      const saleCost = sale.items.reduce((itemAcc: number, item: any) => {
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
      const isoYMD = toLocalDateString(sale.date);
      if (!isoYMD) return;
      
      const parts = isoYMD.split('-');
      if (parts.length !== 3) return;
      const [year, month, day] = parts;
      const dateStr = `${day}/${month}`;
      
      if (!chartDataMap.has(isoYMD)) {
        chartDataMap.set(isoYMD, { date: dateStr, rawDate: isoYMD, total: 0, orders: 0 });
      }
      const existing = chartDataMap.get(isoYMD)!;
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
      const methodObj = paymentMethods.find(m => 
        m.id === s.paymentMethod || 
        m.name?.toLowerCase() === s.paymentMethod?.toLowerCase()
      );
      let name = methodObj ? methodObj.name : (s.paymentMethod || 'Outros');
      if (name && (name.toLowerCase() === 'múltiplo' || name.toLowerCase() === 'multiplo' || name.toLowerCase() === 'múltiplos' || name.toLowerCase() === 'multiplos')) {
        name = 'MÚLTIPLO';
      }
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
      s.items.forEach((item: any) => {
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

  // Reset pagination when filter constraints change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPayment, selectedSeller, sortBy]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  const exportToCSV = () => {
    try {
      const headers = [
        'Data/Hora', 
        'Codigo Cupom', 
        'Cliente Comprador', 
        'Operador', 
        'Forma de Pagto', 
        'Qtd Itens', 
        'Desconto (R$)', 
        'Taxas (R$)', 
        'Custo Total (R$)', 
        'Margem Liquida (R$)', 
        'Total Receita (R$)'
      ];
      
      const rows = processedSales.map(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        const seller = systemUsers.find(u => u.id === sale.userId);
        const method = paymentMethods.find(m => 
          m.id === sale.paymentMethod || 
          m.name?.toLowerCase() === sale.paymentMethod?.toLowerCase()
        );
        
        const saleCost = sale.items.reduce((itemAcc: number, item: any) => {
          const product = products.find(p => p.id === item.productId);
          return itemAcc + ((product?.costPrice || 0) * item.quantity);
        }, 0);
        const saleTax = sale.taxAmount || 0;
        const netProfit = sale.total - saleCost - saleTax;
        const totalItemQty = sale.items.reduce((acc: number, it: any) => acc + it.quantity, 0);

        return [
          new Date(sale.date).toLocaleString('pt-BR'),
          sale.id,
          customer ? customer.name : 'Consumidor Final',
          seller ? (seller.full_name || seller.username) : 'Sistema',
          method ? method.name : (sale.paymentMethod || 'Outros'),
          totalItemQty,
          (sale.discount || 0).toFixed(2),
          (sale.taxAmount || 0).toFixed(2),
          saleCost.toFixed(2),
          netProfit.toFixed(2),
          sale.total.toFixed(2)
        ];
      });

      const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Relatorio_Vendas_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-blue font-black uppercase italic tracking-wider text-[10px] mb-1">
            <Calendar size={11} className="text-brand-blue animate-pulse" />
            Controladoria & Faturamento
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Vendas por Período</h4>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 leading-relaxed">
            Consolidação macroeconômica de receitas brutas, liquidez por ticket de compra e auditoria operacional de transações.
          </p>
        </div>

        {/* Actions bar grouped */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dynamic Period display range */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 py-1.5 px-3 rounded-2xl shrink-0 shadow-sm">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-550 italic">
              Janela: {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            title="Exportar dados para planilha Excel (CSV)"
          >
            <Download size={13} />
            Exportar CSV
          </button>

          <button
            onClick={() => {
              const table = document.querySelector('#report-content table');
              if (!table) return;
              const wb = XLSX.utils.table_to_book(table as HTMLTableElement);
              XLSX.writeFile(wb, `Relatorio_Vendas_${startDate}_a_${endDate}.xlsx`);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            title="Exportar dados para Excel (.xlsx)"
          >
            <FileSpreadsheet size={13} />
            Excel (.xlsx)
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            title="Imprimir dossiê de faturamento"
          >
            <Printer size={13} />
            Imprimir
          </button>
        </div>
      </div>

      {/* KPI Dashboard Highlights with interactive motion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Gross value sold */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <TrendingUp size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-sans">Vendas Brutas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight" title={formatCurrency(totalRevenue)}>
              {formatCurrency(totalRevenue)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              {comparisonStats.revenueGrowth !== 0 ? (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded uppercase italic border shrink-0",
                  comparisonStats.revenueGrowth > 0 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {comparisonStats.revenueGrowth > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {comparisonStats.revenueGrowth > 0 ? '+' : ''}{comparisonStats.revenueGrowth.toFixed(1)}%
                </span>
              ) : null}
              <span className="text-[9px] font-black text-slate-400 uppercase italic">
                vs anterior ({comparisonStats.diffDays}d)
              </span>
            </div>
          </div>
        </motion.div>

        {/* KPI 2: Estimated Profit / margin calculated */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-sans">Margem Estimada</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight" title={formatCurrency(estimatedProfit)}>
              {formatCurrency(estimatedProfit)}
            </h3>
            <span className="text-[10px] font-black text-emerald-600 uppercase italic mt-1.5 bg-emerald-50 border border-emerald-100/55 px-2 py-0.5 rounded-md inline-block font-bold">
              {totalRevenue > 0 ? `${Math.round((estimatedProfit / totalRevenue) * 100)}%` : '0%'} margem líquida
            </span>
          </div>
        </motion.div>

        {/* KPI 3: Orders volume count */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <ShoppingBag size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-sans">Frequência Comercial</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {totalOrders} <span className="text-xs font-black text-slate-400 uppercase font-sans">pedidos</span>
            </h3>
            <div className="flex flex-col mt-1.5 gap-1.5">
              <div className="flex items-center gap-1.5">
                {comparisonStats.ordersGrowth !== 0 ? (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded uppercase italic border shrink-0",
                    comparisonStats.ordersGrowth > 0 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : "bg-rose-50 text-rose-600 border-rose-100"
                  )}>
                    {comparisonStats.ordersGrowth > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {comparisonStats.ordersGrowth > 0 ? '+' : ''}{comparisonStats.ordersGrowth.toFixed(1)}%
                  </span>
                ) : null}
                <span className="text-[9px] font-black text-slate-400 uppercase italic">
                  vs anterior ({comparisonStats.diffDays}d)
                </span>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase italic block">
                Ticket Médio: <strong className="font-mono text-slate-700 font-bold">{formatCurrency(ticketMedio)}</strong>
              </span>
            </div>
          </div>
        </motion.div>

        {/* KPI 4: Peak record invoice or total discounts applied */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Flame size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-sans">Faturamento Recorde</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Flame size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-slate-850 font-mono tracking-tight text-amber-600">
              {formatCurrency(peakSaleValue)}
            </h3>
            {totalDiscounts > 0 ? (
              <span className="text-[9px] font-black text-rose-500 uppercase italic mt-1.5 block">
                {formatCurrency(totalDiscounts)} concedidos de desconto
              </span>
            ) : (
              <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                Maior ticket individual
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Visual analytics block section with dynamic responsive charts & tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive trend area chart */}
        <div className="lg:col-span-2 p-6 rounded-[2.2rem] border border-slate-200 bg-white shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-4">
            <div>
              <h5 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight flex items-center gap-1.5">
                <LineChart size={15} className="text-brand-blue" />
                Curva de Faturamento & Janelas Operacionais
              </h5>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Visão diária do desempenho financeiro filtrado na janela cronológica</p>
            </div>

            {/* Metric active toggle selectors */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-0.5 self-start sm:self-center">
              <button
                onClick={() => setChartMetric('revenue')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  chartMetric === 'revenue' 
                    ? "bg-white text-slate-850 shadow-xs scale-102" 
                    : "text-slate-400 hover:text-slate-600 font-bold"
                )}
              >
                Faturamento (R$)
              </button>
              <button
                onClick={() => setChartMetric('orders')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  chartMetric === 'orders' 
                    ? "bg-white text-slate-850 shadow-xs scale-102" 
                    : "text-slate-400 hover:text-slate-600 font-bold"
                )}
              >
                Volume Pedidos (Ped)
              </button>
            </div>
          </div>

          <div className="h-80 w-full mt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer id="rel-sales-evolution-chart-metrics" width="100%" height="100%" debounce={1}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueBIServiceBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e5eff" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#1e5eff" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="revenueBIServicePurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="stroke-slate-100" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => chartMetric === 'orders' ? `${val} ped` : formatCurrency(val)}
                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', background: 'rgba(255, 255, 255, 0.98)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                    labelClassName="text-[10px] font-black uppercase text-slate-400"
                    formatter={(value: any, name: string) => {
                      const displayedValue = chartMetric === 'orders' 
                        ? `${value} pedidos emitidos` 
                        : formatCurrency(Number(value));

                      return [
                        <span className="text-xs font-black text-slate-800 font-mono" key={name}>{displayedValue}</span>,
                        chartMetric === 'orders' ? 'Transações PDV' : 'Faturamento Comercial'
                      ];
                    }} 
                  />
                  <Area 
                    name="Resultados" 
                    type="monotone" 
                    dataKey={chartMetric === 'orders' ? 'orders' : 'total'} 
                    stroke={chartMetric === 'orders' ? '#8b5cf6' : '#1e5eff'} 
                    strokeWidth={3} 
                    fill={chartMetric === 'orders' ? "url(#revenueBIServicePurple)" : "url(#revenueBIServiceBlue)"} 
                    activeDot={{ r: 6 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-medium gap-2">
                <BarChart3 size={32} className="opacity-30 stroke-1 animate-pulse text-brand-blue" />
                <span className="text-xs italic uppercase text-slate-450">Nenhum faturamento para renderizar nesta janela temporal.</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic breakdown segmented insight ranking card */}
        <div className="p-6 rounded-[2.2rem] border border-slate-200 bg-white shadow-sm flex flex-col justify-between min-h-[430px]">
          <div>
            <h5 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight flex items-center gap-1.5">
              <Activity size={14} className="text-brand-blue" />
              Rateio Executivo
            </h5>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Metrificação e canais operacionais ativos</p>
          </div>

          {/* Interactive tabs segmented controller */}
          <div className="flex bg-slate-50 border border-slate-150 p-1 rounded-xl w-full mt-4">
            <button
              onClick={() => setActiveInsightTab('payments')}
              className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition-all",
                activeInsightTab === 'payments' 
                  ? "bg-white text-brand-blue shadow-xs font-black" 
                  : "text-slate-400 hover:text-slate-600 font-bold"
              )}
            >
              Meios Pagto
            </button>
            <button
              onClick={() => setActiveInsightTab('products')}
              className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition-all",
                activeInsightTab === 'products' 
                  ? "bg-white text-brand-blue shadow-xs font-black" 
                  : "text-slate-400 hover:text-slate-600 font-bold"
              )}
            >
              Top Produtos
            </button>
            <button
              onClick={() => setActiveInsightTab('sellers')}
              className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition-all",
                activeInsightTab === 'sellers' 
                  ? "bg-white text-brand-blue shadow-xs font-black" 
                  : "text-slate-400 hover:text-slate-600 font-bold"
              )}
            >
              Operadores
            </button>
          </div>

          {/* List stats section according to active tab */}
          <div className="flex-1 overflow-y-auto max-h-72 pr-1 mt-5 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
            {activeInsightTab === 'payments' && (
              <>
                {paymentBreakdown.length > 0 ? paymentBreakdown.map((item, index) => {
                  const percent = totalRevenue > 0 ? (item.total / totalRevenue) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1 block hover:bg-slate-50/50 p-1.5 rounded-xl transition-colors">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1 select-none">
                          <CreditCard size={12} className="text-slate-400" />
                          {item.name}
                        </span>
                        <span className="font-black text-slate-800 font-mono">
                          {formatCurrency(item.total)} <span className="text-[9px] text-slate-400">({Math.round(percent)}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-blue h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center text-xs text-slate-300 uppercase italic">Nenhum meio computado</div>
                )}
              </>
            )}

            {activeInsightTab === 'products' && (
              <>
                {topSellingProducts.length > 0 ? topSellingProducts.map((item, index) => {
                  const percent = totalRevenue > 0 ? (item.total / totalRevenue) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1 block hover:bg-slate-50/50 p-1.5 rounded-xl transition-colors">
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-bold text-slate-700 block truncate max-w-[130px] uppercase italic" title={item.name}>
                          {item.name}
                        </span>
                        <span className="font-black text-slate-800 text-right shrink-0">
                          {item.qty} un • {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center text-xs text-slate-300 uppercase italic">Nenhum produto liquidado</div>
                )}
              </>
            )}

            {activeInsightTab === 'sellers' && (
              <>
                {topSellersRanking.length > 0 ? topSellersRanking.map((item, index) => {
                  const percent = totalRevenue > 0 ? (item.total / totalRevenue) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1 block hover:bg-slate-50/50 p-1.5 rounded-xl transition-colors">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1 uppercase italic">
                          <Award size={12} className={index === 0 ? "text-amber-500" : "text-slate-450"} />
                          {item.name}
                        </span>
                        <span className="font-black text-slate-800">
                          {formatCurrency(item.total)} <span className="text-[9px] text-slate-400">({item.count}v)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center text-xs text-slate-350 uppercase italic">Nenhum colaborador operacional</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Control panel and filters search section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-4 rounded-[1.6rem] shadow-sm">
        {/* Term search box */}
        <div className="relative w-full md:w-88">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold placeholder:text-slate-450 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:bg-white transition-all text-slate-700"
            placeholder="Buscar por código de pedido, nome de cliente ou item do cupom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Triple filter options */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
          {/* Categoria Selector */}
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-450 italic">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-[11px] font-black text-slate-700 italic focus:outline-none focus:bg-white"
            >
              <option value="All">Categorias (Todas)</option>
              {categorias && categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Meio Pagto selector */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-450 italic">Forma:</span>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-[11px] font-black text-slate-700 italic focus:outline-none focus:bg-white"
            >
              <option value="All">Meios (Todos)</option>
              {paymentMethods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* User selector */}
          <div className="flex items-center gap-1.5">
            <UserCheck size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-450 italic">Operdor:</span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-[11px] font-black text-slate-700 italic focus:outline-none focus:bg-white animate-soft"
            >
              <option value="All">Vendedores (Todos)</option>
              {systemUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
              ))}
            </select>
          </div>

          {/* Sort selector orders list */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-450 italic">Ordem:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-[11px] font-black text-slate-700 italic focus:outline-none focus:bg-white"
            >
              <option value="date-desc">Data Decrescente</option>
              <option value="date-asc">Data Crescente</option>
              <option value="total-desc">Maior Ticket total</option>
              <option value="total-asc">Menor Ticket total</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main ledger list detail card */}
      <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Registro Consolidado de Faturamento</h4>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Clique em qualquer linha de transação para expandir e auditar seu cupom de itens fiscais correspondentes</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <ShoppingBag size={14} />
          </div>
        </div>

        {/* High quality visual grid table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                <th className="py-4 pl-4 min-w-[130px]">Data e Hora</th>
                <th className="py-4 min-w-[120px]">Código Cupom</th>
                <th className="py-4 min-w-[180px]">Cliente Comprador</th>
                <th className="py-4 min-w-[140px]">Operador</th>
                <th className="py-4 min-w-[125px]">Forma de Pagto</th>
                <th className="py-4 text-center min-w-[70px]">Itens</th>
                <th className="py-4 text-right min-w-[110px]">Margem Líquida</th>
                <th className="py-4 text-right pr-4 min-w-[130px]">Total Receita</th>
                <th className="py-4 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {currentSales.length > 0 ? currentSales.map((sale) => {
                const customer = customers.find(c => c.id === sale.customerId);
                const seller = systemUsers.find(u => u.id === sale.userId);
                const method = paymentMethods.find(m => 
                  m.id === sale.paymentMethod || 
                  m.name?.toLowerCase() === sale.paymentMethod?.toLowerCase()
                );
                const isExpanded = expandedSaleId === sale.id;

                // Margem cálculo
                const saleCost = sale.items.reduce((itemAcc: number, item: any) => {
                  const product = products.find(p => p.id === item.productId);
                  return itemAcc + ((product?.costPrice || 0) * item.quantity);
                }, 0);
                const saleTax = sale.taxAmount || 0;
                const netProfit = sale.total - saleCost - saleTax;
                const totalItemQty = sale.items.reduce((acc: number, it: any) => acc + it.quantity, 0);

                return (
                  <React.Fragment key={sale.id}>
                    {/* Main Row */}
                    <tr
                      onClick={() => toggleExpand(sale.id)}
                      className={cn(
                        "hover:bg-slate-50/70 transition-colors cursor-pointer group",
                        isExpanded ? "bg-slate-50/50" : ""
                      )}
                    >
                      {/* Timestamp formatted */}
                      <td className="py-4 pl-4 text-xs font-semibold text-slate-500 font-mono">
                        {new Date(sale.date).toLocaleString('pt-BR')}
                      </td>

                      {/* Code coupon copyable */}
                      <td className="py-4 text-[10px] text-slate-400 font-mono font-black uppercase">
                        <div className="flex items-center gap-1.5">
                          <span className="group-hover:text-brand-blue transition-colors">
                            #{sale.id.substring(0, 8).toUpperCase()}
                          </span>
                          <button 
                            onClick={(e) => handleCopy(sale.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity p-0.5"
                            title="Copiar cupom"
                          >
                            {copiedId === sale.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Recipient custom badge */}
                      <td className="py-4 text-xs font-black text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="uppercase italic">{customer ? customer.name : 'Consumidor Final'}</span>
                          {customer?.isClubMember && (
                            <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.2 rounded font-black uppercase tracking-tight scale-95 shrink-0">
                              Clube
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Operator initials/badge */}
                      <td className="py-4 text-xs font-bold text-slate-500 uppercase italic">
                        {seller ? (seller.full_name || seller.username) : 'Sistema / PDV'}
                      </td>

                      {/* Cash status shape */}
                      <td className="py-4">
                        <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase italic tracking-wide bg-slate-150/40 text-slate-550 border border-slate-200">
                          {method ? method.name : (sale.paymentMethod || 'Outros')}
                        </span>
                      </td>

                      {/* Total physical items count */}
                      <td className="py-4 text-center text-xs font-black text-slate-700 font-mono">
                        {totalItemQty} <span className="text-[10px] text-slate-400 font-semibold font-sans">un</span>
                      </td>

                      {/* Computed Net margin */}
                      <td className="py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn("text-xs font-mono font-black", netProfit >= 0 ? "text-emerald-600" : "text-amber-600")}>
                            {formatCurrency(netProfit)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-black italic mt-0.5">
                            {sale.total > 0 ? `${Math.round((netProfit / sale.total) * 100)}%` : '0%'} margem
                          </span>
                        </div>
                      </td>

                      {/* Dynamic volume ticket price */}
                      <td className="py-4 text-right pr-4 text-xs font-black font-mono text-brand-blue">
                        {formatCurrency(sale.total)}
                      </td>

                      {/* Chevron up/down toggle indicator */}
                      <td className="py-4 text-center w-12">
                        <div className={cn(
                          "w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-200",
                          isExpanded && "rotate-180 bg-brand-blue/10 text-brand-blue"
                        )}>
                          <ChevronDown size={13} />
                        </div>
                      </td>
                    </tr>

                    {/* Expand Detail Drawer */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0 border-t border-b border-slate-200 bg-slate-50/20">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 space-y-5 bg-white border-x border-slate-150/40">
                              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                                    <Package size={14} />
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase italic">Demonstrativo de Cupom Eletrônico</span>
                                    <h6 className="text-[12px] font-black text-slate-850 uppercase italic mt-0.5 leading-none">
                                      Auditoria de Itens da Venda: <span className="text-slate-500 font-mono font-bold">#{sale.id.toUpperCase()}</span>
                                    </h6>
                                  </div>
                                </div>

                                {/* Summary metrics specific for expanded ticket */}
                                <div className="flex flex-wrap gap-2.5 bg-slate-50/60 p-2 rounded-2xl border border-slate-100 min-w-xs justify-end">
                                  {sale.discount > 0 && (
                                    <div className="px-3.5 py-1">
                                      <span className="text-[8px] font-black text-rose-500 uppercase leading-none block">Descontos (Cupom)</span>
                                      <span className="text-xs font-black text-rose-500 font-mono mt-1 block">
                                        -{formatCurrency(sale.discount)}
                                      </span>
                                    </div>
                                  )}
                                  {sale.taxAmount > 0 && (
                                    <div className="px-3.5 py-1 border-l border-slate-200">
                                      <span className="text-[8px] font-black text-slate-400 uppercase leading-none block">Encargos de Taxa</span>
                                      <span className="text-xs font-black text-slate-600 font-mono mt-1 block">
                                        {formatCurrency(sale.taxAmount)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="px-3.5 py-1 border-l border-slate-200">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none block">Custo Fixo Mercadoria</span>
                                    <span className="text-xs font-black text-slate-655 font-mono mt-1 block">
                                      {formatCurrency(saleCost)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Item list layout grids */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sale.items.map((item: any, idx: number) => {
                                  const product = products.find(p => p.id === item.productId);
                                  const productCost = product ? (product.costPrice || 0) : 0;
                                  const itemSubtotal = item.price * item.quantity;
                                  const itemMarkup = item.price - productCost;

                                  return (
                                    <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50/40 border border-slate-200 rounded-xl transition-all hover:bg-slate-50 shadow-xs hover:shadow-sm">
                                      <div className="flex flex-col gap-0.5 min-w-0 pr-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-black text-slate-800 uppercase italic truncate max-w-[200px]" title={product ? product.name : 'Desconhecido'}>
                                            {product ? product.name : 'Produto Desconhecido'}
                                          </span>
                                          {(item.discount && item.discount > 0) && (
                                            <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-1.5 py-0.2 rounded border border-rose-100 uppercase italic">Desconto</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                                            {item.quantity} un x {formatCurrency(item.price)}
                                          </span>
                                          {productCost > 0 && (
                                            <span className="text-[9px] text-slate-400 font-semibold bg-slate-100 rounded px-1 flex items-center">
                                              CMV un: {formatCurrency(productCost)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-black text-brand-blue font-mono block">
                                          {formatCurrency(itemSubtotal)}
                                        </span>
                                        {itemMarkup > 0 && (() => {
                                          const isMarkup = pricingSettings?.defaultMethod === 'markup';
                                          const percentage = isMarkup
                                            ? (productCost > 0 ? Math.round((itemMarkup / productCost) * 100) : 100)
                                            : Math.round((itemMarkup / item.price) * 100);
                                          const label = isMarkup ? 'markup' : 'margem';
                                          return (
                                            <span className="text-[9px] text-emerald-600 font-black block mt-0.5 italic">
                                              +{percentage}% {label}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}
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
                  <td colSpan={9} className="py-20 text-center text-sm font-black text-slate-400 uppercase italic">
                    Nenhum faturamento elegível para os critérios definidos.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Consolidating totals footer */}
            {processedSales.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                <tr className="font-black font-mono text-xs text-slate-800">
                  <td colSpan={4} className="py-5 pl-4 text-left uppercase italic font-black text-slate-700">TOTAIS FILTRADOS DO PERÍODO</td>
                  <td></td>
                  <td className="py-5 text-center text-slate-850">
                    {processedSales.reduce((acc: number, sale: any) => acc + sale.items.reduce((sc: number, it: any) => sc + it.quantity, 0), 0)} un
                  </td>
                  <td className="py-5 text-right text-emerald-600 font-black">
                    {formatCurrency(estimatedProfit)}
                  </td>
                  <td className="py-5 text-right pr-4 text-brand-blue font-black">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="py-5 w-12"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination components elements */}
      {processedSales.length > 0 && (
        <div className="p-4 bg-slate-50/50 border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between rounded-2xl shadow-xs">
          <p className="text-xs text-slate-500 font-bold">
            Mostrando {Math.min(processedSales.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(processedSales.length, currentPage * itemsPerPage)} de {processedSales.length} transações
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {/* Prior Page trigger */}
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-700 transition-colors"
                title="Voltar Página"
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
              {/* Next Page trigger */}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-700 transition-colors"
                title="Avançar Página"
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
