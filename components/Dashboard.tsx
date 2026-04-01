'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Package,
  CreditCard,
  Activity,
  LayoutGrid,
  ShoppingCart,
  DollarSign,
  Percent,
  Users,
  BarChart3,
  Search,
  Filter,
  Download,
  Printer,
  Share2,
  RefreshCw,
  Clock,
  Target,
  Zap,
  Gauge
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
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'framer-motion';
import { useERP } from '@/lib/context';
import { cn, toLocalDateString } from '@/lib/utils';

export function Dashboard() {
  const { sales, products, expenses, systemUsers, categorias, subcategorias, paymentMethods, hasPermission } = useERP();
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const timer = setTimeout(() => {
      setStartDate(today);
      setEndDate(today);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!startDate || !endDate) return null;

  if (!hasPermission('Dashboard', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <LayoutGrid size={48} className="text-brand-danger" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar o Dashboard.</p>
      </div>
    );
  }

  // Filter data based on date range
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const filteredExpenses = expenses.filter(e => {
    const d = e.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  // Calculate Metrics
  const totalSales = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalTax = filteredSales.reduce((acc, s) => acc + (s.taxAmount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  
  let totalCost = 0;
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.costPrice : 0;
      totalCost += cost * item.quantity;
    });
  });

  const totalProfit = totalSales - totalCost - totalTax - totalExpenses;
  const ticketMedio = totalSales / (filteredSales.length || 1);
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  // Previous Period Data for Trends
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - diffDays);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStartDate = prevStart.toISOString().split('T')[0];
  const prevEndDate = prevEnd.toISOString().split('T')[0];

  const prevFilteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= prevStartDate && d <= prevEndDate;
  });

  const prevFilteredExpenses = expenses.filter(e => {
    const d = e.date.split('T')[0];
    return d >= prevStartDate && d <= prevEndDate;
  });

  const prevTotalSales = prevFilteredSales.reduce((acc, s) => acc + s.total, 0);
  const prevTotalTax = prevFilteredSales.reduce((acc, s) => acc + (s.taxAmount || 0), 0);
  const prevTotalExpenses = prevFilteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  
  let prevTotalCost = 0;
  prevFilteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.costPrice : 0;
      prevTotalCost += cost * item.quantity;
    });
  });

  const prevTotalProfit = prevTotalSales - prevTotalCost - prevTotalTax - prevTotalExpenses;
  const prevTicketMedio = prevFilteredSales.length > 0 ? prevTotalSales / prevFilteredSales.length : 0;
  const prevProfitMargin = prevTotalSales > 0 ? (prevTotalProfit / prevTotalSales) * 100 : 0;

  const profitTrend = prevTotalProfit !== 0 
    ? ((totalProfit - prevTotalProfit) / Math.abs(prevTotalProfit)) * 100 
    : (totalProfit > 0 ? 100 : (totalProfit < 0 ? -100 : 0));
    
  const ticketMedioTrend = prevTicketMedio !== 0 
    ? ((ticketMedio - prevTicketMedio) / prevTicketMedio) * 100 
    : (ticketMedio > 0 ? 100 : 0);
    
  const marginTrend = prevProfitMargin !== 0 
    ? profitMargin - prevProfitMargin 
    : (profitMargin !== 0 ? profitMargin : 0);

  // Category Data Calculation
  const categoryTotals: Record<string, number> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      let catName = 'Outros';
      if (product && product.subcategoria_id) {
        const sub = subcategorias.find(s => s.id === product.subcategoria_id);
        if (sub) {
          const cat = categorias.find(c => c.id === sub.categoria_id);
          if (cat) catName = cat.nome;
        }
      }
      categoryTotals[catName] = (categoryTotals[catName] || 0) + (item.price * item.quantity);
    });
  });

  const colors = ['#1E5EFF', '#00E676', '#2F7BFF', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#6B7C93'];
  const categoryData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));

  // Payment Data Calculation
  const paymentTotals: Record<string, number> = {};
  filteredSales.forEach(sale => {
    const method = paymentMethods.find(m => m.id === sale.paymentMethod);
    const methodName = method ? method.name : (sale.paymentMethod || 'Outros');
    paymentTotals[methodName] = (paymentTotals[methodName] || 0) + sale.total;
  });

  const paymentData = Object.entries(paymentTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value: totalSales > 0 ? Number(((value / totalSales) * 100).toFixed(1)) : 0,
      color: colors[index % colors.length]
    }));

  // Sellers Ranking
  const sellerStats: Record<string, { total: number, volume: number, margin: number }> = {};
  filteredSales.forEach(sale => {
    const seller = systemUsers.find(u => u.id === sale.userId);
    const sellerName = seller?.full_name || seller?.username || 'Sistema';
    if (!sellerStats[sellerName]) {
      sellerStats[sellerName] = { total: 0, volume: 0, margin: 0 };
    }
    sellerStats[sellerName].total += sale.total;
    sellerStats[sellerName].volume += 1;
    
    let saleCost = 0;
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      saleCost += (product ? product.costPrice : item.price * 0.7) * item.quantity;
    });
    const saleMargin = sale.total > 0 ? ((sale.total - saleCost) / sale.total) * 100 : 0;
    sellerStats[sellerName].margin = (sellerStats[sellerName].margin + saleMargin) / 2;
  });

  const sellers = Object.entries(sellerStats)
    .map(([name, stats], index) => ({
      id: index + 1,
      name,
      total: stats.total,
      volume: stats.volume,
      margin: Number(stats.margin.toFixed(1)),
      trend: stats.total > 5000 ? 'up' : 'down'
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return (
    <div className="space-y-8 p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
              <Gauge size={24} />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tight text-brand-text-main">Dashboard Executivo</h1>
          </div>
          <p className="text-brand-text-sec text-sm font-medium ml-13">Visão geral em tempo real da performance do seu negócio.</p>
        </div>

        <div className="flex items-center gap-3 bg-brand-card border border-brand-border p-2 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg rounded-xl border border-brand-border">
            <Calendar size={16} className="text-brand-blue" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs font-black uppercase italic text-brand-text-main focus:ring-0 p-0 w-28"
            />
          </div>
          <span className="text-brand-text-sec font-black italic text-xs">A</span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg rounded-xl border border-brand-border">
            <Calendar size={16} className="text-brand-blue" />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs font-black uppercase italic text-brand-text-main focus:ring-0 p-0 w-28"
            />
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Faturamento Bruto" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSales)}
          trend={`${profitTrend.toFixed(1)}%`}
          positive={profitTrend >= 0}
          icon={DollarSign}
          color="blue"
        />
        <MetricCard 
          label="Lucro Líquido Estimado" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProfit)}
          trend={`${profitTrend.toFixed(1)}%`}
          positive={profitTrend >= 0}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard 
          label="Ticket Médio" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio)}
          trend={`${ticketMedioTrend.toFixed(1)}%`}
          positive={ticketMedioTrend >= 0}
          icon={ShoppingCart}
          color="purple"
        />
        <MetricCard 
          label="Margem de Lucro" 
          value={`${profitMargin.toFixed(1)}%`}
          trend={`${marginTrend.toFixed(1)}%`}
          positive={marginTrend >= 0}
          icon={Percent}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Performance Chart */}
        <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Activity size={20} />
              </div>
              <h3 className="text-lg font-black uppercase italic text-brand-text-main">Desempenho de Vendas</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-blue"></div>
                <span className="text-[10px] font-bold text-brand-text-sec uppercase">Vendas</span>
              </div>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredSales.map((s, i) => ({ name: `Venda ${i+1}`, value: s.total }))}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E5EFF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1E5EFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" hide />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7C93', fontWeight: 600}} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#1E5EFF" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-brand-card border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
              <Target size={20} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-brand-text-main">Vendas por Categoria</h3>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-3">
            {categoryData.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-bold text-brand-text-main">{item.name}</span>
                </div>
                <span className="text-xs font-black text-brand-text-sec">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Sellers and Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Sellers */}
        <div className="bg-brand-card border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Users size={20} />
              </div>
              <h3 className="text-lg font-black uppercase italic text-brand-text-main">Ranking de Vendedores</h3>
            </div>
            <button className="text-xs font-bold text-brand-blue hover:underline">Ver Todos</button>
          </div>

          <div className="space-y-4">
            {sellers.map((seller, index) => (
              <div key={seller.id} className="flex items-center justify-between p-4 bg-brand-bg rounded-2xl border border-brand-border hover:border-brand-blue/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-card flex items-center justify-center text-xs font-black text-brand-text-sec border border-brand-border group-hover:bg-brand-blue group-hover:text-white transition-all">
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-brand-text-main uppercase italic">{seller.name}</h4>
                    <p className="text-[10px] font-bold text-brand-text-sec uppercase">{seller.volume} vendas realizadas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-brand-text-main">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seller.total)}</p>
                  <p className="text-[10px] font-bold text-brand-green uppercase italic">Margem: {seller.margin}%</p>
                </div>
              </div>
            ))}
            {sellers.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-brand-text-sec italic">Nenhuma venda registrada no período.</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-brand-card border border-brand-border rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
              <CreditCard size={20} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-brand-text-main">Meios de Pagamento</h3>
          </div>

          <div className="space-y-6">
            {paymentData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-text-main uppercase italic">{item.name}</span>
                  <span className="text-xs font-black text-brand-blue">{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
            {paymentData.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-brand-text-sec italic">Nenhum pagamento registrado no período.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, positive, icon: Icon, color }: { label: string, value: string, trend: string, positive: boolean, icon: any, color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    green: 'bg-brand-green/10 text-brand-green border-brand-green/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded-[2rem] p-4 md:p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", colorClasses[color])}>
          <Icon size={20} />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase italic",
          positive ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-danger/10 text-brand-danger'
        )}>
          {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {trend}
        </div>
      </div>
      <div className="space-y-1 min-w-0">
        <p className="text-[9px] md:text-[10px] font-black uppercase italic text-brand-text-sec tracking-widest leading-none truncate" title={label}>{label}</p>
        <h4 className="text-base xl:text-lg font-black text-brand-text-main tracking-tight truncate leading-none" title={value}>{value}</h4>
      </div>
    </div>
  );
}
