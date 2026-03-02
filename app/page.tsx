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
  ArrowDownRight
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
  Pie
} from 'recharts';
import { AIInsights } from '@/components/AIInsights';


export default function DashboardPage() {
  const { products, sales, customers } = useERP();

  const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
  const lowStockItems = products.filter(p => p.stock <= p.minStock);

  const chartData = React.useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];
      
      const daySales = sales
        .filter(s => s.date.split('T')[0] === dateStr)
        .reduce((acc, s) => acc + s.total, 0);
      
      last7Days.push({ name: dayName, vendas: daySales });
    }
    return last7Days;
  }, [sales]);

  const pieData = React.useMemo(() => {
    const methods: Record<string, number> = {};
    sales.forEach(s => {
      methods[s.paymentMethod] = (methods[s.paymentMethod] || 0) + s.total;
    });

    const total = Object.values(methods).reduce((acc, v) => acc + v, 0);
    const colors = ['#10b981', '#059669', '#34d399', '#064e3b', '#6ee7b7'];

    return Object.entries(methods).map(([name, value], index) => ({
      name,
      value: total > 0 ? Math.round((value / total) * 100) : 0,
      color: colors[index % colors.length]
    }));
  }, [sales]);

  const topProducts = React.useMemo(() => {
    const productSales: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      });
    });

    return Object.entries(productSales)
      .map(([id, quantity]) => ({
        product: products.find(p => p.id === id),
        quantity
      }))
      .filter(item => item.product)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }, [sales, products]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-emerald-950 italic uppercase">Visão Geral</h2>
        <p className="text-emerald-600/60 font-medium">Desempenho da loja em tempo real e principais métricas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Faturamento Total" 
          value={formatCurrency(totalRevenue)} 
          trend="Total Acumulado" 
          positive 
          icon={TrendingUp} 
          color="emerald"
        />
        <StatCard 
          title="Total de Vendas" 
          value={sales.length.toString()} 
          trend="Vendas Realizadas" 
          positive 
          icon={ShoppingBag} 
          color="emerald"
        />
        <StatCard 
          title="Clientes Ativos" 
          value={customers.length.toString()} 
          trend="Base de Clientes" 
          positive 
          icon={BarChart} 
          color="emerald"
        />
        <StatCard 
          title="Estoque Baixo" 
          value={lowStockItems.length.toString()} 
          trend={lowStockItems.length > 0 ? "Reposição Necessária" : "Estoque Saudável"} 
          positive={lowStockItems.length === 0} 
          icon={AlertTriangle} 
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h4 className="text-lg font-black italic uppercase text-emerald-900 mb-6">Vendas por Período (Últimos 7 Dias)</h4>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="100%">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#059669', fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#059669', fontWeight: 600}} />
                  <Tooltip 
                    formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', backgroundColor: '#fff' }}
                  />
                  <Area type="monotone" dataKey="vendas" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorVendas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <AIInsights data={{ products, sales, customers }} />
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h4 className="text-lg font-black italic uppercase text-emerald-900 mb-6">Métodos de Pagamento</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? `${value}%` : ''} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-bold text-emerald-900/60 uppercase italic">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-emerald-900">{item.value}%</span>
                </div>
              ))}
              {pieData.length === 0 && (
                <p className="text-center text-xs text-emerald-600/40 font-bold uppercase italic">Sem dados de vendas</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
            <h4 className="text-lg font-black italic uppercase text-emerald-900 mb-4">Produtos Mais Vendidos</h4>
            <div className="space-y-4">
              {topProducts.map(({ product, quantity }) => (
                <div key={product!.id} className="flex items-center gap-3 p-2 hover:bg-emerald-50 rounded-2xl transition-colors">
                  <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-emerald-100">
                    <Image 
                      src={product!.image} 
                      alt={product!.name}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-emerald-950 truncate uppercase italic">{product!.name}</p>
                    <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-widest">{quantity} unidades vendidas</p>
                  </div>
                  <p className="text-sm font-black text-emerald-600">{formatCurrency(product!.salePrice)}</p>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-center py-4 text-xs text-emerald-600/40 font-bold uppercase italic">Nenhuma venda registrada</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, positive, icon: Icon, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase italic px-3 py-1 rounded-full ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <p className="text-xs font-black text-emerald-900/40 uppercase tracking-widest italic">{title}</p>
      <h3 className="text-3xl font-black mt-1 text-emerald-950">{value}</h3>
    </div>
  );
}
