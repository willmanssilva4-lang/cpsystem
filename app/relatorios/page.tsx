'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Download,
  Filter,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  FileText,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  Printer,
  Share2,
  X,
  Package,
  CreditCard,
  Clock,
  UserCheck,
  History,
  AlertCircle,
  CalendarRange,
  Activity,
  Layers,
  Target,
  Zap,
  PieChart as PieIcon,
  LayoutGrid,
  ShoppingCart,
  DollarSign,
  Percent,
  GitBranch,
  FileDown,
  ArrowRightLeft,
  ClipboardList,
  Truck,
  Calculator,
  BarChartHorizontal,
  Gauge,
  TrendingDown,
  MapPin,
  Bell,
  Settings,
  LayoutDashboard,
  Wallet,
  UserCircle,
  RefreshCw,
  AlertTriangle,
  FileBarChart,
  Bot
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
  Pie,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { useERP } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { cn, toLocalDateString } from '@/lib/utils';
import { SalesByProductReport } from '@/components/reports/SalesByProductReport';
import { SalesReport } from '@/components/reports/SalesReport';

export default function ReportsPage() {
  const { sales, products, customers, companySettings, discountLogs, hasPermission, expenses, subcategorias, categorias, departamentos, systemUsers, suppliers, paymentMethods } = useERP();
  const [activeReport, setActiveReport] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const [selectedReportView, setSelectedReportView] = useState<string | null>(null);
  const [activeCentralTab, setActiveCentralTab] = useState('vendas');
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));

  // Dynamic Data Calculations for Dashboard
  const filteredSales = React.useMemo(() => sales.filter(s => {
    const d = toLocalDateString(s.date);
    return d >= startDate && d <= endDate;
  }), [sales, startDate, endDate]);

  const filteredExpenses = React.useMemo(() => expenses.filter(e => {
    const d = toLocalDateString(e.date);
    return d >= startDate && d <= endDate;
  }), [expenses, startDate, endDate]);

  // Sales Chart Data
  const dynamicSalesData = React.useMemo(() => {
    const chartDataMap = new Map();
    filteredSales.forEach(sale => {
      const d = sale.date.split('T')[0];
      const dateObj = new Date(d);
      dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
      const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}`;
      
      if (!chartDataMap.has(dateStr)) {
        chartDataMap.set(dateStr, { date: dateStr, total: 0, profit: 0 });
      }
      
      let profit = 0;
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cost = product ? product.costPrice : 0;
        profit += (item.price - cost) * item.quantity;
      });
      
      // Subtract machine fees from profit
      profit -= (sale.taxAmount || 0);

      const current = chartDataMap.get(dateStr);
      current.total += sale.total;
      current.profit += profit;
    });

    return Array.from(chartDataMap.values()).sort((a, b) => {
      const [d1, m1] = a.date.split('/');
      const [d2, m2] = b.date.split('/');
      return new Date(2020, Number(m1)-1, Number(d1)).getTime() - new Date(2020, Number(m2)-1, Number(d2)).getTime();
    });
  }, [filteredSales, products]);

  // Category Data
  const { dynamicCategoryData, totalRevenue } = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let revenue = 0;
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        let category = 'Outros';
        if (product && product.subcategoria_id) {
          const sub = subcategorias.find(s => s.id === product.subcategoria_id);
          if (sub) {
            const cat = categorias.find(c => c.id === sub.categoria_id);
            if (cat) category = cat.nome;
          }
        }
        const itemTotal = item.price * item.quantity;
        categoryTotals[category] = (categoryTotals[category] || 0) + itemTotal;
        revenue += itemTotal;
      });
    });

    const data = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      percentage: revenue > 0 ? (value / revenue) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    return { dynamicCategoryData: data, totalRevenue: revenue };
  }, [filteredSales, products, subcategorias, categorias]);

  const colors = ['#00E676', '#22C55E', '#10B981', '#34D399', '#6EE7B7', '#047857', '#064E3B'];

  // Top Products Data
  const dynamicTopProducts = React.useMemo(() => {
    const productStats: Record<string, { qty: number, total: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = { qty: 0, total: 0 };
        }
        productStats[item.productId].qty += item.quantity;
        productStats[item.productId].total += item.price * item.quantity;
      });
    });

    return Object.entries(productStats)
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        return {
          name: product ? product.name : 'Produto Desconhecido',
          sales: `${stats.qty} un`,
          revenue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.total),
          growth: '-',
          total: stats.total
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredSales, products]);

  // Dados reais por semana para o gráfico de projeção/histórico
  const projectionData = React.useMemo(() => {
    return [0, 1, 2, 3].map(i => {
      const start = new Date(startDate);
      start.setDate(start.getDate() + (i * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      
      const weekSales = filteredSales.filter(s => {
        const d = new Date(s.date);
        return d >= start && d < end;
      }).reduce((acc, s) => acc + s.total, 0);
      
      const weekExpenses = filteredExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= start && d < end;
      }).reduce((acc, e) => acc + e.amount, 0);
      
      return {
        name: `Semana ${i + 1}`,
        inflows: weekSales,
        outflows: weekExpenses,
        balance: weekSales - weekExpenses
      };
    });
  }, [filteredSales, filteredExpenses, startDate]);

  // Accounts Payable/Receivable
  const accounts = [
    ...filteredExpenses.slice(0, 3).map(e => ({
      type: 'Pagar',
      desc: e.description,
      date: new Date(e.date).toLocaleDateString('pt-BR'),
      value: e.amount,
      status: 'Em Dia'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [selectedCategory, setSelectedCategory] = useState('vendas');
  const [searchTerm, setSearchTerm] = useState('');

  const reportCategories = [
    { id: 'vendas', label: 'Vendas', icon: TrendingUp },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'fiscal', label: 'Fiscal', icon: FileText },
    { id: 'gerencial', label: 'Gerencial', icon: LayoutGrid },
  ];

  const allReports = [
    { id: 'dash_exec', category: 'gerencial', title: 'Dashboard Executivo', description: 'Visão geral de desempenho, lucro e KPIs principais.', icon: Gauge },
    { id: 'vendas_periodo', category: 'vendas', title: 'Vendas por Período', description: 'Detalhamento de vendas brutas, líquidas e ticket médio.', icon: Calendar },
    { id: 'vendas_produto', category: 'vendas', title: 'Vendas por Produto', description: 'Ranking de produtos mais vendidos por volume e receita.', icon: ShoppingCart },
    { id: 'vendas_vendedor', category: 'vendas', title: 'Vendas por Vendedor', description: 'Ranking de performance e comissões da equipe.', icon: Users },
    { id: 'vendas_categoria', category: 'vendas', title: 'Vendas por Categoria', description: 'Análise de mix de produtos e categorias mais vendidas.', icon: PieChartIcon },
    { id: 'vendas_hora', category: 'vendas', title: 'Vendas por Hora', description: 'Identificação de horários de pico e fluxo de clientes.', icon: Clock },
    { id: 'comissoes', category: 'vendas', title: 'Comissões de Vendedores', description: 'Cálculo detalhado de comissões por período.', icon: DollarSign },
    { id: 'fluxo_caixa', category: 'financeiro', title: 'Fluxo de Caixa', description: 'Projeção de entradas e saídas para os próximos meses.', icon: Activity },
    { id: 'contas_pagar', category: 'financeiro', title: 'Contas a Pagar', description: 'Relatório de compromissos financeiros e vencimentos.', icon: CreditCard },
    { id: 'relatorio_compras', category: 'financeiro', title: 'Relatório de Compras', description: 'Análise de compras, fornecedores e custos de reposição.', icon: ShoppingBag },
    { id: 'giro_estoque', category: 'estoque', title: 'Giro de Estoque', description: 'Velocidade de saída dos produtos e necessidade de reposição.', icon: RefreshCw },
    { id: 'estoque_critico', category: 'estoque', title: 'Estoque Crítico', description: 'Produtos abaixo do nível mínimo de segurança.', icon: AlertTriangle },
    { id: 'validade_lotes', category: 'estoque', title: 'Validade de Lotes', description: 'Acompanhamento de vencimentos e lotes próximos da validade.', icon: Calendar },
    { id: 'dre', category: 'gerencial', title: 'DRE Gerencial', description: 'Demonstrativo de resultados, impostos e lucro líquido.', icon: FileBarChart },
    { id: 'abc_clientes', category: 'gerencial', title: 'Curva ABC de Clientes', description: 'Classificação de clientes por volume de compras e fidelidade.', icon: Target },
    { id: 'meios_pagamento', category: 'vendas', title: 'Relatório de Meios de Pagamento (Análise Profunda)', description: 'Detalhamento de vendas por forma de pagamento e taxas.', icon: CreditCard },
    { id: 'estorno_devolucao', category: 'financeiro', title: 'Relatório de Estorno e Devolução', description: 'Monitoramento de estornos e devoluções realizadas.', icon: RefreshCw },
    { id: 'relatorio_custo', category: 'financeiro', title: 'Relatório de Custo', description: 'Análise detalhada dos custos de aquisição e CMV.', icon: Calculator },
    { id: 'lucro_estoque', category: 'estoque', title: 'Relatório de Lucro no Estoque', description: 'Projeção de lucro bruto baseado no saldo atual de estoque.', icon: TrendingUp },
  ];

  const filteredReports = allReports.filter(r => 
    r.category === selectedCategory && 
    (r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!hasPermission('Relatórios', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <BarChart3 size={48} className="text-brand-danger" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para visualizar os Relatórios.</p>
      </div>
    );
  }

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExport = async () => {
    setIsLoading(true);
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    showToast('Relatório exportado com sucesso! Verifique seus downloads.');
  };

  const handleAction = (action: string) => {
    showToast(`Iniciando ${action}...`, 'info');
  };

  const handleReportClick = (reportName: string) => {
    showToast(`Gerando relatório: ${reportName}...`, 'info');
    setIsLoading(true);
    setTimeout(() => {
      setSelectedReportView(reportName);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Report Viewer Modal */}
      {selectedReportView && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedReportView(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-6xl h-[85vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                {selectedReportView !== 'Catálogo' && (
                  <button 
                    onClick={() => {
                      setSelectedReportView('Catálogo');
                      const today = new Date().toISOString().split('T')[0];
                      setStartDate(today);
                      setEndDate(today);
                    }}
                    className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all mr-2"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {selectedReportView === 'Catálogo' ? 'Catálogo de Relatórios' : selectedReportView}
                  </h3>
                  <p className="text-xs font-medium text-slate-400">
                    {selectedReportView === 'Catálogo' 
                      ? 'Selecione um relatório para visualizar os dados detalhados' 
                      : `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {selectedReportView !== 'Catálogo' && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                    <Calendar size={16} className="text-slate-400" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 p-0"
                    />
                    <span className="text-slate-300 text-xs font-bold">a</span>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 p-0"
                    />
                  </div>
                )}
                {selectedReportView === 'Catálogo' && (
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar relatório..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
                    />
                  </div>
                )}
                <button 
                  onClick={() => setSelectedReportView(null)}
                  className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {selectedReportView === 'Catálogo' ? (
                <>
                  {/* Sidebar Categories */}
                  <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-6 space-y-2 overflow-y-auto">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Categorias</p>
                    {reportCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                          selectedCategory === cat.id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                            : 'text-slate-500 hover:bg-white hover:text-blue-600'
                        }`}
                      >
                        <cat.icon size={18} />
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Reports Grid */}
                  <div className="flex-1 p-10 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredReports.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => {
                            if (report.id === 'dash_exec') {
                              setSelectedReportView(null); // Already on dashboard
                            } else {
                              handleReportClick(report.title);
                            }
                          }}
                          className="group p-6 rounded-3xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left flex flex-col gap-4"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <report.icon size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{report.title}</h4>
                            <p className="text-[11px] font-medium text-slate-400 mt-1 leading-relaxed">{report.description}</p>
                          </div>
                        </button>
                      ))}
                      {filteredReports.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                          <p className="text-sm font-medium text-slate-400 italic">Nenhum relatório encontrado nesta categoria.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-10">
                  {selectedReportView === 'Vendas por Período' && <SalesReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'DRE Gerencial' && <DreReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Giro de Estoque' && <StockTurnoverReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Curva ABC de Clientes' && <AbcCustomersReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Comissões de Vendedores' && <CommissionsReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Vendas por Vendedor' && <SalesBySellerReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Vendas por Produto' && <SalesByProductReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Vendas por Categoria' && <SalesByCategoryReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Vendas por Hora' && <SalesByHourReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Estoque Crítico' && <CriticalStockReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Validade de Lotes' && <ExpiryReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Relatório de Meios de Pagamento (Análise Profunda)' && <SalesByPaymentReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Relatório de Estorno e Devolução' && <EstornoDevolucaoReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Relatório de Custo' && <CostReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Relatório de Compras' && <PurchasesReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Relatório de Lucro no Estoque' && <StockProfitReport />}
                  {selectedReportView === 'Fluxo de Caixa' && (
                    <div className="space-y-6">
                      <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100 text-center">
                        <Activity size={48} className="mx-auto text-blue-600 mb-4" />
                        <h4 className="text-xl font-bold text-slate-800">Fluxo de Caixa Detalhado</h4>
                        <p className="text-sm text-slate-500 mt-2">Este relatório está sendo gerado com base nas projeções de vendas e despesas fixas.</p>
                      </div>
                      <div className="h-80 w-full bg-white rounded-3xl border border-slate-100 p-6">
                        <ResponsiveContainer id="rel-proj-bar-main-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                          <BarChart data={projectionData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7C93', fontWeight: 600}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7C93', fontWeight: 600}} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)} />
                            <Tooltip formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)} />
                            <Legend formatter={(value) => value === 'inflows' ? 'Entradas' : 'Saídas'} />
                            <Bar dataKey="inflows" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="outflows" name="Saídas" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {selectedReportView === 'Contas a Pagar' && (
                    <div className="space-y-6">
                      <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-center">
                        <CreditCard size={48} className="mx-auto text-slate-400 mb-4" />
                        <h4 className="text-xl font-bold text-slate-800">Contas a Pagar e Receber</h4>
                        <p className="text-sm text-slate-500 mt-2">Listagem completa de títulos em aberto para os próximos 30 dias.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                              <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                              <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</th>
                              <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                              <th className="pb-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {accounts.map((a, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 text-[11px] font-bold text-slate-700">{a.type}</td>
                                <td className="py-4 text-[11px] font-bold text-slate-700">{a.desc}</td>
                                <td className="py-4 text-[11px] font-bold text-slate-700">{a.date}</td>
                                <td className="py-4 text-[11px] font-bold text-slate-700">R$ {a.value.toLocaleString('pt-BR')}</td>
                                <td className="py-4 text-right">
                                  <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${a.status === 'Em Dia' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {!['Vendas por Período', 'DRE Gerencial', 'Giro de Estoque', 'Curva ABC de Clientes', 'Comissões de Vendedores', 'Vendas por Produto', 'Vendas por Categoria', 'Vendas por Hora', 'Estoque Crítico', 'Validade de Lotes', 'Fluxo de Caixa', 'Contas a Pagar', 'Relatório de Estorno e Devolução', 'Relatório de Custo', 'Relatório de Compras', 'Relatório de Lucro no Estoque'].includes(selectedReportView) && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <FileText size={40} />
                      </div>
                      <h4 className="text-xl font-bold text-slate-800">Relatório em Processamento</h4>
                      <p className="text-slate-400 max-w-md">Este relatório está sendo compilado com base nos dados mais recentes do sistema.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content: Advanced Performance Dashboard */}
      <AdvancedPerformanceDashboard startDate={startDate} endDate={endDate} />

      {/* Floating Action Button to open Report Catalog */}
      <button 
        onClick={() => setSelectedReportView('Catálogo')}
        className="fixed bottom-8 right-8 p-5 bg-[#1E5EFF] text-white rounded-full shadow-2xl hover:scale-110 transition-all z-50 group"
      >
        <LayoutGrid size={28} />
        <span className="absolute right-full mr-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
          Catálogo de Relatórios
        </span>
      </button>

      {/* Toast Notification */}
      {notification && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl font-black uppercase italic text-sm flex items-center gap-3 border ${
            notification.type === 'success' 
              ? 'bg-brand-blue text-white border-brand-blue-hover' 
              : 'bg-brand-text-main text-brand-text-sec border-brand-text-main'
          }`}
        >
          <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-brand-border' : 'bg-brand-text-sec'}`}></div>
          {notification.message}
        </motion.div>
      )}
    </div>
  );
}

