'use client';

import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  DollarSign, 
  Calendar, 
  Filter, 
  Download,
  Search,
  MoreHorizontal,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const FINANCE_DATA = [
  { month: 'Jan', entrada: 45000, saida: 32000 },
  { month: 'Fev', entrada: 52000, saida: 38000 },
  { month: 'Mar', entrada: 48000, saida: 35000 },
  { month: 'Abr', entrada: 61000, saida: 42000 },
  { month: 'Mai', entrada: 55000, saida: 39000 },
  { month: 'Jun', entrada: 67000, saida: 45000 },
];

const TRANSACTIONS = [
  { id: 1, type: 'entrada', category: 'Venda PDV', description: 'Venda #84921', date: 'Hoje, 14:30', amount: 450.00, status: 'Confirmado' },
  { id: 2, type: 'saida', category: 'Fornecedor', description: 'Compra de Estoque - TechDist', date: 'Hoje, 11:15', amount: 2800.00, status: 'Pendente' },
  { id: 3, type: 'entrada', category: 'Serviço', description: 'Manutenção Técnica', date: 'Ontem, 16:45', amount: 120.00, status: 'Confirmado' },
  { id: 4, type: 'saida', category: 'Infraestrutura', description: 'Aluguel Comercial', date: '05 Out, 2023', amount: 4500.00, status: 'Confirmado' },
  { id: 5, type: 'entrada', category: 'Venda PDV', description: 'Venda #84919', date: '04 Out, 2023', amount: 1250.00, status: 'Confirmado' },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('fluxo');

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Financeiro</h1>
          <p className="text-slate-500 dark:text-slate-400">Controle de fluxo de caixa, contas a pagar e receber.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm shadow-sm">
            <Download size={18} /> Exportar
          </button>
          <button className="flex items-center gap-2 px-6 h-11 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20">
            <Plus size={18} /> Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinanceStatCard title="Saldo em Caixa" value="R$ 24.580,00" icon={Wallet} color="emerald" trend="+R$ 1.200 hoje" />
        <FinanceStatCard title="Entradas (Mês)" value="R$ 67.400,00" icon={ArrowUpCircle} color="emerald" trend="+15% vs mês ant." />
        <FinanceStatCard title="Saídas (Mês)" value="R$ 42.820,00" icon={ArrowDownCircle} color="rose" trend="-5% vs mês ant." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold">Fluxo de Caixa Mensal</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button className="px-3 py-1 text-xs font-bold rounded-md bg-white dark:bg-slate-700 shadow-sm">6 Meses</button>
                <button className="px-3 py-1 text-xs font-bold text-slate-500">1 Ano</button>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FINANCE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="entrada" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="saida" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold">Últimas Transações</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input className="w-full pl-9 pr-4 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs" placeholder="Buscar transação..." />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {TRANSACTIONS.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className={cn(
                          "size-8 rounded-lg flex items-center justify-center",
                          t.type === 'entrada' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {t.type === 'entrada' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.description}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{t.category}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">{t.date}</td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-black",
                        t.type === 'entrada' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                          t.status === 'Confirmado' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Contas a Pagar (Hoje)</h3>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 transition-all cursor-pointer group">
                  <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <DollarSign size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Energia Elétrica</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Vence hoje</p>
                  </div>
                  <p className="text-sm font-black text-rose-600">R$ 840,00</p>
                </div>
              ))}
              <button className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold hover:border-emerald-500/50 hover:text-emerald-500 transition-all">
                + ADICIONAR CONTA
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-indigo-200" />
              <h3 className="font-bold">Previsão Mensal</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-indigo-100 font-medium">Lucro Estimado</p>
                  <p className="text-2xl font-black">R$ 18.450,00</p>
                </div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">+12%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white w-3/4 rounded-full"></div>
              </div>
              <p className="text-[10px] text-indigo-100 leading-relaxed">
                Baseado no histórico dos últimos 3 meses, sua previsão de lucro para este mês é superior à média.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceStatCard({ title, value, trend, icon: Icon, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/20",
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className={`size-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h3>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs font-bold text-slate-400">{trend}</p>
      </div>
    </div>
  );
}
