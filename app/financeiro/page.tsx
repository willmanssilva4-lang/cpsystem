'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Plus,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn, getLocalDateString } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie
} from 'recharts';
import { useERP } from '@/lib/context';
import { ExpenseModal } from '@/components/ExpenseModal';
import { ContasPagar } from '@/components/financeiro/ContasPagar';
import { ContasReceber } from '@/components/financeiro/ContasReceber';
import { FluxoCaixa } from '@/components/financeiro/FluxoCaixa';
import { MovimentacaoFinanceira } from '@/components/financeiro/MovimentacaoFinanceira';
import { DRE } from '@/components/financeiro/DRE';

export default function FinancePage() {
  const { sales, expenses, stockMovements, products, hasPermission, cashRegisters, cashMovements, customers, returns } = useERP();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pagar' | 'receber' | 'fluxo' | 'movimentacao' | 'dre'>('dashboard');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const todayStr = getLocalDateString();
    const timer = setTimeout(() => {
      setStartDate(todayStr);
      setEndDate(todayStr);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Helper to get start of day
  const getStartOfDay = (date: Date | string) => {
    let d: Date;
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, day] = date.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(date);
    }
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const today = getStartOfDay(new Date());

  const isWithinRange = useCallback((dateStr: string | Date) => {
    if (!startDate || !endDate || !dateStr) return false;
    const d = getLocalDateString(dateStr);
    return d >= startDate && d <= endDate;
  }, [startDate, endDate]);

  // --- 1. Cards Financeiros ---
  const stats = useMemo(() => {
    // Faturamento no Período
    const salesInPeriod = sales.filter(s => isWithinRange(s.date));
    const faturamentoHoje = salesInPeriod.reduce((acc, s) => acc + s.total, 0);

    // Despesas no Período
    const expensesInPeriod = expenses.filter(e => isWithinRange(e.date));
    const despesasHoje = expensesInPeriod.reduce((acc, e) => acc + e.amount, 0);

    // CMV no Período
    let cmvHoje = 0;
    salesInPeriod.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          cmvHoje += product.costPrice * item.quantity;
        }
      });
    });

    // Taxas no Período
    const taxasHoje = salesInPeriod.reduce((acc, s) => acc + (s.taxAmount || 0), 0);

    // Lucro no Período (Bruto)
    const lucroHoje = faturamentoHoje - cmvHoje;

    // Saldo em Caixa Real (Baseado em todos os caixas, movimentações e vendas)
    const openingBalances = cashRegisters.reduce((acc, r) => acc + r.openingBalance, 0);
    const movementsTotal = cashMovements.reduce((acc, m) => {
      if (m.type === 'suprimento') return acc + m.amount;
      if (m.type === 'sangria') return acc - m.amount;
      if (m.type === 'ajuste') return acc + m.amount;
      return acc;
    }, 0);
    
    const totalEntradas = sales.reduce((acc, s) => acc + (s.total - (s.taxAmount || 0)), 0);
    const totalDespesasPagas = expenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.amount, 0);
    const totalReturns = (returns || []).reduce((acc, r) => acc + r.total, 0);
    const totalCompras = stockMovements.filter(m => m.type === 'COMPRA').reduce((acc, m) => acc + (m.quantity * (m.cost || 0)), 0);
    
    const saldoCaixa = openingBalances + movementsTotal + totalEntradas - totalDespesasPagas - totalReturns - totalCompras;

    return { faturamentoHoje, despesasHoje, lucroHoje, saldoCaixa };
  }, [sales, expenses, stockMovements, products, cashRegisters, cashMovements, returns, isWithinRange]);

  // --- 2. Gráfico de Fluxo de Caixa ---
  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];
    const data = [];
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay);
    start.setHours(0, 0, 0, 0);
    
    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Limit to 60 days for daily view
    const actualDays = Math.min(diffDays, 60);
    
    for (let i = 0; i <= actualDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const dIso = getLocalDateString(d);
      
      const entrada = sales
        .filter(s => getLocalDateString(s.date) === dIso)
        .reduce((acc, s) => acc + s.total, 0);
        
      const saidaExpenses = expenses
        .filter(e => e.status === 'Pago' && getLocalDateString(e.paymentDate || e.date) === dIso)
        .reduce((acc, e) => acc + e.amount, 0);
        
      const saidaCompras = stockMovements
        .filter(m => m.type === 'COMPRA' && getLocalDateString(m.date) === dIso)
        .reduce((acc, m) => acc + (m.quantity * (m.cost || 0)), 0);
        
      data.push({ date: dateStr, entrada, saida: saidaExpenses + saidaCompras });
    }
    return data;
  }, [sales, expenses, stockMovements, startDate, endDate]);

  // --- 3. Contas a Pagar / Receber ---
  const contas = useMemo(() => {
    const todayStr = getLocalDateString();
    const naoPagas = expenses.filter(e => e.status === 'Pendente' || e.status === 'Vencido');
    
    const aPagarHoje = naoPagas.filter(e => getLocalDateString(e.dueDate || e.date) === todayStr);
    const vencidas = naoPagas.filter(e => e.status === 'Vencido' || getLocalDateString(e.dueDate || e.date) < todayStr);
    
    // Simulando contas a receber com vendas "Fiado" não pagas (simplificação)
    const aReceberHoje = sales.filter(s => s.paymentMethod === 'Fiado' && getLocalDateString(s.date) === todayStr);

    return {
      aPagarHoje: aPagarHoje.reduce((acc, e) => acc + e.amount, 0),
      aPagarHojeList: aPagarHoje,
      vencidas: vencidas.reduce((acc, e) => acc + e.amount, 0),
      vencidasList: vencidas,
      aReceberHoje: aReceberHoje.reduce((acc, s) => acc + s.total, 0),
      aReceberHojeList: aReceberHoje
    };
  }, [expenses, sales]);

  // --- 4. Movimentações Financeiras Recentes ---
  const transactions = useMemo(() => {
    const all = [
      ...sales.map(s => ({
        id: `sale-${s.id}`,
        type: 'entrada' as const,
        category: 'Venda PDV',
        description: `Venda #${s.id.slice(0, 6)}`,
        date: s.date,
        amount: s.total,
      })),
      ...expenses.map(e => ({
        id: `expense-${e.id}`,
        type: 'saida' as const,
        category: e.category,
        description: e.description,
        date: e.date,
        amount: e.amount,
      })),
      ...stockMovements.filter(m => m.type === 'COMPRA').map(m => ({
        id: `stock-${m.id}`,
        type: 'saida' as const,
        category: 'Compra Fornecedor',
        description: `Compra de ${m.quantity} un - ${m.productName || 'Produto'}`,
        date: m.date,
        amount: m.quantity * (m.cost || 0),
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return all.slice(0, 10);
  }, [sales, expenses, stockMovements]);

  // --- 5. Resumo de Vendas por Pagamento ---
  const salesByPayment = useMemo(() => {
    const totals: Record<string, number> = {};
    sales.forEach(s => {
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach(p => {
          totals[p.method] = (totals[p.method] || 0) + p.amount;
        });
      } else {
        totals[s.paymentMethod] = (totals[s.paymentMethod] || 0) + s.total;
      }
    });
    
    return Object.entries(totals)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [sales]);

  // --- 6. DRE Automático ---
  const dre = useMemo(() => {
    const salesInPeriod = sales.filter(s => isWithinRange(s.date));
    const receita = salesInPeriod.reduce((acc, s) => acc + s.total, 0);

    // Taxas de Maquininhas (Financeiras)
    const taxasMaquininhas = salesInPeriod.reduce((acc, s) => {
      if (s.payments && Array.isArray(s.payments) && s.payments.length > 0) {
        return acc + s.payments.reduce((pAcc, p) => pAcc + (p.taxAmount || 0), 0);
      }
      // @ts-ignore
      if (s.taxAmount) return acc + s.taxAmount;
      return acc;
    }, 0);

    let cmv = 0;
    salesInPeriod.forEach(sale => {
      sale.items.forEach(item => {
        const cost = item.costPrice && item.costPrice > 0 
          ? item.costPrice 
          : (products.find(p => p.id === item.productId)?.costPrice || 0);
        cmv += cost * item.quantity;
      });
    });

    const expensesInPeriod = expenses.filter(e => isWithinRange(e.date));
    const despesas = expensesInPeriod.reduce((acc, e) => acc + e.amount, 0);

    // Standard DRE:
    // Lucro Bruto = Receita - CMV
    // Lucro Líquido = Lucro Bruto - Taxas - Despesas
    const lucroBruto = receita - cmv;
    const lucroReal = lucroBruto - taxasMaquininhas - despesas;
    
    console.log('DEBUG DRE VALUES:', { receita, cmv, taxasMaquininhas, despesas, lucroBruto, lucroReal });
    
    const margemBruta = receita > 0 ? (lucroBruto / receita) * 100 : 0;
    const margemLiquida = receita > 0 ? (lucroReal / receita) * 100 : 0;

    return { receita, cmv, taxasMaquininhas, despesas, lucroBruto, lucroReal, margemBruta, margemLiquida };
  }, [sales, expenses, products, isWithinRange]);

  if (!hasPermission('Financeiro', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <DollarSign size={48} className="text-rose-500" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar o módulo Financeiro.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Financeiro 360°</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Painel Executivo em Tempo Real</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-200 dark:border-slate-700">
              <Calendar size={16} className="text-brand-blue" />
              <span className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">Período</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none"
              />
              <span className="text-xs font-bold text-slate-400">a</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'pagar', label: 'Contas a Pagar' },
          { id: 'receber', label: 'Contas a Receber' },
          { id: 'fluxo', label: 'Fluxo de Caixa' },
          { id: 'movimentacao', label: 'Movimentação' },
          { id: 'dre', label: 'DRE' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-3 text-xs font-black uppercase italic tracking-widest transition-all border-b-2",
              activeTab === tab.id ? "border-brand-blue text-brand-blue" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* 1. Cards Financeiros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <FinanceStatCard 
              title="Faturamento" 
              value={formatCurrency(stats.faturamentoHoje)} 
              icon={ArrowUpCircle} 
              color="emerald" 
              trend="No período selecionado" 
            />
            <FinanceStatCard 
              title="Despesas" 
              value={formatCurrency(stats.despesasHoje)} 
              icon={ArrowDownCircle} 
              color="rose" 
              trend="No período selecionado" 
            />
            <FinanceStatCard 
              title="Lucro" 
              value={formatCurrency(stats.lucroHoje)} 
              icon={TrendingUp} 
              color="blue" 
              trend="No período selecionado" 
            />
            <FinanceStatCard 
              title="Saldo em Caixa" 
              value={formatCurrency(stats.saldoCaixa)} 
              icon={Wallet} 
              color="indigo" 
              trend="Fluxo financeiro total" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column: Chart & DRE */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              
              {/* 2. Gráfico de Fluxo de Caixa */}
              <div className="bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2">
                    <Activity size={20} className="text-brand-blue" />
                    Fluxo de Caixa
                  </h3>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00E676" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7C93'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7C93'}} tickFormatter={(value) => `R$ ${value}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Area type="monotone" dataKey="entrada" name="Entradas" stroke="#00E676" strokeWidth={3} fillOpacity={1} fill="url(#colorEntrada)" />
                      <Area type="monotone" dataKey="saida" name="Saídas" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSaida)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 6. DRE Automático */}
              <div className="bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2">
                    <PieChartIcon size={20} className="text-indigo-500" />
                    DRE Automático (Período)
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest" title="Margem sobre o custo do produto">
                      M. Bruta: {dre.margemBruta.toFixed(1)}%
                    </span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      dre.margemLiquida >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"
                    )} title="Margem final após todas as despesas">
                      M. Líquida: {dre.margemLiquida.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Receita Bruta (Vendas)</span>
                    <span className="text-lg font-black text-emerald-600">{formatCurrency(dre.receita)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">-</span>
                      CMV (Custo da Mercadoria)
                    </span>
                    <span className="text-lg font-black text-rose-600">{formatCurrency(dre.cmv)}</span>
                  </div>

                  <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Lucro Bruto</span>
                    <span className="text-lg font-black text-emerald-600">{formatCurrency(dre.lucroBruto)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">-</span>
                      Taxas Financeiras (Maquininhas)
                    </span>
                    <span className="text-lg font-black text-rose-600">{formatCurrency(dre.taxasMaquininhas)}</span>
                  </div>

                  <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">-</span>
                      Despesas Operacionais
                    </span>
                    <span className="text-lg font-black text-rose-600">{formatCurrency(dre.despesas)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
                    <span className="text-base font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">= Lucro Real</span>
                    <span className={cn("text-2xl font-black", dre.lucroReal >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatCurrency(dre.lucroReal)}
                    </span>
                  </div>
                </div>
              </div>


            </div>

            {/* Right Column: Contas & Vendas por Pagamento */}
            <div className="space-y-6 md:space-y-8">
              
              {/* 3. Contas a Pagar / Receber */}
              <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
                <h3 className="text-lg font-black uppercase italic tracking-tight mb-6 flex items-center gap-2">
                  <Calendar size={20} className="text-brand-warning" />
                  Contas a Pagar / Receber
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle size={14} /> Contas a Pagar Hoje
                      </span>
                      <span className="text-lg font-black text-rose-700 dark:text-rose-300">{formatCurrency(contas.aPagarHoje)}</span>
                    </div>
                    {contas.aPagarHojeList.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {contas.aPagarHojeList.slice(0, 3).map(e => (
                          <div key={e.id} className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400 truncate pr-2">{e.description}</span>
                            <span className="font-bold text-rose-600">{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={14} /> Contas a Receber Hoje
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(contas.aReceberHoje)}</span>
                    </div>
                    {contas.aReceberHojeList.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {contas.aReceberHojeList.slice(0, 3).map(s => (
                          <div key={s.id} className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400 truncate pr-2">Venda #{s.id.slice(0,6)}</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(s.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Contas Vencidas
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(contas.vencidas)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Resumo de Vendas por Pagamento */}
              <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
                <h3 className="text-lg font-black uppercase italic tracking-tight mb-6 flex items-center gap-2">
                  <DollarSign size={20} className="text-brand-blue" />
                  Vendas por Pagamento
                </h3>
                
                <div className="space-y-3">
                  {salesByPayment.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                          <Wallet size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.method}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {salesByPayment.length === 0 && (
                    <p className="text-center py-4 text-xs text-slate-400 font-bold">Nenhuma venda registrada.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {activeTab === 'pagar' && (
        <ContasPagar expenses={expenses} onAdd={() => setShowExpenseModal(true)} />
      )}

      {activeTab === 'receber' && (
        <ContasReceber sales={sales} customers={customers} />
      )}

      {activeTab === 'fluxo' && (
        <FluxoCaixa 
          sales={sales} 
          expenses={expenses} 
          stockMovements={stockMovements} 
          cashMovements={cashMovements} 
        />
      )}

      {activeTab === 'movimentacao' && (
        <MovimentacaoFinanceira 
          sales={sales} 
          expenses={expenses} 
          stockMovements={stockMovements} 
          cashMovements={cashMovements} 
        />
      )}

      {activeTab === 'dre' && (
        <DRE 
          sales={sales} 
          expenses={expenses} 
          products={products} 
        />
      )}

      {activeTab !== 'dashboard' && activeTab !== 'pagar' && activeTab !== 'receber' && activeTab !== 'fluxo' && activeTab !== 'movimentacao' && activeTab !== 'dre' && (
        <div className="bg-brand-card p-12 rounded-2xl border border-brand-border shadow-sm text-center">
          <h2 className="text-xl font-black uppercase italic text-slate-700">Tela em construção: {activeTab}</h2>
          <p className="text-slate-500 mt-2">Esta funcionalidade será implementada em breve.</p>
        </div>
      )}

      {showExpenseModal && (
        <ExpenseModal 
          expenseToEdit={expenseToEdit}
          onClose={() => {
            setShowExpenseModal(false);
            setExpenseToEdit(null);
          }} 
        />
      )}
    </div>
  );
}

function FinanceStatCard({ title, value, trend, icon: Icon, color }: any) {
  const colors: any = {
    "emerald": "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
    "rose": "bg-rose-50 text-rose-600 dark:bg-rose-900/20",
    "blue": "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
    "indigo": "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20",
  };

  return (
    <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <div className={`size-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{trend}</p>
      </div>
    </div>
  );
}