function MetricRow({ label, value, trend, positive }: { label: string, value: string, trend: string, positive: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
      <div>
        <p className="text-[10px] font-black uppercase italic text-brand-text-sec/60 tracking-widest">{label}</p>
        <h5 className="text-xl font-black">{value}</h5>
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase italic px-2 py-1 rounded-full ${positive ? 'bg-brand-blue-hover/20 text-brand-text-sec' : 'bg-brand-danger/20 text-brand-danger'}`}>
        {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
        {trend}
      </div>
    </div>
  );
}

function ReportCard({ title, description, icon: Icon, onClick }: { title: string, description: string, icon: any, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col p-5 rounded-[2rem] bg-slate-50 border border-transparent hover:border-brand-blue/20 hover:bg-white hover:shadow-xl hover:shadow-brand-blue/5 transition-all text-left group"
    >
      <div className="size-12 rounded-2xl bg-white flex items-center justify-center text-brand-blue mb-4 shadow-sm group-hover:bg-brand-blue group-hover:text-white transition-all">
        <Icon size={24} />
      </div>
      <div className="space-y-1">
        <h5 className="text-xs font-black text-brand-text-main uppercase italic group-hover:text-brand-blue transition-colors leading-tight">{title}</h5>
        <p className="text-[9px] font-medium text-brand-blue/60 line-clamp-2 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

function ReportLink({ title, description, onClick }: { title: string, description: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group"
    >
      <div className="min-w-0">
        <h5 className="text-sm font-black text-brand-text-main uppercase italic group-hover:text-brand-blue transition-colors">{title}</h5>
        <p className="text-[10px] font-medium text-brand-blue/60 truncate">{description}</p>
      </div>
      <ChevronRight size={16} className="text-brand-border group-hover:text-brand-blue-hover transition-colors" />
    </button>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-3 bg-white rounded-2xl border border-brand-border hover:border-brand-border transition-all group"
    >
      <Icon size={18} className="text-brand-border group-hover:text-brand-blue transition-colors" />
      <span className="text-[8px] font-black uppercase italic text-brand-text-main/40">{label}</span>
    </button>
  );
}

// --- Advanced Performance Dashboard Component ---
function AdvancedPerformanceDashboard({ startDate: initialStartDate, endDate: initialEndDate }: { startDate: string, endDate: string }) {
  const { sales, products, expenses, systemUsers, categorias, subcategorias, paymentMethods } = useERP();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [reportType, setReportType] = useState('Relatório de Vendas');
  
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

  const methodColors: Record<string, string> = {
    'Dinheiro': '#10B981',
    'Crédito': '#6366F1',
    'Débito': '#0EA5E9',
    'Pix': '#F43F5E',
    'Fiado': '#8B5CF6',
    'Voucher': '#F59E0B',
    'Outros': '#64748B'
  };

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

  // Dados reais por semana para o gráfico de projeção/histórico
  const secondProjectionData = React.useMemo(() => {
    return [0, 1, 2, 3].map(i => {
      const start = new Date(startDate);
      start.setDate(start.getDate() + (i * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      
      const weekSales = sales.filter(s => {
        const d = new Date(s.date);
        const dateStr = toLocalDateString(s.date);
        return dateStr >= startDate && dateStr <= endDate && d >= start && d < end;
      }).reduce((acc, s) => acc + s.total, 0);
      
      const weekExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        const dateStr = toLocalDateString(e.date);
        return dateStr >= startDate && dateStr <= endDate && d >= start && d < end;
      }).reduce((acc, e) => acc + e.amount, 0);
      
      return {
        name: `Semana ${i + 1}`,
        inflows: weekSales,
        outflows: weekExpenses,
        balance: weekSales - weekExpenses
      };
    });
  }, [sales, expenses, startDate, endDate]);

  // Accounts Payable/Receivable
  const accounts = [
    ...filteredExpenses.slice(0, 3).map(e => ({
      type: 'Pagar',
      desc: e.description,
      date: new Date(e.date).toLocaleDateString('pt-BR'),
      value: e.amount,
      status: 'Em Dia'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Stock Metrics
  const totalProductsInStock = products.reduce((acc, p) => acc + (p.stock > 0 ? 1 : 0), 0);
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);
  const lowStockProductsCount = products.filter(p => p.stock <= p.minStock && p.has_had_stock).length;

  return (
    <div className="space-y-6 bg-[#f8fafc] -m-8 p-8 min-h-full font-sans">
      <div className="flex flex-col gap-6">
        {/* Header with Filters */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-[#1e293b]">Relatórios Avançados de Desempenho</h2>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                <Download size={14} className="text-blue-600" />
                Exportar Excel
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                <Printer size={14} className="text-blue-600" />
                Imprimir Dashboard
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Relatório</label>
              <div className="relative">
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                >
                  <option value="Relatório de Vendas">Relatório de Vendas</option>
                  <option value="Relatório Financeiro">Relatório Financeiro</option>
                  <option value="Relatório de Estoque">Relatório de Estoque</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
              <div className="relative">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data Fim</label>
              <div className="relative">
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Metrics Row - 3 Cards like the image */}
        {(reportType === 'Relatório de Vendas' || reportType === 'Relatório Financeiro') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lucro Líquido Acumulado</p>
              <div className="mt-1">
                <h3 className="text-xl md:text-2xl font-black text-brand-text-main truncate leading-none">R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 ${profitTrend >= 0 ? 'text-brand-green' : 'text-brand-danger'}`}>
                  {profitTrend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{Math.abs(profitTrend).toFixed(1)}% vs período anterior</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ticket Médio por Venda</p>
              <div className="mt-1">
                <h3 className="text-xl md:text-2xl font-black text-brand-text-main truncate leading-none">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 ${ticketMedioTrend >= 0 ? 'text-brand-green' : 'text-brand-danger'}`}>
                  {ticketMedioTrend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{Math.abs(ticketMedioTrend).toFixed(1)}% vs período anterior</span>
                </div>
              </div>
            </div>
   
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Margem de Lucro Bruta</p>
              <div className="mt-1">
                <h3 className="text-xl md:text-2xl font-black text-brand-text-main truncate leading-none">{profitMargin.toFixed(1)}%</h3>
                <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 ${marginTrend >= 0 ? 'text-brand-green' : 'text-brand-danger'}`}>
                  {marginTrend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{Math.abs(marginTrend).toFixed(1)}% vs período anterior</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportType === 'Relatório de Estoque' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total de Produtos em Estoque</p>
              <div className="mt-1">
                <h3 className="text-xl md:text-2xl font-black text-brand-text-main truncate leading-none">{totalProductsInStock}</h3>
                <div className="flex items-center gap-1 text-[10px] font-bold mt-2 text-slate-500">
                  <Package size={12} />
                  <span>Produtos únicos com saldo</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Valor Total em Estoque</p>
              <div className="mt-1">
                <h3 className="text-xl md:text-2xl font-black text-brand-text-main truncate leading-none">R$ {totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                <div className="flex items-center gap-1 text-[10px] font-bold mt-2 text-slate-500">
                  <DollarSign size={12} />
                  <span>Baseado no preço de custo</span>
                </div>
              </div>
            </div>
   
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Produtos com Estoque Baixo</p>
              <div className="mt-1">
                <h3 className="text-xl md:text-2xl font-black text-brand-text-main truncate leading-none">{lowStockProductsCount}</h3>
                <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 ${lowStockProductsCount > 0 ? 'text-brand-danger' : 'text-brand-green'}`}>
                  {lowStockProductsCount > 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                  <span>{lowStockProductsCount > 0 ? 'Atenção necessária' : 'Estoque saudável'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts & Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Vendas por Categoria - Left Column */}
          {(reportType === 'Relatório de Vendas' || reportType === 'Relatório de Estoque') && (
            <div className="lg:col-span-5 bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-bold text-[#1e293b]">Vendas por Categoria e Subcategoria (Mês)</h4>
                <PieIcon size={16} className="text-slate-300" />
              </div>
              <div className="flex-1 flex items-center justify-between gap-4">
                <div className="h-64 w-1/2">
                  <ResponsiveContainer id="rel-cat-pie-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(value: any) => `${value}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {categoryData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[11px] font-bold text-slate-500 truncate max-w-[120px]">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Desempenho por Assistente IA - Right Column */}
          {reportType === 'Relatório de Vendas' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-bold text-[#1e293b]">Desempenho por Assistente IA</h4>
                <Bot size={16} className="text-slate-300" />
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assistente IA</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Vendas (R$)</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume Vendas</th>
                      <th className="pb-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margem Média (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sellers.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 text-[11px] font-bold text-slate-700">{idx + 1}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">{s.name}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">
                          R$ {s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          <TrendingUp size={12} className="inline ml-1 text-brand-green" />
                        </td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">{s.volume}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[11px] font-bold text-slate-700">{s.margin}%</span>
                            {s.margin > 25 ? <TrendingUp size={12} className="text-brand-green" /> : <TrendingDown size={12} className="text-brand-danger" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Produtos com Estoque Baixo - Right Column */}
          {reportType === 'Relatório de Estoque' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-bold text-[#1e293b]">Produtos com Estoque Baixo</h4>
                <Package size={16} className="text-slate-300" />
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produto</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estoque Atual</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estoque Mínimo</th>
                      <th className="pb-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.filter(p => p.stock <= p.minStock && p.has_had_stock).slice(0, 6).map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 text-[11px] font-bold text-slate-700 truncate max-w-[200px]">{p.name}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">{p.stock}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">{p.minStock}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${
                            p.stock === 0 ? 'bg-brand-danger text-white' : 'bg-brand-warning text-white'
                          }`}>
                            {p.stock === 0 ? 'Sem Estoque' : 'Baixo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {products.filter(p => p.stock <= p.minStock && p.has_had_stock).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-slate-500 italic">Nenhum produto com estoque baixo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Projeção de Fluxo de Caixa - Full Width */}
          {reportType === 'Relatório Financeiro' && (
            <div className="lg:col-span-12 bg-white p-7 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-sm font-bold text-[#1e293b]">Projeção de Fluxo de Caixa Próximas 4 Semanas</h4>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#00E676]"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entradas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#EF4444]"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saídas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#1E5EFF]"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projeção</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-[#1E5EFF] bg-white"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo de Caixa</span>
                  </div>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer id="rel-proj-bar-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                  <BarChart data={secondProjectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7C93', fontWeight: 600}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7C93', fontWeight: 600}} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)} />
                    <Tooltip 
                      cursor={{fill: '#F3F4F6'}} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                      formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)}
                    />
                    <Bar name="Entradas" dataKey="inflows" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar name="Saídas" dataKey="outflows" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={40} />
                    <Line name="Saldo" type="monotone" dataKey="balance" stroke="#6366F1" strokeWidth={3} dot={{ r: 5, fill: '#fff', stroke: '#6366F1', strokeWidth: 2 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Meios de Pagamento - Bottom Left */}
          {(reportType === 'Relatório de Vendas' || reportType === 'Relatório Financeiro') && (
            <div className="lg:col-span-5 bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-bold text-[#1e293b]">Relatório de Meios de Pagamento (Análise Profunda)</h4>
                <CreditCard size={16} className="text-slate-300" />
              </div>
              <div className="flex-1 flex items-center justify-between gap-6">
                <div className="h-56 w-1/2">
                  <ResponsiveContainer id="rel-pay-pie-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={85}
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(value: any) => `${value}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4">
                  {paymentData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[11px] font-bold text-slate-500">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center gap-6 mt-6">
                {paymentData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contas a Pagar e Receber - Bottom Right */}
          {reportType === 'Relatório Financeiro' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-bold text-[#1e293b]">Análise de Contas a Pagar e Receber (Próximos 30 Dias)</h4>
                <Calendar size={16} className="text-slate-300" />
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição/Fornecedor/Cliente</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor (R$)</th>
                      <th className="pb-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accounts.length > 0 ? accounts.map((a, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 text-[11px] font-bold text-slate-700">{a.type}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700 truncate max-w-[180px]">{a.desc}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">{a.date}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">R$ {a.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 text-right">
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase ${
                            a.status === 'Em Dia' ? 'bg-brand-green text-white' : 'bg-brand-warning text-white'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs font-medium text-slate-400 italic">Nenhum lançamento encontrado para este período</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componentes de Relatórios Reais
function CashClosingReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { cashRegisters, cashClosings } = useERP();
  
  const filteredRegisters = cashRegisters.filter(r => {
    const d = toLocalDateString(r.openedAt);
    return d >= startDate && d <= endDate;
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-slate-50 border border-brand-border min-w-0">
          <p className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest truncate">Caixas Abertos</p>
          <h4 className="text-xl xl:text-2xl font-black text-brand-blue break-words leading-tight">{filteredRegisters.length}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100 min-w-0">
          <p className="text-[10px] font-black text-rose-900/40 uppercase italic tracking-widest truncate">Caixas Fechados</p>
          <h4 className="text-xl xl:text-2xl font-black text-rose-600 break-words leading-tight">{filteredRegisters.filter(r => r.status === 'closed').length}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-brand-text-main text-white shadow-xl shadow-brand-text-main/20 min-w-0">
          <p className="text-[10px] font-black text-brand-text-sec/60 uppercase italic tracking-widest truncate">Total em Caixa (Abertos)</p>
          <h4 className="text-xl xl:text-2xl font-black text-brand-text-sec break-words leading-tight">
            {formatCurrency(filteredRegisters.filter(r => r.status === 'open').reduce((acc, r) => acc + r.openingBalance, 0))}
          </h4>
        </div>
      </div>
      
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-50">
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Abertura</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Operador</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Status</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Fundo Inicial</th>
            <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Diferença</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filteredRegisters.length > 0 ? filteredRegisters.map((r) => {
            const closing = cashClosings.find(c => c.cashRegisterId === r.id);
            return (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 text-sm font-bold text-brand-text-main">
                  {new Date(r.openedAt).toLocaleString('pt-BR')}
                </td>
                <td className="py-4 text-sm font-bold text-brand-text-main uppercase italic">
                  {r.operatorId?.slice(0, 8) || 'SISTEMA'}
                </td>
                <td className="py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase italic ${
                    r.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 
                    r.status === 'closed' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.status === 'open' ? 'Aberto' : r.status === 'closed' ? 'Fechado' : r.status}
                  </span>
                </td>
                <td className="py-4 text-sm font-black text-brand-blue">
                  {formatCurrency(r.openingBalance)}
                </td>
                <td className={`py-4 text-right text-sm font-black ${
                  !closing ? 'text-slate-400' : closing.totalDifference === 0 ? 'text-brand-green' : 'text-brand-danger'
                }`}>
                  {closing ? formatCurrency(closing.totalDifference) : '---'}
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm font-medium text-brand-blue/60">Nenhum registro de caixa no período selecionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DreReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, expenses } = useERP();
  
  const { filteredSales, filteredExpenses } = React.useMemo(() => {
    return {
      filteredSales: sales.filter(s => {
        const d = s.date.split('T')[0];
        return d >= startDate && d <= endDate;
      }),
      filteredExpenses: expenses.filter(e => {
        const d = e.date.split('T')[0];
        return d >= startDate && d <= endDate;
      })
    };
  }, [sales, expenses, startDate, endDate]);

  const { receitaBruta, cmv, impostos, despesasOp, despesasAdm, depreciacao } = React.useMemo(() => {
    const rBruta = filteredSales.reduce((acc, s) => acc + s.total, 0);
    let costOfGoods = 0;
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cost = product ? product.costPrice : 0;
        costOfGoods += cost * item.quantity;
      });
    });
    
    const imp = filteredExpenses
      .filter(e => ['Impostos', 'Taxas'].includes(e.category))
      .reduce((acc, e) => acc + e.amount, 0);
      
    const taxasMaquininha = filteredSales.reduce((acc, s) => acc + (s.taxAmount || 0), 0);
      
    const dOp = filteredExpenses
      .filter(e => ['Operacional', 'Fornecedores', 'Utilidades'].includes(e.category))
      .reduce((acc, e) => acc + e.amount, 0);
      
    const dAdm = filteredExpenses
      .filter(e => ['Administrativo', 'Infraestrutura', 'Salários'].includes(e.category))
      .reduce((acc, e) => acc + e.amount, 0);

    const dep = filteredExpenses
      .filter(e => ['Depreciação', 'Amortização'].includes(e.category))
      .reduce((acc, e) => acc + e.amount, 0);

    return { receitaBruta: rBruta, cmv: costOfGoods, impostos: imp + taxasMaquininha, despesasOp: dOp, despesasAdm: dAdm, depreciacao: dep };
  }, [filteredSales, filteredExpenses, products]);

  const receitaLiquida = receitaBruta - impostos;
  const lucroBruto = receitaLiquida - cmv;
  const ebitda = lucroBruto - despesasOp - despesasAdm;
  const lucroLiquido = ebitda - depreciacao;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-4">
        <DreRow label="Receita Bruta de Vendas" value={formatCurrency(receitaBruta)} bold />
        <DreRow label="(-) Impostos sobre Vendas" value={`(${formatCurrency(impostos)})`} negative />
        <div className="h-px bg-brand-border my-2"></div>
        <DreRow label="Receita Líquida" value={formatCurrency(receitaLiquida)} highlight />
        <DreRow label="(-) Custo de Mercadorias (CMV)" value={`(${formatCurrency(cmv)})`} negative />
        <div className="h-px bg-brand-border my-2"></div>
        <DreRow label="Lucro Bruto" value={formatCurrency(lucroBruto)} highlight />
        <DreRow label="(-) Despesas Operacionais (Reais)" value={`(${formatCurrency(despesasOp)})`} negative />
        <DreRow label="(-) Despesas Administrativas (Reais)" value={`(${formatCurrency(despesasAdm)})`} negative />
        <div className="h-px bg-brand-border my-2"></div>
        <DreRow label="EBITDA" value={formatCurrency(ebitda)} highlight />
        <DreRow label="(-) Depreciação / Amortização" value={`(${formatCurrency(depreciacao)})`} negative />
        <div className="h-px bg-brand-border my-2"></div>
        <DreRow label="Lucro Líquido do Exercício" value={formatCurrency(lucroLiquido)} final />
      </div>
    </div>
  );
}

function DreRow({ label, value, bold, negative, highlight, final }: any) {
  return (
    <div className={`flex justify-between items-center p-3 rounded-xl ${highlight ? 'bg-slate-50' : ''} ${final ? 'bg-brand-text-main text-white' : ''}`}>
      <span className={`text-sm uppercase italic tracking-tight ${bold || highlight || final ? 'font-black' : 'font-medium text-brand-text-main/60'}`}>{label}</span>
      <span className={`text-sm font-black ${negative ? 'text-brand-danger' : final ? 'text-brand-text-sec' : 'text-brand-text-main'}`}>{value}</span>
    </div>
  );
}

function StockTurnoverReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const productSales: Record<string, number> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
    });
  });

  const data = Object.entries(productSales)
    .map(([productId, qty]) => {
      const product = products.find(p => p.id === productId);
      const stock = product ? product.stock : 0;
      const turnover = stock > 0 ? (qty / stock).toFixed(1) : '0.0';
      let status = 'Médio Giro';
      let color = 'blue';
      if (Number(turnover) > 2) { status = 'Alto Giro'; color = 'brand-blue'; }
      else if (Number(turnover) < 0.5) { status = 'Baixo Giro'; color = 'rose'; }
      
      return {
        name: product ? product.name : 'Produto Desconhecido',
        turnover: `${turnover}x`,
        status,
        color
      };
    })
    .sort((a, b) => parseFloat(b.turnover) - parseFloat(a.turnover))
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.length > 0 ? data.map((item, i) => (
          <div key={i} className="p-6 rounded-3xl border border-brand-border bg-white flex items-center justify-between shadow-sm gap-4">
            <div className="min-w-0 flex-1">
              <h5 className="text-sm font-black text-brand-text-main uppercase italic truncate" title={item.name}>{item.name}</h5>
              <p className="text-[10px] font-black text-brand-blue/40 uppercase tracking-widest truncate">{item.status}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-brand-blue truncate">{item.turnover}</p>
              <p className="text-[10px] font-black text-brand-text-main/20 uppercase italic">Giro no Período</p>
            </div>
          </div>
        )) : (
          <div className="col-span-2 text-center py-8 text-brand-blue/60 font-medium">
            Nenhuma venda registrada no período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}

function AbcCustomersReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, customers } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const customerTotals: Record<string, number> = {};
  let totalRevenue = 0;
  filteredSales.forEach(sale => {
    if (sale.customerId) {
      customerTotals[sale.customerId] = (customerTotals[sale.customerId] || 0) + sale.total;
      totalRevenue += sale.total;
    }
  });

  const sortedCustomers = Object.entries(customerTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([customerId, total]) => {
      const customer = customers.find(c => c.id === customerId);
      return {
        name: customer ? customer.name : 'Cliente Não Identificado',
        total
      };
    });

  const data = sortedCustomers.reduce((acc, c) => {
    const cumulative = (acc.length > 0 ? acc[acc.length - 1].cumulative : 0) + c.total;
    const percent = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    let cls = 'C';
    if (percent <= 80) cls = 'A';
    else if (percent <= 95) cls = 'B';

    acc.push({
      ...c,
      cumulative,
      class: cls,
      formattedTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total)
    });
    return acc;
  }, [] as any[]);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-8">
        <div className="flex-1 p-4 rounded-2xl bg-brand-blue text-white text-center">
          <p className="text-[10px] font-black uppercase italic opacity-60">Classe A</p>
          <p className="text-xl font-black">Até 80%</p>
          <p className="text-[8px] font-black uppercase italic">do Faturamento</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-brand-text-sec text-white text-center">
          <p className="text-[10px] font-black uppercase italic opacity-60">Classe B</p>
          <p className="text-xl font-black">Até 95%</p>
          <p className="text-[8px] font-black uppercase italic">do Faturamento</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-brand-border text-brand-blue text-center">
          <p className="text-[10px] font-black uppercase italic opacity-60">Classe C</p>
          <p className="text-xl font-black">Até 100%</p>
          <p className="text-[8px] font-black uppercase italic">do Faturamento</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {data.length > 0 ? data.map((c, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${c.class === 'A' ? 'bg-brand-blue' : c.class === 'B' ? 'bg-brand-text-sec' : 'bg-brand-border'}`}>
                {c.class}
              </div>
              <div>
                <h5 className="text-sm font-black text-brand-text-main uppercase italic">{c.name}</h5>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-brand-text-main">{c.formattedTotal}</p>
              <p className="text-[10px] font-black text-brand-blue/40 uppercase italic">Total Acumulado</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-8 text-brand-blue/60 font-medium">
            Nenhuma venda registrada no período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}

function CommissionsReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, systemUsers, employees } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const salesByUser: Record<string, number> = {};
  filteredSales.forEach(sale => {
    const userId = sale.userId || 'unknown';
    salesByUser[userId] = (salesByUser[userId] || 0) + sale.total;
  });

  const data = Object.entries(salesByUser).map(([userId, total]) => {
    let sellerName = 'Vendedor Desconhecido';
    let initials = 'VD';
    
    if (userId !== 'unknown') {
      const user = systemUsers.find(u => u.id === userId);
      if (user) {
        if (user.employeeId) {
          const employee = employees.find(e => e.id === user.employeeId);
          if (employee) {
            sellerName = employee.fullName;
          } else {
            sellerName = user.username;
          }
        } else {
          sellerName = user.username;
        }
      }
    }

    const nameParts = sellerName.split(' ');
    if (nameParts.length >= 2) {
      initials = `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    } else if (nameParts.length === 1 && nameParts[0].length > 0) {
      initials = nameParts[0].substring(0, 2).toUpperCase();
    }

    const commissionRate = 0.03; // Taxa padrão de 3% sobre o total de vendas
    const commission = total * commissionRate;
    return {
      userId,
      sellerName,
      initials,
      total,
      commission
    };
  }).sort((a, b) => b.total - a.total);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-50">
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Vendedor</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Vendas Totais</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Taxa (%)</th>
            <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Comissão</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.length > 0 ? data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-border text-brand-blue flex items-center justify-center text-xs font-black">
                    {row.initials}
                  </div>
                  <span className="text-sm font-black text-brand-text-main uppercase italic">{row.sellerName}</span>
                </div>
              </td>
              <td className="py-4 text-sm font-bold text-brand-text-main">{formatCurrency(row.total)}</td>
              <td className="py-4 text-xs font-black text-brand-blue/60 uppercase italic">3%</td>
              <td className="py-4 text-right text-sm font-black text-brand-blue">{formatCurrency(row.commission)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} className="py-8 text-center text-sm font-medium text-brand-blue/60">Nenhuma venda registrada no período selecionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


function SalesByCategoryReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, subcategorias, categorias } = useERP();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const categoryTotals: Record<string, number> = {};
  const categoryProducts: Record<string, Record<string, { name: string, quantity: number, total: number }>> = {};
  let totalRevenue = 0;

  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      let category = 'Outros';
      if (product && product.subcategoria_id) {
        const sub = subcategorias.find(s => s.id === product.subcategoria_id);
        if (sub) {
          const cat = categorias.find(c => c.id === sub.categoria_id);
          if (cat) category = cat.nome;
        }
      }
      const itemTotal = item.price * item.quantity;
      categoryTotals[category] = (categoryTotals[category] || 0) + itemTotal;
      totalRevenue += itemTotal;

      // Track products per category
      if (!categoryProducts[category]) categoryProducts[category] = {};
      if (!categoryProducts[category][item.productId]) {
        categoryProducts[category][item.productId] = {
          name: product ? product.name : 'Produto Desconhecido',
          quantity: 0,
          total: 0
        };
      }
      categoryProducts[category][item.productId].quantity += item.quantity;
      categoryProducts[category][item.productId].total += itemTotal;
    });
  });

  const colors = ['#00E676', '#22C55E', '#10B981', '#34D399', '#6EE7B7', '#047857', '#064E3B'];
  const data = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
      percent: totalRevenue > 0 ? `${((value / totalRevenue) * 100).toFixed(1)}%` : '0%',
      color: colors[index % colors.length],
      products: Object.values(categoryProducts[name] || {}).sort((a, b) => b.total - a.total)
    }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h4 className="text-sm font-black text-brand-text-main uppercase italic mb-6 flex items-center gap-2">
            <PieChartIcon size={16} className="text-brand-blue" />
            Distribuição por Categoria
          </h4>
          <div className="h-64">
            {data.length > 0 ? (
              <ResponsiveContainer id="rel-pay-pie-2-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-blue/60 font-medium text-center">
                Nenhum dado para exibir no gráfico neste período.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <h4 className="text-sm font-black text-brand-text-main uppercase italic mb-6 flex items-center gap-2">
            <Layers size={16} className="text-brand-blue" />
            Detalhamento de Vendas
          </h4>
          <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
            {data.map((cat, i) => (
              <div key={i} className="space-y-2">
                <button 
                  onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-2xl transition-all border",
                    expandedCategory === cat.name ? "bg-brand-blue/5 border-brand-blue/20" : "bg-slate-50 border-transparent hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-sm font-black text-brand-text-main uppercase italic text-left">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-sm font-black text-brand-blue">{cat.total}</span>
                      <span className="text-[10px] font-bold text-brand-text-main/40 ml-2">({cat.percent})</span>
                    </div>
                    <ChevronDown size={16} className={cn("text-slate-400 transition-transform", expandedCategory === cat.name && "rotate-180")} />
                  </div>
                </button>

                {expandedCategory === cat.name && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pl-6 pr-2 py-2 space-y-2 overflow-hidden"
                  >
                    <div className="grid grid-cols-12 px-2 text-[10px] font-black text-brand-text-main/40 uppercase italic mb-1">
                      <div className="col-span-7">Produto</div>
                      <div className="col-span-2 text-center">Qtd</div>
                      <div className="col-span-3 text-right">Total</div>
                    </div>
                    {cat.products.map((prod, idx) => (
                      <div key={idx} className="grid grid-cols-12 px-2 py-1.5 border-b border-slate-50 last:border-0 items-center">
                        <div className="col-span-7 text-[11px] font-bold text-brand-text-main truncate">{prod.name}</div>
                        <div className="col-span-2 text-[11px] font-black text-brand-blue text-center">{prod.quantity}</div>
                        <div className="col-span-3 text-[11px] font-black text-brand-blue text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.total)}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesByHourReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const hourCounts: Record<string, number> = {};
  filteredSales.forEach(sale => {
    const dateObj = new Date(sale.date);
    const hour = dateObj.getHours().toString().padStart(2, '0') + 'h';
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const data = Object.entries(hourCounts)
    .map(([hour, salesCount]) => ({ hour, sales: salesCount }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  let peakHour = 'N/A';
  let peakSales = 0;
  data.forEach(d => {
    if (d.sales > peakSales) {
      peakSales = d.sales;
      peakHour = d.hour;
    }
  });

  return (
    <div className="space-y-8">
      <div className="h-80 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer id="rel-hourly-bar-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#00E676', fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#00E676', fontWeight: 700}} />
              <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '24px', border: '1px solid #E5E7EB' }} />
              <Bar name="Vendas" dataKey="sales" fill="#00E676" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-blue/60 font-medium">
            Nenhum dado para exibir no gráfico neste período.
          </div>
        )}
      </div>
      <div className="p-6 rounded-3xl bg-slate-50 border border-brand-border text-center">
        <p className="text-sm font-black text-brand-text-main uppercase italic">Horário de Pico: {peakHour !== 'N/A' ? `${peakHour.replace('h', ':00')} - ${String(Number(peakHour.replace('h', ''))+1).padStart(2, '0')}:00` : 'N/A'}</p>
        <p className="text-xs font-medium text-brand-blue/60">Média de {peakSales} transações neste período.</p>
      </div>
    </div>
  );
}

function AbcProductsReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const productTotals: Record<string, number> = {};
  let totalRevenue = 0;

  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      productTotals[item.productId] = (productTotals[item.productId] || 0) + itemTotal;
      totalRevenue += itemTotal;
    });
  });

  const sortedProducts = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([productId, total]) => {
      const product = products.find(p => p.id === productId);
      return {
        name: product ? product.name : 'Produto Desconhecido',
        total
      };
    });

  const data = sortedProducts.reduce((acc, p) => {
    const cumulative = (acc.length > 0 ? acc[acc.length - 1].cumulative : 0) + p.total;
    const percent = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    let cls = 'C';
    if (percent <= 80) cls = 'A';
    else if (percent <= 95) cls = 'B';

    acc.push({
      ...p,
      cumulative,
      class: cls,
      formattedTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.total)
    });
    return acc;
  }, [] as any[]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-brand-blue text-white">
          <h5 className="text-[10px] font-black uppercase italic opacity-60">Curva A</h5>
          <p className="text-lg font-black">Até 80% do Faturamento</p>
          <p className="text-[8px] font-black uppercase italic">Alta Importância</p>
        </div>
        <div className="p-4 rounded-2xl bg-brand-text-sec text-white">
          <h5 className="text-[10px] font-black uppercase italic opacity-60">Curva B</h5>
          <p className="text-lg font-black">Até 95% do Faturamento</p>
          <p className="text-[8px] font-black uppercase italic">Média Importância</p>
        </div>
        <div className="p-4 rounded-2xl bg-brand-border text-brand-blue">
          <h5 className="text-[10px] font-black uppercase italic opacity-60">Curva C</h5>
          <p className="text-lg font-black">Até 100% do Faturamento</p>
          <p className="text-[8px] font-black uppercase italic">Baixa Importância</p>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-50">
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Classe</th>
            <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Acumulado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.length > 0 ? data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 text-sm font-black text-brand-text-main uppercase italic">{row.name}</td>
              <td className="py-4">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black text-white ${row.class === 'A' ? 'bg-brand-blue' : row.class === 'B' ? 'bg-brand-text-sec' : 'bg-brand-border'}`}>{row.class}</span>
              </td>
              <td className="py-4 text-right text-sm font-black text-brand-blue">{row.formattedTotal}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="py-8 text-center text-sm font-medium text-brand-blue/60">Nenhuma venda registrada no período selecionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LossesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { losses, products, sales } = useERP();

  const filteredLosses = losses.filter(l => {
    const d = l.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const totalLosses = filteredLosses.reduce((acc, l) => acc + l.totalValue, 0);
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const lossIndex = totalRevenue > 0 ? (totalLosses / totalRevenue) * 100 : 0;

  const data = filteredLosses.map(l => {
    const product = products.find(p => p.id === l.productId);
    return {
      name: product ? product.name : 'Produto Desconhecido',
      reason: l.reason,
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.totalValue)
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100 min-w-0">
          <p className="text-[10px] font-black text-rose-900/40 uppercase italic tracking-widest truncate">Total de Perdas (Período)</p>
          <h4 className="text-lg xl:text-xl font-black text-rose-600 truncate leading-tight">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLosses)}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-slate-50 border border-brand-border min-w-0">
          <p className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest truncate">Índice de Quebra</p>
          <h4 className="text-lg xl:text-xl font-black text-brand-blue truncate leading-tight">{lossIndex.toFixed(1)}%</h4>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-50">
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Motivo</th>
            <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.length > 0 ? data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 text-sm font-black text-brand-text-main uppercase italic">{row.name}</td>
              <td className="py-4 text-xs font-black text-rose-600/60 uppercase italic">{row.reason}</td>
              <td className="py-4 text-right text-sm font-black text-rose-600">{row.value}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="py-8 text-center text-sm font-medium text-brand-blue/60">Nenhuma perda registrada no período selecionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DiscountAuditReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { discountLogs, products } = useERP();
  
  const filteredLogs = discountLogs.filter(log => {
    const d = log.date.split('T')[0];
    return d >= startDate && d <= endDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-brand-text-main text-white flex items-center gap-4 shadow-lg shadow-brand-text-main/10">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Search size={20} />
        </div>
        <div>
          <h5 className="text-sm font-black uppercase italic">Auditoria de Descontos (Caixa Preta)</h5>
          <p className="text-[10px] font-medium text-brand-text-sec/60 uppercase">Rastreamento de todas as concessões de desconto e autorizações.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-brand-border">
          <p className="text-[10px] font-black text-brand-text-main/40 uppercase italic">Total de Ocorrências</p>
          <h4 className="text-xl font-black text-brand-text-main">{filteredLogs.length}</h4>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-brand-border">
          <p className="text-[10px] font-black text-brand-text-main/40 uppercase italic">Valor Total Concedido</p>
          <h4 className="text-xl font-black text-brand-blue">
            {formatCurrency(filteredLogs.reduce((acc, log) => acc + log.value, 0))}
          </h4>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <p className="text-[10px] font-black text-rose-900/40 uppercase italic">Média de Desconto</p>
          <h4 className="text-xl font-black text-rose-600">
            {filteredLogs.length > 0 
              ? `${(filteredLogs.reduce((acc, log) => acc + (log.percentage || 0), 0) / filteredLogs.filter(l => l.percentage).length || 0).toFixed(1)}%`
              : '0%'}
          </h4>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Data/Hora</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Tipo</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto/Venda</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Operador</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Supervisor</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Motivo</th>
              <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredLogs.length > 0 ? filteredLogs.map((log) => {
              const product = products.find(p => p.id === log.productId);
              return (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 text-[11px] font-bold text-brand-text-main">
                    {new Date(log.date).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase italic ${
                      log.type === 'item' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-text-main/10 text-brand-text-main'
                    }`}>
                      {log.type === 'item' ? 'Item' : 'Venda'}
                    </span>
                  </td>
                  <td className="py-4 text-[11px] font-bold text-brand-text-main uppercase italic">
                    {log.type === 'item' ? (product?.name || 'Produto Removido') : `Venda #${log.saleId.slice(0, 8)}`}
                  </td>
                  <td className="py-4 text-[11px] font-medium text-brand-text-main/60">
                    {log.appliedBy}
                  </td>
                  <td className="py-4 text-[11px] font-black text-brand-blue uppercase italic">
                    {log.authorizedBy || 'Auto-Aprovado'}
                  </td>
                  <td className="py-4 text-[11px] font-medium text-brand-text-main/40 italic">
                    &quot;{log.reason}&quot;
                  </td>
                  <td className="py-4 text-right">
                    <div className="text-[11px] font-black text-rose-600">{formatCurrency(log.value)}</div>
                    {log.percentage && <div className="text-[9px] font-bold text-brand-text-main/40">-{log.percentage}%</div>}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm font-medium text-brand-blue/60">
                  Nenhum log de desconto encontrado no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesByPaymentReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, paymentMethods } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const paymentTotals: Record<string, number> = {};
  filteredSales.forEach(sale => {
    const method = paymentMethods.find(m => m.id === sale.paymentMethod);
    const methodName = method ? method.name : (sale.paymentMethod || 'Outros');
    paymentTotals[methodName] = (paymentTotals[methodName] || 0) + sale.total;
  });

  const colors = ['#10B981', '#6366F1', '#0EA5E9', '#F43F5E', '#8B5CF6', '#F59E0B', '#64748B'];
  const data = Object.entries(paymentTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name: name,
      value,
      total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
      fill: colors[index % colors.length],
      color: colors[index % colors.length]
    }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-64">
          {data.length > 0 ? (
            <ResponsiveContainer id="rel-cat-bar-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7C93', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7C93', fontWeight: 600}} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-blue/60 font-medium text-center">
              Nenhum dado para exibir no gráfico neste período.
            </div>
          )}
        </div>
        <div className="space-y-4 flex flex-col justify-center">
          {data.map((pay, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pay.color }}></div>
                <span className="text-sm font-black text-brand-text-main uppercase italic">{pay.name}</span>
              </div>
              <span className="text-sm font-black text-brand-blue">{pay.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CriticalStockReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { products } = useERP();
  
  const lowStockProducts = products
    .filter(p => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h5 className="text-sm font-black text-orange-950 uppercase italic">Atenção: {lowStockProducts.length} Itens com Estoque Crítico</h5>
          <p className="text-[10px] font-medium text-orange-600/60 uppercase">Considere repor o estoque destes produtos.</p>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-50">
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Estoque Mínimo</th>
            <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Estoque Atual</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {lowStockProducts.length > 0 ? lowStockProducts.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 text-sm font-black text-brand-text-main uppercase italic">{row.name}</td>
              <td className="py-4 text-sm font-bold text-brand-text-main">{row.minStock} un</td>
              <td className="py-4 text-right text-sm font-black text-rose-600">{row.stock} un</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="py-8 text-center text-sm font-medium text-brand-blue/60">Nenhum produto com estoque crítico.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExpiryReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { lotes, products } = useERP();
  
  const activeLotes = lotes
    .filter(l => l.saldoAtual > 0 && l.validade)
    .map(l => {
      const product = products.find(p => p.id === l.productId);
      const daysToExpiry = l.validade ? Math.ceil((new Date(l.validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 999;
      
      return {
        ...l,
        productName: product ? product.name : 'Produto Desconhecido',
        daysToExpiry
      };
    })
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const expiredCount = activeLotes.filter(l => l.daysToExpiry < 0).length;
  const soonCount = activeLotes.filter(l => l.daysToExpiry >= 0 && l.daysToExpiry <= 30).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <h5 className="text-sm font-black text-rose-950 uppercase italic">{expiredCount} Lotes Vencidos</h5>
            <p className="text-[10px] font-medium text-rose-600/60 uppercase">Ação imediata recomendada.</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <h5 className="text-sm font-black text-amber-950 uppercase italic">{soonCount} Lotes Vencendo em Breve</h5>
            <p className="text-[10px] font-medium text-amber-600/60 uppercase">Vencimento nos próximos 30 dias.</p>
          </div>
        </div>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-50">
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto / Lote</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Vencimento</th>
            <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Status</th>
            <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {activeLotes.length > 0 ? activeLotes.map((lote, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-brand-text-main uppercase italic">{lote.productName}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lote: {lote.numeroLote}</span>
                </div>
              </td>
              <td className="py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-brand-text-main">
                    {lote.validade ? new Date(lote.validade).toLocaleDateString('pt-BR') : '-'}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black uppercase italic",
                    lote.daysToExpiry < 0 ? "text-brand-danger" : 
                    lote.daysToExpiry <= 30 ? "text-brand-warning" : "text-brand-green"
                  )}>
                    {lote.daysToExpiry < 0 ? `Vencido há ${Math.abs(lote.daysToExpiry)} dias` : 
                     lote.daysToExpiry === 0 ? 'Vence hoje' :
                     `Vence em ${lote.daysToExpiry} dias`}
                  </span>
                </div>
              </td>
              <td className="py-4 text-center">
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[9px] font-black uppercase italic",
                  lote.daysToExpiry < 0 ? "bg-rose-100 text-rose-600" : 
                  lote.daysToExpiry <= 30 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  {lote.daysToExpiry < 0 ? 'Vencido' : 
                   lote.daysToExpiry <= 30 ? 'Crítico' : 'Regular'}
                </span>
              </td>
              <td className="py-4 text-right text-sm font-black text-brand-text-main">{lote.saldoAtual} un</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} className="py-8 text-center text-sm font-medium text-brand-blue/60">Nenhum lote com validade registrada em estoque.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SalesBySellerReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, systemUsers, employees } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const salesByUser: Record<string, { total: number, count: number }> = {};
  filteredSales.forEach(sale => {
    const userId = sale.userId || 'unknown';
    if (!salesByUser[userId]) salesByUser[userId] = { total: 0, count: 0 };
    salesByUser[userId].total += sale.total;
    salesByUser[userId].count += 1;
  });

  const data = Object.entries(salesByUser).map(([userId, stats]) => {
    let sellerName = 'Vendedor Desconhecido';
    
    if (userId !== 'unknown') {
      const user = systemUsers.find(u => u.id === userId);
      if (user) {
        if (user.employeeId) {
          const employee = employees.find(e => e.id === user.employeeId);
          if (employee) {
            sellerName = employee.fullName;
          } else {
            sellerName = user.username;
          }
        } else {
          sellerName = user.username;
        }
      }
    }

    return {
      userId,
      sellerName,
      total: stats.total,
      count: stats.count
    };
  }).sort((a, b) => b.total - a.total);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-slate-800">Vendas por Vendedor</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Vendedor</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Qtd. Vendas</th>
              <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Total Vendido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 text-sm font-black text-brand-text-main uppercase italic">{row.sellerName}</td>
                <td className="py-4 text-sm font-bold text-brand-text-main">{row.count}</td>
                <td className="py-4 text-right text-sm font-black text-brand-blue">{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EstornoDevolucaoReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { returns, products } = useERP();

  const filteredReturns = returns.filter(r => {
    const d = r.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const getProductNames = (items: any[]) => {
    return items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return product ? product.name : 'Produto Desconhecido';
    }).join(', ');
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-slate-800">Relatório de Estorno e Devolução</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Data</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Tipo</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto(s)</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Método Reembolso</th>
              <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredReturns.map((ret) => (
              <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 text-sm font-medium text-slate-600">{new Date(ret.date).toLocaleDateString('pt-BR')}</td>
                <td className="py-4 text-sm font-bold text-slate-800">{ret.type}</td>
                <td className="py-4 text-sm font-medium text-slate-600">{getProductNames(ret.items)}</td>
                <td className="py-4 text-sm font-medium text-slate-600">{ret.refundMethod}</td>
                <td className="py-4 text-right text-sm font-black text-brand-danger">{formatCurrency(ret.total)}</td>
              </tr>
            ))}
            {filteredReturns.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 italic">Nenhum estorno ou devolução encontrado no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const costData = React.useMemo(() => {
    const stats: Record<string, { name: string, qty: number, totalCost: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cost = product ? product.costPrice : 0;
        if (!stats[item.productId]) {
          stats[item.productId] = { name: product?.name || 'Desconhecido', qty: 0, totalCost: 0 };
        }
        stats[item.productId].qty += item.quantity;
        stats[item.productId].totalCost += cost * item.quantity;
      });
    });
    return Object.values(stats).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredSales, products]);

  const totalCost = costData.reduce((acc, item) => acc + item.totalCost, 0);

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-center">
        <Calculator size={48} className="mx-auto text-slate-400 mb-4" />
        <h4 className="text-xl font-bold text-slate-800">Relatório de Custo (CMV)</h4>
        <p className="text-sm text-slate-500 mt-2">Análise detalhada dos custos de aquisição dos produtos vendidos no período.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Total Acumulado</p>
          <h4 className="text-2xl font-black text-slate-800">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Qtd Vendida</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Custo Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {costData.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-700 uppercase italic">{item.name}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700 text-center">{item.qty}</td>
                <td className="px-6 py-4 text-right text-sm font-black text-brand-blue">R$ {item.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {costData.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-400 italic">Nenhuma venda encontrada no período para calcular custos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchasesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { user, suppliers } = useERP();
  const [purchases, setPurchases] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchPurchases() {
      if (!user?.companyId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            purchase_order_items (
              id, product_id, quantity, unit_price, total_price
            )
          `)
          .eq('company_id', user.companyId)
          .gte('order_date', startDate + 'T00:00:00Z')
          .lte('order_date', endDate + 'T23:59:59Z')
          .order('order_date', { ascending: false });

        if (error) throw error;
        setPurchases(data || []);
      } catch (error: any) {
        console.error('Error fetching purchases:', error.message || error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPurchases();
  }, [user?.companyId, startDate, endDate]);

  const totalPurchases = purchases.reduce((acc, p) => acc + Number(p.total_amount), 0);
  const pendingPurchases = purchases.filter(p => p.status === 'Pendente').reduce((acc, p) => acc + Number(p.total_amount), 0);
  const receivedPurchases = purchases.filter(p => p.status === 'Recebido').reduce((acc, p) => acc + Number(p.total_amount), 0);

  const filteredPurchases = purchases.filter(p => {
    const supplier = suppliers.find(s => s.id === p.supplier_id);
    const supplierName = supplier?.name?.toLowerCase() || '';
    return supplierName.includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return <div className="py-20 text-center text-slate-400">Carregando relatório de compras...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-center">
        <ShoppingBag size={48} className="mx-auto text-slate-400 mb-4" />
        <h4 className="text-xl font-bold text-slate-800">Relatório de Compras</h4>
        <p className="text-sm text-slate-500 mt-2">Análise de pedidos de compra, fornecedores e custos de reposição.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total em Compras</p>
          <h4 className="text-2xl font-black text-slate-800">R$ {totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compras Recebidas</p>
          <h4 className="text-2xl font-black text-emerald-600">R$ {receivedPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compras Pendentes</p>
          <h4 className="text-2xl font-black text-amber-600">R$ {pendingPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        <input
          type="text"
          placeholder="Buscar por fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        />
      </div>
      
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Data</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Fornecedor</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Status</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredPurchases.map((purchase, idx) => {
              const supplier = suppliers.find(s => s.id === purchase.supplier_id);
              return (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{new Date(purchase.order_date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700 uppercase italic">{supplier?.name || 'Desconhecido'}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black uppercase italic",
                      purchase.status === 'Recebido' ? "bg-emerald-100 text-emerald-600" : 
                      purchase.status === 'Cancelado' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {purchase.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black text-brand-blue">R$ {Number(purchase.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
            {filteredPurchases.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 italic">Nenhuma compra encontrada no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockProfitReport() {
  const { products, categorias, subcategorias, suppliers } = useERP();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = React.useState<string>('all');

  const reportData = React.useMemo(() => {
    return products
      .filter(p => p.status !== 'Inativo' && p.stock > 0)
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesCategory = true;
        if (selectedCategory !== 'all') {
          if (p.subcategoria_id) {
            const sub = subcategorias.find(s => s.id === p.subcategoria_id);
            matchesCategory = sub?.categoria_id === selectedCategory;
          } else {
            matchesCategory = false;
          }
        }

        let matchesSupplier = true;
        if (selectedSupplier !== 'all') {
          // Check both ID and Name for flexibility
          matchesSupplier = p.supplier === selectedSupplier;
        }

        return matchesSearch && matchesCategory && matchesSupplier;
      })
      .map(p => {
        const totalCost = p.stock * p.costPrice;
        const totalSale = p.stock * p.salePrice;
        const potentialProfit = totalSale - totalCost;
        const margin = totalSale > 0 ? (potentialProfit / totalSale) * 100 : 0;
        return {
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          costPrice: p.costPrice,
          salePrice: p.salePrice,
          totalCost,
          totalSale,
          potentialProfit,
          margin
        };
      })
      .sort((a, b) => b.potentialProfit - a.potentialProfit);
  }, [products, searchTerm, selectedCategory, selectedSupplier, subcategorias]);

  const totals = reportData.reduce((acc, item) => ({
    cost: acc.cost + item.totalCost,
    sale: acc.sale + item.totalSale,
    profit: acc.profit + item.potentialProfit
  }), { cost: 0, sale: 0, profit: 0 });

  const totalMargin = totals.sale > 0 ? (totals.profit / totals.sale) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-100 text-center">
        <TrendingUp size={48} className="mx-auto text-emerald-600 mb-4" />
        <h4 className="text-xl font-bold text-slate-800">Relatório de Lucro no Estoque</h4>
        <p className="text-sm text-slate-500 mt-2">Projeção de lucro bruto baseado no saldo atual de estoque e preços de venda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Total em Estoque</p>
          <h4 className="text-2xl font-black text-slate-800">R$ {totals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Venda Total Prevista</p>
          <h4 className="text-2xl font-black text-brand-blue">R$ {totals.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lucro Bruto Potencial</p>
          <h4 className="text-2xl font-black text-emerald-500">R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          <p className="text-[10px] font-bold text-emerald-600 mt-1">Margem Média: {totalMargin.toFixed(2)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por produto ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-300"
          />
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Filter size={16} className="text-slate-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none transition-all"
            >
              <option value="all">Todas Categorias</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>

          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Truck size={16} className="text-slate-400" />
            </div>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full pl-10 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none transition-all"
            >
              <option value="all">Todos Fornecedores</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.name}>{sup.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>

          {(searchTerm || selectedCategory !== 'all' || selectedSupplier !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedSupplier('all');
              }}
              className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-sm font-black uppercase italic transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Estoque</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right">Custo Total</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right">Venda Total</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right">Lucro Prev.</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reportData.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-slate-700 uppercase italic">{item.name}</div>
                  <div className="text-[10px] text-slate-400 font-medium">SKU: {item.sku}</div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700 text-center">{item.stock}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-slate-500">R$ {item.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-brand-blue">R$ {item.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-right text-sm font-black text-emerald-500">R$ {item.potentialProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black">
                    {item.margin.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
            {reportData.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Search size={32} className="text-slate-200" />
                    <p className="text-sm text-slate-400 italic font-medium">Nenhum produto encontrado para &quot;{searchTerm}&quot;</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

