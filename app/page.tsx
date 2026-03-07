'use client';

import React from 'react';
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
  ChevronDown
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

export default function DashboardPage() {
  const { products, sales, customers, expenses, cashMovements, activeRegister, hasPermission } = useERP();

  const today = new Date().toISOString().split('T')[0];
  
  const salesToday = sales.filter(s => s.date.startsWith(today));
  const expensesToday = expenses.filter(e => e.date.startsWith(today));
  
  const revenueToday = salesToday.reduce((acc, sale) => acc + sale.total, 0);
  const expensesTodayTotal = expensesToday.reduce((acc, exp) => acc + exp.amount, 0);
  const profitToday = revenueToday - expensesTodayTotal;

  // Calculate current cash balance
  const currentCashBalance = (activeRegister?.openingBalance || 0) + 
    cashMovements
      .filter(m => m.cashRegisterId === activeRegister?.id)
      .reduce((acc, m) => acc + (m.type === 'suprimento' ? m.amount : -m.amount), 0) +
    sales
      .filter(s => s.cashRegisterId === activeRegister?.id && s.paymentMethod === 'Dinheiro')
      .reduce((acc, s) => acc + s.total, 0);

  const lowStockItems = products.filter(p => p.stock <= p.minStock);

  const [chartData, setChartData] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Generate last 30 days data from real sales and expenses
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    const data = last30Days.map(date => {
      const daySales = sales.filter(s => s.date.startsWith(date));
      const dayExpenses = expenses.filter(e => e.date.startsWith(date));
      
      return {
        name: date.split('-')[2], // Just the day number
        receita: daySales.reduce((acc, s) => acc + s.total, 0),
        despesa: dayExpenses.reduce((acc, e) => acc + e.amount, 0),
      };
    });
    setChartData(data);
  }, [sales, expenses]);

  if (!hasPermission('Dashboard', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <BarChart size={48} className="text-rose-500" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar o Dashboard.</p>
      </div>
    );
  }

  // Calculate payment method distribution
  const paymentMethods = ['Dinheiro', 'Cartão', 'Pix', 'Outros'];
  const methodColors: any = {
    'Dinheiro': '#F9A825',
    'Cartão': '#1E88E5',
    'Pix': '#2BB673',
    'Outros': '#E53935'
  };

  const pieData = paymentMethods.map(method => {
    const methodSales = sales.filter(s => s.paymentMethod === method);
    const totalMethod = methodSales.reduce((acc, s) => acc + s.total, 0);
    const percentage = sales.length > 0 ? (totalMethod / sales.reduce((acc, s) => acc + s.total, 0)) * 100 : 0;
    
    return {
      name: method,
      value: Number(percentage.toFixed(1)),
      color: methodColors[method]
    };
  }).filter(d => d.value > 0);

  // If no sales, show placeholder pie data so it's not empty
  const displayPieData = pieData.length > 0 ? pieData : [
    { name: 'Sem Vendas', value: 100, color: '#E1E5EA' }
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-brand-bg min-h-screen overflow-x-hidden">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl md:text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Receita do Dia" 
          value={formatCurrency(revenueToday)} 
          trend="Dados reais do sistema" 
          positive 
          icon={TrendingUp} 
          color="green"
        />
        <StatCard 
          title="Despesas do Dia" 
          value={formatCurrency(expensesTodayTotal)} 
          trend="Dados reais do sistema" 
          positive={false} 
          icon={CreditCard} 
          color="red"
        />
        <StatCard 
          title="Lucro do Dia" 
          value={formatCurrency(profitToday)} 
          trend="Dados reais do sistema" 
          positive={profitToday >= 0} 
          icon={BarChart} 
          color={profitToday >= 0 ? "green" : "red"}
        />
        <StatCard 
          title="Saldo Atual em Caixa" 
          value={formatCurrency(currentCashBalance)} 
          icon={Wallet} 
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Receita vs Despesas</h4>
            <div className="flex bg-slate-100 rounded-xl p-1 w-fit">
              <button className="px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold text-brand-text-sec hover:text-brand-text-main rounded-lg transition-colors">7 dias</button>
              <button className="px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold bg-brand-blue text-white rounded-lg shadow-sm">30 dias</button>
            </div>
          </div>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2BB673" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2BB673" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E53935" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#E53935" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1E5EA" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7C93'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7C93'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E1E5EA', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff' }}
                />
                <Area type="monotone" dataKey="receita" stroke="#2BB673" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" activeDot={{ r: 6, fill: '#2BB673', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="despesa" stroke="#E53935" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesa)" activeDot={{ r: 6, fill: '#E53935', stroke: '#fff', strokeWidth: 2 }} />
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
            <ResponsiveContainer width="100%" height="100%">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Estoque Baixo</h4>
            <button className="text-xs font-bold text-brand-text-sec hover:text-brand-blue flex items-center gap-1 uppercase italic">
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
            <button className="bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="bg-brand-card p-4 md:p-6 rounded-2xl border border-brand-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Últimas Vendas</h4>
            <button className="text-xs font-bold text-brand-text-sec hover:text-brand-blue flex items-center gap-1 uppercase italic">
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
                  sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(sale => {
                    const customer = customers.find(c => c.id === sale.customerId);
                    return (
                      <tr key={sale.id} className="border-b border-brand-border/50">
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
            <button className="bg-brand-blue hover:bg-brand-blue-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="bg-[#FFFDF5] p-4 md:p-6 rounded-2xl border border-[#FDE68A] shadow-sm flex flex-col">
          <h4 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight mb-6">Alertas</h4>
          <div className="space-y-4 flex-1">
            {lowStockItems.length > 0 && (
              <>
                <div className="flex gap-3">
                  <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-text-main">{lowStockItems.length} produtos estão com estoque baixo</p>
                </div>
                <div className="w-full h-px bg-[#FDE68A]/50"></div>
              </>
            )}
            {currentCashBalance < 0 && (
              <>
                <div className="flex gap-3">
                  <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-brand-text-main">Saldo em caixa está negativo</p>
                </div>
                <div className="w-full h-px bg-[#FDE68A]/50"></div>
              </>
            )}
            {salesToday.length === 0 && (
              <div className="flex gap-3">
                <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
                <p className="text-sm text-brand-text-main">Nenhuma venda registrada hoje até o momento</p>
              </div>
            )}
            {lowStockItems.length === 0 && currentCashBalance >= 0 && salesToday.length > 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp size={32} className="text-brand-green mb-2 opacity-20" />
                <p className="text-sm text-brand-text-sec italic">Tudo sob controle!</p>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button className="bg-white border border-[#FDE68A] hover:bg-[#FEF3C7] text-brand-text-main px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              Ver todas <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
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
