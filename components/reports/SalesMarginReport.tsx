'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3, 
  ShoppingBag, 
  Copy,
  Check,
  DollarSign,
  Percent,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  FileSpreadsheet,
  Package,
  Calculator
} from 'lucide-react';
import { cn, getLocalDateString } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

export function SalesMarginReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, customers, systemUsers, paymentMethods, subcategorias, returns } = useERP();
  
  // States
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string>('All');
  const [selectedSeller, setSelectedSeller] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'margin-desc' | 'margin-asc' | 'margin-pct-desc' | 'margin-pct-asc' | 'total-desc'>('date-desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Process sales to filter and compute margin details
  const processedSales = useMemo(() => {
    let result = sales.filter(s => {
      if (!s.date) return false;

      // Filter out returned/cancelled/reversed sales
      const isReturned = returns.some(r => {
        const rId = String(r.saleId || r.sale_id || '').toLowerCase().replace('#', '').trim();
        const sId = String(s.id || '').toLowerCase().replace('#', '').trim();
        return rId === sId || (rId.length > 4 && sId.includes(rId)) || (sId.length > 4 && rId.includes(sId));
      });
      if (isReturned) return false;

      const rawStatus = s.status?.toLowerCase().trim() || '';
      const cancelledStatuses = ['cancelada', 'estornada', 'cancelado', 'reversão', 'estorno', 'cancelar', 'reverter', 'devolução', 'devolvida', 'devolvido'];
      if (cancelledStatuses.some(status => rawStatus.includes(status))) {
        return false;
      }
      
      const sType = s.type?.toLowerCase().trim() || '';
      if (cancelledStatuses.some(type => sType.includes(type))) {
        return false;
      }
      
      const d = getLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });

    // Map each sale to its calculated margin data
    const mapped = result.map(sale => {
      const saleCost = sale.items.reduce((itemAcc: number, item: any) => {
        const product = products.find(p => p.id === item.productId);
        const cost = Number(product?.costPrice || 0);
        return itemAcc + (cost * item.quantity);
      }, 0);

      const saleTax = sale.taxAmount || 0;
      const netProfit = sale.total - saleCost - saleTax;
      const marginPct = sale.total > 0 ? (netProfit / sale.total) * 100 : 0;

      return {
        ...sale,
        cost: saleCost,
        tax: saleTax,
        netProfit,
        marginPct
      };
    });

    // Apply search filter
    let filtered = mapped;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const idMatches = s.id.toLowerCase().includes(lowerSearch);
        const customerObj = customers.find(c => c.id === s.customerId);
        const nameMatches = customerObj ? customerObj.name.toLowerCase().includes(lowerSearch) : false;
        const fallbackNameMatches = s.customerId === 'final' ? 'consumidor final'.includes(lowerSearch) : false;
        
        const itemMatches = s.items.some((item: any) => {
          const p = products.find(prod => prod.id === item.productId);
          return p ? p.name.toLowerCase().includes(lowerSearch) : false;
        });

        return idMatches || nameMatches || fallbackNameMatches || itemMatches;
      });
    }

    // Apply payment filter
    if (selectedPayment !== 'All') {
      filtered = filtered.filter(s => s.paymentMethod === selectedPayment);
    }

    // Apply seller filter
    if (selectedSeller !== 'All') {
      filtered = filtered.filter(s => s.userId === selectedSeller);
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'margin-desc') {
        return b.netProfit - a.netProfit;
      }
      if (sortBy === 'margin-asc') {
        return a.netProfit - b.netProfit;
      }
      if (sortBy === 'margin-pct-desc') {
        return b.marginPct - a.marginPct;
      }
      if (sortBy === 'margin-pct-asc') {
        return a.marginPct - b.marginPct;
      }
      if (sortBy === 'total-desc') {
        return b.total - a.total;
      }
      return 0;
    });

    return filtered;
  }, [sales, products, customers, returns, startDate, endDate, searchTerm, selectedPayment, selectedSeller, sortBy]);

  // Aggregate global metrics
  const totalRevenue = useMemo(() => processedSales.reduce((acc, s) => acc + s.total, 0), [processedSales]);
  const totalCost = useMemo(() => processedSales.reduce((acc, s) => acc + s.cost, 0), [processedSales]);
  const totalTax = useMemo(() => processedSales.reduce((acc, s) => acc + s.tax, 0), [processedSales]);
  const totalProfit = useMemo(() => totalRevenue - totalCost - totalTax, [totalRevenue, totalCost, totalTax]);
  const averageMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  const averageMarginPerSale = processedSales.length > 0 ? totalProfit / processedSales.length : 0;

  // Pagination
  const totalPages = Math.ceil(processedSales.length / itemsPerPage);
  const currentSales = useMemo(() => {
    return processedSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [processedSales, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPayment, selectedSeller, sortBy]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const dataToExport = processedSales.map(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        const seller = systemUsers.find(u => u.id === sale.userId);
        const method = paymentMethods.find(m => 
          m.id === sale.paymentMethod || 
          m.name?.toLowerCase() === sale.paymentMethod?.toLowerCase()
        );

        return {
          'Data/Hora': new Date(sale.date).toLocaleString('pt-BR'),
          'Cupom': `#${sale.id.toUpperCase()}`,
          'Cliente': customer ? customer.name : 'Consumidor Final',
          'Vendedor': seller ? (seller.full_name || seller.username) : 'Sistema',
          'Forma de Pagto': method ? method.name : (sale.paymentMethod || 'Outros'),
          'Faturamento (R$)': Number(sale.total.toFixed(2)),
          'Custo CMV (R$)': Number(sale.cost.toFixed(2)),
          'Impostos/Taxas (R$)': Number(sale.tax.toFixed(2)),
          'Lucro Líquido (R$)': Number(sale.netProfit.toFixed(2)),
          'Margem (%)': Number(sale.marginPct.toFixed(1))
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Margem nas Vendas');
      XLSX.writeFile(wb, `Relatorio_Margem_Vendas_${startDate}_a_${endDate}.xlsx`);
    } catch (e) {
      console.error('Error exporting margins report:', e);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = [
        'Data/Hora', 
        'Cupom', 
        'Cliente', 
        'Vendedor', 
        'Forma Pagto', 
        'Faturamento (R$)', 
        'Custo CMV (R$)', 
        'Impostos (R$)', 
        'Lucro Líquido (R$)', 
        'Margem (%)'
      ];
      
      const rows = processedSales.map(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        const seller = systemUsers.find(u => u.id === sale.userId);
        const method = paymentMethods.find(m => 
          m.id === sale.paymentMethod || 
          m.name?.toLowerCase() === sale.paymentMethod?.toLowerCase()
        );
        
        return [
          new Date(sale.date).toLocaleString('pt-BR'),
          `#${sale.id.toUpperCase()}`,
          customer ? customer.name : 'Consumidor Final',
          seller ? (seller.full_name || seller.username) : 'Sistema',
          method ? method.name : (sale.paymentMethod || 'Outros'),
          sale.total.toFixed(2),
          sale.cost.toFixed(2),
          sale.tax.toFixed(2),
          sale.netProfit.toFixed(2),
          sale.marginPct.toFixed(1)
        ];
      });

      const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Relatorio_Margem_Vendas_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8" id="report-margin-content">
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-blue font-black uppercase italic tracking-wider text-[10px] mb-1">
            <Calculator size={11} className="text-brand-blue animate-pulse" />
            Lucratividade & Margem Real
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Margem nas Vendas</h4>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 leading-relaxed">
            Relatório gerencial de lucratividade líquida detalhada por cupom de venda e rentabilidade unitária dos produtos.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 py-1.5 px-3 rounded-2xl shrink-0 shadow-sm">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-550 italic">
              Período: {new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer font-sans"
            title="Exportar CSV"
          >
            <Download size={13} />
            Exportar CSV
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer font-sans"
            title="Exportar Excel"
          >
            <FileSpreadsheet size={13} />
            Planilha Excel
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer font-sans"
            title="Imprimir"
          >
            <Printer size={13} />
            Imprimir
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Faturamento Bruto */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none transition-transform duration-500">
            <TrendingUp size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Faturamento Bruto</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {formatCurrency(totalRevenue)}
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase italic">
              Total de receita gerada no período
            </span>
          </div>
        </div>

        {/* KPI 2: Custo CMV */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none transition-transform duration-500">
            <Package size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Custo Total (CMV)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Package size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-amber-600 font-mono tracking-tight">
              {formatCurrency(totalCost)}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic">
              {totalRevenue > 0 ? `${((totalCost / totalRevenue) * 100).toFixed(1)}%` : '0%'} do faturamento bruto
            </span>
          </div>
        </div>

        {/* KPI 3: Lucro Líquido Real */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Lucro Líquido Estimado</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              {formatCurrency(totalProfit)}
            </h3>
            <span className="text-[10px] font-black text-emerald-600 uppercase italic mt-1 bg-emerald-50 border border-emerald-100/55 px-2 py-0.5 rounded-md inline-block font-bold">
              {averageMarginPct.toFixed(1)}% de Margem Bruta/Líquida
            </span>
          </div>
        </div>

        {/* KPI 4: Média por Venda */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none transition-transform duration-500">
            <Percent size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ticket Médio de Lucro</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-purple-600 font-mono tracking-tight">
              {formatCurrency(averageMarginPerSale)}
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase italic">
              Lucro líquido médio por cupom realizado
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
          <SlidersHorizontal size={14} className="text-slate-500" />
          <h5 className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Filtros & Ordenação de Lucratividade</h5>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, cupom ou item..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          {/* Payment Method filter */}
          <div>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
            >
              <option value="All">Todas Formas de Pagamento</option>
              {paymentMethods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Operator / Seller filter */}
          <div>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
            >
              <option value="All">Todos os Operadores</option>
              {systemUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
              ))}
            </select>
          </div>

          {/* Sorting rules */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
            >
              <option value="date-desc">Data (Mais recente primeiro)</option>
              <option value="date-asc">Data (Mais antigo primeiro)</option>
              <option value="margin-desc">Margem Bruta (Maior R$ primeiro)</option>
              <option value="margin-asc">Margem Bruta (Menor R$ primeiro)</option>
              <option value="margin-pct-desc">Percentual Margem (Maior % primeiro)</option>
              <option value="margin-pct-asc">Percentual Margem (Menor % primeiro)</option>
              <option value="total-desc">Receita total (Maior R$ primeiro)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main ledger list */}
      <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Análise de Lucratividade por Cupom</h4>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Acompanhe a receita, o CMV de reposição e a margem de contribuição líquida de cada venda realizada.</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <ShoppingBag size={14} />
          </div>
        </div>

        {/* Sales table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                <th className="py-4 pl-4 min-w-[130px]">Data e Hora</th>
                <th className="py-4 min-w-[110px]">Cupom</th>
                <th className="py-4 min-w-[160px]">Cliente Comprador</th>
                <th className="py-4 text-right min-w-[100px]">Receita (R$)</th>
                <th className="py-4 text-right min-w-[100px]">Custo CMV (R$)</th>
                <th className="py-4 text-right min-w-[90px]">Impostos (R$)</th>
                <th className="py-4 text-right min-w-[110px]">Margem R$</th>
                <th className="py-4 text-right min-w-[90px]">Margem %</th>
                <th className="py-4 text-center w-12">Det.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {currentSales.length > 0 ? currentSales.map((sale) => {
                const customer = customers.find(c => c.id === sale.customerId);
                const isExpanded = expandedSaleId === sale.id;

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
                      {/* Timestamp */}
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

                      {/* Customer */}
                      <td className="py-4 text-xs font-black text-slate-800">
                        <span className="uppercase italic">{customer ? customer.name : 'Consumidor Final'}</span>
                      </td>

                      {/* Receita (Faturamento) */}
                      <td className="py-4 text-right text-xs font-black font-mono text-slate-700">
                        {formatCurrency(sale.total)}
                      </td>

                      {/* Custo (CMV) */}
                      <td className="py-4 text-right text-xs font-semibold font-mono text-amber-600">
                        {formatCurrency(sale.cost)}
                      </td>

                      {/* Taxas */}
                      <td className="py-4 text-right text-xs font-medium font-mono text-slate-400">
                        {formatCurrency(sale.tax)}
                      </td>

                      {/* Margem líquida R$ */}
                      <td className="py-4 text-right text-xs font-black font-mono">
                        <span className={sale.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {formatCurrency(sale.netProfit)}
                        </span>
                      </td>

                      {/* Margem % */}
                      <td className="py-4 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black font-mono inline-block",
                          sale.marginPct >= 30 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          sale.marginPct >= 15 ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          sale.marginPct >= 0 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-rose-50 text-rose-600 border border-rose-100"
                        )}>
                          {sale.marginPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* Action toggle indicator */}
                      <td className="py-4 text-center w-12">
                        <div className={cn(
                          "w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-200",
                          isExpanded && "rotate-180 bg-brand-blue/10 text-brand-blue"
                        )}>
                          <ChevronDown size={13} />
                        </div>
                      </td>
                    </tr>

                    {/* Expand Detail Drawer (Product-level profit/margins!) */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0 border-t border-b border-slate-200 bg-slate-50/20">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 bg-white border-x border-slate-150/40">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                                  <Package size={14} />
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-slate-400 uppercase italic">Rentabilidade Individual por Item</span>
                                  <h6 className="text-[12px] font-black text-slate-850 uppercase italic mt-0.5">
                                    Lista de Produtos Vendidos no Cupom: <span className="text-slate-500 font-mono font-bold">#{sale.id.toUpperCase()}</span>
                                  </h6>
                                </div>
                              </div>

                              {/* Item list */}
                              <div className="overflow-x-auto bg-slate-50/50 rounded-2xl border border-slate-150 p-4">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-200/60 text-[9px] font-black text-slate-400 uppercase italic tracking-widest">
                                      <th className="pb-2">Produto / Descrição</th>
                                      <th className="pb-2 text-center">Qtd</th>
                                      <th className="pb-2 text-right">Preço Venda (un)</th>
                                      <th className="pb-2 text-right">Preço Venda Total</th>
                                      <th className="pb-2 text-right">Custo Reposição (un)</th>
                                      <th className="pb-2 text-right">Custo Total</th>
                                      <th className="pb-2 text-right">Lucro Bruto (R$)</th>
                                      <th className="pb-2 text-right">Margem %</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150">
                                    {sale.items.map((item: any, idx: number) => {
                                      const product = products.find(p => p.id === item.productId);
                                      const itemCost = Number(product?.costPrice || 0);
                                      const itemSaleTotal = item.price * item.quantity;
                                      const itemCostTotal = itemCost * item.quantity;
                                      const itemProfit = itemSaleTotal - itemCostTotal;
                                      const itemMarginPct = itemSaleTotal > 0 ? (itemProfit / itemSaleTotal) * 100 : 0;

                                      return (
                                        <tr key={idx} className="text-xs text-slate-700 hover:bg-slate-100/40">
                                          <td className="py-2.5 font-bold uppercase italic text-slate-800">
                                            {product ? product.name : 'Produto Desconhecido'}
                                            {product?.sku && (
                                              <span className="block text-[9px] font-mono font-normal text-slate-400 tracking-wider">
                                                SKU: {product.sku}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2.5 text-center font-mono font-bold">
                                            {item.quantity}
                                          </td>
                                          <td className="py-2.5 text-right font-mono">
                                            {formatCurrency(item.price)}
                                          </td>
                                          <td className="py-2.5 text-right font-mono font-bold text-slate-800">
                                            {formatCurrency(itemSaleTotal)}
                                          </td>
                                          <td className="py-2.5 text-right font-mono text-amber-600">
                                            {formatCurrency(itemCost)}
                                          </td>
                                          <td className="py-2.5 text-right font-mono font-semibold text-amber-600">
                                            {formatCurrency(itemCostTotal)}
                                          </td>
                                          <td className="py-2.5 text-right font-mono font-bold text-emerald-600">
                                            {formatCurrency(itemProfit)}
                                          </td>
                                          <td className="py-2.5 text-right font-mono">
                                            <span className={cn(
                                              "px-1.5 py-0.2 rounded text-[9px] font-black inline-block",
                                              itemMarginPct >= 30 ? "bg-emerald-50 text-emerald-600" :
                                              itemMarginPct >= 15 ? "bg-blue-50 text-blue-600" :
                                              itemMarginPct >= 0 ? "bg-amber-50 text-amber-600" :
                                              "bg-rose-50 text-rose-600"
                                            )}>
                                              {itemMarginPct.toFixed(1)}%
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
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
                  <td colSpan={9} className="py-12 text-center text-xs font-bold text-slate-400 uppercase italic">
                    Nenhuma venda com dados de margem encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6">
            <span className="text-[10px] font-black uppercase italic text-slate-400">
              Página {currentPage} de {totalPages} — Total: {processedSales.length} vendas
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
