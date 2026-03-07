'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useERP } from '@/lib/context';
import { 
  Truck, 
  Plus, 
  FileSearch, 
  History, 
  AlertTriangle, 
  FileText, 
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  XCircle,
  PackageCheck,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// Mock data for charts
const PRICE_HISTORY_DATA = [
  { month: 'Set', price: 4.20 },
  { month: 'Out', price: 4.50 },
  { month: 'Nov', price: 4.30 },
  { month: 'Dez', price: 4.80 },
  { month: 'Jan', price: 5.10 },
  { month: 'Fev', price: 4.90 },
];

const SUPPLIER_PERFORMANCE = [
  { name: 'Ambev', rating: 95, color: '#10b981' },
  { name: 'Nestlé', rating: 88, color: '#10b981' },
  { name: 'Unilever', rating: 72, color: '#f59e0b' },
  { name: 'Coca-Cola', rating: 92, color: '#10b981' },
  { name: 'Distrib. Sol', rating: 45, color: '#ef4444' },
];

// Mock data for the purchasing dashboard
const STATS = [
  { label: 'Pedidos Pendentes', value: '12', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Entradas (Mês)', value: 'R$ 45.200', icon: ArrowDownRight, color: 'text-brand-blue', bg: 'bg-slate-50' },
  { label: 'Abaixo do Estoque', value: '28', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
  { label: 'Fornecedores Ativos', value: '45', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
];

const RECENT_ORDERS = [
  { id: 'PED-001', supplier: 'Ambev S.A.', date: '01/03/2024', total: 'R$ 12.450,00', status: 'Pendente', items: 15 },
  { id: 'PED-002', supplier: 'Nestlé Brasil', date: '28/02/2024', total: 'R$ 8.900,00', status: 'Recebido', items: 24 },
  { id: 'PED-003', supplier: 'Unilever', date: '27/02/2024', total: 'R$ 5.600,00', status: 'Cancelado', items: 8 },
  { id: 'PED-004', supplier: 'Coca-Cola FEMSA', date: '26/02/2024', total: 'R$ 15.200,00', status: 'Recebido', items: 42 },
];

const QUICK_ACTIONS = [
  { label: 'Novo Pedido', icon: Plus, href: '/compras/novo-pedido', description: 'Criar ordem de compra manual' },
  { label: 'Importar XML', icon: FileSearch, href: '/compras/importar-xml', description: 'Entrada por nota fiscal (NF-e)' },
  { label: 'Reposição', icon: PackageCheck, href: '/compras/reposicao', description: 'Sugestão baseada em estoque' },
  { label: 'Cotações', icon: FileText, href: '/compras/cotacoes', description: 'Comparar preços de fornecedores' },
];

export default function PurchasingPage() {
  const { hasPermission } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(STATS);
  const [recentOrders, setRecentOrders] = useState<any[]>(RECENT_ORDERS);
  const [stockAlerts, setStockAlerts] = useState<any[]>([
    { name: 'Arroz Agulhinha 5kg', stock: '2 un.', min: '10 un.' },
    { name: 'Feijão Carioca 1kg', stock: '5 un.', min: '20 un.' },
    { name: 'Óleo de Soja 900ml', stock: '0 un.', min: '12 un.' },
  ]);
  const [topSuppliers, setTopSuppliers] = useState<any[]>([
    { name: 'Ambev S.A.', orders: 12, total: 'R$ 85k' },
    { name: 'Nestlé Brasil', orders: 8, total: 'R$ 62k' },
    { name: 'Unilever', orders: 6, total: 'R$ 45k' },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch stats
        const { count: pendingCount } = await supabase
          .from('purchase_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pendente');

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: monthOrders } = await supabase
          .from('purchase_orders')
          .select('total_amount')
          .eq('status', 'Recebido')
          .gte('order_date', startOfMonth.toISOString());
        
        const monthTotal = monthOrders?.reduce((acc, order) => acc + Number(order.total_amount), 0) || 0;

        const { data: allProducts } = await supabase.from('products').select('id, name, stock, min_stock');
        const belowStockCountActual = allProducts?.filter(p => p.stock < p.min_stock).length || 0;

        const { count: activeSuppliersCount } = await supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true });

        setStats([
          { label: 'Pedidos Pendentes', value: pendingCount?.toString() || '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Entradas (Mês)', value: `R$ ${monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: ArrowDownRight, color: 'text-brand-blue', bg: 'bg-slate-50' },
          { label: 'Abaixo do Estoque', value: belowStockCountActual.toString(), icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Fornecedores Ativos', value: activeSuppliersCount?.toString() || '0', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
        ]);

        // Fetch recent orders
        const { data: ordersData } = await supabase
          .from('purchase_orders')
          .select(`
            id,
            order_date,
            total_amount,
            status,
            suppliers ( name ),
            purchase_order_items ( id )
          `)
          .order('order_date', { ascending: false })
          .limit(5);

        if (ordersData && ordersData.length > 0) {
          setRecentOrders(ordersData.map(order => ({
            id: order.id.substring(0, 8).toUpperCase(),
            supplier: (order.suppliers as any)?.name || 'Desconhecido',
            date: new Date(order.order_date).toLocaleDateString('pt-BR'),
            total: `R$ ${Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            status: order.status,
            items: (order.purchase_order_items as any[])?.length || 0
          })));
        } else {
          setRecentOrders([]);
        }

        // Fetch stock alerts
        if (allProducts && allProducts.length > 0) {
          const alerts = allProducts
            .filter(p => p.stock < p.min_stock)
            .slice(0, 5)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              stock: `${p.stock} un.`,
              min: `${p.min_stock} un.`
            }));
          setStockAlerts(alerts);
        } else {
          setStockAlerts([]);
        }

        // Fetch top suppliers
        const { data: topSuppliersData } = await supabase
          .from('purchase_orders')
          .select(`
            total_amount,
            suppliers ( name )
          `);
        
        if (topSuppliersData && topSuppliersData.length > 0) {
          const supplierStats: Record<string, { orders: number, total: number }> = {};
          topSuppliersData.forEach(order => {
            const name = (order.suppliers as any)?.name || 'Desconhecido';
            if (!supplierStats[name]) {
              supplierStats[name] = { orders: 0, total: 0 };
            }
            supplierStats[name].orders += 1;
            supplierStats[name].total += Number(order.total_amount);
          });

          const sortedSuppliers = Object.entries(supplierStats)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([name, stats]) => ({
              name,
              orders: stats.orders,
              total: `R$ ${(stats.total / 1000).toFixed(1)}k`
            }));
          
          setTopSuppliers(sortedSuppliers);
        } else {
          setTopSuppliers([]);
        }

      } catch (error) {
        console.error('Error fetching purchasing data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (!hasPermission('Compras', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Truck size={48} className="text-rose-500" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar o módulo de Compras.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Central de Compras</h1>
          <p className="text-xs md:text-sm text-brand-blue/60 font-medium font-bold uppercase tracking-widest">Gestão robusta de suprimentos e entradas de mercadorias.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/compras/novo-pedido" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95 text-sm">
            <Plus size={20} />
            Novo Pedido
          </Link>
          <Link href="/compras/importar-xml" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-brand-border text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-50 transition-all active:scale-95 text-sm">
            <FileSearch size={20} />
            Importar XML
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 md:p-6 rounded-[32px] border border-brand-border bg-white hover:border-brand-border transition-all"
          >
            <div className={`${stat.bg} ${stat.color} w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <div className="text-xl md:text-2xl font-black text-brand-text-main italic tracking-tight truncate">{stat.value}</div>
            <div className="text-[10px] text-brand-text-main/40 font-bold uppercase italic tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {QUICK_ACTIONS.map((action, index) => (
          <Link
            key={action.label}
            href={action.href}
            className="group p-4 md:p-6 rounded-[32px] border border-brand-border bg-slate-50/30 hover:bg-brand-blue transition-all"
          >
            <div className="bg-white text-brand-blue p-3 rounded-xl w-fit mb-4 group-hover:bg-brand-blue-hover group-hover:text-white transition-colors">
              <action.icon size={24} />
            </div>
            <div className="text-lg font-black text-brand-text-main uppercase italic tracking-tight group-hover:text-white">{action.label}</div>
            <div className="text-[10px] text-brand-text-main/40 font-bold uppercase italic leading-tight mt-1 group-hover:text-brand-border">{action.description}</div>
          </Link>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Price History Chart */}
        <div className="p-4 md:p-8 rounded-[32px] border border-brand-border bg-white space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 text-brand-blue rounded-2xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Evolução de Custos</h3>
                <p className="text-[10px] font-bold text-brand-text-main/40 uppercase italic">Média ponderada de itens básicos</p>
              </div>
            </div>
            <select className="px-3 py-1 bg-slate-50 border-none rounded-lg text-[10px] font-black uppercase italic text-brand-text-main focus:ring-0 w-full sm:w-auto">
              <option>Últimos 6 Meses</option>
              <option>Último Ano</option>
            </select>
          </div>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PRICE_HISTORY_DATA}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#064e3b', opacity: 0.4 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#064e3b', opacity: 0.4 }}
                  tickFormatter={(value) => `R$ ${value.toFixed(2).replace('.', ',')}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900, fontStyle: 'italic' }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, 'Preço']}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier Performance */}
        <div className="p-4 md:p-8 rounded-[32px] border border-brand-border bg-white space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 text-brand-blue rounded-2xl">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Performance de Fornecedores</h3>
                <p className="text-[10px] font-bold text-brand-text-main/40 uppercase italic">Pontualidade e Qualidade (0-100)</p>
              </div>
            </div>
            <button className="p-2 bg-slate-50 text-brand-text-main rounded-xl hover:bg-brand-border transition-colors w-full sm:w-auto flex justify-center">
              <Filter size={18} />
            </button>
          </div>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SUPPLIER_PERFORMANCE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0fdf4" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#064e3b', opacity: 0.8 }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900, fontStyle: 'italic' }}
                />
                <Bar dataKey="rating" radius={[0, 10, 10, 0]} barSize={20}>
                  {SUPPLIER_PERFORMANCE.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Orders Table */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Pedidos Recentes</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar pedido..."
                  className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-blue-hover w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="p-2 bg-slate-50 text-brand-text-main rounded-xl hover:bg-brand-border transition-colors">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/50 border-bottom border-brand-border">
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Fornecedor</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Data</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Itens</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-brand-text-main italic">{order.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-brand-text-main">{order.supplier}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-brand-text-main/60">{order.date}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-brand-text-main/60">{order.items} un.</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-brand-text-main italic">{order.total}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-tight ${
                          order.status === 'Recebido' ? 'bg-brand-border text-brand-text-main' :
                          order.status === 'Pendente' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {order.status === 'Recebido' && <CheckCircle2 size={12} />}
                          {order.status === 'Pendente' && <Clock size={12} />}
                          {order.status === 'Cancelado' && <XCircle size={12} />}
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-50 text-center">
              <button className="text-[10px] font-black uppercase italic tracking-widest text-brand-blue hover:text-brand-text-main transition-colors">
                Ver todos os pedidos
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info / Alerts */}
        <div className="space-y-6 md:space-y-8">
          {/* Stock Alerts */}
          <div className="p-4 md:p-8 rounded-[32px] bg-rose-50 border border-rose-100 space-y-6">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-black uppercase italic tracking-tight">Alertas de Estoque</h3>
            </div>
            <div className="space-y-4">
              {stockAlerts.map((item, index) => (
                <div key={item.id || item.name || index} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-rose-100 shadow-sm">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-brand-text-main truncate">{item.name}</div>
                    <div className="text-[10px] font-black text-rose-500 uppercase italic">Estoque: {item.stock} / Mín: {item.min}</div>
                  </div>
                  <button className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shrink-0">
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase italic tracking-tight text-xs md:text-sm hover:bg-rose-700 transition-all">
              Gerar Pedido de Reposição
            </button>
          </div>

          {/* Top Suppliers */}
          <div className="p-4 md:p-8 rounded-[32px] border border-brand-border bg-white space-y-6">
            <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Principais Fornecedores</h3>
            <div className="space-y-4">
              {topSuppliers.map((supplier) => (
                <div key={supplier.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-brand-blue font-black italic shrink-0">
                      {supplier.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-brand-text-main group-hover:text-brand-blue transition-colors truncate">{supplier.name}</div>
                      <div className="text-[10px] font-black text-brand-text-main/40 uppercase italic">{supplier.orders} pedidos realizados</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-brand-text-main italic shrink-0">{supplier.total}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
