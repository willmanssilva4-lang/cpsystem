'use client';

import React, { useMemo, useState } from 'react';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Download, 
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { cn, formatDateBR, formatTimeBR } from '@/lib/utils';
import { Sale, Expense, StockMovement, CashMovement, Return } from '@/lib/types';
import * as XLSX from 'xlsx';

interface Props {
  sales: Sale[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  cashMovements: CashMovement[];
  returns?: Return[];
}

export function MovimentacaoFinanceira({ sales, expenses, stockMovements, cashMovements, returns = [] }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [mounted, setMounted] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, daysFilter]);

  const transactions = useMemo(() => {
    if (!mounted) return [];
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysFilter);
    cutoffDate.setHours(0, 0, 0, 0);

    const purchaseMovements = stockMovements.filter(m => m.type === 'COMPRA');
    const groupedPurchases: Record<string, typeof purchaseMovements> = {};
    purchaseMovements.forEach(m => {
      const key = m.origin || m.date;
      if (!groupedPurchases[key]) {
        groupedPurchases[key] = [];
      }
      groupedPurchases[key].push(m);
    });

    const consolidatedPurchases = Object.values(groupedPurchases).map(movements => {
      const first = movements[0];
      
      // Try to find matching paid expense of category "Compra de Mercadoria"
      let amount = movements.reduce((sum, m) => sum + (m.quantity * (m.cost || 0)), 0);
      
      if (first) {
        const origin = (first.origin || '').toLowerCase().trim();
        const nfMatch = origin.match(/nf:\s*([a-z0-9]+)/i);
        const nfNumber = nfMatch ? nfMatch[1] : null;
        
        const compraExpenses = expenses.filter(e => 
          e.status === 'Pago' && 
          (e.category === 'Compra de Mercadoria' || (e.category || '').toLowerCase().includes('compra'))
        );
        
        let foundMatch = false;
        
        // 1. Match by NF number
        if (nfNumber) {
          const matchingExpenses = compraExpenses.filter(e => {
            const desc = (e.description || '').toLowerCase();
            const expNfMatch = desc.match(/nf:\s*([a-z0-9]+)/i);
            return expNfMatch && expNfMatch[1] === nfNumber;
          });
          
          if (matchingExpenses.length > 0) {
            amount = matchingExpenses.reduce((sum, e) => sum + e.amount, 0);
            foundMatch = true;
          }
        }
        
        // 2. Match by exact date proximity if no NF match
        if (!foundMatch) {
          const firstTime = new Date(first.date).getTime();
          const matchingExpenses = compraExpenses.filter(e => {
            const expTime = new Date(e.paymentDate || e.date || '').getTime();
            return Math.abs(firstTime - expTime) <= 120000; // within 2 minutes
          });
          
          if (matchingExpenses.length > 0) {
            amount = matchingExpenses.reduce((sum, e) => sum + e.amount, 0);
          }
        }
      }

      return {
        id: `stk-group-${first.id}`,
        date: first.date,
        description: first.origin || `Compra Consol.: ${movements.length} item(s)`,
        category: 'Compra de Mercadoria',
        type: 'saida',
        amount: amount,
        status: 'Pago',
        source: 'stock'
      };
    });

    const isSaleActive = (s: any) => {
      if (!s || !s.date) return false;

      // Filter out returned/cancelled/reversed sales (matching Vendas por Período)
      const isReturned = (returns || []).some(r => {
        const rId = String(r.saleId || (r as any).sale_id || '').toLowerCase().replace('#', '').trim();
        const sId = String(s.id || '').toLowerCase().replace('#', '').trim();
        return rId === sId || (rId.length > 4 && sId.includes(rId)) || (sId.length > 4 && rId.includes(sId));
      });
      if (isReturned) return false;

      const rawStatus = (s.status || '').toLowerCase().trim();
      const cancelledStatuses = ['cancelada', 'estornada', 'cancelado', 'reversão', 'estorno', 'cancelar', 'reverter', 'devolução', 'devolvida'];
      if (cancelledStatuses.some(status => rawStatus.includes(status))) {
        return false;
      }
      
      const sType = (s.type || '').toLowerCase().trim();
      if (cancelledStatuses.some(type => sType.includes(type))) {
        return false;
      }

      return true;
    };

    const all: any[] = [
      ...sales.filter(isSaleActive).map(s => ({
        id: `sale-${s.id}`,
        date: s.date,
        description: `Venda #${s.id.slice(0, 8)}`,
        category: 'Venda PDV',
        type: 'entrada',
        amount: s.total,
        status: 'Pago',
        source: 'sale'
      })),
      ...(returns || []).map(r => ({
        id: `return-${r.id}`,
        date: r.date,
        description: `Devolução Ref. Venda #${r.saleId?.slice(0, 8) || ''}`,
        category: 'Devolução de Venda',
        type: 'saida',
        amount: r.total,
        status: 'Pago',
        source: 'return'
      })),
      ...expenses.filter(e => e.status === 'Pago' && e.category !== 'Compra de Mercadoria').map(e => ({
        id: `exp-${e.id}`,
        date: e.paymentDate || e.date,
        description: e.description,
        category: e.category,
        type: 'saida',
        amount: e.amount,
        status: e.status,
        source: 'expense'
      })),
      ...consolidatedPurchases,
      ...cashMovements.filter(m => m.type === 'suprimento' || m.type === 'sangria').map(m => ({
        id: `csh-${m.id}`,
        date: m.createdAt,
        description: m.reason || (m.type === 'suprimento' ? 'Suprimento de Caixa' : 'Sangria de Caixa'),
        category: 'Movimentação de Caixa',
        type: m.type === 'suprimento' ? 'entrada' : 'saida',
        amount: m.amount,
        status: 'Pago',
        source: 'cash'
      }))
    ];

    return all
      .filter(t => new Date(t.date).getTime() >= cutoffDate.getTime())
      .filter(t => typeFilter === 'all' || t.type === typeFilter)
      .filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, expenses, stockMovements, cashMovements, returns, daysFilter, typeFilter, searchTerm, mounted]);

  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.status !== 'Pendente' && t.status !== 'Vencido') {
        if (t.type === 'entrada') {
          acc.entradas += t.amount;
          acc.entradasCount++;
        }
        if (t.type === 'saida') {
          acc.saidas += t.amount;
          acc.saidasCount++;
        }
      }
      return acc;
    }, { entradas: 0, saidas: 0, entradasCount: 0, saidasCount: 0 });
  }, [transactions]);

  const netBalance = totals.entradas - totals.saidas;

  // Pagination Calculations
  const totalItems = transactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTransactions = useMemo(() => {
    return transactions.slice(startIndex, endIndex);
  }, [transactions, startIndex, endIndex]);

  const handleExport = () => {
    if (transactions.length === 0) return;

    const dataToExport = transactions.map(t => ({
      'Data Lançamento': formatDateBR(t.date),
      'Hora Lançamento': formatTimeBR(t.date),
      'Descrição': t.description,
      'Categoria': t.category,
      'Operação': t.type === 'entrada' ? 'Crédito (Entrada)' : 'Débito (Saída)',
      'Valor Líquido': t.amount,
      'Status': t.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Livro_Caixa_Geral");
    XLSX.writeFile(workbook, `lancamentos_consolidado_${daysFilter}d.xlsx`);
  };

  const getCategoryTheme = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('venda')) {
      return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50';
    }
    if (c.includes('movimentação de caixa') || c.includes('caixa')) {
      return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/50';
    }
    if (c.includes('compra') || c.includes('estoque') || c.includes('mercadoria')) {
      return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50';
    }
    if (c.includes('aluguel') || c.includes('infra') || c.includes('energia') || c.includes('água') || c.includes('condom')) {
      return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-900/50';
    }
    if (c.includes('pessoal') || c.includes('salário') || c.includes('prolabore') || c.includes('fgts')) {
      return 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-900/50';
    }
    if (c.includes('imposto') || c.includes('taxa') || c.includes('das') || c.includes('mei')) {
      return 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-200/50 dark:border-rose-900/50';
    }
    return 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-800';
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 select-none">
      
      {/* Dynamic Upper Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Inflows */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 border border-emerald-150/30 flex items-center justify-center shrink-0">
              <ArrowUpCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Créditos Realizados</p>
              <h3 className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                {formatCurrency(totals.entradas)}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Operações Ativas</span>
            <span className="text-emerald-500 font-black">{totals.entradasCount} faturas</span>
          </div>
        </div>

        {/* Total Outflows */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-455 border border-rose-150/30 flex items-center justify-center shrink-0">
              <ArrowDownCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Débitos Liquidados</p>
              <h3 className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-0.5">
                {formatCurrency(totals.saidas)}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Operações Quitadas</span>
            <span className="text-rose-500 font-black">{totals.saidasCount} faturas</span>
          </div>
        </div>

        {/* Dynamic Balance indicator */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500",
            netBalance >= 0 ? "bg-indigo-500/5" : "bg-rose-500/5"
          )} />
          <div className="flex items-center gap-4">
            <div className={cn(
              "size-12 rounded-2xl border flex items-center justify-center shrink-0",
              netBalance >= 0 
                ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 border-indigo-150/30" 
                : "bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-450 border-rose-150/30"
            )}>
              {netBalance >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucratividade</p>
              <h3 className={cn(
                "text-xl md:text-2xl font-black tracking-tight mt-0.5",
                netBalance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-405"
              )}>
                {formatCurrency(netBalance)}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Aproveitamento Geral</span>
            <span className={cn("font-black", netBalance >= 0 ? "text-indigo-500" : "text-rose-500")}>
              {totals.entradas > 0 ? ((netBalance / totals.entradas) * 100).toFixed(1) + '%' : '0.0%'} de Retenção
            </span>
          </div>
        </div>

      </div>

      {/* Styled Filtering Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
          
          {/* Detailed search bar with visual shadow */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar movimentações por descrição do lançamento ou categoria..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type dropdown */}
          <div>
            <select
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-extrabold uppercase text-slate-650 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all appearance-none cursor-pointer"
            >
              <option value="all">⚫ TODAS AS OPERAÇÕES</option>
              <option value="entrada">🟢 APENAS CRÉDITOS (ENTRADAS)</option>
              <option value="saida">🔴 APENAS DÉBITOS (SAÍDAS)</option>
            </select>
          </div>

          {/* Direct temporal select range */}
          <div>
            <select
              value={daysFilter}
              onChange={(e: any) => setDaysFilter(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/55 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-extrabold uppercase text-slate-650 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all appearance-none cursor-pointer"
            >
              <option value={7}>📅 ÚLTIMOS 7 DIAS</option>
              <option value={15}>📅 ÚLTIMOS 15 DIAS</option>
              <option value={30}>📅 ÚLTIMOS 30 DIAS</option>
              <option value={60}>📅 ÚLTIMOS 60 DIAS</option>
              <option value={90}>📅 ÚLTIMOS 90 DIAS</option>
            </select>
          </div>

        </div>

        {/* Action Indicators & Spreadsheet Excel compile */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-50 dark:border-slate-700/50">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span>Filtro Ativo:</span>
            <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
              {typeFilter === 'all' ? 'Tudo' : typeFilter === 'entrada' ? 'Créditos' : 'Débitos'}
            </span>
            <span className="text-slate-300">/</span>
            <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
              Janela: {daysFilter} Dias
            </span>
            {searchTerm && (
              <>
                <span className="text-slate-300">/</span>
                <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                  Palavra: "{searchTerm}"
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {(typeFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setSearchTerm('');
                }}
                className="text-[10px] font-black text-rose-500 hover:text-rose-650 transition-colors uppercase tracking-widest cursor-pointer"
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

      {/* Main Ledger ledger container */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-indigo-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Extrato Consolidado da Operação</h3>
          </div>
          <span className="text-[11px] font-extrabold text-slate-400">
            {totalItems} lançamentos localizados
          </span>
        </div>

        {/* Mobile View Card List */}
        <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-850">
          {paginatedTransactions.map((t) => {
            const isEntrada = t.type === 'entrada';
            return (
              <div key={t.id} className="p-5 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 font-mono text-[9px] text-slate-450 font-bold">
                      <Calendar size={11} />
                      <span>{formatDateBR(t.date)} - {formatTimeBR(t.date)}</span>
                    </div>
                    <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase leading-snug">{t.description}</h4>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-black tracking-tight", isEntrada ? "text-emerald-500" : "text-rose-500")}>
                      {isEntrada ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase block mt-1 border text-center select-all",
                      getCategoryTheme(t.category)
                    )}>
                      {t.category}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border",
                    isEntrada ? "bg-emerald-50 text-emerald-600 border-emerald-200/50" : "bg-rose-50 text-rose-500 border-rose-200/50"
                  )}>
                    {isEntrada ? '🟢 CRÉDITO' : '🔴 DÉBITO'}
                  </span>
                  
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t.status || 'Pago'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Large screen layout table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição detalhada</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lançado (Líquido)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedTransactions.map((t) => {
                const isEntrada = t.type === 'entrada';
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {formatDateBR(t.date)}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {formatTimeBR(t.date)}
                      </div>
                    </td>

                    {/* Operations / Description */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border shrink-0",
                          isEntrada 
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border-emerald-100/30" 
                            : "bg-rose-50 dark:bg-rose-950/20 text-rose-500 border-rose-100/30"
                        )}>
                          {isEntrada ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase select-text">
                          {t.description}
                        </span>
                      </div>
                    </td>

                    {/* Category tag badges */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border select-text", getCategoryTheme(t.category))}>
                        {t.category}
                      </span>
                    </td>

                    {/* Net pricing */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={cn("font-mono font-black tracking-tight text-sm", isEntrada ? "text-emerald-500" : "text-rose-500")}>
                        {isEntrada ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </td>

                    {/* Direction flows */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        isEntrada 
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/30" 
                          : "bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-450 border-rose-105/30"
                      )}>
                        {isEntrada ? '▲ Crédito' : '▼ Débito'}
                      </span>
                    </td>

                    {/* Simple status badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">
                        {t.status || 'Liquido'}
                      </span>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty placeholder view warning */}
        {transactions.length === 0 && (
          <div className="py-16 text-center select-none">
            <div className="inline-flex size-14 bg-slate-50 dark:bg-slate-900 rounded-3xl items-center justify-center text-slate-450 mb-4 border border-dashed border-slate-200 dark:border-slate-800">
              <FileText size={24} className="opacity-45" />
            </div>
            <h4 className="text-sm font-black text-slate-705 dark:text-slate-205 uppercase tracking-widest italic mb-1">Nenhum lançamento localizado</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Não há movimentações de caixa, vendas ou despesas registradas nesta janela temporal.</p>
          </div>
        )}

        {/* Premium Pagination controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between overflow-x-auto">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap mr-4">
              Mostrando <span className="font-black text-slate-700 dark:text-slate-300">{startIndex + 1}</span> a <span className="font-black text-slate-700 dark:text-slate-300">{endIndex}</span> de <span className="font-black text-slate-700 dark:text-slate-300">{totalItems}</span> lançamentos
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
