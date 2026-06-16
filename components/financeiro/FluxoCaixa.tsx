'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Search,
  ClipboardList,
  Info,
  CircleDollarSign,
  Tag,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { cn, getLocalDateString } from '@/lib/utils';
import { Sale, Expense, StockMovement, CashMovement } from '@/lib/types';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

interface FluxoCaixaProps {
  sales: Sale[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  cashMovements: CashMovement[];
}

export function FluxoCaixa({ sales, expenses, stockMovements, cashMovements }: FluxoCaixaProps) {
  const [days, setDays] = useState(30);
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const dailyData = useMemo(() => {
    if (!now) return [];
    const data: any[] = [];
    
    const isSameDay = (date1: string | Date, date2: Date) => {
      return getLocalDateString(date1) === getLocalDateString(date2);
    };
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime());
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toLocaleDateString('pt-BR');

      // Inflows (Entradas)
      const daySales = sales
        .filter(s => isSameDay(s.date, d))
        .reduce((acc, s) => acc + s.total, 0);
      
      const daySuprimentos = cashMovements
        .filter(m => m.type === 'suprimento' && isSameDay(m.createdAt, d))
        .reduce((acc, m) => acc + m.amount, 0);

      // Outflows (Saídas)
      const dayExpenses = expenses
        .filter(e => e.status === 'Pago' && e.category !== 'Compra de Mercadoria' && (e.paymentDate || e.date) && isSameDay((e.paymentDate || e.date) as string, d))
        .reduce((acc, e) => acc + e.amount, 0);
      
      const dayPurchases = stockMovements
        .filter(m => m.type === 'COMPRA' && isSameDay(m.date, d))
        .reduce((acc, m) => acc + (m.quantity * (m.cost || 0)), 0);
      
      const daySangrias = cashMovements
        .filter(m => m.type === 'sangria' && isSameDay(m.createdAt, d))
        .reduce((acc, m) => acc + m.amount, 0);

      const inflows = daySales + daySuprimentos;
      const outflows = dayExpenses + dayPurchases + daySangrias;
      const balance = inflows - outflows;

      data.push({
        date: dateStr,
        rawDate: d,
        inflows,
        outflows,
        balance,
        details: {
          sales: daySales,
          suprimentos: daySuprimentos,
          expenses: dayExpenses,
          purchases: dayPurchases,
          sangrias: daySangrias
        }
      });
    }
    return data;
  }, [sales, expenses, stockMovements, cashMovements, days, now]);

  const totals = useMemo(() => {
    return dailyData.reduce((acc, day) => ({
      inflows: acc.inflows + day.inflows,
      outflows: acc.outflows + day.outflows,
      balance: acc.balance + day.balance,
      sales: acc.sales + day.details.sales,
      suprimentos: acc.suprimentos + day.details.suprimentos,
      expenses: acc.expenses + day.details.expenses,
      purchases: acc.purchases + day.details.purchases,
      sangrias: acc.sangrias + day.details.sangrias,
    }), { inflows: 0, outflows: 0, balance: 0, sales: 0, suprimentos: 0, expenses: 0, purchases: 0, sangrias: 0 });
  }, [dailyData]);

  // Export Daily Cash Flow breakdown to XLSX
  const handleExport = () => {
    if (dailyData.length === 0) return;

    const dataToExport = dailyData.slice().reverse().map(day => ({
      'Data de Comp.': day.date,
      'Entradas (Total)': day.inflows,
      '  - Vendas (PDV)': day.details.sales,
      '  - Suprimentos': day.details.suprimentos,
      'Saídas (Total)': day.outflows,
      '  - Despesas Pagas': day.details.expenses,
      '  - Compras Estoque': day.details.purchases,
      '  - Sangrias': day.details.sangrias,
      'Saldo Líquido': day.balance,
      'Resultado Diário': day.balance >= 0 ? 'Positivo' : 'Negativo'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fluxo_Caixa_Diario");
    XLSX.writeFile(workbook, `fluxo_caixa_diario_${days}d.xlsx`);
  };

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl space-y-2.5 min-w-[210px] text-xs">
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5 font-mono">
            <Calendar size={13} className="text-slate-400" />
            <span className="font-bold text-slate-500 uppercase">{label}</span>
          </div>
          
          <div className="space-y-1 text-[11px]">
            <div className="grid grid-cols-2 gap-4">
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">▲ Entradas:</span>
              <span className="text-right text-emerald-600 dark:text-emerald-400 font-black">{formatCurrency(data.inflows)}</span>
            </div>
            <div className="grid grid-cols-2 text-[10px] text-slate-400 pl-2">
              <span>• Vendas PDV:</span>
              <span className="text-right">{formatCurrency(data.details.sales)}</span>
            </div>
            <div className="grid grid-cols-2 text-[10px] text-slate-400 pl-2">
              <span>• Suprimentos:</span>
              <span className="text-right">{formatCurrency(data.details.suprimentos)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1.5">
              <span className="text-rose-600 dark:text-rose-400 font-extrabold">▼ Saídas:</span>
              <span className="text-right text-rose-600 dark:text-rose-400 font-black">{formatCurrency(data.outflows)}</span>
            </div>
            <div className="grid grid-cols-2 text-[10px] text-slate-400 pl-2">
              <span>• Despesas Pago:</span>
              <span className="text-right">{formatCurrency(data.details.expenses)}</span>
            </div>
            <div className="grid grid-cols-2 text-[10px] text-slate-400 pl-2">
              <span>• Compras Estoq:</span>
              <span className="text-right">{formatCurrency(data.details.purchases)}</span>
            </div>
            <div className="grid grid-cols-2 text-[10px] text-slate-400 pl-2">
              <span>• Sangrias:</span>
              <span className="text-right">{formatCurrency(data.details.sangrias)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 font-bold">
              <span className="text-slate-600 dark:text-slate-300">Saldo Geral:</span>
              <span className={cn("text-right font-black", data.balance >= 0 ? "text-brand-blue" : "text-rose-500")}>
                {formatCurrency(data.balance)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* Dynamic Header with Premium Period Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 border border-indigo-100/30 flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Período de Conciliação</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Análise temporal de entradas e saídas operacionais</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 self-stretch sm:self-auto">
          {[7, 15, 30, 60].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                days === d 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/15" 
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-755 dark:hover:text-slate-300"
              )}
            >
              {d} Dias
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Total Entradas (Inflows) */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 border border-emerald-100/30 flex items-center justify-center shrink-0">
              <ArrowUpCircle size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Entradas</p>
              <h3 className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate mt-0.5">{formatCurrency(totals.inflows)}</h3>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-750 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase"><Tag size={10} className="text-slate-400" /> Vendas PDV:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-extrabold">{formatCurrency(totals.sales)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase"><CircleDollarSign size={10} className="text-slate-400" /> Suprimentos:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-extrabold">{formatCurrency(totals.suprimentos)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Saídas (Outflows) */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500" />
          
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 border border-rose-100/30 flex items-center justify-center shrink-0">
              <ArrowDownCircle size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Saídas</p>
              <h3 className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight truncate mt-0.5">{formatCurrency(totals.outflows)}</h3>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-750 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase"><Tag size={10} className="text-slate-400" /> Despesas Pago:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-extrabold">{formatCurrency(totals.expenses)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase"><ShoppingBag size={10} className="text-slate-400" /> Compras Estoque:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-extrabold">{formatCurrency(totals.purchases)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Saldo do Período (Net Profit/Loss) */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500",
            totals.balance >= 0 ? "bg-indigo-500/5" : "bg-rose-500/5"
          )} />
          
          <div className="flex items-center gap-4">
            <div className={cn(
              "size-12 rounded-2xl border flex items-center justify-center shrink-0",
              totals.balance >= 0 
                ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 border-indigo-100/30" 
                : "bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 border-rose-100/30"
            )}>
              {totals.balance >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Líquido</p>
              <h3 className={cn(
                "text-xl md:text-2xl font-black tracking-tight truncate mt-0.5",
                totals.balance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {formatCurrency(totals.balance)}
              </h3>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-750 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase"><Info size={10} className="text-slate-400" /> Aproveitamento:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-extrabold">
                {totals.inflows > 0 ? ((totals.balance / totals.inflows) * 100).toFixed(1) + '%' : '0.0%'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase"><ClipboardList size={10} className="text-slate-400" /> Dias Ativos:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-extrabold">
                {dailyData.filter(d => d.inflows > 0 || d.outflows > 0).length} dias com fluxo
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Elegant Area Chart Container */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 pb-4">
          <div className="flex items-center gap-2">
            <div className="size-2 bg-indigo-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Análise Gráfica de Tendência</h3>
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Totalizado p/ dia</span>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fill: '#94A3B8', fontWeight: 'bold'}} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fill: '#94A3B8', fontWeight: 'bold'}}
                tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000) + 'k' : val}`}
              />
              <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: 'rgba(148, 163, 184, 0.15)', strokeWidth: 1.5 }} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingBottom: '20px', letterSpacing: '0.05em' }} 
              />
              <Area type="monotone" dataKey="inflows" name="Entradas (R$)" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIn)" />
              <Area type="monotone" dataKey="outflows" name="Saídas (R$)" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Table view / Desktop & Mobile List */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-slate-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Livro Geral do Fluxo de Caixa</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              title="Exportar Fluxo de Caixa Diário"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl font-black text-xs uppercase tracking-tight hover:bg-brand-blue-hover transition-all shadow-md shadow-brand-blue/20 cursor-pointer active:scale-95"
            >
              <Download size={14} /> Exportar Excel
            </button>
          </div>
        </div>

        {/* Mobile View Card List */}
        <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {dailyData.slice().reverse().filter(day => day.inflows > 0 || day.outflows > 0).length > 0 ? (
            dailyData.slice().reverse().filter(day => day.inflows > 0 || day.outflows > 0).map((day, idx) => (
              <div key={idx} className="p-5 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 font-extrabold uppercase uppercase">
                    <Calendar size={13} />
                    <span>{day.date}</span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border",
                    day.balance >= 0 
                      ? "bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400 border-emerald-100/30" 
                      : "bg-rose-50 dark:bg-rose-950/35 text-rose-600 dark:text-rose-400 border-rose-100/30"
                  )}>
                    {day.balance >= 0 ? '🟢 Positivo' : '🔴 Negativo'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2bg-slate-50/50 dark:bg-slate-900/40 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Entradas</p>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(day.inflows)}</p>
                  </div>
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saídas</p>
                    <p className="text-xs font-black text-rose-500 mt-1">{formatCurrency(day.outflows)}</p>
                  </div>
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo Diário</p>
                    <p className={cn(
                      "text-xs font-black mt-1",
                      day.balance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {formatCurrency(day.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center select-none p-6">
              <div className="inline-flex size-14 bg-slate-50 dark:bg-slate-900 rounded-3xl items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-200 dark:border-slate-800">
                <Search size={24} className="opacity-45" />
              </div>
              <h4 className="text-sm font-black text-slate-705 dark:text-slate-205 uppercase tracking-widest italic mb-1">Sem movimentação no relatório</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Nenhuma transação, venda ou despesa foi registrada no intervalo selecionado.</p>
            </div>
          )}
        </div>

        {/* Desktop Screen layout table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Competência</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">▲ Entradas (Inflow)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">▼ Saídas (Outflow)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo do Dia</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Análise de Balanço</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dailyData.slice().reverse().filter(day => day.inflows > 0 || day.outflows > 0).length > 0 ? (
                dailyData.slice().reverse().filter(day => day.inflows > 0 || day.outflows > 0).map((day, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    
                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono text-slate-550 font-bold text-xs">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        {day.date}
                      </div>
                    </td>

                    {/* Inflows */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(day.inflows)}
                      </span>
                    </td>

                    {/* Outflows */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-mono font-black text-rose-500 text-sm">
                        {formatCurrency(day.outflows)}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={cn(
                        "font-mono font-black text-sm",
                        day.balance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-450"
                      )}>
                        {formatCurrency(day.balance)}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        day.balance >= 0 
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50" 
                          : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/50 text-rose-500"
                      )}>
                        {day.balance >= 0 ? '🟢 POSITIVO' : '🔴 NEGATIVO'}
                      </span>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center select-none text-slate-450 italic">
                    <div className="inline-flex size-14 bg-slate-50 dark:bg-slate-900 rounded-3xl items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-200 dark:border-slate-800">
                      <Search size={22} className="opacity-45" />
                    </div>
                    <p className="text-xs font-black text-slate-600 dark:text-slate-350 uppercase tracking-wider">Aguardando dados de Fluxo de Caixa...</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">Tente alterar o período de visualização ou realizar movimentações de caixa/vendas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
