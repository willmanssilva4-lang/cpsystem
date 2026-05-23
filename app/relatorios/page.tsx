'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Bot,
  User
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
import { motion } from 'motion/react';
import { useERP } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { cn, toLocalDateString, getLocalDateString } from '@/lib/utils';
import { SalesByProductReport } from '@/components/reports/SalesByProductReport';
import { SalesReport } from '@/components/reports/SalesReport';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando relatórios...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const { sales, products, customers, companySettings, discountLogs, hasPermission, expenses, subcategorias, categorias, departamentos, systemUsers, suppliers, paymentMethods, setCustomAlert } = useERP();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeReport, setActiveReport] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const [selectedReportView, setSelectedReportView] = useState<string | null>(null);

  // Prevent background page scrolling when the modal or sub-reports are open
  useEffect(() => {
    if (selectedReportView) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedReportView]);

  // Handle report query parameter
  useEffect(() => {
    const reportId = searchParams.get('report');
    if (reportId) {
      const report = allReports.find(r => r.id === reportId);
      if (report) {
        handleReportClick(report.title);
        // Clear the query param without refreshing the page
        const newPath = window.location.pathname;
        router.replace(newPath);
      }
    }
  }, [searchParams]);
  const [activeCentralTab, setActiveCentralTab] = useState('vendas');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

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
      const d = toLocalDateString(sale.date);
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
    if (!startDate) return [];
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
    { id: 'estoque_geral', category: 'estoque', title: 'Relatório de Estoque Geral', description: 'Listagem completa de todos os produtos e suas quantidades em estoque.', icon: Package },
    { id: 'giro_estoque', category: 'estoque', title: 'Giro de Estoque', description: 'Velocidade de saída dos produtos e necessidade de reposição.', icon: RefreshCw },
    { id: 'estoque_critico', category: 'estoque', title: 'Estoque Crítico', description: 'Produtos abaixo do nível mínimo de segurança.', icon: AlertTriangle },
    { id: 'validade_lotes', category: 'estoque', title: 'Validade de Lotes', description: 'Acompanhamento de vencimentos e lotes próximos da validade.', icon: Calendar },
    { id: 'dre', category: 'gerencial', title: 'DRE Gerencial', description: 'Demonstrativo de resultados, impostos e lucro líquido.', icon: FileBarChart },
    { id: 'abc_clientes', category: 'gerencial', title: 'Curva ABC de Clientes', description: 'Classificação de clientes por volume de compras e fidelidade.', icon: Target },
    { id: 'abc_produtos', category: 'gerencial', title: 'Curva ABC de Produtos', description: 'Classificação de produtos por volume de vendas e faturamento.', icon: Layers },
    { id: 'meios_pagamento', category: 'vendas', title: 'Relatório de Meios de Pagamento (Análise Profunda)', description: 'Detalhamento de vendas por forma de pagamento e taxas.', icon: CreditCard },
    { id: 'estorno_devolucao', category: 'financeiro', title: 'Relatório de Estorno e Devolução', description: 'Monitoramento de estornos e devoluções realizadas.', icon: RefreshCw },
    { id: 'relatorio_custo', category: 'financeiro', title: 'Relatório de Custo', description: 'Análise detalhada dos custos de aquisição e CMV.', icon: Calculator },
    { id: 'lucro_estoque', category: 'estoque', title: 'Relatório de Lucro no Estoque', description: 'Projeção de lucro bruto baseado no saldo atual de estoque.', icon: TrendingUp },
    { id: 'clube_clientes', category: 'gerencial', title: 'Relatório Cliente Clube', description: 'Análise de adesão, economia gerada e frequência de membros do clube.', icon: UserCheck },
    { id: 'clube_vendas', category: 'vendas', title: 'Vendas Cliente Clube', description: 'Comparativo de vendas entre membros do clube e clientes comuns.', icon: ShoppingCart },
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
            className="relative w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 max-w-[98vw] h-[95vh] md:max-w-[96vw] md:h-[94vh]"
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
                  {selectedReportView === 'Curva ABC de Produtos' && <AbcProductsReport startDate={startDate} endDate={endDate} />}
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
                  {selectedReportView === 'Relatório de Estoque Geral' && <GeneralStockReport />}
                  {selectedReportView === 'Relatório Cliente Clube' && <ClubCustomersReport />}
                  {selectedReportView === 'Vendas Cliente Clube' && <ClubSalesReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Fluxo de Caixa' && (
                    <CashFlowReport startDate={startDate} endDate={endDate} />
                  )}
                  {selectedReportView === 'Contas a Pagar' && (
                    <AccountsPayableReport startDate={startDate} endDate={endDate} />
                  )}
                  
                  {!['Vendas por Período', 'DRE Gerencial', 'Giro de Estoque', 'Curva ABC de Clientes', 'Curva ABC de Produtos', 'Comissões de Vendedores', 'Vendas por Vendedor', 'Vendas por Produto', 'Vendas por Categoria', 'Vendas por Hora', 'Estoque Crítico', 'Validade de Lotes', 'Fluxo de Caixa', 'Contas a Pagar', 'Relatório de Estorno e Devolução', 'Relatório de Custo', 'Relatório de Compras', 'Relatório de Lucro no Estoque', 'Relatório de Estoque Geral', 'Relatório Cliente Clube', 'Vendas Cliente Clube', 'Relatório de Meios de Pagamento (Análise Profunda)'].includes(selectedReportView) && (
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
      <AdvancedPerformanceDashboard 
        startDate={startDate} 
        endDate={endDate} 
        onOpenCatalog={() => setSelectedReportView('Catálogo')} 
        onViewReport={(reportName) => handleReportClick(reportName)}
      />

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
function AdvancedPerformanceDashboard({ 
  startDate: initialStartDate, 
  endDate: initialEndDate, 
  onOpenCatalog,
  onViewReport 
}: { 
  startDate: string, 
  endDate: string, 
  onOpenCatalog?: () => void,
  onViewReport?: (reportName: string) => void
}) {
  const { sales, products, expenses, systemUsers, categorias, subcategorias, paymentMethods, customers, setCustomAlert } = useERP();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  // Sync state with props if they change
  const [prevInitialStartDate, setPrevInitialStartDate] = useState(initialStartDate);
  const [prevInitialEndDate, setPrevInitialEndDate] = useState(initialEndDate);

  if (initialStartDate !== prevInitialStartDate) {
    setStartDate(initialStartDate);
    setPrevInitialStartDate(initialStartDate);
  }
  if (initialEndDate !== prevInitialEndDate) {
    setEndDate(initialEndDate);
    setPrevInitialEndDate(initialEndDate);
  }

  const [reportType, setReportType] = useState('Relatório de Vendas');

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const firstDayOfMonth = `${year}-${month}-01`;
  
  const safeStartDate = startDate || firstDayOfMonth;
  const safeEndDate = endDate || getLocalDateString();
  
  // Filter data based on date range
  const filteredSales = sales.filter(s => {
    const d = toLocalDateString(s.date);
    return d >= safeStartDate && d <= safeEndDate;
  });

  const filteredExpenses = expenses.filter(e => {
    const d = toLocalDateString(e.date);
    return d >= safeStartDate && d <= safeEndDate;
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

  // Vendas em Oferta
  const totalPromoSales = filteredSales.reduce((acc, s) => {
    const promoItemsTotal = s.items
      .filter(item => item.promotionId || (item.discount && item.discount > 0) || (item.originalPrice && item.price < item.originalPrice))
      .reduce((itemAcc, item) => itemAcc + (item.price * item.quantity), 0);
    return acc + promoItemsTotal;
  }, 0);
  const promoSalesCount = filteredSales.filter(s => s.items.some(item => item.promotionId || (item.discount && item.discount > 0) || (item.originalPrice && item.price < item.originalPrice))).length;

  // Previous Period Data for Trends
  const start = new Date(safeStartDate);
  const end = new Date(safeEndDate);
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

  const handleExportExcel = () => {
    setCustomAlert({ message: 'Preparando exportação...', type: 'info' });
    let dataToExport: any[] = [];
    let filename = 'relatorio';

    if (reportType === 'Relatório de Vendas') {
      filename = `vendas_${safeStartDate}_${safeEndDate}`;
      dataToExport = filteredSales.map(s => {
        const customer = customers.find(c => c.id === s.customerId);
        const seller = systemUsers.find(u => u.id === s.userId);
        const method = paymentMethods.find(m => m.id === s.paymentMethod);
        return {
          'Data': new Date(s.date).toLocaleString('pt-BR'),
          'ID': s.id.substring(0, 8),
          'Cliente': customer ? customer.name : 'Consumidor Final',
          'Vendedor': seller ? (seller.full_name || seller.username) : 'Sistema',
          'Pagamento': method ? method.name : (s.paymentMethod || 'N/A'),
          'Total': s.total,
          'Desconto': s.discount || 0,
          'Taxas': s.taxAmount || 0
        };
      });
    } else if (reportType === 'Relatório Financeiro') {
      filename = `financeiro_${safeStartDate}_${safeEndDate}`;
      dataToExport = filteredExpenses.map(e => ({
        'Data': new Date(e.date).toLocaleDateString('pt-BR'),
        'Descrição': e.description,
        'Categoria': e.category,
        'Valor': e.amount,
        'Status': 'Pago'
      }));
    } else if (reportType === 'Relatório de Estoque') {
      filename = `estoque_${new Date().toISOString().split('T')[0]}`;
      dataToExport = products.map(p => ({
        'Produto': p.name,
        'SKU': p.sku || 'N/A',
        'Estoque Atual': p.stock,
        'Estoque Mínimo': p.minStock,
        'Preço de Custo': p.costPrice,
        'Preço de Venda': p.salePrice,
        'Valor em Estoque': p.stock * p.costPrice
      }));
    }

    if (dataToExport.length === 0) {
      setCustomAlert({ message: 'Nenhum dado encontrado para exportar.', type: 'warning' });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    setCustomAlert({ message: 'Relatório exportado com sucesso!', type: 'success' });
  };

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
      value: totalSales > 0 ? Number(((value / totalSales) * 100).toFixed(1)) : 0,
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
      totalValue: value,
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

  // Top Products Ranking
  const productStats: Record<string, { total: number, quantity: number, margin: number }> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const productName = product?.name || 'Produto Desconhecido';
      if (!productStats[productName]) {
        productStats[productName] = { total: 0, quantity: 0, margin: 0 };
      }
      const itemTotal = item.price * item.quantity;
      const itemCost = (product ? product.costPrice : item.price * 0.7) * item.quantity;
      const itemMargin = itemTotal > 0 ? ((itemTotal - itemCost) / itemTotal) * 100 : 0;
      
      productStats[productName].total += itemTotal;
      productStats[productName].quantity += item.quantity;
      productStats[productName].margin = (productStats[productName].margin + itemMargin) / 2;
    });
  });

  const topProducts = Object.entries(productStats)
    .map(([name, stats], index) => ({
      id: index + 1,
      name,
      total: stats.total,
      quantity: stats.quantity,
      margin: Number(stats.margin.toFixed(1))
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top Customers Ranking
  const customerStats: Record<string, { total: number, volume: number }> = {};
  filteredSales.forEach(sale => {
    const customer = customers.find(c => c.id === sale.customerId);
    const customerName = customer ? customer.name : 'Consumidor Final';
    if (!customerStats[customerName]) {
      customerStats[customerName] = { total: 0, volume: 0 };
    }
    customerStats[customerName].total += sale.total;
    customerStats[customerName].volume += 1;
  });

  const topCustomers = Object.entries(customerStats)
    .map(([name, stats], index) => ({
      id: index + 1,
      name,
      total: stats.total,
      volume: stats.volume
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Dados reais por semana para o gráfico de projeção/histórico
  const secondProjectionData = React.useMemo(() => {
    const sDate = startDate || getLocalDateString();
    const eDate = endDate || getLocalDateString();
    return [0, 1, 2, 3].map(i => {
      const start = new Date(sDate);
      start.setDate(start.getDate() + (i * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      
      const weekSales = sales.filter(s => {
        const d = new Date(s.date);
        const dateStr = toLocalDateString(s.date);
        return dateStr >= sDate && dateStr <= eDate && d >= start && d < end;
      }).reduce((acc, s) => acc + s.total, 0);
      
      const weekExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        const dateStr = toLocalDateString(e.date);
        return dateStr >= sDate && dateStr <= eDate && d >= start && d < end;
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
  const totalStockValue = products.reduce((acc, p) => {
    const isVirtual = p.product_type === 'KIT' || (p.composition && p.composition.length > 0) || !!p.base_product_id;
    if (isVirtual) return acc;
    return acc + (p.stock * p.costPrice);
  }, 0);
  const lowStockProductsCount = products.filter(p => p.status !== 'Inativo' && p.stock <= p.minStock).length;

  return (
    <div className="space-y-6 bg-[#f8fafc] -m-8 p-8 min-h-full font-sans">
      <div className="flex flex-col gap-6">
        {/* Header with Filters */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-[#1e293b]">Relatórios Avançados de Desempenho</h2>
            <div className="flex gap-3">
              {onOpenCatalog && (
                <button 
                  onClick={onOpenCatalog}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue/90 transition-all shadow-md shadow-brand-blue/10"
                >
                  <LayoutGrid size={14} />
                  Catálogo de Relatórios
                </button>
              )}
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue/90 transition-all shadow-md shadow-brand-blue/10"
              >
                <Download size={14} />
                Exportar Excel
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
        
        {/* Metrics Row - 4 Cards */}
        {(reportType === 'Relatório de Vendas' || reportType === 'Relatório Financeiro') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vendas em Oferta</p>
              <div className="mt-1">
                <h3 className="text-xl md:text-2xl font-black text-brand-text-main truncate leading-none">R$ {totalPromoSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                <div className="flex items-center gap-1 text-[10px] font-bold mt-2 text-blue-600">
                  <Zap size={12} />
                  <span>{promoSalesCount} vendas com itens em promoção</span>
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
                        formatter={(value: any) => `${Number(value).toFixed(2)}%`}
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

          {/* Ranking de Clientes - Right Column */}
          {reportType === 'Relatório de Vendas' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-bold text-[#1e293b]">Ranking de Clientes</h4>
                <Users size={16} className="text-slate-300" />
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Comprado (R$)</th>
                      <th className="pb-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qtd Pedidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topCustomers.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 text-[11px] font-bold text-slate-700">{idx + 1}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">{c.name}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700">
                          R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-right text-[11px] font-bold text-slate-700">{c.volume}</td>
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
                    {products.filter(p => p.status !== 'Inativo' && p.stock <= p.minStock).slice(0, 6).map((p, idx) => (
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
                    {products.filter(p => p.status !== 'Inativo' && p.stock <= p.minStock).length === 0 && (
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
                        formatter={(value: any) => `${Number(value).toFixed(2)}%`}
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
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalValue)}
                        </span>
                        <span className="text-[11px] font-bold text-brand-blue">({item.value}%)</span>
                      </div>
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

          {/* Ranking de Produtos - Bottom Right */}
          {reportType === 'Relatório de Vendas' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#1e293b]">Ranking de Produtos</h4>
                  <button 
                    onClick={() => onViewReport?.('Vendas por Produto')}
                    className="text-[10px] font-bold text-brand-blue hover:underline ml-2"
                  >
                    Ver Todos
                  </button>
                </div>
                <Package size={16} className="text-slate-300" />
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produto</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                      <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total (R$)</th>
                      <th className="pb-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margem (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topProducts.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 text-[11px] font-bold text-slate-700">{idx + 1}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700 truncate max-w-[150px]">{p.name}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700 text-center">{p.quantity}</td>
                        <td className="py-4 text-[11px] font-bold text-slate-700 text-right">
                          R$ {p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[11px] font-bold text-slate-700">{p.margin}%</span>
                            {p.margin > 25 ? <TrendingUp size={12} className="text-brand-green" /> : <TrendingDown size={12} className="text-brand-danger" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        const d = toLocalDateString(s.date);
        return d >= startDate && d <= endDate;
      }),
      filteredExpenses: expenses.filter(e => {
        const d = toLocalDateString(e.date);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isExplanationOpen, setIsExplanationOpen] = useState(true);

  // Filter sales that are within the period and not cancelled
  const filteredSales = sales.filter(s => {
    if (s.status === 'Cancelada') return false;
    const d = toLocalDateString(s.date);
    return d >= startDate && d <= endDate;
  });

  const productSales: Record<string, number> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
    });
  });

  const rawData = Object.entries(productSales)
    .map(([productId, qty]) => {
      const product = products.find(p => p.id === productId);
      const stock = product ? product.stock : 0;
      const turnoverVal = stock > 0 ? qty / stock : 0;
      
      let status = 'Médio Giro';
      let colorClass = 'text-blue-600 bg-blue-50 border-blue-105 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40';
      let barColor = 'bg-blue-500';
      
      if (turnoverVal >= 2.0) {
        status = 'Alto Giro';
        colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-105 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40';
        barColor = 'bg-emerald-500';
      } else if (turnoverVal < 0.5) {
        status = 'Baixo Giro';
        colorClass = 'text-rose-600 bg-rose-50 border-rose-105 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40';
        barColor = 'bg-rose-500';
      }

      return {
        id: productId,
        name: product ? product.name : 'Produto Desconhecido',
        sku: product ? product.sku : 'S/SKU',
        qty,
        stock,
        turnoverVal,
        turnoverFormated: `${turnoverVal.toFixed(1)}x`,
        status,
        colorClass,
        barColor
      };
    })
    .sort((a, b) => b.turnoverVal - a.turnoverVal);

  const filteredData = rawData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Computations for overall indicators
  const totalItemsSold = rawData.reduce((acc, curr) => acc + curr.qty, 0);
  const averageTurnover = rawData.length > 0 
    ? (rawData.reduce((acc, curr) => acc + curr.turnoverVal, 0) / rawData.length).toFixed(1)
    : '0.0';
  const highTurnoverCount = rawData.filter(item => item.turnoverVal >= 2.0).length;
  const lowTurnoverCount = rawData.filter(item => item.turnoverVal < 0.5).length;

  return (
    <div className="space-y-6">
      {/* Dynamic Informative Banner explaining Stock Turnover */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-900/10 border border-brand-border p-5 rounded-2xl relative overflow-hidden transition-all">
        <div className="absolute right-4 top-4 text-brand-blue/10 pointer-events-none">
          <RefreshCw size={92} className="rotate-12 opacity-10" />
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">O que é e como funciona o Giro de Estoque?</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aprenda a analisar a velocidade do seu capital de giro</p>
            </div>
          </div>
          <button 
            onClick={() => setIsExplanationOpen(!isExplanationOpen)}
            className="text-slate-400 hover:text-brand-text-main transition-colors text-xs font-black uppercase italic border border-brand-border px-3 py-1 rounded-lg bg-white dark:bg-slate-800"
          >
            {isExplanationOpen ? 'Ocultar Explicação' : 'Como Funciona?'}
          </button>
        </div>

        {isExplanationOpen && (
          <div className="mt-4 pt-4 border-t border-brand-border/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-brand-text-main/70 relative z-10 transition-all duration-300">
            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-ping"></span>
                CONCEITO PRÁTICO
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                O <strong className="font-bold text-brand-text-main">Giro de Estoque</strong> indica quantas vezes o seu estoque de um produto foi vendido e reposto no período selecionado. É o termômetro do seu investimento em mercadorias transformando-se em dinheiro.
              </p>
            </div>
            
            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                ALTO GIRO (&gt;= 2.0x)
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                Significa alta circulação e ótima aceitação de venda. <strong className="font-bold text-emerald-600">Estratégia:</strong> Evite faltas programando compras frequentes com menor intervalo, sem precisar inchar o estoque físico.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                BAIXO GIRO (&lt; 0.5x)
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                Indica mercadoria empacada prateleira e <strong className="font-bold text-rose-600">capital de giro travado</strong>. <strong className="font-bold text-brand-text-main">Estratégia:</strong> Crie ofertas agrupadas (combos), promoções de urgência ou reduza as novas compras deste item.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Cards Grid with Real Calculative Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Giro Médio */}
        <div className="bg-brand-card border border-brand-border p-5 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Giro Médio Geral</span>
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30 text-indigo-505">
              <Gauge size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-brand-blue tracking-tight leading-none mb-1">{averageTurnover}x</p>
          <p className="text-[9px] font-bold uppercase text-slate-400">Reposições por produto</p>
        </div>

        {/* KPI 2: Total Items Sold */}
        <div className="bg-brand-card border border-brand-border p-5 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Volume de Saída</span>
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/30 text-sky-505">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-1">{totalItemsSold} un</p>
          <p className="text-[9px] font-bold uppercase text-slate-400">Total vendido no período</p>
        </div>

        {/* KPI 3: High Turnover Count */}
        <div className="bg-brand-card border border-brand-border p-5 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Alto Giro (&gt;=2x)</span>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-505">
              <Zap size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mb-1">{highTurnoverCount}</p>
          <p className="text-[9px] font-bold uppercase text-slate-400">Produtos com bom giro</p>
        </div>

        {/* KPI 4: Low Turnover Count (Alert) */}
        <div className="bg-brand-card border border-brand-border p-5 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Baixo Giro (&lt;0.5x)</span>
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-505">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none mb-1">{lowTurnoverCount}</p>
          <p className="text-[9px] font-bold uppercase text-slate-400">Produtos com capital parado</p>
        </div>
      </div>

      {/* Control Panel with Search & Filter status */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-brand-card border border-brand-border p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-brand-border pl-9 pr-4 py-2 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="Pesquisar produto ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[9px] font-bold uppercase text-slate-400">Análise de velocidade:</span>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border border-emerald-100 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400">Alto &gt;= 2.0x</span>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border border-blue-100 bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400">Médio 0.5x - 2.0x</span>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border border-rose-100 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400">Baixo &lt; 0.5x</span>
        </div>
      </div>

      {/* Bento Grid layout of products analyzed with micro-visualizers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredData.length > 0 ? filteredData.map((item, i) => {
          // Progress speed calculated with limits from 0% to 100% for visual layout
          const progressPercentage = Math.min(100, Math.max(5, item.turnoverVal * 40));
          
          return (
            <div key={i} className="p-5 rounded-2xl border border-brand-border bg-brand-card flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-black text-brand-text-main uppercase italic truncate group-hover:text-brand-blue transition-colors" title={item.name}>
                    {item.name}
                  </h5>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    SKU: {item.sku}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border tracking-wider bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-900 dark:border-slate-800`}>
                    Giro {item.turnoverFormated}
                  </span>
                </div>
              </div>

              {/* Statistical ratio display */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-brand-border/60 mb-4 text-xs">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vendidos no Período</p>
                  <p className="text-sm font-black text-brand-text-main mt-0.5">{item.qty} un</p>
                </div>
                <div className="border-l border-brand-border/60 pl-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estoque Atual</p>
                  <p className="text-sm font-black text-brand-text-main mt-0.5">{item.stock} un</p>
                </div>
              </div>

              {/* Progress bar visualizer */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Velocidade de Reposição</span>
                  <span className="font-black text-brand-blue uppercase italic">{item.status}</span>
                </div>
                <div className="w-full bg-slate-150 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", item.barColor)}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-900/20 border border-brand-border rounded-2xl text-slate-400 font-bold uppercase italic text-xs">
            Nenhuma venda registrada ou correspondente ao filtro de pesquisa.
          </div>
        )}
      </div>
    </div>
  );
}

function AbcCustomersReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, customers } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = toLocalDateString(s.date);
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

function ClubCustomersReport() {
  const { customers } = useERP();
  const clubMembers = customers.filter(c => c.isClubMember);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
          <p className="text-[10px] font-black uppercase italic text-blue-600 tracking-widest mb-1">Total Membros</p>
          <h4 className="text-3xl font-black text-slate-800">{clubMembers.length}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] font-black uppercase italic text-emerald-600 tracking-widest mb-1">Taxa de Adesão</p>
          <h4 className="text-3xl font-black text-slate-800">
            {customers.length > 0 ? ((clubMembers.length / customers.length) * 100).toFixed(1) : 0}%
          </h4>
        </div>
        <div className="p-6 rounded-3xl bg-purple-50 border border-purple-100">
          <p className="text-[10px] font-black uppercase italic text-purple-600 tracking-widest mb-1">Novos (Mês)</p>
          <h4 className="text-3xl font-black text-slate-800">
            {clubMembers.filter(c => {
              if (!c.clubJoinDate) return false;
              const joinDate = new Date(c.clubJoinDate);
              const now = new Date();
              return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
            }).length}
          </h4>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">CPF</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Adesão</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clubMembers.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-800 uppercase">{member.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{member.phone}</p>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-600 text-center">{member.document}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-600 text-center">
                  {member.clubJoinDate ? new Date(member.clubJoinDate).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase italic">
                    Ativo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClubSalesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, customers } = useERP();
  
  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  const clubSales = filteredSales.filter(s => {
    const customer = customers.find(c => c.id === s.customerId);
    return customer?.isClubMember;
  });

  const normalSales = filteredSales.filter(s => {
    const customer = customers.find(c => c.id === s.customerId);
    return !customer?.isClubMember;
  });

  const totalClubRevenue = clubSales.reduce((acc, s) => acc + s.total, 0);
  const totalNormalRevenue = normalSales.reduce((acc, s) => acc + s.total, 0);

  const chartData = [
    { name: 'Membros Clube', value: totalClubRevenue, color: '#1E5EFF' },
    { name: 'Clientes Comuns', value: totalNormalRevenue, color: '#94A3B8' }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h4 className="text-sm font-black text-slate-800 uppercase italic mb-6">Distribuição de Receita</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest mb-1">Ticket Médio Clube</p>
            <h4 className="text-2xl font-black text-slate-800">
              R$ {clubSales.length > 0 ? (totalClubRevenue / clubSales.length).toLocaleString('pt-BR') : '0,00'}
            </h4>
          </div>
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest mb-1">Ticket Médio Comum</p>
            <h4 className="text-2xl font-black text-slate-800">
              R$ {normalSales.length > 0 ? (totalNormalRevenue / normalSales.length).toLocaleString('pt-BR') : '0,00'}
            </h4>
          </div>
          <div className="p-6 rounded-3xl bg-brand-blue/5 border border-brand-blue/10">
            <p className="text-[10px] font-black uppercase italic text-brand-blue tracking-widest mb-1">Representatividade</p>
            <h4 className="text-2xl font-black text-brand-blue">
              {filteredSales.length > 0 ? ((totalClubRevenue / (totalClubRevenue + totalNormalRevenue)) * 100).toFixed(1) : 0}%
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommissionsReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, systemUsers, employees } = useERP();
  
  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

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
  
  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

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
  
  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  const hourCounts: Record<number, number> = {};
  let totalSales = 0;
  
  filteredSales.forEach(sale => {
    const dateObj = new Date(sale.date);
    const hour = dateObj.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    totalSales++;
  });

  const hours = Array.from({ length: 18 }, (_, i) => i + 6);
  const chartData = hours.map(hour => ({
    hour: `${hour}h`,
    vendas: hourCounts[hour] || 0,
    fullHour: hour
  }));

  const maxVendas = Math.max(...Object.values(hourCounts), 0);
  const peakHourRecord = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0] || ["--", 0];
  const peakHour = peakHourRecord[0];
  const avgVendas = hours.length > 0 ? (totalSales / hours.length).toFixed(1) : 0;

  const morningSales = hours.filter(h => h < 12).reduce((sum, h) => sum + (hourCounts[h] || 0), 0);
  const afternoonSales = hours.filter(h => h >= 12 && h < 18).reduce((sum, h) => sum + (hourCounts[h] || 0), 0);
  const eveningSales = hours.filter(h => h >= 18).reduce((sum, h) => sum + (hourCounts[h] || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto"
    >
      <div className="bg-white rounded-[3rem] border border-brand-border shadow-2xl overflow-hidden">
        {/* Cinematic Header */}
        <div className="bg-slate-700 px-10 py-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
              <path fill="#3b82f6" d="M47.7,-62.4C61.4,-52.1,72.2,-37.9,76.5,-22.3C80.8,-6.7,78.6,10.2,71.4,24.8C64.2,39.4,52,51.7,37.9,59.3C23.8,66.9,7.8,69.9,-8,68.6C-23.8,67.3,-39.3,61.8,-51.1,51.8C-62.9,41.8,-71.1,27.3,-73.4,12.3C-75.7,-2.7,-72.1,-18.2,-64,-31.6C-55.9,-44.9,-43.3,-56.1,-29.6,-66.4C-15.9,-76.7,0,-86.1,15.9,-83.4C31.8,-80.7,47.7,-62.4Z" transform="translate(100 100)" />
            </svg>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-brand-blue/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-brand-blue">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Central de Comando</h3>
                  <p className="text-brand-blue-hover text-[10px] font-black uppercase mt-1 tracking-widest">Análise de Tráfego de Vendas</p>
                </div>
              </div>
            </div>

            <div className="flex gap-8 border-t md:border-t-0 border-white/10 pt-6 md:pt-0">
              <div className="text-center group">
                <p className="text-[10px] font-black text-white/40 uppercase italic mb-1 group-hover:text-brand-blue transition-colors">Vendas</p>
                <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{totalSales}</p>
              </div>
              <div className="text-center border-l border-white/10 pl-8 group">
                <p className="text-[10px] font-black text-white/40 uppercase italic mb-1 group-hover:text-brand-blue transition-colors">Pico</p>
                <div className="flex items-baseline justify-center gap-0.5">
                  <p className="text-3xl font-black text-brand-blue tracking-tighter tabular-nums">{peakHour}</p>
                  <span className="text-xs font-black text-white italic">h</span>
                </div>
              </div>
              <div className="text-center border-l border-white/10 pl-8 group">
                <p className="text-[10px] font-black text-white/40 uppercase italic mb-1 group-hover:text-brand-blue transition-colors">Média</p>
                <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{avgVendas}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Detailed Flow Section */}
          <div className="lg:col-span-8 flex flex-col justify-between h-[450px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-1 h-8 bg-brand-blue rounded-full" />
                <div>
                  <h4 className="text-lg font-black text-brand-text-main uppercase italic">Volume Estratégico</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ondas de consumo por hora</p>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-brand-blue" />
                  <div className="w-2 h-2 rounded-full bg-brand-blue/30" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase italic">Dados em tempo real</span>
              </div>
            </div>

            <div className="flex-1 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b', fontFamily: 'var(--font-mono)' }}
                    interval={1}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b', fontFamily: 'var(--font-mono)' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-brand-text-main/90 backdrop-blur-xl p-5 border border-white/10 rounded-3xl shadow-2xl min-w-[160px] animate-in fade-in zoom-in duration-300">
                             <div className="flex justify-between items-center mb-3">
                               <span className="text-[11px] font-black text-white italic">{payload[0].payload.hour}</span>
                               <span className="text-[9px] font-bold text-brand-blue uppercase px-2 py-0.5 bg-brand-blue/10 rounded-full">Análise</span>
                             </div>
                             <div className="space-y-1">
                               <p className="text-3xl font-black text-white tabular-nums leading-none">{payload[0].value}</p>
                               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vendas Concluídas</p>
                             </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="#3b82f6" 
                    strokeWidth={5}
                    fill="url(#areaGradient)" 
                    animationDuration={2000}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Performance Panel */}
          <div className="lg:col-span-4 space-y-8">
            <div className="grid grid-cols-2 gap-4">
               {[
                 { label: 'Matutino', val: morningSales, icon: <Zap size={14}/>, color: 'text-brand-blue' },
                 { label: 'Vespertino', val: afternoonSales, icon: <TrendingUp size={14}/>, color: 'text-emerald-500' },
                 { label: 'Noturno', val: eveningSales, icon: <Clock size={14}/>, color: 'text-brand-text-main' },
                 { label: 'Pico', val: peakHour + 'h', icon: <Target size={14}/>, color: 'text-brand-blue' }
               ].map((item, idx) => (
                 <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-3xl group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-default">
                    <div className={cn("w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", item.color)}>
                      {item.icon}
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-0.5">{item.label}</p>
                    <p className="text-xl font-black text-brand-text-main tabular-nums">{item.val}</p>
                 </div>
               ))}
            </div>

            <div className="bg-slate-700 rounded-[2.5rem] p-8 text-white relative shadow-2xl overflow-hidden group">
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl group-hover:bg-brand-blue/20 transition-colors" />
               <div className="relative z-10">
                 <h5 className="text-[10px] font-black text-brand-blue uppercase italic tracking-widest mb-4">Relatório de Intensidade</h5>
                 <div className="space-y-5">
                   {[
                     { label: 'Manhã', val: morningSales },
                     { label: 'Tarde', val: afternoonSales },
                     { label: 'Noite', val: eveningSales }
                   ].map((p, i) => {
                     const total = totalSales || 1;
                     const percentage = Math.round((p.val / total) * 100);
                     return (
                       <div key={i}>
                         <div className="flex justify-between items-end mb-2 px-1">
                           <span className="text-[9px] font-black uppercase text-white/40">{p.label}</span>
                           <span className="text-xs font-black text-brand-blue tabular-nums">{percentage}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${percentage}%` }}
                             transition={{ duration: 1.5, delay: i * 0.2 }}
                             className="h-full bg-brand-blue rounded-full"
                           />
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2.5rem] flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Gauge size={24} />
              </div>
              <div>
                <h5 className="text-xs font-black text-emerald-900 uppercase italic">Operação Otimizada</h5>
                <p className="text-[10px] font-bold text-emerald-700/70 leading-tight mt-0.5">O pico às <span className="font-black">{peakHour}h</span> sugere reforço no atendimento neste intervalo.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pro-Matrix Saturation View */}
        <div className="bg-slate-50 p-10 border-t border-slate-100">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h4 className="text-xs font-black text-brand-text-main uppercase italic italic tracking-wider">Matriz de Saturação Horária</h4>
               <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 leading-none">Mapa térmico de ocupação</p>
             </div>
             <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                 <span className="text-[8px] font-black text-slate-400 uppercase italic">Sem Vendas</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                 <span className="text-[8px] font-black text-slate-400 uppercase italic">Pico de Vendas</span>
               </div>
             </div>
           </div>

           <div className="grid grid-cols-9 md:grid-cols-18 gap-3">
             {hours.map((hour, idx) => {
               const count = hourCounts[hour] || 0;
               const intensity = maxVendas > 0 ? (count / maxVendas) : 0;
               const isPeak = hour.toString() === peakHour;

               return (
                 <motion.div 
                   key={hour}
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ delay: idx * 0.03 }}
                   className="flex flex-col items-center gap-2 group"
                 >
                   <div 
                     className={cn(
                       "w-full aspect-[4/5] rounded-xl flex flex-col items-center justify-end p-2 transition-all duration-500 relative overflow-hidden border",
                       count > 0 ? "border-brand-blue/10 shadow-lg shadow-brand-blue/5" : "border-slate-200/50"
                     )}
                     style={{ 
                       backgroundColor: count > 0 ? `rgba(59, 130, 246, ${Math.max(0.05, intensity)})` : 'white' 
                     }}
                   >
                     {isPeak && (
                       <div className="absolute top-1 right-1">
                         <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-ping absolute" />
                         <div className="w-1.5 h-1.5 bg-brand-blue rounded-full relative" />
                       </div>
                     )}
                     <span className={cn(
                       "text-[12px] font-black tabular-nums transition-colors duration-500",
                       count > 0 ? "text-brand-text-main" : "text-slate-300"
                     )}>{count}</span>
                   </div>
                   <span className={cn(
                     "text-[9px] font-black uppercase tracking-tighter transition-colors",
                     count > 0 ? "text-brand-text-main" : "text-slate-400"
                   )}>{hour}h</span>
                 </motion.div>
               );
             })}
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function AbcProductsReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<'All' | 'A' | 'B' | 'C'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExplanationOpen, setIsExplanationOpen] = useState(true);
  const itemsPerPage = 10;
  
  // Filter sales within the period that are not cancelled
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status === 'Cancelada') return false;
      const d = s.date.split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  const rawData = useMemo(() => {
    const productTotals: Record<string, number> = {};
    const productQtys: Record<string, number> = {};
    let totalRevenue = 0;

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        productTotals[item.productId] = (productTotals[item.productId] || 0) + itemTotal;
        productQtys[item.productId] = (productQtys[item.productId] || 0) + item.quantity;
        totalRevenue += itemTotal;
      });
    });

    const sortedProducts = Object.entries(productTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([productId, total]) => {
        const product = products.find(p => p.id === productId);
        return {
          id: productId,
          name: product ? product.name : 'Produto Desconhecido',
          sku: product ? product.sku : 'S/SKU',
          stock: product ? product.stock : 0,
          qtySold: productQtys[productId] || 0,
          total
        };
      });

    let cumulative = 0;
    return sortedProducts.map((p) => {
      cumulative += p.total;
      const percent = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
      const individualPercent = totalRevenue > 0 ? (p.total / totalRevenue) * 100 : 0;
      
      let cls = 'C';
      let tagColor = 'text-slate-600 bg-slate-100 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200 dark:border-slate-800';
      
      if (percent <= 80) {
        cls = 'A';
        tagColor = 'text-emerald-700 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40';
      } else if (percent <= 95) {
        cls = 'B';
        tagColor = 'text-brand-blue bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40';
      }

      return {
        ...p,
        cumulative,
        percent,
        individualPercent,
        class: cls,
        tagColor,
        formattedTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.total)
      };
    });
  }, [filteredSales, products]);

  // General Metrics computed on full dataset
  const stats = useMemo(() => {
    const totalRev = rawData.reduce((acc, p) => acc + p.total, 0);
    const classA = rawData.filter(p => p.class === 'A');
    const classB = rawData.filter(p => p.class === 'B');
    const classC = rawData.filter(p => p.class === 'C');

    const revA = classA.reduce((acc, p) => acc + p.total, 0);
    const revB = classB.reduce((acc, p) => acc + p.total, 0);
    const revC = classC.reduce((acc, p) => acc + p.total, 0);

    return {
      totalRevenue: totalRev,
      formattedTotalRevenue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRev),
      countA: classA.length,
      pctA: totalRev > 0 ? (revA / totalRev) * 100 : 0,
      countB: classB.length,
      pctB: totalRev > 0 ? (revB / totalRev) * 100 : 0,
      countC: classC.length,
      pctC: totalRev > 0 ? (revC / totalRev) * 100 : 0,
    };
  }, [rawData]);

  // Apply search filtering and class tabs
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClass === 'All' || item.class === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [rawData, searchTerm, selectedClass]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  return (
    <div className="space-y-6">
      {/* Dynamic Informative Banner explaining ABC Curve */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-900/10 border border-brand-border p-5 rounded-2xl relative overflow-hidden transition-all">
        <div className="absolute right-4 top-4 text-brand-blue/10 pointer-events-none">
          <TrendingUp size={92} className="rotate-12 opacity-10" />
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">Como analisar a Curva ABC de Produtos?</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">A regra de Pareto (80/20) aplicada no faturamento da sua loja</p>
            </div>
          </div>
          <button 
            onClick={() => setIsExplanationOpen(!isExplanationOpen)}
            className="text-slate-400 hover:text-brand-text-main transition-colors text-xs font-black uppercase italic border border-brand-border px-3 py-1 rounded-lg bg-white dark:bg-slate-800"
          >
            {isExplanationOpen ? 'Ocultar Explicação' : 'Como Funciona?'}
          </button>
        </div>

        {isExplanationOpen && (
          <div className="mt-4 pt-4 border-t border-brand-border/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-brand-text-main/70 relative z-10 transition-all duration-300">
            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                CLASSE A — ALTO IMPACTO (Até 80%)
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                Poucos produtos que acumulam juntos cerca de <strong className="font-bold text-emerald-600">80% do seu faturamento</strong>. São vitais para o negócio. <strong className="font-bold">Estratégia:</strong> Não podem faltar no estoque (ruptura zero) e merecem maior margem de negociação com fornecedores.
              </p>
            </div>
            
            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                CLASSE B — INTERMEDIÁRIOS (De 80% a 95%)
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                Produtos de importância média que representam os próximos <strong className="font-bold text-brand-blue">15% do seu faturamento</strong>. <strong className="font-bold">Estratégia:</strong> Devem ser repostos com atenção moderada, mantendo um estoque de segurança razoável.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                CLASSE C — BAIXO IMPACTO (De 95% a 100%)
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                Grande variedade de produtos que respondem pelos últimos <strong className="font-bold text-slate-600 dark:text-slate-400">5% do faturamento</strong>. <strong className="font-bold">Estratégia:</strong> Evite excesso de estoque físico para não travar capital, compre sob demanda ou configure períodos longos de reposição.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Segmented Class Card KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total KPI */}
        <div className="p-5 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-brand-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Faturamento no Período</span>
              <DollarSign size={16} className="text-slate-400" />
            </div>
            <p className="text-xl font-black text-brand-blue truncate" title={stats.formattedTotalRevenue}>
              {stats.formattedTotalRevenue}
            </p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            Base Calculada: {rawData.length} itens vendidos
          </p>
        </div>

        {/* Classe A */}
        <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Classe A — Alta Importância</span>
              <Zap size={16} className="text-emerald-500" />
            </div>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">
              {stats.pctA.toFixed(1)}% <span className="text-xs font-normal text-slate-400">do faturamento</span>
            </p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            {stats.countA} produtos ({(rawData.length > 0 ? (stats.countA / rawData.length) * 100 : 0).toFixed(0)}% do mix)
          </p>
        </div>

        {/* Classe B */}
        <div className="p-5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-blue">Classe B — Média Importância</span>
              <Layers size={16} className="text-brand-blue" />
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-350">
              {stats.pctB.toFixed(1)}% <span className="text-xs font-normal text-slate-400">do faturamento</span>
            </p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            {stats.countB} produtos ({(rawData.length > 0 ? (stats.countB / rawData.length) * 100 : 0).toFixed(0)}% do mix)
          </p>
        </div>

        {/* Classe C */}
        <div className="p-5 rounded-2xl bg-slate-100/30 dark:bg-slate-900/20 border border-brand-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Classe C — Baixa Importância</span>
              <ShoppingBag size={16} className="text-slate-400" />
            </div>
            <p className="text-xl font-black text-slate-500">
              {stats.pctC.toFixed(1)}% <span className="text-xs font-normal text-slate-400">do faturamento</span>
            </p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            {stats.countC} produtos ({(rawData.length > 0 ? (stats.countC / rawData.length) * 100 : 0).toFixed(0)}% do mix)
          </p>
        </div>
      </div>

      {/* Control Panel: Search + Class Filtering tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-brand-card border border-brand-border p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-brand-border pl-9 pr-4 py-2 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="Pesquisar por produto ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 self-stretch md:self-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[9px] font-bold uppercase text-slate-400 whitespace-nowrap mr-1">Filtrar Classe:</span>
          <button 
            onClick={() => setSelectedClass('All')}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap", 
              selectedClass === 'All' 
                ? "bg-brand-blue text-white shadow-sm" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Todos ({rawData.length})
          </button>
          <button 
            onClick={() => setSelectedClass('A')}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap border border-transparent", 
              selectedClass === 'A' 
                ? "bg-emerald-500 text-white shadow-sm" 
                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
            )}
          >
            Classe A ({stats.countA})
          </button>
          <button 
            onClick={() => setSelectedClass('B')}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap border border-transparent", 
              selectedClass === 'B' 
                ? "bg-brand-blue text-white shadow-sm" 
                : "text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/10"
            )}
          >
            Classe B ({stats.countB})
          </button>
          <button 
            onClick={() => setSelectedClass('C')}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap border border-transparent", 
              selectedClass === 'C' 
                ? "bg-slate-500 text-white shadow-sm" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Classe C ({stats.countC})
          </button>
        </div>
      </div>

      {/* Main Table Segment */}
      <div className="overflow-x-auto min-w-full rounded-2xl border border-brand-border bg-brand-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-slate-50/50 dark:bg-slate-900/10">
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest pl-6">Rank & Produto</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Classe</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Qtd Vendida</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right">Faturamento</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right pr-6">Acumulado (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {paginatedData.length > 0 ? paginatedData.map((row, i) => {
              const globalIndex = rawData.findIndex(item => item.id === row.id) + 1;
              return (
                <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/5 transition-colors">
                  {/* Rank and Product Details */}
                  <td className="p-4 pl-6 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black font-mono text-slate-400 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-md shrink-0">
                        #{globalIndex}
                      </span>
                      <div className="min-w-0">
                        <p className="font-black text-brand-text-main uppercase italic truncate block max-w-[240px] md:max-w-xs">{row.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">SKU: {row.sku} • Est. Físico: {row.stock} un</p>
                      </div>
                    </div>
                  </td>

                  {/* Class Badge */}
                  <td className="p-4 text-center">
                    <span className={cn("px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider whitespace-nowrap", row.tagColor)}>
                      Classe {row.class}
                    </span>
                  </td>

                  {/* Qty Sold */}
                  <td className="p-4 text-center font-bold text-slate-600 dark:text-slate-300 text-xs">
                    {row.qtySold} un
                  </td>

                  {/* Faturamento (Value + Percentage contribution of total revenue) */}
                  <td className="p-4 text-right">
                    <p className="text-sm font-black text-brand-blue">{row.formattedTotal}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                      Contribuí com {row.individualPercent.toFixed(1)}%
                    </p>
                  </td>

                  {/* Cumulative % with visual Progress bar */}
                  <td className="p-4 text-right pr-6 min-w-[140px]">
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-300">{row.percent.toFixed(1)}%</p>
                      <div className="w-full max-w-[120px] bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden block">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-300", 
                            row.class === 'A' ? 'bg-emerald-500' : row.class === 'B' ? 'bg-brand-blue' : 'bg-slate-400'
                          )}
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm font-black text-slate-400 uppercase italic">
                  Nenhum produto correspondente aos filtros de pesquisa selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Unified Pagination matching Products Management exactly */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-brand-border flex items-center justify-between rounded-b-2xl">
            <p className="text-sm text-slate-500 font-medium">
              Mostrando {paginatedData.length} de {filteredData.length} produtos
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-slate-400 px-1">...</span>
                        )}
                        <button 
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                            page === currentPage 
                              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" 
                              : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LossesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { losses, products, sales } = useERP();

  const filteredLosses = losses.filter(l => {
    if (!l.date) return false;
    const d = toLocalDateString(l.date);
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
    const d = toLocalDateString(log.date);
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
    const d = toLocalDateString(s.date);
    return d >= startDate && d <= endDate;
  });

  const totalSalesAmount = filteredSales.reduce((acc, s) => acc + s.total, 0);

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
      percentage: totalSalesAmount > 0 ? ((value / totalSalesAmount) * 100).toFixed(1) : '0.0',
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
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} formatter={(value: any, name: string, props: any) => [
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0) + ` (${props.payload.percentage}%)`,
                  'Total'
                ]} />
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-brand-blue">{pay.total}</span>
                <span className="text-xs font-bold text-brand-text-sec">({pay.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CriticalStockReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { products } = useERP();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const lowStockProducts = useMemo(() => {
    return products
      .filter(p => p.status !== 'Inativo' && p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  // Reset to page 1 if the dataset changes
  useEffect(() => {
    setCurrentPage(1);
  }, [lowStockProducts]);

  const totalPages = Math.ceil(lowStockProducts.length / itemsPerPage);
  
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return lowStockProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [lowStockProducts, currentPage, itemsPerPage]);

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
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Produto</th>
              <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Estoque Mínimo</th>
              <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Estoque Atual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedProducts.length > 0 ? paginatedProducts.map((row, i) => (
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

      {totalPages > 1 && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between rounded-b-2xl mt-4">
          <p className="text-sm text-slate-500 font-medium">
            Mostrando {paginatedProducts.length} de {lowStockProducts.length} produtos
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="text-slate-400 px-1">...</span>
                      )}
                      <button 
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                          page === currentPage 
                            ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" 
                            : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                        )}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
              </button>
            </div>
          </div>
        </div>
      )}
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
  
  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

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

  const filteredReturns = React.useMemo(() => {
    return returns.filter(r => {
      if (!r.date) return false;
      const d = toLocalDateString(r.date);
      return d >= startDate && d <= endDate;
    });
  }, [returns, startDate, endDate]);

  const getProductNames = (items: any[]) => {
    return (items || []).map(item => {
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
                <td className="py-4 text-sm font-medium text-slate-600">
                  {ret.date ? new Date(ret.date).toLocaleDateString('pt-BR') : 'N/A'}
                </td>
                <td className="py-4 text-sm font-bold text-slate-800">{ret.type}</td>
                <td className="py-4 text-sm font-medium text-slate-600">{getProductNames(ret.items)}</td>
                <td className="py-4 text-sm font-medium text-slate-600">{ret.refundMethod}</td>
                <td className="py-4 text-right text-sm font-black text-brand-danger">{formatCurrency(Number(ret.total || 0))}</td>
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
  
  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  const costData = React.useMemo(() => {
    const stats: Record<string, { name: string, qty: number, totalCost: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cost = Number(item.costPrice || 0) || (product ? Number(product.costPrice || 0) : 0);
        if (!stats[item.productId]) {
          stats[item.productId] = { name: product?.name || 'Produto Desconhecido', qty: 0, totalCost: 0 };
        }
        stats[item.productId].qty += Number(item.quantity || 0);
        stats[item.productId].totalCost += cost * Number(item.quantity || 0);
      });
    });
    return Object.values(stats)
      .filter(item => item.qty > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
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
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

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

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const currentPurchases = filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
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
            {currentPurchases.map((purchase, idx) => {
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
            {currentPurchases.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 italic">Nenhuma compra encontrada no período.</td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredPurchases.length > 0 && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              Mostrando {currentPurchases.length} de {filteredPurchases.length} compras
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-slate-400 px-1">...</span>
                        )}
                        <button 
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                            page === currentPage ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} className="text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GeneralStockReport() {
  const { products, categorias, subcategorias, suppliers } = useERP();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedSupplier]);

  const reportData = React.useMemo(() => {
    return products
      .filter(p => p.status !== 'Inativo')
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
          matchesSupplier = p.supplier === selectedSupplier;
        }

        return matchesSearch && matchesCategory && matchesSupplier;
      })
      .map(p => {
        const sub = subcategorias.find(s => s.id === p.subcategoria_id);
        const cat = categorias.find(c => c.id === sub?.categoria_id);
        return {
          name: p.name,
          sku: p.sku,
          category: cat?.nome || 'Sem Categoria',
          subcategory: sub?.nome || 'Sem Subcategoria',
          supplier: p.supplier || 'Sem Fornecedor',
          stock: p.stock,
          minStock: p.minStock,
          costPrice: p.costPrice,
          salePrice: p.salePrice,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, selectedCategory, selectedSupplier, subcategorias, categorias]);

  const totals = reportData.reduce((acc, item) => ({
    stock: acc.stock + item.stock,
    cost: acc.cost + (item.stock * item.costPrice),
    sale: acc.sale + (item.stock * item.salePrice)
  }), { stock: 0, cost: 0, sale: 0 });

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100 text-center">
        <Package size={48} className="mx-auto text-brand-blue mb-4" />
        <h4 className="text-xl font-bold text-slate-800">Relatório de Estoque Geral</h4>
        <p className="text-sm text-slate-500 mt-2">Listagem completa de todos os produtos e suas quantidades em estoque.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Itens Físicos</p>
          <h4 className="text-2xl font-black text-slate-800">{totals.stock.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</h4>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Total do Estoque</p>
          <h4 className="text-2xl font-black text-slate-800">R$ {totals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor de Venda Total</p>
          <h4 className="text-2xl font-black text-brand-blue">R$ {totals.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
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
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all placeholder:text-slate-300"
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
              className="w-full pl-10 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 appearance-none transition-all"
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
              className="w-full pl-10 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 appearance-none transition-all"
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
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right">Preço Custo</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right">Preço Venda</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Estoque Atual</th>
              <th className="px-6 py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(() => {
              const totalPages = Math.ceil(reportData.length / itemsPerPage);
              const currentItems = reportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
              
              if (reportData.length === 0) {
                return (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Search size={32} className="text-slate-200" />
                        <p className="text-sm text-slate-400 italic font-medium">Nenhum produto encontrado para &quot;{searchTerm}&quot;</p>
                      </div>
                    </td>
                  </tr>
                );
              }

              return currentItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-700 uppercase italic">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">SKU: {item.sku}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-600">{item.category}</div>
                    <div className="text-[10px] text-slate-400">{item.subcategory}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-500">R$ {item.costPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">R$ {item.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "text-sm font-black",
                      item.stock <= item.minStock ? "text-rose-500" : "text-slate-700"
                    )}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black",
                      item.stock <= 0 ? "bg-rose-50 text-rose-600" :
                      item.stock <= item.minStock ? "bg-amber-50 text-amber-600" :
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      {item.stock <= 0 ? 'Sem Estoque' : item.stock <= item.minStock ? 'Estoque Baixo' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
        
        {reportData.length > 0 && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              Mostrando {Math.min(reportData.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(reportData.length, currentPage * itemsPerPage)} de {reportData.length} registros
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(reportData.length / itemsPerPage) }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === Math.ceil(reportData.length / itemsPerPage) || Math.abs(page - currentPage) <= 1)
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-slate-400 px-1">...</span>
                        )}
                        <button 
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                            page === currentPage ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(reportData.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(reportData.length / itemsPerPage) || Math.ceil(reportData.length / itemsPerPage) === 0}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} className="text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StockProfitReport() {
  const { products, categorias, subcategorias, suppliers, pricingSettings } = useERP();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedSupplier]);

  const reportData = React.useMemo(() => {
    return products
      .filter(p => p.status !== 'Inativo' && p.stock > 0)
      .filter(p => {
        // Exclude kits because their components are already listed individually
        if (p.product_type === 'KIT' || (p.composition && p.composition.length > 0)) return false;

        // Exclude virtual/fractioned products (which have a physical base product) to avoid double counting stock value
        if (p.base_product_id) return false;

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
        
        let margin = 0;
        if (pricingSettings?.defaultMethod === 'markup') {
          margin = p.costPrice > 0 ? ((p.salePrice - p.costPrice) / p.costPrice) * 100 : 0;
        } else {
          margin = p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : 0;
        }

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
  }, [products, searchTerm, selectedCategory, selectedSupplier, subcategorias, pricingSettings]);

  const totals = reportData.reduce((acc, item) => ({
    cost: acc.cost + item.totalCost,
    sale: acc.sale + item.totalSale,
    profit: acc.profit + item.potentialProfit
  }), { cost: 0, sale: 0, profit: 0 });

  let totalMargin = 0;
  if (pricingSettings?.defaultMethod === 'markup') {
    totalMargin = totals.cost > 0 ? (totals.profit / totals.cost) * 100 : 0;
  } else {
    totalMargin = totals.sale > 0 ? (totals.profit / totals.sale) * 100 : 0;
  }

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
            {(() => {
              const totalPages = Math.ceil(reportData.length / itemsPerPage);
              const currentItems = reportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
              
              if (reportData.length === 0) {
                return (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Search size={32} className="text-slate-200" />
                        <p className="text-sm text-slate-400 italic font-medium">Nenhum produto encontrado para &quot;{searchTerm}&quot;</p>
                      </div>
                    </td>
                  </tr>
                );
              }

              return currentItems.map((item, idx) => (
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
                      {item.margin.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
        
        {reportData.length > 0 && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              Mostrando {Math.min(reportData.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(reportData.length, currentPage * itemsPerPage)} de {reportData.length} registros
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(reportData.length / itemsPerPage) }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === Math.ceil(reportData.length / itemsPerPage) || Math.abs(page - currentPage) <= 1)
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-slate-400 px-1">...</span>
                        )}
                        <button 
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                            page === currentPage ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(reportData.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(reportData.length / itemsPerPage) || Math.ceil(reportData.length / itemsPerPage) === 0}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} className="text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CashFlowReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, expenses } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | 'Entrada' | 'Saída'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExplanationOpen, setIsExplanationOpen] = useState(true);
  const itemsPerPage = 10;

  // Filter sales and expenses by date matching exactly what other reports do
  const { filteredSales, filteredExpenses } = useMemo(() => {
    return {
      filteredSales: sales.filter(s => {
        if (s.status === 'Cancelada') return false; // Ignore cancelled sales
        const d = toLocalDateString(s.date);
        return d >= startDate && d <= endDate;
      }),
      filteredExpenses: expenses.filter(e => {
        const d = toLocalDateString(e.date);
        return d >= startDate && d <= endDate;
      })
    };
  }, [sales, expenses, startDate, endDate]);

  // Compute exact KPI stats
  const stats = useMemo(() => {
    const totalInflows = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalOutflows = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const balance = totalInflows - totalOutflows;
    const margin = totalInflows > 0 ? (balance / totalInflows) * 100 : 0;

    return {
      totalInflows,
      totalOutflows,
      balance,
      margin,
      formattedInflows: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInflows),
      formattedOutflows: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOutflows),
      formattedBalance: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance),
    };
  }, [filteredSales, filteredExpenses]);

  // Prepare ledger chronology of all inflows (Sales) and outflows (Expenses)
  const ledger = useMemo(() => {
    const saleItems = filteredSales.map(s => ({
      id: s.id,
      type: 'Entrada' as const,
      description: `Recebimento de Venda #${s.id.slice(0, 8)} ${s.customerName ? `(${s.customerName})` : ''}`,
      category: 'Vendas de Produtos',
      date: s.date.split('T')[0],
      amount: s.total,
      tagColor: 'text-emerald-700 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40',
    }));

    const expenseItems = filteredExpenses.map(e => ({
      id: e.id,
      type: 'Saída' as const,
      description: e.description || 'Despesa Não Identificada',
      category: e.category || 'Despesas Compartilhadas',
      date: e.date.split('T')[0],
      amount: e.amount,
      tagColor: 'text-rose-700 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40',
    }));

    return [...saleItems, ...expenseItems].sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSales, filteredExpenses]);

  // Dynamic Grouping of Cash Flow to match Chart Views perfectly
  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      // Group by daily ticks
      const daysMap: Record<string, { inflows: number; outflows: number }> = {};
      const scanDate = new Date(start);
      while (scanDate <= end) {
        const key = toLocalDateString(scanDate.toISOString());
        daysMap[key] = { inflows: 0, outflows: 0 };
        scanDate.setDate(scanDate.getDate() + 1);
      }

      filteredSales.forEach(s => {
        const key = toLocalDateString(s.date);
        if (daysMap[key]) daysMap[key].inflows += s.total;
      });

      filteredExpenses.forEach(e => {
        const key = toLocalDateString(e.date);
        if (daysMap[key]) daysMap[key].outflows += e.amount;
      });

      return Object.entries(daysMap).map(([key, val]) => {
        const parts = key.split('-');
        return {
          name: parts.length === 3 ? `${parts[2]}/${parts[1]}` : key,
          Entradas: val.inflows,
          Saídas: val.outflows,
          Saldo: val.inflows - val.outflows,
        };
      });
    }

    // Default: Group into 4 periods dynamically
    const totalDuration = end.getTime() - start.getTime();
    const periodDuration = totalDuration / 4;

    return [0, 1, 2, 3].map(i => {
      const pStart = new Date(start.getTime() + (i * periodDuration));
      const pEnd = new Date(start.getTime() + ((i + 1) * periodDuration));

      const pSales = filteredSales.filter(s => {
        const d = new Date(s.date);
        return d >= pStart && d < pEnd;
      }).reduce((sum, s) => sum + s.total, 0);

      const pExpenses = filteredExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= pStart && d < pEnd;
      }).reduce((sum, e) => sum + e.amount, 0);

      let label = `Período ${i + 1}`;
      if (diffDays >= 25 && diffDays <= 35) {
        label = `Semana ${i + 1}`;
      } else {
        const formatOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
        label = `${pStart.toLocaleDateString('pt-BR', formatOptions)} - ${pEnd.toLocaleDateString('pt-BR', formatOptions)}`;
      }

      return {
        name: label,
        Entradas: pSales,
        Saídas: pExpenses,
        Saldo: pSales - pExpenses,
      };
    });
  }, [filteredSales, filteredExpenses, startDate, endDate]);

  // Search filter and type filter
  const filteredLedger = useMemo(() => {
    return ledger.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'All' || item.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [ledger, searchTerm, selectedType]);

  // Reset page relative to search criteria
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType]);

  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);

  const paginatedLedger = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLedger.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLedger, currentPage]);

  return (
    <div className="space-y-6">
      {/* Informative Help Card */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-900/10 border border-brand-border p-5 rounded-2xl relative overflow-hidden transition-all">
        <div className="absolute right-4 top-4 text-brand-blue/10 pointer-events-none">
          <Activity size={92} className="rotate-12 opacity-10" />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">Análise do Fluxo de Caixa</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Acompanhe detalhadamente a saúde financeira imediata da sua loja</p>
            </div>
          </div>
          <button
            onClick={() => setIsExplanationOpen(!isExplanationOpen)}
            className="text-slate-400 hover:text-brand-text-main transition-colors text-xs font-black uppercase italic border border-brand-border px-3 py-1 rounded-lg bg-white dark:bg-slate-800"
          >
            {isExplanationOpen ? 'Ocultar Dicas' : 'Como Funciona?'}
          </button>
        </div>

        {isExplanationOpen && (
          <div className="mt-4 pt-4 border-t border-brand-border/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-brand-text-main/70 relative z-10 transition-all duration-300">
            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                ENTRADAS (Inflows)
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                Todo o dinheiro que efetivamente entra no caixa através de vendas à vista ou a prazo liquidadas. <strong className="font-bold">Dica:</strong> Aumente o ticket médio ou crie campanhas de antecipação para reforçar as entradas imediatas.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                SAÍDAS (Outflows)
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                Qualquer tipo de gasto operacional, impostos, taxas, ou pagamentos de fornecedores. <strong className="font-bold">Dica:</strong> Revise despesas fixas recorrentes periodicamente para evitar desperdícios e sangria de caixa.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-extrabold text-brand-text-main uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                SALDO LÍQUIDO & MARGEM
              </h5>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                O resultado final obtido no período. Se o saldo for positivo, você obteve superávit financeiro. Se for negativo, significa déficit. <strong className="font-bold">Dica:</strong> Uma margem de caixa acima de 15% representa ótima eficiência de conversão operacional.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Inflows Card */}
        <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Entradas Totais</span>
            <ArrowUpRight size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 truncate" title={stats.formattedInflows}>
            {stats.formattedInflows}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            {filteredSales.length} transações comerciais
          </p>
        </div>

        {/* Outflows Card */}
        <div className="p-5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Saídas Totais</span>
            <ArrowDownRight size={16} className="text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-700 dark:text-rose-400 truncate" title={stats.formattedOutflows}>
            {stats.formattedOutflows}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            {filteredExpenses.length} despesas e taxas
          </p>
        </div>

        {/* Saldo Líquido Card */}
        <div className={cn("p-5 rounded-2xl shadow-sm flex flex-col justify-between border",
          stats.balance >= 0 
            ? "bg-slate-100/50 dark:bg-slate-900/30 border-[#e2e8f0]" 
            : "bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[10px] font-black uppercase tracking-wider", stats.balance >= 0 ? "text-slate-400" : "text-amber-600")}>
              Saldo de Caixa
            </span>
            <Activity size={16} className={stats.balance >= 0 ? "text-slate-400" : "text-amber-500"} />
          </div>
          <p className={cn("text-xl font-black truncate", stats.balance >= 0 ? "text-slate-800 dark:text-slate-200" : "text-amber-700 dark:text-amber-400")} title={stats.formattedBalance}>
            {stats.formattedBalance}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            {stats.balance >= 0 ? 'Resultado Superavitário' : 'Resultado Deficitário'}
          </p>
        </div>

        {/* Margem Card */}
        <div className="p-5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-blue">Eficiência de Caixa</span>
            <Percent size={16} className="text-brand-blue" />
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-slate-350">
            {stats.margin.toFixed(1)}% <span className="text-xs font-normal text-slate-400">de margem</span>
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            Retenção de caixa p/ faturamento
          </p>
        </div>
      </div>

      {/* Dual Visualizers Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparative Period Bar Chart */}
        <div className="bg-brand-card border border-brand-border p-6 rounded-2xl shadow-sm flex flex-col">
          <div className="mb-4">
            <h4 className="text-xs font-black text-brand-text-main uppercase italic">Movimentações Periódicas</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Comparativo entre Entradas e Saídas ao longo do tempo</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer id="rel-proj-bar-main-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#6B7C93', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#6B7C93', fontWeight: 600}} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)} />
                <Tooltip formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 600}} />
                <Bar dataKey="Entradas" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saídas" name="Saídas" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accumulated Net Cash Flow Line Chart */}
        <div className="bg-brand-card border border-brand-border p-6 rounded-2xl shadow-sm flex flex-col">
          <div className="mb-4">
            <h4 className="text-xs font-black text-brand-text-main uppercase italic">Tendência do Saldo Líquido</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Flutuação do caixa disponível acumulado por período</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer id="rel-proj-area-main-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#6B7C93', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#6B7C93', fontWeight: 600}} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)} />
                <Tooltip formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 600}} />
                <Area type="monotone" dataKey="Saldo" name="Saldo Líquido" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSaldo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Control Panel: Search ledger entries & filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-brand-card border border-brand-border p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-brand-border pl-9 pr-4 py-2 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="Pesquisar por descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 self-stretch md:self-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[9px] font-bold uppercase text-slate-400 whitespace-nowrap mr-1">Filtrar Transações:</span>
          <button 
            onClick={() => setSelectedType('All')}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap", 
              selectedType === 'All' 
                ? "bg-brand-blue text-white shadow-sm" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Todas ({ledger.length})
          </button>
          <button 
            onClick={() => setSelectedType('Entrada')}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap border border-transparent", 
              selectedType === 'Entrada' 
                ? "bg-emerald-500 text-white shadow-sm" 
                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
            )}
          >
            Entradas ({filteredSales.length})
          </button>
          <button 
            onClick={() => setSelectedType('Saída')}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap border border-transparent", 
              selectedType === 'Saída' 
                ? "bg-rose-500 text-white shadow-sm" 
                : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10"
            )}
          >
            Saídas ({filteredExpenses.length})
          </button>
        </div>
      </div>

      {/* Chronological Ledger Table */}
      <div className="overflow-x-auto min-w-full rounded-2xl border border-brand-border bg-brand-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-slate-50/50 dark:bg-slate-900/10">
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest pl-6">Data de Liquidação</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Descrição</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Tipo</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Categoria</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right pr-6">Impacto no Caixa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {paginatedLedger.length > 0 ? paginatedLedger.map((row, i) => {
              const formattedRowDate = new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR');
              return (
                <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/5 transition-colors">
                  {/* Date */}
                  <td className="p-4 pl-6 text-xs text-slate-500 font-mono">
                    {formattedRowDate}
                  </td>

                  {/* Description */}
                  <td className="p-4 text-xs font-bold text-slate-800 dark:text-slate-250">
                    <span className="uppercase italic block truncate max-w-[280px]" title={row.description}>
                      {row.description}
                    </span>
                  </td>

                  {/* Type Badge */}
                  <td className="p-4 text-center">
                    <span className={cn("px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider whitespace-nowrap", row.tagColor)}>
                      {row.type}
                    </span>
                  </td>

                  {/* Category of Inflow/Outflow */}
                  <td className="p-4 text-xs font-bold text-slate-500 uppercase italic">
                    {row.category}
                  </td>

                  {/* Impact amount */}
                  <td className="p-4 text-right pr-6">
                    <span className={cn("text-xs font-black", row.type === 'Entrada' ? "text-emerald-500" : "text-rose-500")}>
                      {row.type === 'Entrada' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.amount)}
                    </span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm font-black text-slate-400 uppercase italic">
                  Nenhuma transação financeira correspondente aos filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Premium Pagination standard */}
        {filteredLedger.length > 0 && (
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-brand-border flex items-center justify-between rounded-b-2xl">
            <p className="text-sm text-slate-500 font-medium">
              Mostrando {Math.min(filteredLedger.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredLedger.length, currentPage * itemsPerPage)} de {filteredLedger.length} lançamentos
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-slate-400 px-1">...</span>
                        )}
                        <button 
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                            page === currentPage 
                              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" 
                              : "text-slate-500 hover:bg-slate-205 dark:text-slate-400 dark:hover:bg-slate-800"
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountsPayableReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { expenses } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Pendente' | 'Vencido' | 'Pago'>('All');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Compra de Mercadoria' | 'Outros'>('All');
  const [useDateFilter, setUseDateFilter] = useState(true);
  const [dateFilterType, setDateFilterType] = useState<'dueDate' | 'issueDate'>('issueDate'); // Default to issueDate (Lançamento) so pending items created in the period show up!
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const todayStr = getLocalDateString();

  // Process expenses to identify exact status, due date, isOverdue, etc.
  const processedExpenses = useMemo(() => {
    return expenses.map(e => {
      const dueDateStr = e.dueDate ? e.dueDate.split('T')[0] : e.date.split('T')[0];
      const isPaid = e.status === 'Pago';
      const isOverdue = !isPaid && dueDateStr < todayStr;
      
      let computedStatus: 'Pendente' | 'Vencido' | 'Pago' = 'Pendente';
      if (isPaid) {
        computedStatus = 'Pago';
      } else if (isOverdue) {
        computedStatus = 'Vencido';
      }

      return {
        ...e,
        dueDateStr,
        isOverdue,
        computedStatus
      };
    }).sort((a, b) => b.dueDateStr.localeCompare(a.dueDateStr));
  }, [expenses, todayStr]);

  // Compute stats across ALL expenses matching the core finance rules
  const stats = useMemo(() => {
    // Current period expenses matching the date filter
    const periodExpenses = processedExpenses.filter(e => {
      const targetDate = dateFilterType === 'dueDate' ? e.dueDateStr : e.date.split('T')[0];
      return targetDate >= startDate && targetDate <= endDate;
    });

    const totalUnpaid = processedExpenses.filter(e => e.computedStatus !== 'Pago')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalOverdue = processedExpenses.filter(e => e.computedStatus === 'Vencido')
      .reduce((acc, e) => acc + e.amount, 0);

    const periodPaid = periodExpenses.filter(e => e.computedStatus === 'Pago')
      .reduce((acc, e) => acc + e.amount, 0);

    const periodUpcoming = periodExpenses.filter(e => e.computedStatus === 'Pendente')
      .reduce((acc, e) => acc + e.amount, 0);

    return {
      totalUnpaid,
      totalOverdue,
      periodPaid,
      periodUpcoming,
      formattedUnpaid: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalUnpaid),
      formattedOverdue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOverdue),
      formattedPeriodPaid: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(periodPaid),
      formattedPeriodUpcoming: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(periodUpcoming),
    };
  }, [processedExpenses, startDate, endDate, dateFilterType]);

  // Filter accounts ledger based on user criteria
  const filteredLedger = useMemo(() => {
    return processedExpenses.filter(item => {
      // 1. Search text filter (description, category, supplier)
      const matchesSearch = 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Status filter
      let matchesStatus = true;
      if (selectedStatus !== 'All') {
        matchesStatus = item.computedStatus === selectedStatus;
      }

      // 3. Category filter
      let matchesCategory = true;
      if (selectedCategory === 'Compra de Mercadoria') {
        matchesCategory = item.category === 'Compra de Mercadoria';
      } else if (selectedCategory === 'Outros') {
        matchesCategory = item.category !== 'Compra de Mercadoria';
      }

      // 4. Date filter
      let matchesDate = true;
      if (useDateFilter) {
        const targetDate = dateFilterType === 'dueDate' ? item.dueDateStr : item.date.split('T')[0];
        matchesDate = targetDate >= startDate && targetDate <= endDate;
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [processedExpenses, searchTerm, selectedStatus, selectedCategory, useDateFilter, dateFilterType, startDate, endDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedCategory, useDateFilter, dateFilterType]);

  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);

  const paginatedLedger = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLedger.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLedger, currentPage]);

  return (
    <div className="space-y-6">
      {/* Informative Header with Bot Tip */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-900/10 border border-brand-border p-5 rounded-2xl relative overflow-hidden transition-all">
        <div className="absolute right-4 top-4 text-brand-blue/10 pointer-events-none">
          <CreditCard size={92} className="rotate-12 opacity-10" />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">Gestão de Contas a Pagar</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Acompanhe duplicatas, despesas recorrentes e compras a prazo de fornecedores</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-800 border border-brand-border px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-50 transition-all select-none">
              <input
                type="checkbox"
                checked={useDateFilter}
                onChange={(e) => setUseDateFilter(e.target.checked)}
                className="rounded text-brand-blue border-slate-300 focus:ring-brand-blue"
              />
              <span>Filtrar por Período</span>
            </label>

            {useDateFilter && (
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900 border border-brand-border p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDateFilterType('issueDate')}
                  className={cn("px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all select-none",
                    dateFilterType === 'issueDate' 
                      ? "bg-white dark:bg-slate-800 text-brand-blue shadow-sm font-extrabold" 
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}
                  title="Filtra as contas pela data em que foram criadas"
                >
                  Lançamento
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterType('dueDate')}
                  className={cn("px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all select-none",
                    dateFilterType === 'dueDate' 
                      ? "bg-white dark:bg-slate-800 text-brand-blue shadow-sm font-extrabold" 
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}
                  title="Filtra as contas pela data de vencimento da duplicata"
                >
                  Vencimento
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-brand-border/60 text-xs text-brand-text-main/70 leading-relaxed max-w-3xl">
          <span className="font-extrabold uppercase italic text-amber-500 mr-1">Aviso de Compras a Prazo:</span>
          Sempre que você confirma uma compra / pedido com a condição <strong className="font-bold">A Prazo</strong> nas telas de compras, o sistema gera parcelas correspondentes automaticamente na categoria <strong className="font-bold">Compra de Mercadoria</strong> como despesas pendentes. Use o filtro de categorias abaixo para isolar e planejar especificamente as suas obrigações com fornecedores.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Pending Unpaid */}
        <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 shadow-sm flex flex-col justify-between font-sans">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Aberto (Geral)</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-700 dark:text-amber-400 truncate" title={stats.formattedUnpaid}>
            {stats.formattedUnpaid}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            Todas as duplicatas não pagas
          </p>
        </div>

        {/* Total Overdue */}
        <div className="p-5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 shadow-sm flex flex-col justify-between font-sans">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Vencido</span>
            <AlertTriangle size={16} className="text-rose-500 animate-bounce" />
          </div>
          <p className="text-xl font-black text-rose-700 dark:text-rose-400 truncate" title={stats.formattedOverdue}>
            {stats.formattedOverdue}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500 mt-2">
            Atenção imediata para juros
          </p>
        </div>

        {/* Period Upcoming */}
        <div className="p-5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 shadow-sm flex flex-col justify-between font-sans">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-blue">A Vencer (No Período)</span>
            <Clock size={16} className="text-brand-blue" />
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-slate-200 truncate" title={stats.formattedPeriodUpcoming}>
            {stats.formattedPeriodUpcoming}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            Programado p/ os filtros selecionados
          </p>
        </div>

        {/* Period Paid */}
        <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col justify-between font-sans">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pago (No Período)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 truncate" title={stats.formattedPeriodPaid}>
            {stats.formattedPeriodPaid}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">
            Liquidados na data de referência
          </p>
        </div>
      </div>

      {/* Control Panel: Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-brand-card border border-brand-border p-4 rounded-2xl shadow-sm animate-fade-in">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-brand-border pl-9 pr-4 py-2 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="Pesquisar descrição, fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status and Category Filter Toggles */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status buttons */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-brand-border overflow-x-auto">
            <button
              onClick={() => setSelectedStatus('All')}
              className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
                selectedStatus === 'All' ? "bg-white dark:bg-slate-800 text-brand-text-main shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Todos ({processedExpenses.length})
            </button>
            <button
              onClick={() => setSelectedStatus('Pendente')}
              className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
                selectedStatus === 'Pendente' ? "bg-amber-500 text-white shadow-sm font-extrabold" : "text-amber-600 hover:text-amber-700 font-bold"
              )}
            >
              A Vencer
            </button>
            <button
              onClick={() => setSelectedStatus('Vencido')}
              className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
                selectedStatus === 'Vencido' ? "bg-rose-500 text-white shadow-sm" : "text-rose-600 hover:text-rose-700 font-bold"
              )}
            >
              Vencidos
            </button>
            <button
              onClick={() => setSelectedStatus('Pago')}
              className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
                selectedStatus === 'Pago' ? "bg-emerald-500 text-white shadow-sm" : "text-emerald-600 hover:text-emerald-700 font-bold"
              )}
            >
              Pagos
            </button>
          </div>

          {/* Category buttons */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-brand-border">
            <button
              onClick={() => setSelectedCategory('All')}
              className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
                selectedCategory === 'All' ? "bg-white dark:bg-slate-800 text-brand-text-main shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Todas Origens
            </button>
            <button
              onClick={() => setSelectedCategory('Compra de Mercadoria')}
              className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1 font-bold", 
                selectedCategory === 'Compra de Mercadoria' ? "bg-brand-blue text-white shadow-sm" : "text-brand-blue hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <ShoppingBag size={10} />
              Compras a Prazo
            </button>
            <button
              onClick={() => setSelectedCategory('Outros')}
              className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
                selectedCategory === 'Outros' ? "bg-white dark:bg-slate-800 text-brand-text-main shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Despesas Fixas
            </button>
          </div>
        </div>
      </div>

      {/* Ledger table */}
      <div className="overflow-x-auto min-w-full rounded-2xl border border-brand-border bg-brand-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-slate-50/50 dark:bg-slate-900/10">
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest pl-6">Data de Vencimento</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Descrição da Conta</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Fornecedor</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-center">Origem / Categoria</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right">Valor do Título</th>
              <th className="p-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest text-right pr-6">Status atual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {paginatedLedger.length > 0 ? paginatedLedger.map((row, i) => {
              const formattedDueDate = new Date(row.dueDateStr + 'T12:00:00').toLocaleDateString('pt-BR');
              const isPurchase = row.category === 'Compra de Mercadoria';

              return (
                <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/5 transition-colors">
                  {/* Date */}
                  <td className="p-4 pl-6 text-xs text-slate-500 font-mono">
                    <div className="flex flex-col">
                      <span>{formattedDueDate}</span>
                      {row.computedStatus === 'Vencido' && (
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tight">Atravessado</span>
                      )}
                    </div>
                  </td>

                  {/* Description */}
                  <td className="p-4 text-xs font-bold text-slate-800 dark:text-slate-250">
                    <span className="uppercase block truncate max-w-[280px]" title={row.description}>
                      {row.description}
                    </span>
                  </td>

                  {/* Fornecedor */}
                  <td className="p-4 text-xs font-bold text-slate-500 uppercase italic">
                    {row.supplier || 'N/A'}
                  </td>

                  {/* Category of Inflow/Outflow */}
                  <td className="p-4 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                      isPurchase 
                        ? "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40"
                        : "bg-slate-50 text-slate-600 border border-slate-100 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-900/40"
                    )}>
                      {row.category || 'Geral'}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="p-4 text-right text-xs font-black text-slate-800 dark:text-slate-200">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.amount)}
                  </td>

                  {/* Status Badge */}
                  <td className="p-4 text-right pr-6">
                    <span className={cn("px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider whitespace-nowrap",
                      row.computedStatus === 'Pago' ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/45" :
                      row.computedStatus === 'Vencido' ? "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/45" :
                      "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/45"
                    )}>
                      {row.computedStatus}
                    </span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm font-black text-slate-400 uppercase italic">
                  Nenhuma obrigação a pagar correspondente aos filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Premium Pagination standard to match Gestão de Produtos count */}
        {filteredLedger.length > 0 && (
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-brand-border flex items-center justify-between rounded-b-2xl">
            <p className="text-sm text-slate-500 font-medium">
              Mostrando {Math.min(filteredLedger.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredLedger.length, currentPage * itemsPerPage)} de {filteredLedger.length} lançamentos
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-slate-400 px-1">...</span>
                        )}
                        <button 
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                            page === currentPage 
                              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" 
                              : "text-slate-500 hover:bg-slate-205 dark:text-slate-400 dark:hover:bg-slate-800"
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

