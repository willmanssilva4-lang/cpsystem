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
  Gauge,
  Monitor
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
import { cn, toLocalDateString, getLocalDateString } from '@/lib/utils';

export function Dashboard() {
  const { sales, products, expenses, systemUsers, categorias, subcategorias, paymentMethods, hasPermission, promotions = [], cashRegisters } = useERP();
  
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

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

  // Helper de cálculo robusto de taxas de vendas
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
          console.error('Error parsing payments json string in Dashboard helper', e);
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
    
    if (totalTax === 0) {
      const t = sale.taxAmount !== undefined ? sale.taxAmount : (sale.tax_amount !== undefined ? sale.tax_amount : 0);
      totalTax = Number(t) || 0;
    }
    
    return totalTax;
  };

  // Filter data based on date range
  const safeToLocalDateString = (dateInput: string) => {
    return toLocalDateString(dateInput);
  };

  const filteredSales = sales.filter(s => {
    const session = cashRegisters.find(r => r.id === s.cashRegisterId);
    const businessDate = session ? safeToLocalDateString(session.openedAt) : safeToLocalDateString(s.date);
    const inRange = businessDate >= startDate && businessDate <= endDate;
    return inRange;
  });

  const filteredExpenses = expenses.filter(e => {
    const d = safeToLocalDateString(e.date);
    const inRange = d >= startDate && d <= endDate;
    return inRange;
  });

  // Calculate Metrics
  const productMap = React.useMemo(() => {
    const map = new Map();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const totalSales = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalTax = filteredSales.reduce((acc, s) => acc + calculateSaleTax(s), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  
  let totalCost = 0;
  filteredSales.forEach(sale => {
    sale.items?.forEach((item: any) => {
      const product = productMap.get(item.productId);
      const cost = item.costPrice && item.costPrice > 0 ? item.costPrice : (product ? product.costPrice : 0);
      totalCost += cost * item.quantity;
    });
  });

  const totalGrossProfit = totalSales - totalCost - totalTax;
  const totalProfit = totalGrossProfit - totalExpenses;
  const ticketMedio = totalSales / (filteredSales.length || 1);
  const profitMargin = totalSales > 0 ? (totalGrossProfit / totalSales) * 100 : 0;

  // Vendas em Oferta
  const totalPromoSales = filteredSales.reduce((acc, s) => {
    const promoItemsTotal = (s.items || [])
      .filter((item: any) => {
        if (item.promotionId) return true;
        
        // Fallback: product is part of an active promotion at the time of sale
        const isPromoProduct = (promotions || []).some((promo: any) => {
          if (promo.status !== 'ACTIVE') return false;
          const promoStart = new Date(promo.start_date || promo.startDate);
          const promoEnd = new Date(promo.end_date || promo.endDate);
          const saleDate = new Date(s.date);
          
          if (saleDate < promoStart || saleDate > promoEnd) return false;
          
          let targets: string[] = [];
          if (typeof promo.target_id === 'string') {
            try {
              targets = JSON.parse(promo.target_id);
            } catch (e) {
              targets = [promo.target_id];
            }
          } else if (Array.isArray(promo.target_id)) {
            targets = promo.target_id;
          } else if (promo.targetId) {
            targets = Array.isArray(promo.targetId) ? promo.targetId : [promo.targetId];
          }
          
          return targets.includes(item.productId);
        });
        
        return isPromoProduct;
      })
      .reduce((itemAcc: number, item: any) => itemAcc + (item.price * item.quantity), 0);
    const subtotal = s.subtotal || (s.total + (s.discount || 0));
    const promoValue = subtotal > 0 ? promoItemsTotal * (s.total / subtotal) : promoItemsTotal;
    
    return acc + promoValue;
  }, 0);

  const promoSalesCount = filteredSales.filter(s => {
    return (s.items || []).some((item: any) => {
      if (item.promotionId) return true;
      
      const isPromoProduct = (promotions || []).some((promo: any) => {
        if (promo.status !== 'ACTIVE') return false;
        const promoStart = new Date(promo.start_date || promo.startDate);
        const promoEnd = new Date(promo.end_date || promo.endDate);
        const saleDate = new Date(s.date);
        
        if (saleDate < promoStart || saleDate > promoEnd) return false;
        
        let targets: string[] = [];
        if (typeof promo.target_id === 'string') {
          try {
            targets = JSON.parse(promo.target_id);
          } catch (e) {
            targets = [promo.target_id];
          }
        } else if (Array.isArray(promo.target_id)) {
          targets = promo.target_id;
        } else if (promo.targetId) {
          targets = Array.isArray(promo.targetId) ? promo.targetId : [promo.targetId];
        }
        
        return targets.includes(item.productId);
      });
      
      return isPromoProduct;
    });
  }).length;

  // Previous Period Data for Trends
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - diffDays);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStartDate = getLocalDateString(prevStart);
  const prevEndDate = getLocalDateString(prevEnd);

  const prevFilteredSales = sales.filter(s => {
    const d = toLocalDateString(s.date);
    return d >= prevStartDate && d <= prevEndDate;
  });

  const prevFilteredExpenses = expenses.filter(e => {
    const d = toLocalDateString(e.date);
    return d >= prevStartDate && d <= prevEndDate;
  });

  const prevTotalSales = prevFilteredSales.reduce((acc, s) => acc + s.total, 0);
  const prevTotalTax = prevFilteredSales.reduce((acc, s) => acc + calculateSaleTax(s), 0);
  const prevTotalExpenses = prevFilteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  
  let prevTotalCost = 0;
  prevFilteredSales.forEach(sale => {
    sale.items?.forEach((item: any) => {
      const product = productMap.get(item.productId);
      const cost = item.costPrice && item.costPrice > 0 ? item.costPrice : (product ? product.costPrice : 0);
      prevTotalCost += cost * item.quantity;
    });
  });

  const prevTotalProfit = prevTotalSales - prevTotalCost - prevTotalTax - prevTotalExpenses;
  const prevTotalGrossProfit = prevTotalSales - prevTotalCost - prevTotalTax;
  const prevTicketMedio = prevFilteredSales.length > 0 ? prevTotalSales / prevFilteredSales.length : 0;
  const prevProfitMargin = prevTotalSales > 0 ? (prevTotalGrossProfit / prevTotalSales) * 100 : 0;

  const salesTrend = prevTotalSales !== 0 
    ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 
    : (totalSales > 0 ? 100 : 0);

  const profitTrend = prevTotalProfit !== 0 
    ? ((totalProfit - prevTotalProfit) / Math.abs(prevTotalProfit)) * 100 
    : (totalProfit > 0 ? 100 : (totalProfit < 0 ? -100 : 0));
    
  const ticketMedioTrend = prevTicketMedio !== 0 
    ? ((ticketMedio - prevTicketMedio) / prevTicketMedio) * 100 
    : (ticketMedio > 0 ? 100 : 0);
    
  const marginTrend = profitMargin - prevProfitMargin;

  const marginTrendPercentage = prevProfitMargin !== 0
    ? ((profitMargin - prevProfitMargin) / Math.abs(prevProfitMargin)) * 100
    : (profitMargin > 0 ? 100 : (profitMargin < 0 ? -100 : 0));

  // Category Data Calculation
  const categoryTotals: Record<string, number> = {};
  filteredSales.forEach(sale => {
    sale.items?.forEach((item: any) => {
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
    const method = paymentMethods.find(m => 
      m.id === sale.paymentMethod || 
      m.name?.toLowerCase() === sale.paymentMethod?.toLowerCase()
    );
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
    sale.items?.forEach((item: any) => {
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

  // Top Products Ranking
  const productStats: Record<string, { total: number, quantity: number, cost: number }> = {};
  filteredSales.forEach(sale => {
    sale.items?.forEach((item: any) => {
      const product = products.find(p => p.id === item.productId);
      const productName = product?.name || 'Produto Desconhecido';
      if (!productStats[productName]) {
        productStats[productName] = { total: 0, quantity: 0, cost: 0 };
      }
      const itemTotal = item.price * item.quantity;
      const itemCost = (product ? product.costPrice : item.price * 0.7) * item.quantity;
      
      productStats[productName].total += itemTotal;
      productStats[productName].quantity += item.quantity;
      productStats[productName].cost += itemCost;
    });
  });

  const topProducts = Object.entries(productStats)
    .map(([name, stats], index) => {
      const profit = stats.total - stats.cost;
      const margin = stats.total > 0 ? (profit / stats.total) * 100 : 0;
      return {
        id: index + 1,
        name,
        total: stats.total,
        quantity: stats.quantity,
        profit: profit,
        margin: Number(margin.toFixed(1))
      };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 3);

  return (
    <div className="space-y-8 p-6 md:p-8 relative bg-brand-bg/50 overflow-x-hidden max-w-full">
      {/* Visual top bar glow effect */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-green/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[1.25rem] bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20 shadow-inner group transition-all duration-300 hover:scale-105">
              <Gauge size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-brand-blue bg-brand-blue/15 px-2 py-0.5 rounded-full leading-none">CONSOLIDADO</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase italic bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Tempo Real
                </span>
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tight text-brand-text-main mt-1">Dashboard Executivo</h1>
            </div>
          </div>
          <p className="text-brand-text-sec text-xs font-semibold ml-15 leading-relaxed">
            Visão gerencial consolidada e análise de performance de faturamento, margem e fluxo de caixa.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <a 
            href="/consulta-preco" 
            className="flex items-center justify-center gap-2.5 px-5 py-3 bg-brand-blue text-white rounded-2xl text-[11px] font-black uppercase italic hover:bg-brand-blue-hover transition-all border border-brand-blue/20 hover:shadow-lg hover:shadow-brand-blue/25 shrink-0"
          >
            <Monitor size={16} />
            Terminal de Consulta
          </a>

          <div className="flex items-center gap-1.5 xs:gap-3 bg-brand-card border border-brand-border p-1.5 xs:p-2 rounded-xl xs:rounded-2xl shadow-sm hover:shadow-md transition-all min-w-0">
            <div className="flex-1 sm:flex-initial flex items-center gap-1 xs:gap-2 px-1.5 py-1 xs:px-3 xs:py-2 bg-brand-bg rounded-lg xs:rounded-xl border border-brand-border transition-all hover:border-slate-300 min-w-0">
              <Calendar size={12} className="text-brand-blue shrink-0 hidden xs:block" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-[9px] xs:text-[11px] font-black uppercase italic text-brand-text-main focus:ring-0 p-0 w-full min-w-0 max-w-[110px] xs:max-w-36 cursor-pointer"
              />
            </div>
            <span className="text-brand-text-sec font-black italic text-[10px] xs:text-xs px-0.5 shrink-0 select-none">A</span>
            <div className="flex-1 sm:flex-initial flex items-center gap-1 xs:gap-2 px-1.5 py-1 xs:px-3 xs:py-2 bg-brand-bg rounded-lg xs:rounded-xl border border-brand-border transition-all hover:border-slate-300 min-w-0">
              <Calendar size={12} className="text-brand-blue shrink-0 hidden xs:block" />
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-[9px] xs:text-[11px] font-black uppercase italic text-brand-text-main focus:ring-0 p-0 w-full min-w-0 max-w-[110px] xs:max-w-36 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid (Dynamic Bento Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 relative z-10">
        <MetricCard 
          label="Faturamento Bruto" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSales)}
          trend={`${salesTrend >= 0 ? '+' : ''}${salesTrend.toFixed(1)}%`}
          positive={salesTrend >= 0}
          icon={DollarSign}
          color="blue"
          subText="Total de vendas brutas"
        />
        <MetricCard 
          label="Lucro Líquido Estimado" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProfit)}
          trend={`${profitTrend >= 0 ? '+' : ''}${profitTrend.toFixed(1)}%`}
          positive={profitTrend >= 0}
          icon={TrendingUp}
          color="green"
          subText="Custos e impostos aplicados"
        />
        <MetricCard 
          label="Ticket Médio" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio)}
          trend={`${ticketMedioTrend >= 0 ? '+' : ''}${ticketMedioTrend.toFixed(1)}%`}
          positive={ticketMedioTrend >= 0}
          icon={ShoppingCart}
          color="purple"
          subText="Faturamento médio por venda"
        />
        <MetricCard 
          label="Margem de Lucro" 
          value={`${profitMargin.toFixed(2).replace('.', ',')}%`}
          trend={`${marginTrend >= 0 ? '+' : ''}${marginTrend.toFixed(2).replace('.', ',')}%`}
          positive={marginTrend >= 0}
          icon={Percent}
          color="orange"
          subText="Retorno líquido gerado"
        />
        <MetricCard 
          label="Vendas em Oferta" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPromoSales)}
          trend={`${promoSalesCount} itens`}
          positive={true}
          icon={Zap}
          color="cyan"
          subText="Total com preço reduzido"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Sales Performance Chart */}
        <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/10">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tight text-brand-text-main">Desempenho de Vendas</h3>
                <p className="text-[10px] font-bold text-brand-text-sec uppercase">Série histórica de transações do período</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-brand-bg px-4 py-2 border border-brand-border rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
                <span className="text-[10px] font-black uppercase italic text-brand-text-main">Venda Individual</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-[10px] font-black uppercase italic text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">
                {filteredSales.length} Pedidos
              </span>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredSales.map((s, i) => ({ name: `Venda #${i+1}`, value: s.total }))}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `R$ ${val}`} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-xl">
                          <p className="text-[10px] font-black uppercase text-slate-400 italic tracking-wider mb-1">Faturamento Eventual</p>
                          <p className="text-sm font-black text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(payload[0].value))}
                          </p>
                          {payload[0].payload.name && (
                            <span className="text-[9px] font-semibold text-slate-500 uppercase block mt-1.5">{payload[0].payload.name}</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorSales)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-brand-card border border-brand-border rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/10">
                <Target size={20} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tight text-brand-text-main">Vendas por Categoria</h3>
                <p className="text-[10px] font-bold text-brand-text-sec uppercase">Representação acúmulo de portfólio</p>
              </div>
            </div>
            
            <div className="h-64 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-xl">
                            <p className="text-[10px] font-black uppercase text-slate-400 italic tracking-wider mb-1">Categoria de Venda</p>
                            <p className="text-xs font-black text-white uppercase italic mb-0.5">{data.name}</p>
                            <p className="text-sm font-black text-brand-green">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(data.value))}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered label inside Pie Chart */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                <span className="text-[10px] font-black text-brand-text-sec uppercase tracking-widest leading-none">TOTAL</span>
                <span className="text-lg font-black text-brand-text-main uppercase italic mt-1 leading-none">
                  {new Intl.NumberFormat('pt-BR', { style: 'decimal' }).format(categoryData.length)} Cat.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-brand-border space-y-2.5">
            {categoryData.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-1 hover:bg-brand-bg rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-black text-brand-text-main uppercase italic truncate max-w-[130px]">{item.name}</span>
                </div>
                <span className="text-xs font-black text-brand-text-sec">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                </span>
              </div>
            ))}
            {categoryData.length === 0 && (
              <div className="text-center py-4 text-xs font-semibold text-brand-text-sec italic">
                Nenhuma categoria registrada.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Sellers and Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Top Products */}
        <div className="bg-brand-card border border-brand-border rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/10">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase italic tracking-tight text-brand-text-main">Ranking de Produtos</h3>
                  <p className="text-[10px] font-bold text-brand-text-sec uppercase">Top 3 mais lucrativos do período</p>
                </div>
              </div>
              <a 
                href="/relatorios" 
                className="text-xs font-black text-brand-blue hover:text-brand-blue-hover uppercase italic bg-brand-blue/10 px-3.5 py-1.5 rounded-xl border border-brand-blue/10 transition-colors"
              >
                Ver Relatórios
              </a>
            </div>

            <div className="space-y-4">
              {topProducts.map((product, index) => {
                const medalColors = [
                  'bg-amber-400 text-amber-950 border-amber-300 shadow-amber-200/50', // Gold
                  'bg-slate-300 text-slate-800 border-slate-200 shadow-slate-100/50', // Silver
                  'bg-amber-700 text-amber-50 border-amber-600 shadow-amber-800/10'   // Bronze
                ];

                return (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-4 bg-brand-bg rounded-[1.5rem] border border-brand-border hover:border-brand-blue/30 transition-all group hover:bg-white"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-[1rem] flex items-center justify-center text-xs font-black border shadow-md transition-transform duration-300 group-hover:scale-110",
                        medalColors[index] || 'bg-slate-100 text-brand-text-sec border-slate-200'
                      )}>
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-brand-text-main uppercase italic truncate max-w-[210px]" title={product.name}>
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-black text-brand-text-sec uppercase bg-slate-200/50 px-2 py-0.5 rounded">
                            {product.quantity} unidades
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-brand-text-main">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.profit)}
                      </p>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase italic bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                        Margem: {product.margin}%
                      </span>
                    </div>
                  </div>
                );
              })}
              {topProducts.length === 0 && (
                <div className="py-12 text-center rounded-2xl border border-dashed border-brand-border bg-brand-bg/50">
                  <p className="text-sm font-semibold text-brand-text-sec italic">Nenhum produto registrado no período.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-brand-card border border-brand-border rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/10">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tight text-brand-text-main">Meios de Pagamento</h3>
                <p className="text-[10px] font-bold text-brand-text-sec uppercase">Distribuição percentual de recebidores</p>
              </div>
            </div>

            <div className="space-y-5">
              {paymentData.map((item, index) => {
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-slate-500'];
                const trackingColor = colors[index % colors.length] || 'bg-brand-blue';

                return (
                  <div key={index} className="space-y-1.5 p-2.5 rounded-2xl hover:bg-brand-bg border border-transparent hover:border-brand-border transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", trackingColor)}></span>
                        <span className="text-xs font-black text-brand-text-main uppercase italic">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">{item.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className={cn("h-full rounded-full transition-all duration-500", trackingColor)}
                      />
                    </div>
                  </div>
                );
              })}
              {paymentData.length === 0 && (
                <div className="py-12 text-center rounded-2xl border border-dashed border-brand-border bg-brand-bg/50">
                  <p className="text-sm font-semibold text-brand-text-sec italic">Nenhum pagamento registrado no período.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  trend, 
  positive, 
  icon: Icon, 
  color, 
  subText 
}: { 
  label: string, 
  value: string, 
  trend: string, 
  positive: boolean, 
  icon: any, 
  color: string, 
  subText?: string 
}) {
  const colorClasses: Record<string, { bg: string, ring: string, icon: string, trendBg: string }> = {
    blue: {
      bg: 'bg-brand-blue/20 text-brand-blue border-brand-blue/30',
      ring: 'hover:border-brand-blue/50 hover:shadow-brand-blue/10',
      icon: 'text-brand-blue',
      trendBg: 'bg-emerald-500/15 text-emerald-600'
    },
    green: {
      bg: 'bg-brand-green/20 text-brand-green border-brand-green/30',
      ring: 'hover:border-brand-green/50 hover:shadow-brand-green/10',
      icon: 'text-brand-green',
      trendBg: 'bg-emerald-500/15 text-emerald-600'
    },
    purple: {
      bg: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
      ring: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
      icon: 'text-purple-500',
      trendBg: 'bg-purple-500/15 text-purple-600'
    },
    orange: {
      bg: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
      ring: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
      icon: 'text-amber-500',
      trendBg: 'bg-amber-500/15 text-amber-500'
    },
    cyan: {
      bg: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30',
      ring: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
      icon: 'text-cyan-500',
      trendBg: 'bg-cyan-500/15 text-cyan-500'
    }
  };

  const scheme = colorClasses[color] || colorClasses.blue;

  return (
    <div className={cn(
      "bg-brand-card border border-brand-border rounded-[2rem] p-5 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden",
      scheme.ring
    )}>
      {/* Dynamic background card element */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-200/5 to-transparent rounded-bl-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shadow-xs", 
          scheme.bg
        )}>
          <Icon size={20} />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase italic border border-transparent",
          positive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15' : 'bg-rose-500/10 text-rose-500 border-rose-500/15'
        )}>
          {positive ? <ArrowUpRight size={11} className="stroke-[3px]" /> : <ArrowDownRight size={11} className="stroke-[3px]" />}
          {trend}
        </div>
      </div>
      <div className="space-y-1.5 min-w-0">
        <p className="text-[10px] font-black uppercase italic text-brand-text-sec tracking-widest leading-none truncate" title={label}>{label}</p>
        <h4 className="text-[20px] font-black text-brand-text-main tracking-tight truncate leading-none pt-0.5" title={value}>{value}</h4>
        {subText && (
          <p className="text-[9px] font-bold text-slate-400 capitalize truncate leading-none pt-1" title={subText}>{subText}</p>
        )}
      </div>
    </div>
  );
}

