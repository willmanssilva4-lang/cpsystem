'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  TrendingUp, 
  Calendar,
  Filter,
  Download,
  Search
} from 'lucide-react';
import { cn, getLocalDateString } from '@/lib/utils';
import { Sale, Expense, StockMovement, CashMovement } from '@/lib/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface FluxoCaixaProps {
  sales: Sale[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  cashMovements: CashMovement[];
}

export function FluxoCaixa({ sales, expenses, stockMovements, cashMovements }: FluxoCaixaProps) {
  const [days, setDays] = useState(30);
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNow(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const dailyData = useMemo(() => {
    if (!now) return [];
    const data: any[] = [];
    
    const isSameDay = (date1: string | Date, date2: Date) => {
      return getLocalDateString(date1) === getLocalDateString(date2);
    };
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toLocaleDateString('pt-BR');

      // Inflows
      const daySales = sales
        .filter(s => isSameDay(s.date, d))
        .reduce((acc, s) => acc + s.total, 0);
      
      const daySuprimentos = cashMovements
        .filter(m => m.type === 'suprimento' && isSameDay(m.createdAt, d))
        .reduce((acc, m) => acc + m.amount, 0);

      // Outflows
      const dayExpenses = expenses
        .filter(e => e.status === 'Pago' && isSameDay(e.paymentDate || e.date, d))
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
      balance: acc.balance + day.balance
    }), { inflows: 0, outflows: 0, balance: 0 });
  }, [dailyData]);

  return (
    <div className="space-y-6">
      {/* Header & Period Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tight">Período do Fluxo</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Análise detalhada de entradas e saídas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {[7, 15, 30, 60].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                days === d 
                  ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {d} Dias
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpCircle className="text-emerald-500" size={20} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Entradas</span>
          </div>
          <h4 className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(totals.inflows)}</h4>
        </div>
        
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <ArrowDownCircle className="text-rose-500" size={20} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Saídas</span>
          </div>
          <h4 className="text-2xl font-black text-rose-600 tracking-tight">{formatCurrency(totals.outflows)}</h4>
        </div>
        
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-indigo-500" size={20} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo do Período</span>
          </div>
          <h4 className={cn("text-2xl font-black tracking-tight", totals.balance >= 0 ? "text-indigo-600" : "text-rose-600")}>
            {formatCurrency(totals.balance)}
          </h4>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
        <h3 className="text-sm font-black uppercase italic tracking-tight mb-6">Evolução Diária</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fill: '#6B7C93', fontWeight: 'bold'}} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fill: '#6B7C93', fontWeight: 'bold'}}
                tickFormatter={(val) => `R$${val}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                formatter={(val: any) => formatCurrency(val)}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
              <Area type="monotone" dataKey="inflows" name="Entradas" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
              <Area type="monotone" dataKey="outflows" name="Saídas" stroke="#F43F5E" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-card rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border flex justify-between items-center">
          <h3 className="text-sm font-black uppercase italic tracking-tight">Detalhamento Diário</h3>
          <button className="p-2 text-slate-400 hover:text-brand-blue transition-colors">
            <Download size={18} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Entradas</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saídas</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Diário</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dailyData.slice().reverse().filter(day => day.inflows > 0 || day.outflows > 0).length > 0 ? (
                dailyData.slice().reverse().filter(day => day.inflows > 0 || day.outflows > 0).map((day, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{day.date}</td>
                    <td className="px-6 py-4 text-xs font-black text-right text-emerald-600">{formatCurrency(day.inflows)}</td>
                    <td className="px-6 py-4 text-xs font-black text-right text-rose-600">{formatCurrency(day.outflows)}</td>
                    <td className={cn("px-6 py-4 text-xs font-black text-right", day.balance >= 0 ? "text-indigo-600" : "text-rose-600")}>
                      {formatCurrency(day.balance)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-black uppercase italic",
                        day.balance >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {day.balance >= 0 ? 'Positivo' : 'Negativo'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm font-medium text-slate-400 italic">
                    Nenhuma movimentação financeira encontrada no período selecionado.
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
