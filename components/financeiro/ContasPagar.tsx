'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Tag, 
  DollarSign,
  TrendingUp,
  XCircle,
  Check,
  X,
  Pencil
} from 'lucide-react';
import { cn, formatDateBR, getLocalDateString } from '@/lib/utils';
import { Expense } from '@/lib/types';
import { PaymentModal } from './PaymentModal';
import { useERP } from '@/lib/context';
import * as XLSX from 'xlsx';

export function ContasPagar({ expenses, onAdd, onEdit }: { expenses: Expense[], onAdd: () => void, onEdit?: (expense: Expense) => void }) {
  const { updateExpense, setCustomAlert } = useERP();
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);
  
  // Inline editing state for due date
  const [editingDueDateId, setEditingDueDateId] = useState<string | null>(null);
  const [tempDueDate, setTempDueDate] = useState<string>('');
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

  const handleSaveDueDate = async (expense: Expense, newDate: string) => {
    if (!newDate) {
      if (setCustomAlert) setCustomAlert({ message: 'Selecione uma data de vencimento válida.', type: 'warning' });
      return;
    }
    setIsUpdatingDate(true);
    try {
      await updateExpense({
        ...expense,
        dueDate: newDate,
        due_date: newDate
      });
      if (setCustomAlert) setCustomAlert({ message: 'Data de vencimento atualizada com sucesso!', type: 'success' });
      setEditingDueDateId(null);
    } catch (err: any) {
      console.error(err);
      if (setCustomAlert) setCustomAlert({ message: 'Erro ao atualizar a data de vencimento.', type: 'error' });
    } finally {
      setIsUpdatingDate(false);
    }
  };
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'UNPAID' | 'PENDING' | 'OVERDUE' | 'ALL'>('UNPAID');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Filter Categories list from available non-product expenses
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    expenses.forEach(e => {
      if (e.category) {
        cats.add(e.category);
      }
    });
    return Array.from(cats);
  }, [expenses]);

  // Filter accounts-payable
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        // Status calculations relative to "todayStr"
        const isPaid = e.status === 'Pago';
        const isOverdue = !isPaid && e.dueDate < todayStr;
        const isPending = !isPaid && e.dueDate >= todayStr;

        // Apply Status Filters
        if (statusFilter === 'UNPAID' && isPaid) return false;
        if (statusFilter === 'PENDING' && (isPaid || isOverdue)) return false;
        if (statusFilter === 'OVERDUE' && (isPaid || isPending)) return false;
        // statusFilter === 'ALL' shows even paid accounts for bookkeeping

        // Apply Category Filter
        if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;

        // Apply Search Term
        const term = searchTerm.toLowerCase();
        return (
          e.description.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term) ||
          (e.supplier || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [expenses, searchTerm, statusFilter, categoryFilter, todayStr]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  // Pagination Calculations
  const totalItems = filteredExpenses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedExpenses = useMemo(() => {
    return filteredExpenses.slice(startIndex, endIndex);
  }, [filteredExpenses, startIndex, endIndex]);

  // Metrics Dashboard Cards
  const stats = useMemo(() => {
    const unpaidList = expenses.filter(e => e.status !== 'Pago');
    
    const overdueList = unpaidList.filter(e => e.dueDate < todayStr);
    const pendingList = unpaidList.filter(e => e.dueDate >= todayStr);

    const totalUnpaid = unpaidList.reduce((acc, e) => acc + e.amount, 0);
    const totalOverdue = overdueList.reduce((acc, e) => acc + e.amount, 0);
    const totalPending = pendingList.reduce((acc, e) => acc + e.amount, 0);

    return {
      totalUnpaid,
      countUnpaid: unpaidList.length,
      totalOverdue,
      countOverdue: overdueList.length,
      totalPending,
      countPending: pendingList.length
    };
  }, [expenses, todayStr]);

  // Export structured spreadsheet to Excel
  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      if (setCustomAlert) setCustomAlert({ message: 'Não há faturas para exportar.', type: 'warning' });
      return;
    }

    if (setCustomAlert) setCustomAlert({ message: 'Preparando planilha excel...', type: 'info' });

    const dataToExport = filteredExpenses.map(e => {
      const isPaid = e.status === 'Pago';
      const isOverdue = !isPaid && e.dueDate < todayStr;
      let calculatedStatus = 'A vencer';
      if (isPaid) calculatedStatus = 'Quitada (Pago)';
      else if (isOverdue) calculatedStatus = 'Vencida';

      return {
        'Descrição': e.description,
        'Categoria': e.category,
        'Fornecedor': e.supplier || '-',
        'Sinal': 'Débito',
        'Valor da Conta': e.amount,
        'Data Competência': e.issueDate ? formatDateBR(e.issueDate) : '-',
        'Data Vencimento': formatDateBR(e.dueDate),
        'Data Liquidação': e.date ? formatDateBR(e.date) : '-',
        'Status Atual': calculatedStatus,
        'Meio de Liquidação': e.paymentMethod || '-',
        'Conta de Origem': e.financialAccount || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ContasA_Pagar");
    XLSX.writeFile(workbook, "contas_a_pagar_pdv.xlsx");
    
    if (setCustomAlert) setCustomAlert({ message: 'Planilha exportada com sucesso!', type: 'success' });
  };

  // Helper theme for Category badges
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

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 select-none">
      
      {/* 4 Premium Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Total Aberto */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 border border-amber-150/30 flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo de Contas</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{formatCurrency(stats.totalUnpaid)}</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Contas Pendentes</span>
            <span className="text-amber-500 font-black">{stats.countUnpaid} docs</span>
          </div>
        </div>

        {/* Card 2: Contas Vencidas */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 border border-rose-150/30 flex items-center justify-center shrink-0">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Vencido</p>
              <h3 className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{formatCurrency(stats.totalOverdue)}</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Passou do Prazo</span>
            <span className={cn("font-black", stats.countOverdue > 0 ? "text-rose-500 animate-pulse" : "text-slate-400")}>
              {stats.countOverdue} docs
            </span>
          </div>
        </div>

        {/* Card 3: Contas A Vencer */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-brand-blue dark:text-blue-400 border border-blue-150/30 flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total A Vencer</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{formatCurrency(stats.totalPending)}</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Dentro do Prazo</span>
            <span className="text-brand-blue font-black">{stats.countPending} docs</span>
          </div>
        </div>

        {/* Card 4: Planejamento / Ticket */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-550 border border-slate-200/55 flex items-center justify-center shrink-0">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média por Fatura</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-700 dark:text-slate-300 tracking-tight">
                {formatCurrency(stats.countUnpaid > 0 ? stats.totalUnpaid / stats.countUnpaid : 0)}
              </h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Valor Médio pendente</span>
            <span className="text-slate-600 dark:text-slate-300 font-extrabold uppercase">Previsto</span>
          </div>
        </div>

      </div>

      {/* Structured Search, Filter and Actions Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
          
          {/* Search bar inside container with clean shadow */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar faturas por descrição, fornecedor ou categoria..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status filter selection */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-extrabold uppercase text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all appearance-none cursor-pointer"
            >
              <option value="UNPAID">🔴 FILTRAR: CONTAS EM ABERTO</option>
              <option value="PENDING">🟡 FILTRAR: APENAS A VENCER</option>
              <option value="OVERDUE">⛔ FILTRAR: APENAS VENCIDAS</option>
              <option value="ALL">⚫ FILTRAR: INCLUIR LIQUIDADAS (PAGAS)</option>
            </select>
          </div>

          {/* Category Filter selector */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-extrabold uppercase text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">TODAS CATEGORIAS</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Clear indicators and Export block */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-50 dark:border-slate-700/50">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span>Visualizando:</span>
            <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
              {statusFilter === 'UNPAID' ? 'Contas em Aberto' : 
               statusFilter === 'PENDING' ? 'A vencer' :
               statusFilter === 'OVERDUE' ? 'Vencidas' : 'Todas as faturas'}
            </span>
            <span className="text-slate-300">/</span>
            <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
              {categoryFilter === 'ALL' ? 'Todas as Categorias' : categoryFilter}
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
            {(statusFilter !== 'UNPAID' || categoryFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('UNPAID');
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

            <button 
              onClick={onAdd} 
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl font-black text-xs uppercase italic tracking-tight hover:bg-rose-650 transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Nova Conta
            </button>
          </div>
        </div>

      </div>

      {/* Main Table view / Desktop List */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-amber-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Balancete Administrativo — Listagem de Contas a Pagar</h3>
          </div>
          <span className="text-[11px] font-extrabold text-slate-400">
            {totalItems} faturas localizadas
          </span>
        </div>

        {/* Mobile View Card Layout */}
        <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedExpenses.map((e) => {
            const isPaid = e.status === 'Pago';
            const isOverdue = !isPaid && e.dueDate < todayStr;
            const isPending = !isPaid && e.dueDate >= todayStr;

            return (
              <div key={e.id} className="p-5 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    {editingDueDateId === e.id ? (
                      <div className="flex items-center gap-1" onClick={(evt) => evt.stopPropagation()}>
                        <input 
                          type="date"
                          value={tempDueDate}
                          onChange={(evt) => setTempDueDate(evt.target.value)}
                          disabled={isUpdatingDate}
                          className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                        />
                        <button
                          disabled={isUpdatingDate}
                          onClick={() => handleSaveDueDate(e, tempDueDate)}
                          className="p-1 bg-emerald-500 text-white rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                        >
                          <Check size={10} />
                        </button>
                        <button
                          disabled={isUpdatingDate}
                          onClick={() => setEditingDueDateId(null)}
                          className="p-1 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 group/mobdate">
                        <Calendar size={12} />
                        <span>Vencto: {formatDateBR(e.dueDate)}</span>
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            setEditingDueDateId(e.id);
                            setTempDueDate(e.dueDate ? e.dueDate.split('T')[0] : '');
                          }}
                          className="p-0.5 text-slate-400 hover:text-brand-blue rounded transition-all cursor-pointer ml-1"
                          title="Editar vencimento"
                        >
                          <Pencil size={10} />
                        </button>
                      </div>
                    )}
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs">{e.description}</h4>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xs font-black", isOverdue ? "text-rose-500" : "text-slate-800 dark:text-slate-100")}>
                      {formatCurrency(e.amount)}
                    </p>
                    <p className="text-[8px] font-mono text-slate-400 uppercase">{e.supplier || '-'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold">
                  <div className="flex gap-1.5 items-center">
                    <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border", getCategoryTheme(e.category))}>
                      {e.category}
                    </span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border",
                      isPaid ? "bg-emerald-50 text-emerald-600 border-emerald-200/50" :
                      isOverdue ? "bg-rose-50 text-rose-600 border-rose-200/50 animate-pulse" :
                      "bg-amber-50 text-amber-600 border-amber-200/50"
                    )}>
                      {isPaid ? '🟢 PAGO' : isOverdue ? '🔴 VENCIDO' : '🟡 A VENCER'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    {onEdit && (
                      <button 
                        onClick={() => onEdit(e)} 
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        title="Editar"
                      >
                        ✏️ Editar
                      </button>
                    )}
                    {!isPaid && (
                      <button 
                        onClick={() => setExpenseToPay(e)} 
                        className="px-4 py-1.5 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-lg text-[10px] font-black uppercase italic tracking-wide transition-all cursor-pointer active:scale-95"
                      >
                        💰 Pagar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Large screen layout table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Nominal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedExpenses.map((e) => {
                const isPaid = e.status === 'Pago';
                const isOverdue = !isPaid && e.dueDate < todayStr;
                const isPending = !isPaid && e.dueDate >= todayStr;

                return (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    
                    {/* Description */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {e.description}
                      </div>
                      {e.type && (
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold mt-0.5">
                          {e.type}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border select-text", getCategoryTheme(e.category))}>
                        {e.category}
                      </span>
                    </td>

                    {/* Fornecedor */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-350 uppercase select-text">
                        {e.supplier ? (e.supplier.includes(' | ') ? e.supplier.split(' | ')[1] : e.supplier) : '-'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={cn("font-mono font-black tracking-tight text-sm", isOverdue ? "text-rose-500" : "text-slate-700 dark:text-slate-350")}>
                        {formatCurrency(e.amount)}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingDueDateId === e.id ? (
                        <div className="flex items-center gap-1.5" onClick={(evt) => evt.stopPropagation()}>
                          <input 
                            type="date"
                            value={tempDueDate}
                            onChange={(evt) => setTempDueDate(evt.target.value)}
                            disabled={isUpdatingDate}
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                          />
                          <button
                            disabled={isUpdatingDate}
                            onClick={() => handleSaveDueDate(e, tempDueDate)}
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center"
                            title="Salvar"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            disabled={isUpdatingDate}
                            onClick={() => setEditingDueDateId(null)}
                            className="p-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center"
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/date">
                          <div className="flex items-center gap-2 font-mono text-slate-550 font-bold text-xs select-none">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            {formatDateBR(e.dueDate)}
                          </div>
                          <button
                            onClick={(evt) => {
                              evt.stopPropagation();
                              setEditingDueDateId(e.id);
                              setTempDueDate(e.dueDate ? e.dueDate.split('T')[0] : '');
                            }}
                            className="opacity-0 group-hover/date:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-brand-blue rounded-md transition-all cursor-pointer"
                            title="Editar data de vencimento"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        isPaid ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50" :
                        isOverdue ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/50 animate-pulse" :
                        "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50"
                      )}>
                        {isPaid ? '🟢 Quitada' : isOverdue ? '🔴 Vencida' : '🟡 A vencer'}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <button 
                            onClick={() => onEdit(e)} 
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                            title="Editar Parcela / Duplicata"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {!isPaid ? (
                          <button 
                            onClick={() => setExpenseToPay(e)} 
                            className="px-4 py-1.5 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl text-xs font-black uppercase italic tracking-wider transition-all shadow-md shadow-brand-blue/15 active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            💰 Pagar
                          </button>
                        ) : (
                          <span className="text-xs font-extrabold text-emerald-500 uppercase whitespace-nowrap">Quitada</span>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State warning */}
        {filteredExpenses.length === 0 && (
          <div className="py-16 text-center select-none">
            <div className="inline-flex size-14 bg-slate-50 dark:bg-slate-900 rounded-3xl items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-200 dark:border-slate-800">
              <Search size={24} className="opacity-45" />
            </div>
            <h4 className="text-sm font-black text-slate-705 dark:text-slate-205 uppercase tracking-widest italic mb-1">Nenhuma fatura localizada</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Nenhuma conta pendente ou cadastrada atende aos filtros de busca aplicados.</p>
          </div>
        )}

        {/* Structured Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between overflow-x-auto">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap mr-4">
              Mostrando <span className="font-black text-slate-700 dark:text-slate-300">{startIndex + 1}</span> a <span className="font-black text-slate-700 dark:text-slate-300">{endIndex}</span> de <span className="font-black text-slate-700 dark:text-slate-300">{totalItems}</span> faturas
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

      {/* Render the Pay account Modal */}
      {expenseToPay && (
        <PaymentModal expense={expenseToPay} onClose={() => setExpenseToPay(null)} />
      )}

    </div>
  );
}
