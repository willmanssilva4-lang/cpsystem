'use client';

import React, { useMemo, useState } from 'react';
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
  Plus,
  Minus,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sale, Expense, Product, Return, ReturnItem } from '@/lib/types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

interface DREProps {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  returns?: Return[]; // Usando o tipo Return
}

export function DRE({ sales, expenses, products, returns = [] }: DREProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeCostIndex, setActiveCostIndex] = useState<number | null>(null);
  const [expandDeducoes, setExpandDeducoes] = useState<boolean>(false);
  const [expandDespesas, setExpandDespesas] = useState<boolean>(true);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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
      
      // Handle string formats
      if (typeof dateStr === 'string') {
        // YYYY-MM-DD
        if (dateStr.length === 10 && dateStr.includes('-')) {
          const [year, month] = dateStr.split('-');
          return { month: parseInt(month, 10) - 1, year: parseInt(year, 10) };
        }
        // DD/MM/YYYY
        if (dateStr.length === 10 && dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          return { month: parseInt(month, 10) - 1, year: parseInt(year, 10) };
        }
      }
      
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { month: -1, year: -1 };
      return { month: d.getMonth(), year: d.getFullYear() };
    };

    // Filter sales for selected month/year
    const salesMonth = sales.filter(s => {
      const { month, year } = getMonthYear(s.date);
      return month === selectedMonth && year === selectedYear;
    });

    // Filter returns for selected month/year
    const returnsMonth = returns.filter(r => {
      const { month, year } = getMonthYear(r.date);
      return month === selectedMonth && year === selectedYear && r.status !== 'CANCELADO';
    });

    // Receita Bruta (Vendas totais antes dos descontos)
    const receitaBruta = salesMonth.reduce((acc, s) => acc + (s.subtotal || (s.total + (s.discount || 0))), 0);

    // Deduções (Descontos + Devoluções)
    const descontos = salesMonth.reduce((acc, s) => acc + (s.discount || 0), 0);
    const devolucoes = returnsMonth.reduce((acc, r) => acc + (r.total || 0), 0);
    const deducoes = descontos + devolucoes;

    // Receita Líquida
    const receitaLiquida = receitaBruta - deducoes;

    // Taxas de Maquininhas (Financeiras)
    const taxasMaquininhas = salesMonth.reduce((acc, s) => {
      if (s.payments && Array.isArray(s.payments) && s.payments.length > 0) {
        return acc + s.payments.reduce((pAcc, p) => pAcc + (p.taxAmount || 0), 0);
      }
      // Tenta buscar taxa direta na venda se não houver array de pagamentos
      // @ts-ignore
      if (s.taxAmount) return acc + s.taxAmount;
      return acc;
    }, 0);

    // CMV (Custo da Mercadoria Vendida)
    let cmv = 0;
    salesMonth.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        // Prioriza o preço de custo gravado no item da venda (histórico)
        const costPrice = item.costPrice || (product ? product.costPrice : 0);
        cmv += costPrice * item.quantity;
      });
    });

    // Subtrai o custo das mercadorias devolvidas do CMV
    returnsMonth.forEach(ret => {
      ret.items.forEach((item: ReturnItem) => {
        const product = products.find(p => p.id === item.productId);
        // Tenta buscar o preço de custo original da venda se possível, senão usa o atual
        const costPrice = product ? product.costPrice : 0;
        cmv -= costPrice * item.quantity;
      });
    });

    // Lucro Bruto (Receita Líquida - CMV)
    const lucroBruto = receitaLiquida - cmv;

    // Despesas Operacionais (Incluindo contas a pagar para o DRE)
    // EXCLUI "Compra de Mercadoria" que já é contabilizada via CMV para evitar duplicidade e classificação incorreta
    const expensesMonth = expenses.filter(e => {
      const { month, year } = getMonthYear(e.date);
      return month === selectedMonth && year === selectedYear && e.category !== 'Compra de Mercadoria';
    });

    // Agrupar despesas por descrição para detalhamento no gráfico (ex: luz, agua)
    const despesasPorCategoria = expensesMonth.reduce((acc, e) => {
      const label = e.description || e.category || 'Outros';
      acc[label] = (acc[label] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalDespesas = expensesMonth.reduce((acc, e) => acc + e.amount, 0);

    // Lucro Líquido (Resultado do Exercício)
    // Lucro Líquido = Lucro Bruto - Taxas Maquininhas - Despesas Operacionais
    const lucroLiquido = lucroBruto - taxasMaquininhas - totalDespesas;

    // Margens
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
    // Add CMV as a cost
    if (dreData.cmv > 0) {
      data.push({ name: 'CMV (Custo Mercadorias)', value: dreData.cmv });
    }
    // Add Taxas Maquininhas as a cost
    if (dreData.taxasMaquininhas > 0) {
      data.push({ name: 'Taxas Maquininhas', value: dreData.taxasMaquininhas });
    }
    return data.sort((a, b) => b.value - a.value);
  }, [dreData]);

  const totalCustos = useMemo(() => {
    return pieChartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieChartData]);

  const COLORS = ['#F43F5E', '#F97316', '#EAB308', '#84CC16', '#06B6D4', '#3B82F6', '#8B5CF6', '#D946EF', '#64748B'];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <PieChartIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tight">DRE - Demonstração do Resultado</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Análise de lucratividade mensal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest outline-none"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select 
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest outline-none"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          
          <button className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-blue transition-colors">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: DRE Structure */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-brand-card rounded-2xl border border-brand-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-brand-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100">Estrutura do DRE</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Detalhamento Financeiro com Análise Vertical (% RL)</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                <Info size={11} className="text-indigo-500" />
                RL = Receita Líquida
              </div>
            </div>
            
            <div className="p-6 space-y-3">
              {/* 1. Receita Bruta */}
              <div className="group relative flex justify-between items-center p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-150">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">
                    +
                  </span>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">1. Receita Bruta de Vendas</span>
                    <p className="text-[9px] text-slate-400 font-medium">Faturamento bruto total antes dos descontos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs py-0.5 px-2 rounded-md font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/80">
                    {dreData.receitaLiquida > 0 ? `${((dreData.receitaBruta / dreData.receitaLiquida) * 100).toFixed(1)}%` : '100%'}
                  </span>
                  <span className="font-mono text-sm md:text-base font-black text-emerald-600">{formatCurrency(dreData.receitaBruta)}</span>
                </div>
              </div>

              {/* Deduções & Descontos (Collapsible) */}
              <div className="space-y-1">
                <div 
                  onClick={() => setExpandDeducoes(!expandDeducoes)}
                  className="group flex justify-between items-center p-3.5 rounded-xl bg-slate-50/20 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-md bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center text-xs font-black">
                      -
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Deduções e Descontos</span>
                        {expandDeducoes ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium">Descontos concedidos e produtos devolvidos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs py-0.5 px-2 rounded-md font-bold text-rose-500/80 bg-rose-50 dark:bg-rose-950/10">
                      {dreData.receitaLiquida > 0 ? `-${((dreData.deducoes / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'}
                    </span>
                    <span className="font-mono text-sm md:text-base font-extrabold text-rose-500">({formatCurrency(dreData.deducoes)})</span>
                  </div>
                </div>

                {/* Sub items for deducoes */}
                {expandDeducoes && (
                  <div className="pl-8 pr-2 py-1 space-y-2 border-l-2 border-dashed border-slate-200 dark:border-slate-800 ml-5">
                    {/* Descontos */}
                    <div className="flex justify-between items-center py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Descontos Comerciais</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-slate-500 dark:text-slate-400">
                        <span>{dreData.receitaLiquida > 0 ? `${((dreData.descontos / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'}</span>
                        <span className="font-bold">{formatCurrency(dreData.descontos)}</span>
                      </div>
                    </div>
                    {/* Devolucoes */}
                    <div className="flex justify-between items-center py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Devoluções de Vendas</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-slate-500 dark:text-slate-400">
                        <span>{dreData.receitaLiquida > 0 ? `${((dreData.devolucoes / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'}</span>
                        <span className="font-bold">{formatCurrency(dreData.devolucoes)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Receita Liquida */}
              <div className="group relative flex justify-between items-center p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/60 to-emerald-500/5 dark:from-emerald-950/15 dark:to-emerald-500/5 border border-emerald-100/50 dark:border-emerald-900/40 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                    =
                  </span>
                  <div>
                    <span className="text-sm font-black text-emerald-800 dark:text-emerald-400">2. Receita Líquida</span>
                    <p className="text-[9px] text-emerald-600/70 dark:text-emerald-500/70 font-bold uppercase tracking-widest">Base de Análise (100.0%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs py-0.5 px-2 rounded-md font-bold text-emerald-700 bg-emerald-100/60 dark:bg-emerald-900/30">
                    100.0%
                  </span>
                  <span className="font-mono text-sm md:text-base font-black text-emerald-600">{formatCurrency(dreData.receitaLiquida)}</span>
                </div>
              </div>

              {/* CMV */}
              <div className="group relative flex justify-between items-center p-3.5 rounded-xl bg-slate-50/20 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all duration-150">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center text-xs font-black">
                    -
                  </span>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Custo das Mercadorias Vendidas (CMV)</span>
                    <p className="text-[9px] text-slate-400 font-medium">Preço de custo dos itens faturados ajustado por devoluções</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs py-0.5 px-2 rounded-md font-bold text-rose-500/80 bg-rose-50 dark:bg-rose-950/10">
                    {dreData.receitaLiquida > 0 ? `-${((dreData.cmv / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'}
                  </span>
                  <span className="font-mono text-xs sm:text-sm md:text-base font-extrabold text-rose-500">({formatCurrency(dreData.cmv)})</span>
                </div>
              </div>

              {/* 3. Lucro Bruto */}
              <div className="group relative flex justify-between items-center p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/60 to-indigo-500/5 dark:from-indigo-950/15 dark:to-indigo-500/5 border border-indigo-100/50 dark:border-indigo-900/40 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-indigo-500 text-white flex items-center justify-center text-xs font-black">
                    =
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-indigo-800 dark:text-indigo-400">3. Lucro Bruto</span>
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/55 text-indigo-700 dark:text-indigo-400 rounded-md text-[9px] font-black uppercase tracking-wider">
                        MB: {dreData.margemBruta.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[9px] text-indigo-600/70 dark:text-indigo-500/70 font-bold uppercase tracking-widest">Resultado operacional bruto</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs py-0.5 px-2 rounded-md font-bold text-indigo-700 bg-indigo-100/60 dark:bg-indigo-900/30">
                    {dreData.margemBruta.toFixed(1)}%
                  </span>
                  <span className="font-mono text-sm md:text-base font-black text-indigo-600">{formatCurrency(dreData.lucroBruto)}</span>
                </div>
              </div>

              {/* Taxas Financeiras */}
              <div className="group relative flex justify-between items-center p-3.5 rounded-xl bg-slate-50/20 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all duration-150">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center text-xs font-black">
                    -
                  </span>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Taxas Financeiras (Maquininhas)</span>
                    <p className="text-[9px] text-slate-400 font-medium">Custo de antecipação de repassadores e bandeiras de cartões</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs py-0.5 px-2 rounded-md font-bold text-rose-500/80 bg-rose-50 dark:bg-rose-950/10">
                    {dreData.receitaLiquida > 0 ? `-${((dreData.taxasMaquininhas / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'}
                  </span>
                  <span className="font-mono text-sm md:text-base font-extrabold text-rose-500">({formatCurrency(dreData.taxasMaquininhas)})</span>
                </div>
              </div>

              {/* Despesas Operacionais (Collapsible list) */}
              <div className="space-y-1">
                <div 
                  onClick={() => setExpandDespesas(!expandDespesas)}
                  className="group flex justify-between items-center p-3.5 rounded-xl bg-slate-50/20 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-md bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center text-xs font-black">
                      -
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Despesas Operacionais Gerais</span>
                        {expandDespesas ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium">Luz, água, aluguel, salários e contas a pagar do período</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs py-0.5 px-2 rounded-md font-bold text-rose-500/80 bg-rose-50 dark:bg-rose-950/10">
                      {dreData.receitaLiquida > 0 ? `-${((dreData.totalDespesas / dreData.receitaLiquida) * 100).toFixed(1)}%` : '0%'}
                    </span>
                    <span className="font-mono text-sm md:text-base font-extrabold text-rose-500">({formatCurrency(dreData.totalDespesas)})</span>
                  </div>
                </div>

                {/* Categories breakdown with sleek list & mini bar ratios */}
                {expandDespesas && (
                  <div className="pl-8 pr-2 py-1 space-y-2.5 border-l-2 border-dashed border-slate-200 dark:border-slate-800 ml-5">
                    {Object.entries(dreData.despesasPorCategoria).length > 0 ? (
                      Object.entries(dreData.despesasPorCategoria).map(([cat, val]) => {
                        const pctRL = dreData.receitaLiquida > 0 ? (val / dreData.receitaLiquida) * 100 : 0;
                        const pctTotalDesp = dreData.totalDespesas > 0 ? (val / dreData.totalDespesas) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">{cat}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-slate-500 dark:text-slate-400">
                                <span className="text-[10px] text-slate-400">{pctRL.toFixed(1)}% RL</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(val)}</span>
                              </div>
                            </div>
                            {/* Linear visualizer indicator of despesa portion */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-400/80 rounded-full" style={{ width: `${pctTotalDesp}%` }}></div>
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

              {/* Resultado do Exercício (Lucro Líquido - Highly visual, polished card) */}
              <div className={cn(
                "relative overflow-hidden flex flex-col md:flex-row justify-between items-stretch md:items-center p-5 rounded-2xl border-2 mt-6 transition-all duration-300 shadow-sm",
                dreData.lucroLiquido >= 0 
                  ? "bg-gradient-to-br from-emerald-500/[0.04] to-emerald-500/[0.01] dark:from-emerald-950/20 dark:to-emerald-950/5 border-emerald-500/20 dark:border-emerald-800/40" 
                  : "bg-gradient-to-br from-rose-500/[0.04] to-rose-500/[0.01] dark:from-rose-950/20 dark:to-rose-950/5 border-rose-500/20 dark:border-rose-800/40"
              )}>
                {/* Decorative border/glow bar */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1.5",
                  dreData.lucroLiquido >= 0 ? "bg-emerald-500" : "bg-rose-500"
                )}></div>

                <div className="flex flex-col pl-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                      dreData.lucroLiquido >= 0 
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300" 
                        : "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300"
                    )}>
                      Resultado Líquido
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">(Regência Final)</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5",
                    dreData.lucroLiquido >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {dreData.lucroLiquido >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    Margem Líquida do Período: {dreData.margemLiquida.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex flex-col justify-center items-end mt-4 md:mt-0 font-mono">
                  <span className={cn(
                    "text-xl md:text-2xl font-black tracking-tight",
                    dreData.lucroLiquido >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {formatCurrency(dreData.lucroLiquido)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">(Saldo Real)</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Charts & Insights */}
        <div className="space-y-6">
          {/* Margins Card */}
          <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
            <h3 className="text-sm font-black uppercase italic tracking-tight mb-4">Indicadores de Desempenho</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Margem Bruta</span>
                  <span className="text-sm font-black text-indigo-600">{dreData.margemBruta.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(Math.max(dreData.margemBruta, 0), 100)}%` }}></div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Lucro sobre a venda (após custo do produto)</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Margem Líquida</span>
                  <span className={cn("text-sm font-black", dreData.margemLiquida >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {dreData.margemLiquida.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div className={cn("h-2 rounded-full", dreData.margemLiquida >= 0 ? "bg-emerald-500" : "bg-rose-500")} style={{ width: `${Math.min(Math.max(dreData.margemLiquida, 0), 100)}%` }}></div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Lucro final (após todas as despesas)</p>
              </div>
            </div>
          </div>

          {/* Costs Breakdown Chart */}
          <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
            <h3 className="text-sm font-black uppercase italic tracking-tight mb-2">Composição de Custos</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">Detalhamento dos custos e saídas do período</p>
            
            {pieChartData.length > 0 ? (
              <div className="space-y-6">
                {/* Donut Container with Absolute Centered Info */}
                <div className="relative h-56 w-full flex items-center justify-center">
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {activeCostIndex !== null ? pieChartData[activeCostIndex].name : 'Custo Total'}
                    </span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 transition-all duration-200">
                      {formatCurrency(activeCostIndex !== null ? pieChartData[activeCostIndex].value : totalCustos)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 leading-none mt-1">
                      {activeCostIndex !== null 
                        ? `${((pieChartData[activeCostIndex].value / totalCustos) * 105 / 105).toFixed(1)}%`
                        : '100.0%'
                      }
                    </span>
                  </div>
                  
                  <ResponsiveContainer id="dre-pie-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={84}
                        paddingAngle={4}
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
                                filter: activeCostIndex === null || isHovered ? 'none' : 'grayscale(35%) opacity(0.55)',
                                transition: 'all 0.2s ease-in-out',
                                cursor: 'pointer',
                              }}
                            />
                          );
                        })}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          backgroundColor: 'rgba(30, 41, 59, 0.95)',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Highly Polished Custom Legend List with Progress Bars */}
                <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                  {pieChartData.map((item, index) => {
                    const pct = totalCustos > 0 ? (item.value / totalCustos) * 100 : 0;
                    const isHovered = activeCostIndex === index;
                    const color = COLORS[index % COLORS.length];

                    return (
                      <div 
                        key={item.name} 
                        className={cn(
                          "p-2 rounded-xl border border-transparent transition-all duration-150 cursor-pointer",
                          isHovered 
                            ? "bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-800" 
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                        )}
                        onMouseEnter={() => setActiveCostIndex(index)}
                        onMouseLeave={() => setActiveCostIndex(null)}
                      >
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(item.value)}</span>
                            <span className="text-[10px] py-0.5 px-1.5 rounded-md font-bold text-slate-500 bg-slate-100 dark:bg-slate-800">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Custom visual progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{ 
                              width: `${pct}%`,
                              backgroundColor: color,
                              opacity: activeCostIndex === null || isHovered ? 1 : 0.6
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <DollarSign size={32} className="opacity-20 mb-2" />
                <p className="text-xs font-bold italic">Sem dados de custos para este período.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
