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
  Clock,
  Landmark,
  Smartphone,
  CreditCard,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
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
import { Product } from '@/lib/types';
import { ExpenseModal } from '@/components/ExpenseModal';
import { ContasPagar } from '@/components/financeiro/ContasPagar';
import { ContasReceber } from '@/components/financeiro/ContasReceber';
import { Despesas } from '@/components/financeiro/Despesas';
import { FluxoCaixa } from '@/components/financeiro/FluxoCaixa';
import { MovimentacaoFinanceira } from '@/components/financeiro/MovimentacaoFinanceira';
import { DRE } from '@/components/financeiro/DRE';

// Helper de cálculo robusto e unificado de taxas de vendas (maquininhas/PIX/cartões)
const calculateSaleTax = (sale: any): number => {
  if (!sale) return 0;
  let totalTax = 0;
  let paymentsArr: any[] = [];
  
  if (sale.payments) {
    if (Array.isArray(sale.payments)) {
      paymentsArr = sale.payments;
    } else if (typeof sale.payments === 'string') {
      try {
        const parsed = JSON.parse(sale.payments);
        if (Array.isArray(parsed)) {
          paymentsArr = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          paymentsArr = [parsed];
        }
      } catch (e) {
        console.error('Error parsing payments json string in DRE helper', e);
      }
    } else if (typeof sale.payments === 'object') {
      paymentsArr = [sale.payments];
    }
  }

  if (paymentsArr && paymentsArr.length > 0) {
    totalTax = paymentsArr.reduce((pAcc: number, p: any) => {
      const t = p.taxAmount !== undefined ? p.taxAmount : (p.tax_amount !== undefined ? p.tax_amount : 0);
      return pAcc + (Number(t) || 0);
    }, 0);
  }
  
  // Se o total das taxas das parcelas/pagamentos for 0, tenta do nível da venda
  if (totalTax === 0) {
    const t = sale.taxAmount !== undefined ? sale.taxAmount : (sale.tax_amount !== undefined ? sale.tax_amount : 0);
    totalTax = Number(t) || 0;
  }
  
  return totalTax;
};

