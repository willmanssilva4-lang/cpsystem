'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useERP } from '@/lib/context';
import { 
  TrendingUp, 
  ShoppingBag, 
  BarChart, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  RotateCcw,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

export default function DashboardPage() {
  const router = useRouter();
  const { products, sales, returns, customers, expenses, cashMovements, activeRegister, hasPermission, employees, lotes } = useERP();

  // Helper to get local date string in YYYY-MM-DD format
  const getLocalDateString = (dateInput: Date | string | undefined | null) => {
    if (!dateInput) return '';
    let date: Date;
    if (typeof dateInput === 'string') {
      // Handle Supabase timestamp format or YYYY-MM-DD
      const normalizedDate = dateInput.includes(' ') ? dateInput.replace(' ', 'T') : dateInput;
      date = new Date(normalizedDate);
      
      // If it's just a date string without time, it might be interpreted as UTC midnight
      // which could shift the day. Let's ensure it's treated as local time if no T or Z.
      if (!normalizedDate.includes('T') && !normalizedDate.includes('Z')) {
        date = new Date(`${normalizedDate}T12:00:00`);
      }
    } else {
      date = dateInput;
    }
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString(new Date());
  
  const salesToday = sales.filter(s => {
    return getLocalDateString(s.date) === today;
  });
  const expensesToday = expenses.filter(e => {
    return getLocalDateString(e.date) === today;
  });
  
  const revenueToday = salesToday.reduce((acc, sale) => acc + sale.total, 0);
  const returnsToday = returns.filter(r => getLocalDateString(r.date) === today);
  const returnsTodayTotal = returnsToday.reduce((acc, r) => acc + r.total, 0);
  const expensesTodayTotal = expensesToday.reduce((acc, exp) => acc + exp.amount, 0);
  
  // Calculate cost of goods sold today
  let costToday = 0;
  salesToday.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.costPrice : 0;
      costToday += cost * item.quantity;
    });
  });

  // Calculate current cash balance (Total Sales + Opening Balance + Supplies - Bleeds)
  // Note: This calculates the total balance of the register, including all payment methods, as requested.
  const currentCashBalance = (activeRegister?.openingBalance || 0) + 
    cashMovements
      .filter(m => m.cashRegisterId === activeRegister?.id)
      .reduce((acc, m) => acc + (m.type === 'suprimento' ? m.amount : -m.amount), 0) +
    sales
      .filter(s => s.cashRegisterId === activeRegister?.id)
      .reduce((acc, s) => acc + s.total, 0);

  const employeeSales = React.useMemo(() => {
    const salesByEmployee: Record<string, number> = {};
    sales.forEach(sale => {
      if (sale.userId) {
        salesByEmployee[sale.userId] = (salesByEmployee[sale.userId] || 0) + sale.total;
      }
    });
    return employees.map(e => ({
      ...e,
      totalSales: salesByEmployee[e.id] || 0
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [sales, employees]);

  const topProductsToday = React.useMemo(() => {
    const productCounts: Record<string, { name: string, quantity: number }> = {};
    
    salesToday.forEach(sale => {
      sale.items.forEach(item => {
        if (!productCounts[item.productId]) {
          const product = products.find(p => p.id === item.productId);
          productCounts[item.productId] = { 
            name: product?.name || 'Produto Desconhecido', 
            quantity: 0 
          };
        }
        productCounts[item.productId].quantity += item.quantity;
      });
    });

    return Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [salesToday, products]);

  const lowStockItems = products.filter(p => p.stock <= p.minStock);

  const expiringLotes = React.useMemo(() => {
    if (!lotes) return [];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(todayDate);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return lotes.filter(lote => {
      if (lote.saldoAtual <= 0) return false;
      if (!lote.validade) return false;
      
      let validadeDate;
      if (lote.validade.includes('T')) {
        validadeDate = new Date(lote.validade);
      } else {
        validadeDate = new Date(`${lote.validade}T12:00:00`);
      }
      
      return validadeDate <= thirtyDaysFromNow;
    });
  }, [lotes]);

  const [chartData, setChartData] = React.useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = React.useState<'hoje' | '7d' | '30d' | 'mes'>('hoje');
  const [showLowStockModal, setShowLowStockModal] = React.useState(false);
  const [showExpiringModal, setShowExpiringModal] = React.useState(false);
  const [showAllSalesModal, setShowAllSalesModal] = React.useState(false);

  // AI Assistant State
  const [messages, setMessages] = React.useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Olá! Sou seu assistente de IA. Como posso ajudar com seu negócio hoje?' }
  ]);
  const [input, setInput] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: 'user',
            parts: [{ text: `
              Você é um assistente de IA especializado em gestão de negócios para um sistema ERP.
              Contexto atual do negócio:
              - Vendas hoje: ${salesToday.length} vendas, total ${formatCurrency(revenueToday)}
              - Devoluções hoje: ${returnsToday.length}, total ${formatCurrency(returnsTodayTotal)}
              - Despesas hoje: ${expensesToday.length}, total ${formatCurrency(expensesTodayTotal)}
              - Saldo em caixa: ${formatCurrency(currentCashBalance)}
              - Produtos com estoque baixo: ${lowStockItems.length}
              - Produtos vencendo em 30 dias: ${expiringLotes.length}
              - Ticket Médio do período: ${formatCurrency(ticketMedio)}
              - Top 3 produtos hoje: ${topProductsToday.slice(0, 3).map(p => `${p.name} (${p.quantity} un)`).join(', ')}

              Responda de forma concisa, profissional e útil em português brasileiro.
              Pergunta do usuário: ${userMessage}
            `}]
          }
        ],
        config: {
          systemInstruction: "Você é um assistente de gestão empresarial prestativo e analítico."
        }
      });

      const text = response.text || "Desculpe, não consegui processar sua solicitação.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error("Erro na IA:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Houve um erro ao processar sua pergunta. Verifique sua conexão ou tente novamente mais tarde." }]);
    } finally {
      setIsTyping(false);
    }
  };

  React.useEffect(() => {
    // Generate data based on period
    let days = 30;
    if (chartPeriod === 'hoje') days = 1;
    else if (chartPeriod === '7d') days = 7;
    else if (chartPeriod === 'mes') {
      days = new Date().getDate();
    }
    
    const lastNDays = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return getLocalDateString(d);
    });

    const data = lastNDays.map(date => {
      const daySales = sales.filter(s => getLocalDateString(s.date) === date);
      const dayExpenses = expenses.filter(e => getLocalDateString(e.date) === date);
      
      return {
        name: date.split('-')[2], // Just the day number
        receita: daySales.reduce((acc, s) => acc + s.total, 0),
        despesa: dayExpenses.reduce((acc, e) => acc + e.amount, 0),
      };
    });
    setChartData(data);
  }, [sales, expenses, chartPeriod]);

  if (!hasPermission('Dashboard', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <BarChart size={48} className="text-rose-500" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar o Dashboard.</p>
      </div>
    );
  }

  // Calculate payment method distribution dynamically
  const methodColors: Record<string, string> = {
    'Dinheiro': '#10B981',
    'Crédito': '#3B82F6',
    'Débito': '#60A5FA',
    'Pix': '#06B6D4',
    'Fiado': '#F59E0B',
    'Voucher': '#8B5CF6',
    'Outros': '#EF4444',
    'Transferência': '#A855F7',
    'Boleto': '#E11D48'
  };

  const uniqueMethods = Array.from(new Set(sales.map(s => s.paymentMethod)));
  
  // Filter sales based on period
  const filteredSales = sales.filter(s => {
    const saleDate = new Date(s.date);
    const now = new Date();
    if (chartPeriod === 'hoje') return getLocalDateString(s.date) === today;
    if (chartPeriod === '7d') return saleDate >= new Date(now.setDate(now.getDate() - 7));
    if (chartPeriod === '30d') return saleDate >= new Date(now.setDate(now.getDate() - 30));
    if (chartPeriod === 'mes') return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    return true;
  });
  
  const revenue = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
  const returnsInPeriod = returns.filter(r => {
    const returnDate = new Date(r.date);
    const now = new Date();
    if (chartPeriod === 'hoje') return getLocalDateString(r.date) === today;
    if (chartPeriod === '7d') return returnDate >= new Date(now.setDate(now.getDate() - 7));
    if (chartPeriod === '30d') return returnDate >= new Date(now.setDate(now.getDate() - 30));
    if (chartPeriod === 'mes') return returnDate.getMonth() === now.getMonth() && returnDate.getFullYear() === now.getFullYear();
    return true;
  });
  const totalReturns = returnsInPeriod.reduce((acc, r) => acc + r.total, 0);
  const ticketMedio = filteredSales.length > 0 ? (revenue - totalReturns) / filteredSales.length : 0;
  
  // Calculate cost of goods sold for the period
  let costOfGoods = 0;
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      costOfGoods += (product ? product.costPrice : 0) * item.quantity;
    });
  });

  // Filter expenses based on period
  const filteredExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    const now = new Date();
    if (chartPeriod === 'hoje') return getLocalDateString(e.date) === today;
    if (chartPeriod === '7d') return expenseDate >= new Date(now.setDate(now.getDate() - 7));
    if (chartPeriod === '30d') return expenseDate >= new Date(now.setDate(now.getDate() - 30));
    if (chartPeriod === 'mes') return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const lucroPeriodo = revenue - costOfGoods - totalExpenses - totalReturns;
  
  const periodText = {
    'hoje': 'Lucro de hoje',
    '7d': 'Lucro dos últimos 7 dias',
    '30d': 'Lucro dos últimos 30 dias',
    'mes': 'Lucro do mês'
  }[chartPeriod];

  const pieData = uniqueMethods.map((method, index) => {
    const methodSales = sales.filter(s => s.paymentMethod === method);
    const totalMethod = methodSales.reduce((acc, s) => acc + s.total, 0);
    const percentage = sales.length > 0 ? (totalMethod / sales.reduce((acc, s) => acc + s.total, 0)) * 100 : 0;
    
    // Generate a distinct color based on index if not in map
    const colors = Object.values(methodColors);
    const color = methodColors[method] || colors[index % colors.length];

    return {
      name: method,
      value: Number(percentage.toFixed(1)),
      color: color
    };
  }).filter(d => d.value > 0);

  // If no sales, show placeholder pie data so it's not empty
  const displayPieData = pieData.length > 0 ? pieData : [
    { name: 'Sem Vendas', value: 100, color: '#E2E8F0' } // Changed placeholder from gray to a lighter blue-gray
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-brand-bg min-h-screen overflow-x-hidden">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl md:text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Dashboard</h2>
      </div>

      <div className="flex gap-2 mb-6">
        {(['hoje', '7d', '30d', 'mes'] as const).map((p) => (
          <button 
            key={p}
            onClick={() => setChartPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase italic transition-colors ${chartPeriod === p ? 'bg-brand-blue text-white' : 'bg-brand-card text-brand-text-sec hover:bg-slate-100'}`}
          >
            {p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Este mês'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Vendas" 
          value={filteredSales.length.toString()} 
          trend="Total de vendas" 
          positive 
          icon={ShoppingBag} 
          color="blue"
        />
        <StatCard 
          title="Faturamento" 
          value={formatCurrency(revenue)} 
          trend="Total faturado" 
          positive 
          icon={TrendingUp} 
          color="green"
        />
        <StatCard 
          title="Devoluções" 
          value={formatCurrency(totalReturns)} 
          trend="Total devolvido" 
          positive={false} 
          icon={RotateCcw} 
          color="red"
        />
        <StatCard 
          title="Lucro" 
          value={formatCurrency(lucroPeriodo)} 
          trend={periodText} 
          positive={lucroPeriodo >= 0} 
          icon={BarChart} 
          color={lucroPeriodo >= 0 ? "green" : "red"}
        />
        <StatCard 
          title="Ticket Médio" 
          value={formatCurrency(ticketMedio)} 
          trend="Valor médio por venda" 
          positive 
          icon={Wallet} 
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Receita vs Despesas</h4>
            <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
              <button 
                onClick={() => setChartPeriod('7d')}
                className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${chartPeriod === '7d' ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-text-sec hover:text-brand-text-main'}`}
              >
                7 dias
              </button>
              <button 
                onClick={() => setChartPeriod('30d')}
                className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${chartPeriod === '30d' ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-text-sec hover:text-brand-text-main'}`}
              >
                30 dias
              </button>
            </div>
          </div>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E676" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7C93'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7C93'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="receita" stroke="#00E676" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" activeDot={{ r: 6, fill: '#00E676', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesa)" activeDot={{ r: 6, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-green"></div>
              <span className="text-sm font-medium text-brand-text-sec">Receita</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-danger"></div>
              <span className="text-sm font-medium text-brand-text-sec">Despesa</span>
            </div>
          </div>
        </div>
        <div className="bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm flex flex-col">
          <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight mb-6">Vendas por Pagamento</h4>
          <div className="h-48 md:h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={displayPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {displayPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-4 mt-6">
            {displayPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between pr-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] sm:text-xs font-medium text-brand-text-sec truncate">{item.name}</span>
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-brand-text-main shrink-0">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por Hora */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
          <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight mb-6">Vendas por Hora</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ReBarChart data={Array.from({length: 24}, (_, i) => ({ hour: `${i}h`, sales: sales.filter(s => new Date(s.date).getHours() === i).length }))}>
                <XAxis dataKey="hour" />
                <Tooltip />
                <Bar dataKey="sales" name="Vendas" fill="#3B82F6" />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Top Produtos */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
          <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight mb-6">Top Produtos do Dia</h4>
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-border text-left text-sm text-brand-text-sec">
                <th className="pb-3">Produto</th>
                <th className="pb-3 text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {topProductsToday.length > 0 ? (
                topProductsToday.map((p, index) => (
                  <tr key={index} className="border-b border-brand-border/50 text-sm">
                    <td className="py-3 text-brand-text-main">{p.name}</td>
                    <td className="py-3 text-right text-brand-text-main font-bold">{p.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-brand-text-sec text-xs italic">
                    Nenhuma venda realizada hoje
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumo Financeiro */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm">
          <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight mb-6">Resumo Financeiro</h4>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span>Saldo em caixa</span><span className="font-bold">{formatCurrency(currentCashBalance)}</span></div>
            <div className="flex justify-between">
              <span>Contas a pagar</span>
              <span className="font-bold text-red-500">
                {formatCurrency(expenses.filter(e => e.status !== 'Pago').reduce((acc, e) => acc + e.amount, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Contas a receber</span>
              <span className="font-bold text-green-500">
                {formatCurrency(sales.filter(s => s.paymentMethod === 'Fiado').reduce((acc, s) => acc + s.total, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Despesas do mês</span>
              <span className="font-bold text-red-500">
                {formatCurrency(expenses.filter(e => {
                  const d = new Date(e.date);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).reduce((acc, e) => acc + e.amount, 0))}
              </span>
            </div>
          </div>
        </div>
        {/* Assistente de IA */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-sm lg:col-span-2 flex flex-col h-[400px]">
          <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
            Assistente de IA
          </h4>
          
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-blue text-white rounded-tr-none' 
                    : 'bg-brand-bg text-brand-text-main rounded-tl-none border border-brand-border'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-brand-bg text-brand-text-main p-3 rounded-2xl rounded-tl-none border border-brand-border text-sm italic">
                  Digitando...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo sobre seu negócio..."
              className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="bg-brand-blue hover:bg-brand-blue-hover text-white p-2 rounded-xl transition-colors disabled:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Estoque Baixo</h4>
            <button 
              onClick={() => setShowLowStockModal(true)}
              className="text-xs font-bold text-brand-text-sec hover:text-brand-blue flex items-center gap-1 uppercase italic"
            >
              Ver todos <ChevronDown size={14} />
            </button>
          </div>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-left border-collapse min-w-[300px]">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="pb-3 text-sm font-medium text-brand-text-sec">Produto</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec text-center">Estoque atual</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec text-center">Minimo</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec"></th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length > 0 ? (
                  lowStockItems.slice(0, 5).map(product => (
                    <tr key={product.id} className="border-b border-brand-border/50">
                      <td className="py-3 text-sm font-medium text-brand-text-main">{product.name}</td>
                      <td className="py-3 text-sm text-brand-text-main text-center">{product.stock}</td>
                      <td className="py-3 text-sm text-brand-text-main text-center">{product.minStock}</td>
                      <td className="py-3 text-right"><ChevronUp size={16} className="text-brand-text-sec inline-block" /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-slate-400 italic">Nenhum item com estoque baixo</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setShowLowStockModal(true)}
              className="bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Últimas Vendas</h4>
            <button 
              onClick={() => setShowAllSalesModal(true)}
              className="text-xs font-bold text-brand-text-sec hover:text-brand-blue flex items-center gap-1 uppercase italic"
            >
              Ver todas <ChevronDown size={14} />
            </button>
          </div>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="pb-3 text-sm font-medium text-brand-text-sec">Venda</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec">Cliente</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec">Valor</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.length > 0 ? (
                  sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3).map((sale, index) => {
                    const customer = customers.find(c => c.id === sale.customerId);
                    return (
                      <tr key={`${sale.id}-${index}`} className="border-b border-brand-border/50">
                        <td className="py-3 text-sm font-medium text-brand-text-main">#{sale.id.substring(0, 8)}</td>
                        <td className="py-3 text-sm text-brand-text-sec">{customer?.name || 'Consumidor Final'}</td>
                        <td className="py-3 text-sm font-medium text-brand-text-main">{formatCurrency(sale.total)}</td>
                        <td className="py-3 text-center"><span className="bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded">Pago</span></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-slate-400 italic">Nenhuma venda realizada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setShowAllSalesModal(true)}
              className="bg-brand-blue hover:bg-brand-blue-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm flex flex-col">
          <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight mb-6">Alertas</h4>
          <div className="space-y-4 flex-1">
            {lowStockItems.length > 0 && (
              <>
                <div className="flex gap-3 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors" onClick={() => setShowLowStockModal(true)}>
                  <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-text-main">{lowStockItems.length} produtos estão com estoque baixo</p>
                </div>
                <div className="w-full h-px bg-brand-border"></div>
              </>
            )}
            {expiringLotes.length > 0 && (
              <>
                <div className="flex gap-3 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors" onClick={() => setShowExpiringModal(true)}>
                  <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-text-main">{expiringLotes.length} lotes de produtos vencendo em breve ou vencidos</p>
                </div>
                <div className="w-full h-px bg-brand-border"></div>
              </>
            )}
            {currentCashBalance < 0 && (
              <>
                <div className="flex gap-3">
                  <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-text-main">Saldo em caixa está negativo</p>
                </div>
                <div className="w-full h-px bg-brand-border"></div>
              </>
            )}
            {salesToday.length === 0 && (
              <div className="flex gap-3">
                <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
                <p className="text-sm text-brand-text-main">Nenhuma venda registrada hoje até o momento</p>
              </div>
            )}
            {lowStockItems.length === 0 && expiringLotes.length === 0 && currentCashBalance >= 0 && salesToday.length > 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp size={32} className="text-brand-green mb-2 opacity-20" />
                <p className="text-sm text-brand-text-sec italic">Tudo sob controle!</p>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button className="bg-white border border-brand-border hover:bg-slate-50 text-brand-text-main px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              Ver todas <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Estoque Baixo</h2>
                  <p className="text-sm text-slate-500 font-medium">{lowStockItems.length} produtos precisam de reposição</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLowStockModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {lowStockItems.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Produto</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">SKU</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">Estoque Atual</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">Mínimo Ideal</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lowStockItems.map(product => (
                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{product.name}</div>
                            <div className="text-xs text-slate-500">{formatCurrency(product.costPrice)} (Custo)</div>
                          </td>
                          <td className="p-4 text-sm text-slate-600 text-center font-mono">{product.sku || '-'}</td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-sm font-bold bg-rose-100 text-rose-700">
                              {product.stock}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-sm font-bold bg-slate-100 text-slate-700">
                              {product.minStock}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {product.stock <= 0 ? (
                              <span className="text-xs font-bold text-rose-600 uppercase">Esgotado</span>
                            ) : (
                              <span className="text-xs font-bold text-amber-600 uppercase">Crítico</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ShoppingBag size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium">Nenhum produto com estoque baixo</p>
                  <p className="text-sm">Seu estoque está em dia!</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowLowStockModal(false)}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  setShowLowStockModal(false);
                  router.push('/produtos');
                }}
                className="px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                Gerenciar Produtos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Lotes Modal */}
      {showExpiringModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Produtos Vencendo</h2>
                  <p className="text-sm text-slate-500 font-medium">{expiringLotes.length} lotes precisam de atenção</p>
                </div>
              </div>
              <button 
                onClick={() => setShowExpiringModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {expiringLotes.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Produto</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">Lote</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">Validade</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">Saldo</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expiringLotes.map(lote => {
                        const product = products.find(p => p.id === lote.productId);
                        
                        let validadeDate;
                        if (lote.validade.includes('T')) {
                          validadeDate = new Date(lote.validade);
                        } else {
                          validadeDate = new Date(`${lote.validade}T12:00:00`);
                        }
                        
                        const todayDate = new Date();
                        todayDate.setHours(0, 0, 0, 0);
                        
                        const isExpired = validadeDate < todayDate;
                        
                        return (
                          <tr key={lote.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{product?.name || 'Produto Desconhecido'}</div>
                            </td>
                            <td className="p-4 text-sm text-slate-600 text-center font-mono">{lote.numeroLote || '-'}</td>
                            <td className="p-4 text-center">
                              <span className="text-sm font-medium text-slate-700">
                                {validadeDate.toLocaleDateString('pt-BR')}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-sm font-bold bg-slate-100 text-slate-700">
                                {lote.saldoAtual}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {isExpired ? (
                                <span className="text-xs font-bold text-rose-600 uppercase">Vencido</span>
                              ) : (
                                <span className="text-xs font-bold text-amber-600 uppercase">Vence em Breve</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ShoppingBag size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium">Nenhum produto vencendo em breve</p>
                  <p className="text-sm">Seus lotes estão em dia!</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowExpiringModal(false)}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  setShowExpiringModal(false);
                  router.push('/produtos');
                }}
                className="px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                Gerenciar Produtos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Sales Modal */}
      {showAllSalesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Todas as Vendas</h2>
                  <p className="text-sm text-slate-500 font-medium">{sales.length} vendas registradas</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAllSalesModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {sales.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Data</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Venda</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Cliente</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                        <th className="p-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale, index) => {
                        const customer = customers.find(c => c.id === sale.customerId);
                        return (
                          <tr key={`${sale.id}-${index}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-sm font-medium text-slate-700">
                              {new Date(sale.date).toLocaleDateString('pt-BR')} {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-4 text-sm font-medium text-slate-700">#{sale.id.substring(0, 8)}</td>
                            <td className="p-4 text-sm text-slate-600">{customer?.name || 'Consumidor Final'}</td>
                            <td className="p-4 text-sm font-bold text-slate-800">{formatCurrency(sale.total)}</td>
                            <td className="p-4 text-center">
                              <span className="bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded">Pago</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ShoppingBag size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium">Nenhuma venda realizada</p>
                  <p className="text-sm">Suas vendas aparecerão aqui.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowAllSalesModal(false)}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, trend, positive, icon: Icon, color }: any) {
  const colors: any = {
    green: "bg-brand-green text-white",
    red: "bg-brand-danger text-white",
    blue: "bg-brand-blue text-white",
  };

  const trendColors = positive ? "text-brand-green" : "text-brand-danger";

  return (
    <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-brand-text-sec mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-brand-text-main">{value}</h3>
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className={`flex items-center font-medium ${trendColors}`}>
            {positive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {trend.split(' ')[0]}
          </span>
          <span className="text-brand-text-sec">{trend.substring(trend.indexOf(' ') + 1)}</span>
        </div>
      )}
    </div>
  );
}
