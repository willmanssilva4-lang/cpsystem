'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Calendar, 
  ArrowDownCircle, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  CheckCircle2, 
  Tag,
  CreditCard,
  FileText
} from 'lucide-react';
import { cn, formatDateBR } from '@/lib/utils';
import { Expense } from '@/lib/types';
import { useERP } from '@/lib/context';
import * as XLSX from 'xlsx';

export function Despesas({ expenses }: { expenses: Expense[] }) {
  const { setCustomAlert, expenseCategories } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Filter Expenses (only Paid or category-controlled)
  const filteredExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return [];
    return expenses
      .filter(e => e && e.status === 'Pago' && e.category !== 'Compra de Mercadoria')
      .filter(e => {
        const eType = e.type || 'Variável';
        if (typeFilter !== 'ALL' && eType !== typeFilter) return false;
        
        const eCategory = e.category || '';
        if (categoryFilter !== 'ALL' && eCategory !== categoryFilter) return false;
        
        const desc = (e.description || '').toLowerCase();
        const cat = (eCategory || '').toLowerCase();
        const supp = (e.supplier || '').toLowerCase();
        
        const term = searchTerm.toLowerCase();
        return (
          desc.includes(term) ||
          cat.includes(term) ||
          supp.includes(term)
        );
      })
      .sort((a, b) => new Date(b.paymentDate || b.date || '1970-01-01').getTime() - new Date(a.paymentDate || a.date || '1970-01-01').getTime());
  }, [expenses, searchTerm, typeFilter, categoryFilter]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, categoryFilter]);

  // Pagination Calculations
  const totalItems = filteredExpenses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedExpenses = useMemo(() => {
    return filteredExpenses.slice(startIndex, endIndex);
  }, [filteredExpenses, startIndex, endIndex]);

  // Dashboard Stats Calculations
  const totalPaid = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const metrics = useMemo(() => {
    const count = filteredExpenses.length;
    const avg = count > 0 ? totalPaid / count : 0;
    const max = count > 0 ? Math.max(...filteredExpenses.map(e => e.amount)) : 0;
    return { count, avg, max };
  }, [filteredExpenses, totalPaid]);

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      setCustomAlert({ message: 'Não há despesas para exportar.', type: 'warning' });
      return;
    }

    setCustomAlert({ message: 'Exportando despesas...', type: 'info' });

    const dataToExport = filteredExpenses.map(e => ({
      'Data Pagto': formatDateBR(e.paymentDate || e.date),
      'Descrição': e.description,
      'Categoria': e.category,
      'Tipo': e.type || 'Variável',
      'Forma': e.paymentMethod || '-',
      'Conta': e.financialAccount || 'Caixa',
      'Fornecedor': e.supplier || '-',
      'Valor': e.amount,
      'Origem': e.origin || 'Lançamento Manual'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas");
    XLSX.writeFile(workbook, "despesas_pagas.xlsx");
    
    setCustomAlert({ message: 'Exportação concluída!', type: 'success' });
  };

  // Helper to color-theme specific categories
  const getCategoryTheme = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('aluguel') || c.includes('infra') || c.includes('energia') || c.includes('água') || c.includes('condom')) {
      return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-900/50';
    }
    if (c.includes('pessoal') || c.includes('salário') || c.includes('prolabore') || c.includes('fgts')) {
      return 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-900/50';
    }
    if (c.includes('imposto') || c.includes('taxa') || c.includes('das') || c.includes('mei')) {
      return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50';
    }
    if (c.includes('marketing') || c.includes('propoganda') || c.includes('anúncio') || c.includes('social')) {
      return 'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 border-pink-200/50 dark:border-pink-900/50';
    }
    if (c.includes('fornecedor') || c.includes('compra') || c.includes('mercadoria') || c.includes('insumo')) {
      return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50';
    }
    return 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-800';
  };

  const getPaymentMethodBadge = (method?: string) => {
    if (!method) return '-';
    const m = method.toLowerCase();
    if (m.includes('dinheiro')) return '💵 DINHEIRO';
    if (m.includes('pix')) return '⚡ PIX';
    if (m.includes('cart') || m.includes('deb') || m.includes('cred')) return '💳 CARTÃO';
    if (m.includes('boleto')) return '📄 BOLETO';
    return `📝 ${method.toUpperCase()}`;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* 4 Dashboard Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Total Pago */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 border border-rose-100/30 flex items-center justify-center shrink-0">
              <ArrowDownCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pago</p>
              <h3 className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(totalPaid)}</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Período Selecionado</span>
            <span className="text-rose-500 font-black">Gastos</span>
          </div>
        </div>

        {/* Card 2: Média por Lançamento */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-brand-blue dark:text-blue-400 border border-blue-100/30 flex items-center justify-center shrink-0">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média por Conta</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{formatCurrency(metrics.avg)}</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Ticket Médio</span>
            <span className="text-brand-blue font-black">Custo</span>
          </div>
        </div>

        {/* Card 3: Maior Despesa */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 border border-amber-100/30 flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maior Pagamento</p>
              <h3 className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{formatCurrency(metrics.max)}</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Pico Operacional</span>
            <span className="text-amber-500 font-black">Único</span>
          </div>
        </div>

        {/* Card 4: Quantidade Quitada */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 border border-emerald-100/30 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contas Pagas</p>
              <h3 className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{metrics.count} <span className="text-xs font-bold text-slate-400">docs</span></h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Faturas Quitadas</span>
            <span className="text-emerald-500 font-black">Sucesso</span>
          </div>
        </div>

      </div>

      {/* Expanded Filters & Actions Container */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
          
          {/* 1. Large Styled Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por descrição, fornecedor ou categoria..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 2. Type Selector Dropdown */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black uppercase text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">TODOS OS TIPOS</option>
              <option value="Fixa">FIXA</option>
              <option value="Variável">VARIÁVEL</option>
              <option value="Insumo">INSUMO</option>
              <option value="Pessoal">PESSOAL</option>
              <option value="Outros">OUTROS</option>
            </select>
          </div>

          {/* 3. Category selector Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black uppercase text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">TODAS CATEGORIAS</option>
              {expenseCategories.map(cat => (
                <option key={cat.id} value={cat.nome}>{cat.nome.toUpperCase()}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Dynamic Badges and Reset button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-50 dark:border-slate-700/50">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span>Visualizando:</span>
            <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
              {typeFilter === 'ALL' ? 'Todos os Tipos' : typeFilter}
            </span>
            <span className="text-slate-300">/</span>
            <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
              {categoryFilter === 'ALL' ? 'Todas Categorias' : categoryFilter}
            </span>
            {searchTerm && (
              <>
                <span className="text-slate-300">/</span>
                <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                  Busca: "{searchTerm}"
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {(typeFilter !== 'ALL' || categoryFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setTypeFilter('ALL');
                  setCategoryFilter('ALL');
                  setSearchTerm('');
                }}
                className="text-[10px] font-black text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl font-black text-xs uppercase tracking-tight hover:bg-brand-blue-hover transition-all shadow-md shadow-brand-blue/20 cursor-pointer active:scale-95"
            >
              <Download size={14} /> Exportar Excel
            </button>
          </div>
        </div>

      </div>

      {/* Main Table view / Desktop List */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Faturamento Operacional — Listagem de Despesas Pagas</h3>
          </div>
          <span className="text-[11px] font-extrabold text-slate-400">
            {totalItems} reg. encontrados
          </span>
        </div>

        {/* Mobile-Friendly view (renders as clean grid cards on portrait screens, standard tables on large screens) */}
        <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedExpenses.map((e) => (
            <div key={e.id} className="p-5 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                    <Calendar size={12} />
                    <span>{formatDateBR(e.paymentDate || e.date)}</span>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs">{e.description}</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-rose-500">{formatCurrency(e.amount)}</p>
                  <p className="text-[8px] font-mono text-slate-400 uppercase">{e.financialAccount || 'CAIXA'}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold">
                <div className="flex gap-1.5 items-center">
                  <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border", getCategoryTheme(e.category))}>
                    {e.category}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-md uppercase tracking-wider text-[8px]">
                    {e.type || 'Fixa'}
                  </span>
                </div>
                <span>{getPaymentMethodBadge(e.paymentMethod)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Large screen layout table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Pagamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria / Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Meio / Conta</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                  
                  {/* Date Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-mono text-slate-500 font-bold text-xs">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      {formatDateBR(e.paymentDate || e.date)}
                    </div>
                  </td>

                  {/* Description */}
                  <td className="px-6 py-4">
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {e.description}
                    </div>
                    {e.origin && (
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold mt-0.5">
                        {e.origin}
                      </div>
                    )}
                  </td>

                  {/* Category / Type badges */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border", getCategoryTheme(e.category))}>
                        {e.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                        {e.type || 'Variável'}
                      </span>
                    </div>
                  </td>

                  {/* Method / Account */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                      {getPaymentMethodBadge(e.paymentMethod)}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider font-black mt-0.5">
                      🏦 {e.financialAccount || 'CAIXA'}
                    </div>
                  </td>

                  {/* Fornecedor */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                      {e.supplier || '-'}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="font-mono font-black text-rose-500 tracking-tight text-sm">
                      {formatCurrency(e.amount)}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredExpenses.length === 0 && (
          <div className="py-16 text-center select-none">
            <div className="inline-flex size-14 bg-slate-50 dark:bg-slate-900 rounded-3xl items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-200 dark:border-slate-800">
              <Search size={24} className="opacity-45" />
            </div>
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest italic mb-1">Nenhuma despesa paga encontrada</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Tente alterar os termos da busca, filtros ou realize o pagamento de faturas pendentes.</p>
          </div>
        )}

        {/* Dynamic Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between overflow-x-auto">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap mr-4">
              Mostrando <span className="font-black text-slate-700 dark:text-slate-300">{startIndex + 1}</span> a <span className="font-black text-slate-700 dark:text-slate-300">{endIndex}</span> de <span className="font-black text-slate-700 dark:text-slate-300">{totalItems}</span> despesas
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (totalPages > 5 && page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                    if (page === 2 || page === totalPages - 1) {
                      return <span key={page} className="px-1 text-slate-400 text-xs">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors cursor-pointer ${
                        currentPage === page
                          ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
