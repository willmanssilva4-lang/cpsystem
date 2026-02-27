'use client';

import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '@/lib/utils';

const SALES_BY_CATEGORY = [
  { name: 'Eletrônicos', value: 12500 },
  { name: 'Acessórios', value: 8400 },
  { name: 'Periféricos', value: 5200 },
  { name: 'Hortifruti', value: 3100 },
  { name: 'Bebidas', value: 4800 },
];

const CUSTOMER_GROWTH = [
  { month: 'Jan', total: 120 },
  { month: 'Fev', total: 145 },
  { month: 'Mar', total: 168 },
  { month: 'Abr', total: 210 },
  { month: 'Mai', total: 245 },
  { month: 'Jun', total: 290 },
];

export default function ReportsPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Relatórios e BI</h1>
          <p className="text-slate-500 dark:text-slate-400">Análise profunda de dados e inteligência de mercado.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm shadow-sm">
            <Calendar size={18} /> Últimos 30 dias
          </button>
          <button className="flex items-center gap-2 px-4 h-11 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20">
            <Download size={18} /> Gerar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-8">Vendas por Categoria</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SALES_BY_CATEGORY} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} width={100} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-8">Crescimento de Clientes</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CUSTOMER_GROWTH}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Métricas de Conversão</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <ReportMetric label="Ticket Médio" value="R$ 142,50" trend="+5.4%" positive />
          <ReportMetric label="Taxa de Retorno" value="68%" trend="+2.1%" positive />
          <ReportMetric label="CAC (Custo Aquisição)" value="R$ 12,40" trend="-R$ 1,20" positive />
          <ReportMetric label="Churn Rate" value="2.4%" trend="+0.2%" positive={false} />
        </div>
      </div>
    </div>
  );
}

function ReportMetric({ label, value, trend, positive }: any) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <h4 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h4>
        <span className={cn(
          "text-xs font-bold flex items-center gap-0.5 mb-1",
          positive ? "text-emerald-600" : "text-rose-600"
        )}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </span>
      </div>
    </div>
  );
}
