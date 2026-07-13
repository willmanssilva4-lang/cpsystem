'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useERP } from '@/lib/context';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  FileSpreadsheet,
  Package,
  RefreshCw,
  TrendingDown,
  DollarSign,
  Layers,
  ArrowDownRight,
  Check,
  Copy,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function NegativeStockReport() {
  const { products, categorias, subcategorias, stockMovements } = useERP();
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const handleCopy = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedId(sku);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Get all unique suppliers from active products for filter dropdown
  const suppliersList = useMemo(() => {
    const suppliersSet = new Set<string>();
    products.forEach(p => {
      if (p.supplier) suppliersSet.add(p.supplier);
    });
    return Array.from(suppliersSet).sort();
  }, [products]);

  // Process and filter products with negative stock
  const negativeStockProducts = useMemo(() => {
    return products
      .filter(p => {
        // Only active products
        if (p.status === 'Inativo') return false;
        
        // Only actual inventory products (exclude virtual kits/bundled products if applicable)
        if (p.product_type === 'KIT' || p.base_product_id) return false;

        // Stock must be strictly negative
        const stock = p.stock || 0;
        if (stock >= 0) return false;

        // Search text filter
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Category filter
        let matchesCategory = true;
        if (selectedCategory !== 'all') {
          if (p.subcategoria_id) {
            const sub = subcategorias.find(s => s.id === p.subcategoria_id);
            matchesCategory = sub?.categoria_id === selectedCategory;
          } else {
            matchesCategory = false;
          }
        }

        // Supplier filter
        let matchesSupplier = true;
        if (selectedSupplier !== 'all') {
          matchesSupplier = p.supplier === selectedSupplier;
        }

        return matchesSearch && matchesCategory && matchesSupplier;
      })
      .map(p => {
        const sub = subcategorias.find(s => s.id === p.subcategoria_id);
        const cat = categorias.find(c => c.id === sub?.categoria_id);
        
        // Calculate correction cost (how much it costs to bring stock back to 0)
        const defasagem = Math.abs(p.stock || 0);
        const costPrice = Number(p.costPrice || 0);
        const salePrice = Number(p.salePrice || 0);
        const correctionCost = defasagem * costPrice;
        const potentialRevenueLoss = defasagem * salePrice;

        // Count recent movements for this product
        const recentMovementsCount = stockMovements.filter(m => m.productId === p.id).length;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku || 'N/A',
          category: cat?.nome || 'Sem Categoria',
          subcategory: sub?.nome || 'Sem Subcategoria',
          supplier: p.supplier || 'Sem Fornecedor',
          stock: p.stock || 0,
          minStock: p.minStock || 0,
          costPrice,
          salePrice,
          correctionCost,
          potentialRevenueLoss,
          defasagem,
          recentMovementsCount
        };
      })
      .sort((a, b) => a.stock - b.stock); // Show most negative first
  }, [products, searchTerm, selectedCategory, selectedSupplier, subcategorias, categorias, stockMovements]);

  // Aggregate global metrics
  const summaryMetrics = useMemo(() => {
    return negativeStockProducts.reduce((acc, p) => {
      return {
        totalItems: acc.totalItems + 1,
        totalDefasagem: acc.totalDefasagem + p.defasagem,
        totalCorrectionCost: acc.totalCorrectionCost + p.correctionCost,
        totalRevenueLoss: acc.totalRevenueLoss + p.potentialRevenueLoss
      };
    }, { totalItems: 0, totalDefasagem: 0, totalCorrectionCost: 0, totalRevenueLoss: 0 });
  }, [negativeStockProducts]);

  // Pagination
  const totalPages = Math.ceil(negativeStockProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    return negativeStockProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [negativeStockProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedSupplier]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const dataToExport = negativeStockProducts.map(p => ({
        'SKU': p.sku,
        'Produto': p.name,
        'Categoria': p.category,
        'Subcategoria': p.subcategory,
        'Fornecedor': p.supplier,
        'Estoque Atual': p.stock,
        'Estoque Mínimo': p.minStock,
        'Custo Unitário (R$)': Number(p.costPrice.toFixed(2)),
        'Preço de Venda (R$)': Number(p.salePrice.toFixed(2)),
        'Custo de Correção (R$)': Number(p.correctionCost.toFixed(2)),
        'Venda Equivalente (R$)': Number(p.potentialRevenueLoss.toFixed(2)),
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estoque Negativo');
      XLSX.writeFile(wb, `Relatorio_Estoque_Negativo_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error('Error exporting negative stock report:', e);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text("Relatório de Estoque Negativo (Inconsistências de Saldo)", 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} — Total de Itens: ${summaryMetrics.totalItems}`, 14, 21);

      const tableData = negativeStockProducts.map(p => [
        p.sku,
        p.name,
        p.category,
        p.supplier,
        p.stock.toString(),
        p.minStock.toString(),
        formatCurrency(p.costPrice),
        formatCurrency(p.correctionCost)
      ]);

      autoTable(doc, {
        head: [['SKU', 'Produto', 'Categoria', 'Fornecedor', 'Estoque', 'Est. Mínimo', 'Custo Un.', 'Custo Correção']],
        body: tableData,
        startY: 27,
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] } // red-600
      });

      doc.save(`Relatorio_Estoque_Negativo_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error('Error exporting PDF:', e);
    }
  };

  return (
    <div className="space-y-8" id="report-negative-stock-content">
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-rose-600 font-black uppercase italic tracking-wider text-[10px] mb-1">
            <AlertTriangle size={11} className="text-rose-600 animate-pulse" />
            Alerta de Divergência Físico x Sistema
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Estoque Negativo</h4>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 leading-relaxed">
            Relatório de auditoria que identifica produtos com saldo de estoque abaixo de zero, indicando vendas sem lançamento de compras ou furos de inventário.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer font-sans"
            title="Exportar Excel"
          >
            <FileSpreadsheet size={13} />
            Planilha Excel
          </button>

          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer font-sans"
            title="Exportar PDF"
          >
            <Download size={13} />
            Download PDF
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
        {/* KPI 1: Quantidade de SKU com Problema */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none transition-transform duration-500">
            <AlertTriangle size={140} className="text-rose-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Produtos com Divergência</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-rose-600 font-mono tracking-tight">
              {summaryMetrics.totalItems} SKUs
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase italic">
              Itens com saldo negativo no sistema
            </span>
          </div>
        </div>

        {/* KPI 2: Total de Unidades em Falta */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none transition-transform duration-500">
            <Package size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Defasagem de Estoque</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
              <Package size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              -{summaryMetrics.totalDefasagem} un
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase italic">
              Quantidade física total a ser reposta
            </span>
          </div>
        </div>

        {/* KPI 3: Custo Estimado de Correção */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Custo de Reposição</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-amber-600 font-mono tracking-tight">
              {formatCurrency(summaryMetrics.totalCorrectionCost)}
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase italic">
              Investimento de reposição estimado (CMV)
            </span>
          </div>
        </div>

        {/* KPI 4: Venda Estimada Defasada */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none transition-transform duration-500">
            <TrendingDown size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Faturamento Estimado</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
              <TrendingDown size={15} />
            </div>
          </div>
          <div className="mt-2 text-left">
            <h3 className="text-2xl font-black text-brand-blue font-mono tracking-tight">
              {formatCurrency(summaryMetrics.totalRevenueLoss)}
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase italic">
              Valor de venda das unidades pendentes
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50">
          <SlidersHorizontal size={14} className="text-slate-500" />
          <h5 className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Filtros de Auditoria de Estoque</h5>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição ou SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>

          {/* Supplier filter */}
          <div>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
            >
              <option value="all">Todos os Fornecedores</option>
              {suppliersList.map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Explanatory Info Alert banner */}
      <div className="bg-slate-50 border-l-4 border-amber-500 p-4 rounded-r-3xl flex items-start gap-3">
        <Info className="text-amber-500 mt-0.5 shrink-0" size={16} />
        <div>
          <h5 className="text-xs font-bold text-amber-950 uppercase italic">Por que ocorrem saldos de estoque negativos?</h5>
          <p className="text-[11px] font-medium text-amber-800/80 mt-1 leading-relaxed">
            Saldos negativos ocorrem quando há registro de saída de produto (como vendas no PDV ou consumo interno) sem que o sistema possua o registro prévio da respectiva nota fiscal de entrada ou compra correspondente. Recomenda-se realizar uma auditoria de inventário físico e lançar as devidas Notas de Compra ou Ajustes manuais de estoque para sanar as inconsistências apresentadas abaixo.
          </p>
        </div>
      </div>

      {/* Main ledger list */}
      <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Produtos com Saldo Negativo</h4>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Visão geral de quantidades, custos unitários e impacto financeiro.</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={14} />
          </div>
        </div>

        {/* Products table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                <th className="py-4 pl-4 min-w-[120px]">SKU</th>
                <th className="py-4 min-w-[200px]">Produto</th>
                <th className="py-4 min-w-[140px]">Categoria / Subcategoria</th>
                <th className="py-4 min-w-[140px]">Fornecedor</th>
                <th className="py-4 text-right min-w-[90px]">Estoque Atual</th>
                <th className="py-4 text-right min-w-[90px]">Custo Unitário</th>
                <th className="py-4 text-right min-w-[110px]">Custo Reposição</th>
                <th className="py-4 text-right min-w-[115px]">Perda Faturamento</th>
                <th className="py-4 text-center min-w-[80px]">Mvts (Hist)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {paginatedProducts.length > 0 ? paginatedProducts.map((p) => {
                return (
                  <tr key={p.id} className="hover:bg-rose-50/10 transition-colors group">
                    {/* SKU Copyable */}
                    <td className="py-4 pl-4 text-[10px] text-slate-500 font-mono font-black uppercase">
                      <div className="flex items-center gap-1.5">
                        <span className="group-hover:text-rose-600 transition-colors">
                          {p.sku}
                        </span>
                        <button 
                          onClick={(e) => handleCopy(p.sku, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity p-0.5"
                          title="Copiar SKU"
                        >
                          {copiedId === p.sku ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-4 text-xs font-black text-slate-800">
                      <span className="uppercase italic">{p.name}</span>
                    </td>

                    {/* Category */}
                    <td className="py-4 text-xs font-semibold text-slate-500">
                      <div>{p.category}</div>
                      <div className="text-[9px] text-slate-400 font-normal">{p.subcategory}</div>
                    </td>

                    {/* Supplier */}
                    <td className="py-4 text-xs font-medium text-slate-500">
                      {p.supplier}
                    </td>

                    {/* Negative balance (Stretched in red) */}
                    <td className="py-4 text-right">
                      <span className="px-2 py-0.5 rounded text-[11px] font-black font-mono inline-block bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                        {p.stock} un
                      </span>
                    </td>

                    {/* Cost price */}
                    <td className="py-4 text-right text-xs font-semibold font-mono text-slate-500">
                      {formatCurrency(p.costPrice)}
                    </td>

                    {/* Cost of correction */}
                    <td className="py-4 text-right text-xs font-black font-mono text-amber-600">
                      {formatCurrency(p.correctionCost)}
                    </td>

                    {/* Potential revenue loss */}
                    <td className="py-4 text-right text-xs font-black font-mono text-slate-700">
                      {formatCurrency(p.potentialRevenueLoss)}
                    </td>

                    {/* Historical movements count */}
                    <td className="py-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono inline-block bg-slate-100 text-slate-600">
                        {p.recentMovementsCount} mvt
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs font-bold text-slate-400 uppercase italic">
                    Nenhum produto com estoque negativo encontrado para os filtros selecionados.
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
              Página {currentPage} de {totalPages} — Total: {negativeStockProducts.length} produtos
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
