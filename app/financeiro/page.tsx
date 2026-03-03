'use client';

import React, { useState, useMemo } from 'react';
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
import { useERP } from '@/lib/context';

export default function FinancePage() {
  const { sales, expenses } = useERP();
  const [activeTab, setActiveTab] = useState('fluxo');
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalEntradas = sales.reduce((acc, s) => acc + s.total, 0);
    const totalSaidas = expenses.reduce((acc, e) => acc + e.amount, 0);
    const saldo = totalEntradas - totalSaidas;

    const entradasMes = sales
      .filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, s) => acc + s.total, 0);

    const saidasMes = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, e) => acc + e.amount, 0);

    return { saldo, entradasMes, saidasMes };
  }, [sales, expenses]);

  const chartData = useMemo(() => {
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleString('pt-BR', { month: 'short' });
      const month = d.getMonth();
      const year = d.getFullYear();

      const entrada = sales
        .filter(s => {
          const sd = new Date(s.date);
          return sd.getMonth() === month && sd.getFullYear() === year;
        })
        .reduce((acc, s) => acc + s.total, 0);

      const saida = expenses
        .filter(e => {
          const ed = new Date(e.date);
          return ed.getMonth() === month && ed.getFullYear() === year;
        })
        .reduce((acc, e) => acc + e.amount, 0);

      last6Months.push({ month: monthName.charAt(0).toUpperCase() + monthName.slice(1), entrada, saida });
    }
    return last6Months;
  }, [sales, expenses]);

  const transactions = useMemo(() => {
    const all = [
      ...sales.map(s => ({
        id: s.id,
        type: 'entrada' as const,
        category: 'Venda PDV',
        description: `Venda #${s.id.slice(0, 6)}`,
        date: s.date,
        amount: s.total,
        status: 'Confirmado'
      })),
      ...expenses.map(e => ({
        id: e.id,
        type: 'saida' as const,
        category: e.category,
        description: e.description,
        date: e.date,
        amount: e.amount,
        status: e.status === 'Pago' ? 'Confirmado' : 'Pendente'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (searchTerm) {
      return all.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return all.slice(0, 20);
  }, [sales, expenses, searchTerm]);

  const pendingExpenses = useMemo(() => {
    return expenses
      .filter(e => e.status === 'Pendente')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [expenses]);

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
          <button className="flex items-center gap-2 px-6 h-11 bg-brand-blue-hover text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-blue-hover/20">
            <Plus size={18} /> Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinanceStatCard title="Saldo em Caixa" value={formatCurrency(stats.saldo)} icon={Wallet} color="brand-blue" trend="Saldo Total Acumulado" />
        <FinanceStatCard title="Entradas (Mês)" value={formatCurrency(stats.entradasMes)} icon={ArrowUpCircle} color="brand-blue" trend="Total de vendas no mês" />
        <FinanceStatCard title="Saídas (Mês)" value={formatCurrency(stats.saidasMes)} icon={ArrowDownCircle} color="rose" trend="Total de despesas no mês" />
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
                <BarChart data={chartData}>
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
                <input 
                  className="w-full pl-9 pr-4 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs" 
                  placeholder="Buscar transação..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className={cn(
                          "size-8 rounded-lg flex items-center justify-center",
                          t.type === 'entrada' ? "bg-brand-border text-brand-blue" : "bg-rose-100 text-rose-600"
                        )}>
                          {t.type === 'entrada' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.description}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{t.category}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-black",
                        t.type === 'entrada' ? "text-brand-blue" : "text-rose-600"
                      )}>
                        {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                          t.status === 'Confirmado' ? "bg-brand-border text-brand-text-main" : "bg-amber-100 text-amber-700"
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
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">Nenhuma transação encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Contas a Pagar (Pendentes)</h3>
            <div className="space-y-4">
              {pendingExpenses.map((e) => (
                <div key={e.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-brand-blue-hover/30 transition-all cursor-pointer group">
                  <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-hover group-hover:text-white transition-colors">
                    <DollarSign size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{e.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Vencimento: {new Date(e.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <p className="text-sm font-black text-rose-600">{formatCurrency(e.amount)}</p>
                </div>
              ))}
              {pendingExpenses.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400 font-bold">Nenhuma conta pendente.</p>
              )}
              <button className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold hover:border-brand-blue-hover/50 hover:text-brand-blue-hover transition-all">
                + ADICIONAR CONTA
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-indigo-200" />
              <h3 className="font-bold">Resumo do Mês</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-indigo-100 font-medium">Resultado Operacional</p>
                  <p className="text-2xl font-black">{formatCurrency(stats.entradasMes - stats.saidasMes)}</p>
                </div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">
                  {stats.entradasMes > 0 ? `${Math.round(((stats.entradasMes - stats.saidasMes) / stats.entradasMes) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full" 
                  style={{ width: `${Math.min(100, Math.max(0, stats.entradasMes > 0 ? ((stats.entradasMes - stats.saidasMes) / stats.entradasMes) * 100 : 0))}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-indigo-100 leading-relaxed">
                Este valor representa a diferença entre suas vendas e despesas totais no mês atual.
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
    "brand-blue": "bg-slate-50 text-brand-blue dark:bg-brand-text-main/20",
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
