'use client';

import React, { useMemo, useState } from 'react';
import { PieChart as PieChartIcon, Download, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sale, Expense, Product } from '@/lib/types';
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
}

export function DRE({ sales, expenses, products }: DREProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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
    
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, expenses]);

  const dreData = useMemo(() => {
    const getMonthYear = (dateStr: string | Date | undefined) => {
      if (!dateStr) return { month: -1, year: -1 };
      if (typeof dateStr === 'string' && dateStr.length === 10) {
        const [year, month] = dateStr.split('-');
        return { month: parseInt(month, 10) - 1, year: parseInt(year, 10) };
      }
      const d = new Date(dateStr);
      return { month: d.getMonth(), year: d.getFullYear() };
    };

    // Filter sales for selected month/year
    const salesMonth = sales.filter(s => {
      const { month, year } = getMonthYear(s.date);
      return month === selectedMonth && year === selectedYear;
    });

    // Receita Bruta (Vendas totais antes dos descontos)
    const receitaBruta = salesMonth.reduce((acc, s) => acc + (s.subtotal || (s.total + (s.discount || 0))), 0);

    // Deduções (Descontos)
    const deducoes = salesMonth.reduce((acc, s) => acc + (s.discount || 0), 0);

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
        if (product) {
          cmv += product.costPrice * item.quantity;
        }
      });
    });

    // Lucro Bruto
    const lucroBruto = receitaLiquida - cmv - taxasMaquininhas;

    // Despesas Operacionais
    const expensesMonth = expenses.filter(e => {
      const { month, year } = getMonthYear(e.paymentDate || e.date);
      return month === selectedMonth && year === selectedYear && e.status === 'Pago';
    });

    // Agrupar despesas por categoria
    const despesasPorCategoria = expensesMonth.reduce((acc, e) => {
      const cat = e.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalDespesas = expensesMonth.reduce((acc, e) => acc + e.amount, 0);

    // Lucro Líquido (Resultado do Exercício)
    const lucroLiquido = lucroBruto - totalDespesas;

    // Margens
    const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
    const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

    return {
      receitaBruta,
      deducoes,
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
  }, [sales, expenses, products, selectedMonth, selectedYear]);

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
            <div className="p-6 border-b border-brand-border">
              <h3 className="text-lg font-black uppercase italic tracking-tight">Estrutura do DRE</h3>
            </div>
            
            <div className="p-6 space-y-2">
              {/* Receita Bruta */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">1. Receita Bruta de Vendas</span>
                <span className="text-base font-black text-emerald-600">{formatCurrency(dreData.receitaBruta)}</span>
              </div>

              {/* Deduções */}
              <div className="flex justify-between items-center p-3 pl-8">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">-</span>
                  Deduções e Descontos
                </span>
                <span className="text-sm font-bold text-rose-500">{formatCurrency(dreData.deducoes)}</span>
              </div>

              {/* Receita Líquida */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 mt-2">
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-400">= 2. Receita Líquida</span>
                <span className="text-base font-black text-emerald-600">{formatCurrency(dreData.receitaLiquida)}</span>
              </div>

              {/* Taxas Financeiras */}
              <div className="flex justify-between items-center p-3 pl-8 mt-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">-</span>
                  Taxas Financeiras (Maquininhas)
                </span>
                <span className="text-sm font-bold text-rose-500">{formatCurrency(dreData.taxasMaquininhas)}</span>
              </div>

              {/* CMV */}
              <div className="flex justify-between items-center p-3 pl-8 mt-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">-</span>
                  Custo das Mercadorias Vendidas (CMV)
                </span>
                <span className="text-sm font-bold text-rose-500">{formatCurrency(dreData.cmv)}</span>
              </div>

              {/* Lucro Bruto */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-indigo-800 dark:text-indigo-400">= 3. Lucro Bruto</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">
                    Margem: {dreData.margemBruta.toFixed(1)}%
                  </span>
                </div>
                <span className="text-base font-black text-indigo-600">{formatCurrency(dreData.lucroBruto)}</span>
              </div>

              {/* Despesas Operacionais */}
              <div className="p-3 pl-8 mt-2 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">-</span>
                    Despesas Operacionais
                  </span>
                  <span className="text-sm font-black text-rose-600">{formatCurrency(dreData.totalDespesas)}</span>
                </div>
                
                {Object.entries(dreData.despesasPorCategoria).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between items-center pl-6">
                    <span className="text-[10px] font-medium text-slate-500">{cat}</span>
                    <span className="text-[10px] font-bold text-slate-600">{formatCurrency(val)}</span>
                  </div>
                ))}
              </div>

              {/* Resultado do Exercício (Lucro Líquido) */}
              <div className={cn(
                "flex justify-between items-center p-4 rounded-xl border mt-4",
                dreData.lucroLiquido >= 0 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50" 
                  : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50"
              )}>
                <div className="flex flex-col">
                  <span className={cn(
                    "text-base font-black uppercase tracking-widest",
                    dreData.lucroLiquido >= 0 ? "text-emerald-800 dark:text-emerald-400" : "text-rose-800 dark:text-rose-400"
                  )}>
                    = 4. Resultado Líquido
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mt-1",
                    dreData.lucroLiquido >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    Margem Líquida: {dreData.margemLiquida.toFixed(1)}%
                  </span>
                </div>
                <span className={cn(
                  "text-2xl font-black",
                  dreData.lucroLiquido >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {formatCurrency(dreData.lucroLiquido)}
                </span>
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
            <h3 className="text-sm font-black uppercase italic tracking-tight mb-4">Composição de Custos</h3>
            
            {pieChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
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