export default function FinancePage() {
  const { sales, expenses, stockMovements, products, hasPermission, cashRegisters, cashMovements, customers, returns, maquininhas } = useERP();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'despesas' | 'pagar' | 'receber' | 'fluxo' | 'movimentacao' | 'dre'>('dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get('tab');
      if (tab && ['dashboard', 'despesas', 'pagar', 'receber', 'fluxo', 'movimentacao', 'dre'].includes(tab)) {
        setActiveTab(tab as any);
      }
    }
  }, []);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const todayStr = getLocalDateString();
    const firstDayOfMonthStr = todayStr.substring(0, 8) + '01';
    const timer = setTimeout(() => {
      setStartDate(firstDayOfMonthStr);
      setEndDate(todayStr);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

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
    const salesInPeriod = sales.filter(s => isWithinRange(s.date) && s.status !== 'Cancelada');
    const faturamentoHoje = salesInPeriod.reduce((acc, s) => acc + s.total, 0);

    // Despesas no Período (Incluindo CMV conforme pedido do usuário)
    // EXCLUI "Compra de Mercadoria" que já é contabilizada via CMV para evitar duplicidade e classificação incorreta
    const expensesInPeriod = expenses.filter(e => isWithinRange(e.date) && e.category !== 'Compra de Mercadoria');
    const saidasExpenses = expensesInPeriod.reduce((acc, e) => acc + e.amount, 0);

    // CMV no Período
    let cmvHoje = 0;
    salesInPeriod.forEach((sale: any) => {
      sale.items?.forEach((item: any) => {
        const product = productMap.get(item.productId);
        if (product) {
          cmvHoje += product.costPrice * item.quantity;
        }
      });
    });

    const despesasHoje = saidasExpenses + cmvHoje;

    // Taxas no Período
    const taxasHoje = salesInPeriod.reduce((acc, s) => acc + calculateSaleTax(s), 0);

    // Lucro Líquido no Período
    const lucroHoje = faturamentoHoje - despesasHoje - taxasHoje;

    // Saldo em Caixa Real (Baseado em todos os caixas, movimentações e vendas)
    const openingBalances = cashRegisters.reduce((acc, r) => acc + r.openingBalance, 0);
    const movementsTotal = cashMovements.reduce((acc, m) => {
      if (m.type === 'suprimento') return acc + m.amount;
      if (m.type === 'sangria') return acc - m.amount;
      if (m.type === 'ajuste') return acc + m.amount;
      return acc;
    }, 0);
    
    const totalEntradas = sales.filter(s => s.status !== 'Cancelada').reduce((acc, s) => acc + (s.total - calculateSaleTax(s)), 0);
    const totalDespesasPagas = expenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + e.amount, 0);
    const totalReturns = (returns || []).reduce((acc, r) => acc + r.total, 0);
    
    const saldoCaixa = openingBalances + movementsTotal + totalEntradas - totalDespesasPagas - totalReturns;

    return { faturamentoHoje, despesasHoje, lucroHoje, saldoCaixa };
  }, [sales, expenses, products, cashRegisters, cashMovements, returns, isWithinRange, productMap]);

  // --- 2. Gráfico de Fluxo de Caixa ---
  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];
    const data = [];
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay);
    start.setHours(12, 0, 0, 0);
    
    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay);
    end.setHours(12, 0, 0, 0);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Limit to 60 days for daily view
    const actualDays = Math.min(diffDays, 60);
    
    for (let i = 0; i <= actualDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const dIso = getLocalDateString(d);
      
      const salesOnDay = sales.filter(s => s.status !== 'Cancelada' && getLocalDateString(s.date) === dIso);
      const entrada = salesOnDay.reduce((acc, s) => acc + s.total, 0);
        
      const saidaExpenses = expenses
        .filter(e => e.status === 'Pago' && e.category !== 'Compra de Mercadoria' && getLocalDateString(e.paymentDate || e.date) === dIso)
        .reduce((acc, e) => acc + e.amount, 0);

      let cmvDay = 0;
      let taxasDay = 0;
      salesOnDay.forEach((sale: any) => {
        taxasDay += calculateSaleTax(sale);
        sale.items?.forEach((item: any) => {
          const product = productMap.get(item.productId);
          const cost = item.costPrice && item.costPrice > 0 
            ? item.costPrice 
            : (product?.costPrice || 0);
          cmvDay += cost * item.quantity;
        });
      });
      
      // Agora incluímos Despesas Gerais + CMV + Taxas de Maquininha na Saída do Fluxo de Caixa 
      // Isso garante que o Saldo Líquido no Período (-R$ 49,03) seja idêntico ao Lucro Líquido Real do DRE.
      data.push({ date: dateStr, entrada, saida: saidaExpenses + cmvDay + taxasDay });
    }
    return data;
  }, [sales, expenses, startDate, endDate, productMap]);

  // --- 3. Contas a Pagar / Receber ---
  const contas = useMemo(() => {
    const todayStr = getLocalDateString();
    const naoPagas = expenses.filter(e => e.status === 'Pendente' || e.status === 'Vencido');
    
    const aPagarHoje = naoPagas.filter(e => getLocalDateString(e.dueDate || e.date) === todayStr);
    const vencidas = naoPagas.filter(e => e.status === 'Vencido' || getLocalDateString(e.dueDate || e.date) < todayStr);
    
    // Simulando contas a receber com vendas "Fiado" não pagas (simplificação)
    const aReceberHoje = sales.filter(s => s.status !== 'Cancelada' && s.paymentMethod === 'Fiado' && getLocalDateString(s.date) === todayStr);

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
      ...sales.filter(s => s.status !== 'Cancelada').map(s => ({
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
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return all.slice(0, 10);
  }, [sales, expenses]);

  // --- 4.5. Saldos por Conta Financeira ---
  const accountsBalances = useMemo(() => {
    // 1. Caixa
    const regOpening = cashRegisters.reduce((acc, r) => acc + r.openingBalance, 0);
    const regMovements = cashMovements.reduce((acc, m) => {
      if (m.type === 'suprimento') return acc + m.amount;
      if (m.type === 'sangria') return acc - m.amount;
      if (m.type === 'ajuste') return acc + m.amount;
      return acc;
    }, 0);
    
    // Vendas em Dinheiro
    let salesCash = 0;
    sales.forEach((s: any) => {
      if (s.status === 'Cancelada') return;
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p: any) => {
          if (p.method === 'Dinheiro') {
            salesCash += p.amount;
          }
        });
      } else if (s.paymentMethod === 'Dinheiro') {
        salesCash += s.total;
      }
    });

    // Despesas e Compras pagas pelo Caixa
    const expensesCaixa = expenses
      .filter(e => e.status === 'Pago' && e.category !== 'Compra de Mercadoria' && (e.financialAccount === 'Caixa' || !e.financialAccount))
      .reduce((acc, e) => acc + e.amount, 0);
    const purchasesCaixa = stockMovements
      .filter(m => m.type === 'COMPRA' && (m.financialAccount === 'Caixa' || !m.financialAccount))
      .reduce((acc, m) => acc + (m.quantity * (m.cost || 0)), 0);
    const returnsCash = (returns || []).reduce((acc, r) => acc + r.total, 0);
    
    const balanceCaixa = regOpening + regMovements + salesCash - expensesCaixa - purchasesCaixa - returnsCash;

    // 2. Mercado Pago
    let salesMercadoPago = 0;
    sales.forEach((s: any) => {
      if (s.status === 'Cancelada') return;
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p: any) => {
          const name = (p.method || '').toLowerCase();
          if (name.includes('mercado') || name.includes('mercadopago')) {
            salesMercadoPago += p.amount;
          }
        });
      } else if ((s.paymentMethod || '').toLowerCase().includes('mercado')) {
        salesMercadoPago += s.total;
      }
    });
    const expensesMercadoPago = expenses
      .filter(e => e.status === 'Pago' && e.category !== 'Compra de Mercadoria' && e.financialAccount === 'Mercado Pago')
      .reduce((acc, e) => acc + e.amount, 0);
    const purchasesMercadoPago = stockMovements
      .filter(m => m.type === 'COMPRA' && m.financialAccount === 'Mercado Pago')
      .reduce((acc, m) => acc + (m.quantity * (m.cost || 0)), 0);
    const balanceMercadoPago = salesMercadoPago - expensesMercadoPago - purchasesMercadoPago;

    // 3. Conta Bancária
    let salesBank = 0;
    sales.forEach((s: any) => {
      if (s.status === 'Cancelada') return;
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p: any) => {
          const name = (p.method || '').toLowerCase();
          if (name.includes('cart') || name.includes('deb') || name.includes('cred') || name.includes('boleto') || name.includes('banc')) {
            salesBank += p.amount;
          }
        });
      } else {
        const name = (s.paymentMethod || '').toLowerCase();
        if (name.includes('cart') || name.includes('deb') || name.includes('cred') || name.includes('boleto') || name.includes('banc')) {
          salesBank += s.total;
        }
      }
    });
    const expensesBank = expenses
      .filter(e => e.status === 'Pago' && e.category !== 'Compra de Mercadoria' && e.financialAccount === 'Conta Bancária')
      .reduce((acc, e) => acc + e.amount, 0);
    const purchasesBank = stockMovements
      .filter(m => m.type === 'COMPRA' && m.financialAccount === 'Conta Bancária')
      .reduce((acc, m) => acc + (m.quantity * (m.cost || 0)), 0);
    const balanceBank = salesBank - expensesBank - purchasesBank;

    // 4. Conta PIX
    let salesPix = 0;
    sales.forEach((s: any) => {
      if (s.status === 'Cancelada') return;
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p: any) => {
          const name = (p.method || '').toLowerCase();
          if (name.includes('pix') && !name.includes('mercado')) {
            salesPix += p.amount;
          }
        });
      } else {
        const name = (s.paymentMethod || '').toLowerCase();
        if (name.includes('pix') && !name.includes('mercado')) {
          salesPix += s.total;
        }
      }
    });
    const expensesPix = expenses
      .filter(e => e.status === 'Pago' && e.category !== 'Compra de Mercadoria' && e.financialAccount === 'Conta PIX')
      .reduce((acc, e) => acc + e.amount, 0);
    const purchasesPix = stockMovements
      .filter(m => m.type === 'COMPRA' && m.financialAccount === 'Conta PIX')
      .reduce((acc, m) => acc + (m.quantity * (m.cost || 0)), 0);
    const balancePix = salesPix - expensesPix - purchasesPix;

    return [
      { name: 'Caixa (Dinheiro)', balance: balanceCaixa, icon: Wallet, iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
      { name: 'Mercado Pago', balance: balanceMercadoPago, icon: Smartphone, iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
      { name: 'Conta Bancária', balance: balanceBank, icon: Landmark, iconBg: 'bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300' },
      { name: 'Conta PIX', balance: balancePix, icon: Smartphone, iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' },
    ];
  }, [sales, expenses, stockMovements, cashRegisters, cashMovements, returns]);

  // --- 5. Resumo de Vendas por Pagamento ---
  const salesByPayment = useMemo(() => {
    const totals: Record<string, { amount: number; maquininhaNames: Set<string> }> = {};
    sales.forEach((s: any) => {
      if (s.status === 'Cancelada') return;
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p: any) => {
          const key = p.method;
          if (!totals[key]) {
            totals[key] = { amount: 0, maquininhaNames: new Set() };
          }
          totals[key].amount += p.amount;
          if (p.maquininhaId) {
            const maq = (maquininhas || []).find((m: any) => m.id === p.maquininhaId);
            if (maq) totals[key].maquininhaNames.add(maq.nome);
          }
        });
      } else {
        const key = s.paymentMethod;
        if (!totals[key]) {
          totals[key] = { amount: 0, maquininhaNames: new Set() };
        }
        totals[key].amount += s.total;
        if (s.maquininhaId) {
          const maq = (maquininhas || []).find((m: any) => m.id === s.maquininhaId);
          if (maq) totals[key].maquininhaNames.add(maq.nome);
        }
      }
    });
    
    return Object.entries(totals)
      .map(([method, data]) => ({ 
        method, 
        amount: data.amount,
        maquininhas: Array.from(data.maquininhaNames).join(', ')
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [sales, maquininhas]);

  // --- 6. DRE Automático ---
  const dre = useMemo(() => {
    const salesInPeriod = sales.filter(s => isWithinRange(s.date) && s.status?.toLowerCase() !== 'cancelada');
    const receita = salesInPeriod.reduce((acc, s) => acc + s.total, 0);

    // Taxas de Maquininhas (Financeiras)
    const taxasMaquininhas = salesInPeriod.reduce((acc, s: any) => acc + calculateSaleTax(s), 0);

    let cmv = 0;
    salesInPeriod.forEach((sale: any) => {
      sale.items?.forEach((item: any) => {
        const cost = item.costPrice && item.costPrice > 0 
          ? item.costPrice 
          : (products.find(p => p.id === item.productId)?.costPrice || 0);
        cmv += cost * item.quantity;
      });
    });

    const expensesInPeriod = expenses.filter(e => isWithinRange(e.paymentDate || e.date) && e.category !== 'Compra de Mercadoria' && e.status === 'Pago');
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

  // --- 7. Totais do Dashboard ---
  const dashboardDetails = useMemo(() => {
    let chartEntradas = 0;
    let chartSaidas = 0;
    chartData.forEach(d => {
      chartEntradas += d.entrada;
      chartSaidas += d.saida;
    });

    const totalSalesByPayment = salesByPayment.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      chartEntradas,
      chartSaidas,
      chartSaldo: chartEntradas - chartSaidas,
      totalSalesByPayment
    };
  }, [chartData, salesByPayment]);

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
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Central Financeira</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Gestão Completa de Entrada e Saídas</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95 text-sm"
          >
            <Plus size={20} />
            Nova Despesa
          </button>
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
          { id: 'despesas', label: 'Despesas' },
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
              title="Saídas" 
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
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-705 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                      <Activity size={18} className="text-brand-blue" />
                      Fluxo de Caixa no Período
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      Saldo Líquido no Período: {formatCurrency(dashboardDetails.chartSaldo)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-100/20">
                      Entradas: {formatCurrency(dashboardDetails.chartEntradas)}
                    </span>
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-100/20">
                      Saídas: {formatCurrency(dashboardDetails.chartSaidas)}
                    </span>
                  </div>
                </div>
                <div className="h-72 w-full mt-2">
                  <ResponsiveContainer id="fin-cash-area-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 600}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 600}} tickFormatter={(value) => `R$ ${value}`} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: '1px solid #f1f5f9', 
                          backgroundColor: '#ffffff',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                          padding: '12px'
                        }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                        labelStyle={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: any) => [formatCurrency(value), '']}
                      />
                      <Area type="monotone" dataKey="entrada" name="Entradas (+)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEntrada)" />
                      <Area type="monotone" dataKey="saida" name="Saídas (-)" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaida)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. DRE Automático Simplificado */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-705 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-50 dark:border-slate-700/50 pb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                      <PieChartIcon size={18} className="text-indigo-500" />
                      Demonstrativo Simplificado (Período)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      Resumo vertical do balanço operacional
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-100/20" title="Margem Bruta">
                      M. Bruta: {dre.margemBruta.toFixed(1)}%
                    </span>
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                      dre.margemLiquida >= 0 
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border-indigo-100/20" 
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-455 border-rose-100/20"
                    )} title="Margem Líquida">
                      M. Líquida: {(dre.margemLiquida / 100).toFixed(2).replace('.', ',')}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Receita Bruta */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100/40 dark:border-slate-850 hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 text-xs font-black flex items-center justify-center border border-emerald-100/10">+</span>
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Receita de Vendas</span>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Faturamento bruto liquidado</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[9px] text-slate-450 font-bold">100.0% RL</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(dre.receita)}</span>
                    </div>
                  </div>
                  
                  {/* CMV */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/20 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-500 text-xs font-black flex items-center justify-center border border-rose-100/10">-</span>
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">CMV (Custo Mercadoria)</span>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Custo dos itens faturados</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[9px] text-rose-500 font-bold font-mono">
                        {dre.receita > 0 ? `-${(dre.cmv / dre.receita).toFixed(2).replace('.', ',')}%` : '0,00%'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-455">({formatCurrency(dre.cmv)})</span>
                    </div>
                  </div>

                  {/* Lucro Bruto */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/[0.02] dark:bg-emerald-950/15 border border-emerald-550/20 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-emerald-500 text-white text-xs font-black flex items-center justify-center shadow-sm">=</span>
                      <div>
                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-400">Lucro Bruto Operacional</span>
                        <p className="text-[8px] text-emerald-600/70 dark:text-emerald-500/70 font-bold uppercase tracking-wider">Margem Bruta sobre Custos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[9px] text-emerald-600 font-extrabold">{(dre.margemBruta / 100).toFixed(2).replace('.', ',')}%</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(dre.lucroBruto)}</span>
                    </div>
                  </div>
                  
                  {/* Taxas Financeiras */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/20 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-500 text-xs font-black flex items-center justify-center border border-rose-100/10">-</span>
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Taxas de Cartões / Maquininhas</span>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Tarifas e descontos de adquirentes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[9px] text-rose-500 font-bold">
                        {dre.receita > 0 ? `-${(dre.taxasMaquininhas / dre.receita).toFixed(2).replace('.', ',')}%` : '0,00%'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-455">({formatCurrency(dre.taxasMaquininhas)})</span>
                    </div>
                  </div>

                  {/* Despesas Operacionais */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/20 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-500 text-xs font-black flex items-center justify-center border border-rose-100/10">-</span>
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Despesas Operacionais Gerais</span>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Custos de infraestrutura e serviços</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[9px] text-rose-500 font-bold">
                        {dre.receita > 0 ? `-${(dre.despesas / dre.receita).toFixed(2).replace('.', ',')}%` : '0,00%'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-455">({formatCurrency(dre.despesas)})</span>
                    </div>
                  </div>
                  
                  {/* Lucro Real */}
                  <div className={cn(
                    "flex justify-between items-center p-4 rounded-xl border relative overflow-hidden shadow-sm mt-4",
                    dre.lucroReal >= 0 
                      ? "bg-indigo-505/[0.03] dark:bg-indigo-950/15 border-indigo-500/20 dark:border-indigo-800/40" 
                      : "bg-rose-550/[0.03] dark:bg-rose-950/15 border-rose-500/20 dark:border-rose-800/40"
                  )}>
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        "w-5 h-5 rounded text-white text-xs font-black flex items-center justify-center shadow-sm",
                        dre.lucroReal >= 0 ? "bg-indigo-500" : "bg-rose-500"
                      )}>=</span>
                      <div>
                        <span className={cn(
                          "text-xs font-black uppercase tracking-wider",
                          dre.lucroReal >= 0 ? "text-indigo-800 dark:text-indigo-400" : "text-rose-800 dark:text-rose-450"
                        )}>Lucro Líquido Real</span>
                        <p className={cn(
                          "text-[8px] font-bold uppercase tracking-wider",
                          dre.lucroReal >= 0 ? "text-indigo-650/70" : "text-rose-650/70"
                        )}>Margem líquida após saídas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className={cn(
                        "text-[9px] font-black",
                        dre.lucroReal >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
                      )}>{(dre.margemLiquida / 100).toFixed(2).replace('.', ',')}%</span>
                      <span className={cn(
                        "text-sm sm:text-base font-black",
                        dre.lucroReal >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-405"
                      )}>
                        {formatCurrency(dre.lucroReal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Contas & Vendas por Pagamento */}
            <div className="space-y-6 md:space-y-8">
              
              {/* 3. Contas a Pagar / Receber */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-705 shadow-sm">
                <div className="border-b border-slate-50 dark:border-slate-700/50 pb-4 mb-6">
                  <h3 className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                    <Calendar size={18} className="text-amber-500" />
                    Compromissos de Hoje
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Agenda e responsabilidades financeiras
                  </p>
                </div>
                
                <div className="space-y-4">
                  
                  {/* Contas a Pagar Hoje */}
                  <div className="p-4 rounded-2xl bg-rose-500/[0.02] dark:bg-rose-950/10 border border-rose-500/10">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertCircle size={13} className="animate-pulse" /> Contas a Pagar Hoje
                      </span>
                      <span className="text-base font-black text-rose-600 dark:text-rose-400">{formatCurrency(contas.aPagarHoje)}</span>
                    </div>
                    {contas.aPagarHojeList.length > 0 ? (
                      <div className="mt-3 space-y-2 pt-2 border-t border-rose-500/5">
                        {contas.aPagarHojeList.slice(0, 3).map(e => (
                          <div key={e.id} className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 dark:text-slate-400 truncate pr-2 font-medium">{e.description}</span>
                            <span className="font-extrabold text-rose-500">{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-1.5">Sem faturas para pagar hoje</p>
                    )}
                  </div>

                  {/* Contas a Receber Hoje */}
                  <div className="p-4 rounded-2xl bg-emerald-500/[0.02] dark:bg-emerald-950/10 border border-emerald-500/10">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Contas a Receber Hoje
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(contas.aReceberHoje)}</span>
                    </div>
                    {contas.aReceberHojeList.length > 0 ? (
                      <div className="mt-3 space-y-2 pt-2 border-t border-emerald-500/5">
                        {contas.aReceberHojeList.slice(0, 3).map(s => (
                          <div key={s.id} className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 dark:text-slate-400 truncate pr-2 font-medium">Venda #{s.id.slice(0,6)}</span>
                            <span className="font-extrabold text-[#10b981]">{formatCurrency(s.total)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-1.5">Sem vendas pendentes hoje</p>
                    )}
                  </div>

                  {/* Contas Vencidas */}
                  <div className={cn(
                    "p-4 rounded-2xl border transition-all flex items-center justify-between",
                    contas.vencidas > 0 
                      ? "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-600"
                      : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 text-slate-500"
                  )}>
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} className={contas.vencidas > 0 ? "text-rose-500" : "text-slate-400"} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Total de Contas Vencidas
                      </span>
                    </div>
                    <span className={cn(
                      "text-base font-black",
                      contas.vencidas > 0 ? "text-rose-700 dark:text-rose-455" : "text-slate-600 dark:text-slate-300"
                    )}>
                      {formatCurrency(contas.vencidas)}
                    </span>
                  </div>

                </div>
              </div>

              {/* 5. Resumo de Vendas por Pagamento */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-705 shadow-sm">
                <div className="border-b border-slate-50 dark:border-slate-700/50 pb-4 mb-6">
                  <h3 className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                    <DollarSign size={18} className="text-brand-blue" />
                    Divisão por Canal de Entrada
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Métodos e canais de faturamento
                  </p>
                </div>
                
                <div className="space-y-4">
                  {salesByPayment.map((item, index) => {
                    const pct = dashboardDetails.totalSalesByPayment > 0 ? (item.amount / dashboardDetails.totalSalesByPayment) * 100 : 0;
                    
                    let IconComponent = Wallet;
                    let colorClass = "bg-indigo-50 border-indigo-100 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400";
                    let progressClass = "bg-indigo-500";
                    
                    const lowerMethod = item.method.toLowerCase();
                    if (lowerMethod.includes('pix')) {
                      IconComponent = Smartphone;
                      colorClass = "bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400";
                      progressClass = "bg-purple-500";
                    } else if (lowerMethod.includes('dinheiro') || lowerMethod.includes('caixa')) {
                      IconComponent = DollarSign;
                      colorClass = "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";
                      progressClass = "bg-emerald-505 bg-emerald-500";
                    } else if (lowerMethod.includes('crédito') || lowerMethod.includes('credito') || lowerMethod.includes('cartão')) {
                      IconComponent = CreditCard;
                      colorClass = "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
                      progressClass = "bg-blue-500";
                    } else if (lowerMethod.includes('débito') || lowerMethod.includes('debito')) {
                      IconComponent = CreditCard;
                      colorClass = "bg-sky-50 border-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400";
                      progressClass = "bg-sky-500";
                    } else if (lowerMethod.includes('fiado')) {
                      IconComponent = Users;
                      colorClass = "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
                      progressClass = "bg-amber-500";
                    }

                    return (
                      <div key={index} className="space-y-2 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all border border-transparent hover:border-slate-50 dark:hover:border-slate-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", colorClass)}>
                              <IconComponent size={16} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{item.method}</span>
                              {item.maquininhas && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mt-0.5">
                                  {item.maquininhas}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <span className="text-xs font-black text-slate-850 dark:text-slate-105">{formatCurrency(item.amount)}</span>
                            <span className="text-[9px] text-slate-400 font-bold bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Progress metric bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-900 h-1 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-300", progressClass)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {salesByPayment.length === 0 && (
                    <div className="py-8 text-center text-slate-400 select-none">
                      <Wallet size={24} className="mx-auto text-slate-300 opacity-60 mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-wider italic">Nenhuma venda registrada.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {activeTab === 'despesas' && (
        <Despesas expenses={expenses} />
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
          products={products}
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
          returns={returns}
        />
      )}

      {activeTab !== 'dashboard' && activeTab !== 'despesas' && activeTab !== 'pagar' && activeTab !== 'receber' && activeTab !== 'fluxo' && activeTab !== 'movimentacao' && activeTab !== 'dre' && (
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
  const colorMap: any = {
    emerald: {
      accent: "from-emerald-400 to-emerald-500",
      iconContainer: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
    },
    rose: {
      accent: "from-rose-400 to-rose-500",
      iconContainer: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
    },
    blue: {
      accent: "from-blue-400 to-blue-500",
      iconContainer: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
    },
    indigo: {
      accent: "from-indigo-400 to-indigo-500",
      iconContainer: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${scheme.accent} opacity-[0.03] rounded-full blur-xl group-hover:scale-150 transition-all duration-500`} />
      
      <div className="flex items-center gap-4">
        <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 ${scheme.iconContainer}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{title}</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 truncate">
            {value}
          </h3>
        </div>
      </div>
      <div className="mt-5 pt-3.5 border-t border-slate-50 dark:border-slate-700/50">
        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors shrink-0 animate-pulse" />
          {trend}
        </p>
      </div>
    </motion.div>
  );
}
