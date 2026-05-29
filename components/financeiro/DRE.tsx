'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  PieChart as PieChartIcon, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ChevronDown,
  ChevronRight,
  Info,
  Percent,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Eye,
  Activity,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sale, Expense, Product, Return, ReturnItem } from '@/lib/types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip
} from 'recharts';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

interface DREProps {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  returns?: Return[];
}

export function DRE({ sales, expenses, products, returns = [] }: DREProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeCostIndex, setActiveCostIndex] = useState<number | null>(null);
  const [expandDeducoes, setExpandDeducoes] = useState<boolean>(false);
  const [expandDespesas, setExpandDespesas] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    
    const getYear = (dateStr: string | Date | undefined) => {
      if (!dateStr) return currentYear;
      if (typeof dateStr === 'string' && dateStr.length === 10) {
        return parseInt(dateStr.split('-')[0], 10);
      }
      return new Date(dateStr).getFullYear();
    };

    sales.forEach(s => years.add(getYear(s.date)));
    expenses.forEach(e => years.add(getYear(e.date)));
    returns.forEach(r => years.add(getYear(r.date)));
    
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, expenses, returns]);

  const dreData = useMemo(() => {
    const getMonthYear = (dateStr: string | Date | undefined) => {
      if (!dateStr) return { month: -1, year: -1 };
      
      if (typeof dateStr === 'string') {
        if (dateStr.length === 10 && dateStr.includes('-')) {
          const [year, month] = dateStr.split('-');
          return { month: parseInt(month, 10) - 1, year: parseInt(year, 10) };
        }
        if (dateStr.length === 10 && dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          return { month: parseInt(month, 10) - 1, year: parseInt(year, 10) };
        }
      }
      
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { month: -1, year: -1 };
      return { month: d.getMonth(), year: d.getFullYear() };
    };

    const salesMonth = sales.filter(s => {
      const { month, year } = getMonthYear(s.date);
      return month === selectedMonth && year === selectedYear;
    });

    const returnsMonth = returns.filter(r => {
      const { month, year } = getMonthYear(r.date);
      return month === selectedMonth && year === selectedYear && r.status !== 'CANCELADO';
    });

    const receitaBruta = salesMonth.reduce((acc, s) => acc + (s.subtotal || (s.total + (s.discount || 0))), 0);

    const descontos = salesMonth.reduce((acc, s) => acc + (s.discount || 0), 0);
    const devolucoes = returnsMonth.reduce((acc, r) => acc + (r.total || 0), 0);
    const deducoes = descontos + devolucoes;

    const receitaLiquida = receitaBruta - deducoes;

    const taxasMaquininhas = salesMonth.reduce((acc, s) => {
      if (s.payments && Array.isArray(s.payments) && s.payments.length > 0) {
        return acc + s.payments.reduce((pAcc, p) => pAcc + (p.taxAmount || 0), 0);
      }
      // @ts-ignore
      if (s.taxAmount) return acc + s.taxAmount;
      return acc;
    }, 0);

    let cmv = 0;
    salesMonth.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = item.costPrice || (product ? product.costPrice : 0);
        cmv += costPrice * item.quantity;
      });
    });

    returnsMonth.forEach(ret => {
      ret.items?.forEach((item: ReturnItem) => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = product ? product.costPrice : 0;
        cmv -= costPrice * item.quantity;
      });
    });

    const lucroBruto = receitaLiquida - cmv;

    const expensesMonth = expenses.filter(e => {
      const { month, year } = getMonthYear(e.date);
      return month === selectedMonth && year === selectedYear && e.category !== 'Compra de Mercadoria';
    });

    const despesasPorCategoria = expensesMonth.reduce((acc, e) => {
      const label = e.description || e.category || 'Outros';
      acc[label] = (acc[label] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalDespesas = expensesMonth.reduce((acc, e) => acc + e.amount, 0);

    const lucroLiquido = lucroBruto - taxasMaquininhas - totalDespesas;

    const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
    const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

    return {
      receitaBruta,
      deducoes,
      descontos,
      devolucoes,
      receitaLiquida,
      taxasMaquininhas,
      cmv,
      lucroBruto,
      despesasPorCategoria,
      totalDespesas,
      lucroLiquido,
      margemBruta,
      margemLiquida
    };
  }, [sales, expenses, products, returns, selectedMonth, selectedYear]);

  const pieChartData = useMemo(() => {
    const data = Object.entries(dreData.despesasPorCategoria).map(([name, value]) => ({
      name,
      value
    }));
    if (dreData.cmv > 0) {
      data.push({ name: 'CMV (Custo Mercadorias)', value: dreData.cmv });
    }
    if (dreData.taxasMaquininhas > 0) {
      data.push({ name: 'Taxas Maquininhas', value: dreData.taxasMaquininhas });
    }
    return data.sort((a, b) => b.value - a.value);
  }, [dreData]);

  const totalCustos = useMemo(() => {
    return pieChartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieChartData]);

  const COLORS = [
    '#3b82f6', // Indigo Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber/Gold
    '#ef4444', // Rose/Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#6366f1', // Violet
    '#64748b'  // Slate
  ];

  const handleExport = () => {
    const data = [
      { Item: '1. Receita Bruta de Vendas', Valor: dreData.receitaBruta, '% RL': dreData.receitaLiquida > 0 ? (dreData.receitaBruta / dreData.receitaLiquida) : 1 },
      { Item: '(-) Descontos Concedidos', Valor: -dreData.descontos, '% RL': dreData.receitaLiquida > 0 ? (-dreData.descontos / dreData.receitaLiquida) : 0 },
      { Item: '(-) Devoluções de Vendas', Valor: -dreData.devolucoes, '% RL': dreData.receitaLiquida > 0 ? (-dreData.devolucoes / dreData.receitaLiquida) : 0 },
      { Item: '(=) Receita Líquida de Vendas', Valor: dreData.receitaLiquida, '% RL': 1 },
      { Item: '(-) Custo das Mercadorias Vendidas (CMV)', Valor: -dreData.cmv, '% RL': dreData.receitaLiquida > 0 ? (-dreData.cmv / dreData.receitaLiquida) : 0 },
      { Item: '(=) Lucro Bruto', Valor: dreData.lucroBruto, '% RL': dreData.receitaLiquida > 0 ? (dreData.lucroBruto / dreData.receitaLiquida) : 0 },
      { Item: '(-) Taxas Financeiras (Bandeiras)', Valor: -dreData.taxasMaquininhas, '% RL': dreData.receitaLiquida > 0 ? (-dreData.taxasMaquininhas / dreData.receitaLiquida) : 0 },
      { Item: '(-) Despesas Operacionais Gerais', Valor: -dreData.totalDespesas, '% RL': dreData.receitaLiquida > 0 ? (-dreData.totalDespesas / dreData.receitaLiquida) : 0 },
    ];

    Object.entries(dreData.despesasPorCategoria).forEach(([cat, val]) => {
      data.push({
        Item: `   - ${cat}`,
        Valor: -val,
        '% RL': dreData.receitaLiquida > 0 ? (-val / dreData.receitaLiquida) : 0
      });
    });

    data.push({
      Item: '(=) Lucro Líquido do Exercício',
      Valor: dreData.lucroLiquido,
      '% RL': dreData.receitaLiquida > 0 ? (dreData.lucroLiquido / dreData.receitaLiquida) : 0
    });

    const dataToExport = data.map(row => ({
      'Estrutura do DRE': row.Item,
      'Valor Absoluto (R$)': row.Valor,
      'Análise Vertical (% RL)': (row['% RL'] * 100).toFixed(1) + '%'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Auto-adjust column width for Excel readability
    const max_len = dataToExport.reduce((w, r) => Math.max(w, r['Estrutura do DRE'].length), 10);
    worksheet['!cols'] = [{ wch: max_len + 5 }, { wch: 20 }, { wch: 25 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DRE_Automático");
    XLSX.writeFile(workbook, `dre_automatico_${months[selectedMonth]}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 select-none">
      
      {/* Header and Filter Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 border border-indigo-100/30 flex items-center justify-center shrink-0">
            <PieChartIcon size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
              Demonstração do Resultado (DRE)
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Análise integral e vertical de lucros e margens operacionais
            </p>
          </div>
        </div>

        {/* Filters Select boxes + Excel Action */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="grid grid-cols-2 gap-2 flex-1 sm:flex-initial">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-750/70 rounded-xl text-xs font-black uppercase tracking-wider text-slate-650 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>

            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-750/70 rounded-xl text-xs font-black uppercase tracking-wider text-slate-650 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl font-black text-xs uppercase tracking-tight hover:bg-brand-blue-hover transition-all shadow-md shadow-brand-blue/20 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Download size={14} /> Exportar Excel
          </button>
        </div>

      </div>

      {/* Premium Dynamic Cards Row (3 Highlights) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Receita Líquida */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 border border-emerald-100/30 flex items-center justify-center shrink-0">
              <Receipt size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita Líquida (RL)</p>
              <h3 className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5 truncate">
                {formatCurrency(dreData.receitaLiquida)}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
            <span>Faturamento Bruto:</span>
            <span className="font-mono text-slate-700 dark:text-slate-200 font-extrabold">{formatCurrency(dreData.receitaBruta)}</span>
          </div>
        </div>

        {/* Card 2: Custos Totais e CMV */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-455 border border-rose-100/30 flex items-center justify-center shrink-0">
              <CircleDollarSign size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Despesas e Custos</p>
              <h3 className="text-xl md:text-2xl font-black text-rose-650 dark:text-rose-400 tracking-tight mt-0.5 truncate">
                {formatCurrency(dreData.cmv + dreData.taxasMaquininhas + dreData.totalDespesas)}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
            <span>CMV Comercial:</span>
            <span className="font-mono text-slate-700 dark:text-slate-200 font-extrabold">{formatCurrency(dreData.cmv)}</span>
          </div>
        </div>

        {/* Card 3: Lucro Líquido Real / Margem */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500",
            dreData.lucroLiquido >= 0 ? "bg-indigo-500/5" : "bg-rose-500/5"
          )} />
          <div className="flex items-center gap-4">
            <div className={cn(
              "size-12 rounded-2xl border flex items-center justify-center shrink-0",
              dreData.lucroLiquido >= 0 
                ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 border-indigo-100/30" 
                : "bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-450 border-rose-100/30"
            )}>
              {dreData.lucroLiquido >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Líquido</p>
              <h3 className={cn(
                "text-xl md:text-2xl font-black tracking-tight mt-0.5 truncate",
                dreData.lucroLiquido >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-405"
              )}>
                {formatCurrency(dreData.lucroLiquido)}
              </h3>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
            <span>Margem Líquida (ML):</span>
            <span className={cn("font-black text-xs", dreData.lucroLiquido >= 0 ? "text-indigo-500" : "text-rose-500")}>
              {dreData.margemLiquida.toFixed(1)}%
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Ledger style DRE Structure */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden pb-4">
            
            {/* Box Header Description */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                  Estrutura Analítica do DRE
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Cálculo verticalizado de balanço do exercício
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                <Info size={11} className="text-brand-blue" />
                RL = Receita Líquida (Vendas)
              </div>
            </div>

            <div className="p-6 space-y-4">
              
              {/* Row 1: Receita Bruta */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100/40 dark:border-slate-850 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100/30 font-black text-xs text-emerald-500 flex items-center justify-center">
                    +
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">1. Receita Bruta de Vendas</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Venda de produtos antes das deduções</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {dreData.receitaLiquida > 0 ? `${((dreData.receitaBruta / dreData.receitaLiquida) * 100).toFixed(1)}%` : '100%'} RL
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(dreData.receitaBruta)}
                  </span>
                </div>
              </div>

              {/* Collapsible Row: Deducts and Discounts */}
              <div className="space-y-1">
                <div 
                  onClick={() => setExpandDeducoes(!expandDeducoes)}
                  className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/20 hover:bg-slate-50/60 dark:hover:bg-slate-905/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/25 border border-rose-100/30 font-black text-xs text-rose-500 flex items-center justify-center">
                      -
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Deduções e Descontos</h4>
                        {expandDeducoes ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Devoluções de mercadoria e abatimentos concedidos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[10px] font-black text-rose-500">
                      {dreData.receitaLiquida > 0 ? `-${((dreData.deducoes / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'} RL
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-500">
                      ({formatCurrency(dreData.deducoes)})
                    </span>
                  </div>
                </div>

                {/* Indented collapsible details */}
                {expandDeducoes && (
                  <div className="pl-9 pr-4 py-2 space-y-3.5 border-l-2 border-dashed border-slate-150 dark:border-slate-800 ml-7 animate-in slide-in-from-top-1">
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Descontos Comerciais</span>
                      <div className="flex items-center gap-3 font-mono text-slate-655 dark:text-slate-300">
                        <span className="text-[9px] text-slate-400">{dreData.receitaLiquida > 0 ? `${((dreData.descontos / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'}</span>
                        <span className="font-black">{formatCurrency(dreData.descontos)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Devoluções de Vendas</span>
                      <div className="flex items-center gap-3 font-mono text-slate-655 dark:text-slate-300">
                        <span className="text-[9px] text-slate-400">{dreData.receitaLiquida > 0 ? `${((dreData.devolucoes / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'}</span>
                        <span className="font-black">{formatCurrency(dreData.devolucoes)}</span>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Row 2: RECEITA LÍQUIDA (Core structural separator) */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gradient-to-r from-emerald-500/[0.03] to-emerald-500/[0.01] dark:from-emerald-950/15 dark:to-emerald-950/5 border border-emerald-550/20 dark:border-emerald-800/40 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                <div className="flex items-center gap-3 pl-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500 font-extrabold text-xs text-white flex items-center justify-center">
                    =
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-400">2. Receita Líquida (RL)</h4>
                    <p className="text-[9px] text-emerald-600/70 dark:text-emerald-500/70 font-bold uppercase tracking-widest mt-0.5">Base essencial de rentabilidade (100.0%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                    100.0% RL
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(dreData.receitaLiquida)}
                  </span>
                </div>
              </div>

              {/* Row 3: CMV */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/20 hover:bg-slate-50/60 dark:hover:bg-slate-905/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/25 border border-rose-100/30 font-black text-xs text-rose-500 flex items-center justify-center">
                    -
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Custo de Mercadorias (CMV)</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Preço de custo dos itens faturados liquidados</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[10px] font-black text-rose-500">
                    {dreData.receitaLiquida > 0 ? `-${((dreData.cmv / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'} RL
                  </span>
                  <span className="text-xs sm:text-sm font-black text-rose-500">
                    ({formatCurrency(dreData.cmv)})
                  </span>
                </div>
              </div>

              {/* Row 4: LUCRO BRUTO (Total Separator) */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gradient-to-r from-indigo-500/[0.03] to-indigo-500/[0.01] dark:from-indigo-950/15 dark:to-indigo-950/5 border border-indigo-550/20 dark:border-indigo-800/40 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                <div className="flex items-center gap-3 pl-1.5">
                  <div className="w-6 h-6 rounded-md bg-indigo-500 font-extrabold text-xs text-white flex items-center justify-center">
                    =
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-800 dark:text-indigo-400 gap-2 flex items-center">
                      3. Lucro Bruto Operacional
                      <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 text-[8px] font-black rounded border border-indigo-200/40 uppercase">
                        Margem Bruta: {dreData.margemBruta.toFixed(1)}%
                      </span>
                    </h4>
                    <p className="text-[9px] text-indigo-600/70 dark:text-indigo-500/70 font-bold uppercase tracking-widest mt-0.5">Saldo bruto operacional antes de impostos e operacionais</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">
                    {dreData.margemBruta.toFixed(1)}% RL
                  </span>
                  <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(dreData.lucroBruto)}
                  </span>
                </div>
              </div>

              {/* Row 5: Taxas Financeiras */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/20 hover:bg-slate-50/60 dark:hover:bg-slate-905/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/25 border border-rose-100/30 font-black text-xs text-rose-500 flex items-center justify-center">
                    -
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Taxas Financeiras (Bandeiras)</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Antecipações, parcelas de maquininha e tarifas bancárias</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[10px] font-black text-rose-500">
                    {dreData.receitaLiquida > 0 ? `-${((dreData.taxasMaquininhas / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'} RL
                  </span>
                  <span className="text-xs sm:text-sm font-black text-rose-500">
                    ({formatCurrency(dreData.taxasMaquininhas)})
                  </span>
                </div>
              </div>

              {/* Collapsible Row: Despesas Gerais */}
              <div className="space-y-1">
                <div 
                  onClick={() => setExpandDespesas(!expandDespesas)}
                  className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/20 hover:bg-slate-50/60 dark:hover:bg-slate-905/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/25 border border-rose-100/30 font-black text-xs text-rose-500 flex items-center justify-center">
                      -
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Despesas Operacionais Gerais</h4>
                        {expandDespesas ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Infraestrutura, aluguel, luz, águas, pro-labore, etc.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[10px] font-black text-rose-500">
                      {dreData.receitaLiquida > 0 ? `-${((dreData.totalDespesas / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'} RL
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-500">
                      ({formatCurrency(dreData.totalDespesas)})
                    </span>
                  </div>
                </div>

                {/* Indented breakdowns with linear progress weight Indicators */}
                {expandDespesas && (
                  <div className="pl-9 pr-4 py-3 space-y-4 border-l-2 border-dashed border-slate-150 dark:border-slate-800 ml-7 animate-in slide-in-from-top-1">
                    {Object.entries(dreData.despesasPorCategoria).length > 0 ? (
                      Object.entries(dreData.despesasPorCategoria).map(([cat, val]) => {
                        const pctRL = dreData.receitaLiquida > 0 ? (val / dreData.receitaLiquida) * 100 : 0;
                        const pctTotalDesp = dreData.totalDespesas > 0 ? (val / dreData.totalDespesas) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-555 dark:text-slate-400 truncate max-w-[200px]">{cat}</span>
                              <div className="flex items-center gap-2.5 font-mono">
                                <span className="text-[9px] text-slate-400">{pctRL.toFixed(1)}% RL</span>
                                <span className="font-black text-slate-750 dark:text-slate-200">{formatCurrency(val)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-450 rounded-full" style={{ width: `${pctTotalDesp}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic py-1">Nenhuma despesa individual registrada</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row 6: DRE RESULT / NET PROFIT (Grand final card) */}
              <div className={cn(
                "relative overflow-hidden flex flex-col md:flex-row justify-between items-stretch md:items-center p-6 rounded-3xl border-2 mt-8 transition-all duration-300 shadow-md",
                dreData.lucroLiquido >= 0 
                  ? "bg-gradient-to-br from-indigo-500/[0.04] to-indigo-500/[0.01] dark:from-indigo-950/20 dark:to-indigo-950/5 border-indigo-500/20 dark:border-indigo-800/40 shadow-indigo-500/[0.02]" 
                  : "bg-gradient-to-br from-rose-500/[0.04] to-rose-500/[0.01] dark:from-rose-950/20 dark:to-rose-950/5 border-rose-500/20 dark:border-rose-800/40 shadow-rose-500/[0.02]"
              )}>
                
                {/* Visual side bar line */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-2",
                  dreData.lucroLiquido >= 0 ? "bg-indigo-500" : "bg-rose-500"
                )} />

                <div className="flex flex-col pl-3 md:pl-4 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                      dreData.lucroLiquido >= 0 
                        ? "bg-indigo-50 border-indigo-200/50 text-indigo-700 dark:bg-indigo-950/55 dark:text-indigo-400 dark:border-indigo-900/40" 
                        : "bg-rose-50 border-rose-200/50 text-rose-700 dark:bg-rose-950/55 dark:text-rose-400 dark:border-rose-900/40"
                    )}>
                      Resultado Líquido do Exercício
                    </span>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                      (Balanço Fiduciário)
                    </span>
                  </div>
                  
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5",
                    dreData.lucroLiquido >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {dreData.lucroLiquido >= 0 ? <TrendingUp size={11} className="animate-pulse" /> : <TrendingDown size={11} />}
                    Margem Líquida Real do Período: {dreData.margemLiquida.toFixed(1)}%
                  </span>
                </div>

                <div className="flex flex-col justify-center items-start md:items-end mt-4 md:mt-0 pl-3 md:pl-0 font-mono shrink-0">
                  <span className={cn(
                    "text-xl sm:text-2xl font-black tracking-tight",
                    dreData.lucroLiquido >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-405"
                  )}>
                    {formatCurrency(dreData.lucroLiquido)}
                  </span>
                  <span className="text-[9px] text-slate-450 font-black uppercase tracking-widest leading-none mt-1">Saldo Líquido</span>
                </div>

              </div>

            </div>

          </div>
        </div>

        {/* Right Column: Performance Meters & Composition visual Donut */}
        <div className="space-y-6">
          
          {/* Performance stats progress card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-50 dark:border-slate-705/30">
              <Activity size={16} className="text-slate-400" />
              <h3 className="text-xs font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                Indicadores Chave (Vertical)
              </h3>
            </div>

            <div className="space-y-5">
              
              {/* Margem Bruta progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Margem Bruta (Bruto/RL)</span>
                  <span className="font-mono font-black text-indigo-500">{dreData.margemBruta.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-650 h-full rounded-full" style={{ width: `${Math.min(Math.max(dreData.margemBruta, 0), 100)}%` }} />
                </div>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Representação líquida livre de custos de CMV</p>
              </div>

              {/* Margem Liquida progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Margem Líquida (Líquido/RL)</span>
                  <span className={cn("font-mono font-black", dreData.margemLiquida >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {dreData.margemLiquida.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
                  <div className={cn("h-full rounded-full transition-all", dreData.margemLiquida >= 0 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-rose-400 to-rose-500")} style={{ width: `${Math.min(Math.max(dreData.margemLiquida, 0), 100)}%` }} />
                </div>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Aproveitamento final líquido sobre todo custo operacional</p>
              </div>

            </div>
          </div>

          {/* Cost Allocation breakdown visual block */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            
            <div className="border-b border-slate-50 dark:border-slate-705/30 pb-3">
              <h3 className="text-xs font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Alocação de Custo Integrado</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Peso percentual das saídas operacionais</p>
            </div>

            {mounted && pieChartData.length > 0 ? (
              <div className="space-y-5">
                
                {/* High fidelity Donut and absolute inner summary details */}
                <div className="relative h-56 w-full flex items-center justify-center">
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center p-4">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 max-w-[140px] truncate leading-none mb-1.5">
                      {activeCostIndex !== null ? pieChartData[activeCostIndex].name : 'Soma de Saídas'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white transition-all duration-150">
                      {formatCurrency(activeCostIndex !== null ? pieChartData[activeCostIndex].value : totalCustos)}
                    </span>
                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 px-2 py-0.5 border border-indigo-100/10 rounded-md leading-none mt-2">
                      {activeCostIndex !== null 
                        ? `${((pieChartData[activeCostIndex].value / totalCustos) * 100).toFixed(1)}%`
                        : '100.0% Geral'
                      }
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={84}
                        paddingAngle={5}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActiveCostIndex(index)}
                        onMouseLeave={() => setActiveCostIndex(null)}
                      >
                        {pieChartData.map((entry, index) => {
                          const isHovered = activeCostIndex === index;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              style={{
                                filter: activeCostIndex === null || isHovered ? 'none' : 'grayscale(45%) opacity(0.45)',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                              }}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend breakdown lists with matching colored bullets */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {pieChartData.map((item, index) => {
                    const pct = totalCustos > 0 ? (item.value / totalCustos) * 100 : 0;
                    const isHovered = activeCostIndex === index;
                    const color = COLORS[index % COLORS.length];

                    return (
                      <div 
                        key={item.name} 
                        className={cn(
                          "p-2.5 rounded-xl border border-transparent transition-all cursor-pointer",
                          isHovered 
                            ? "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800" 
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-900/10"
                        )}
                        onMouseEnter={() => setActiveCostIndex(index)}
                        onMouseLeave={() => setActiveCostIndex(null)}
                      >
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px] sm:max-w-[160px]" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono shrink-0">
                            <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                            <span className="text-[9px] py-0.5 px-1.5 rounded-md font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Custom matching progress rail */}
                        <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/50 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-300 animate-in slide-in-from-left-1"
                            style={{ 
                              width: `${pct}%`,
                              backgroundColor: color,
                              opacity: activeCostIndex === null || isHovered ? 1 : 0.6
                            }}
                          />
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div className="py-16 text-center select-none whitespace-normal hover:border-slate-100 transition-colors">
                <div className="inline-flex size-12 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl items-center justify-center text-slate-450 mb-3">
                  <DollarSign size={20} className="opacity-35" />
                </div>
                <h4 className="text-[11px] font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest italic leading-none mb-1">Ausência de Custos</h4>
                <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-normal">Sem faturas, CMV ou despesas computadas neste mês.</p>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
