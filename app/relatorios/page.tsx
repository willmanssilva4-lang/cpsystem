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
  User,
  Trophy,
  Award,
  HelpCircle,
  UserPlus,
  RotateCcw
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
import { motion, AnimatePresence } from 'motion/react';
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

  // Corrige fuso horário UTC do servidor para o fuso local do navegador do cliente após a montagem
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setStartDate(`${year}-${month}-01`);
    setEndDate(`${year}-${month}-${day}`);
  }, []);

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
      sale.items.forEach((item: any) => {
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
      sale.items.forEach((item: any) => {
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
      sale.items.forEach((item: any) => {
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
    { id: 'estoque_geral', category: 'estoque', title: 'Estoque Geral', description: 'Listagem completa de todos os produtos e suas quantidades em estoque.', icon: Package },
    { id: 'giro_estoque', category: 'estoque', title: 'Giro de Estoque', description: 'Velocidade de saída dos produtos e necessidade de reposição.', icon: RefreshCw },
    { id: 'estoque_critico', category: 'estoque', title: 'Estoque Crítico', description: 'Produtos abaixo do nível mínimo de segurança.', icon: AlertTriangle },
    { id: 'validade_lotes', category: 'estoque', title: 'Validade de Lotes', description: 'Acompanhamento de vencimentos e lotes próximos da validade.', icon: Calendar },
    { id: 'dre', category: 'gerencial', title: 'DRE Gerencial', description: 'Demonstrativo de resultados, impostos e lucro líquido.', icon: FileBarChart },
    { id: 'abc_clientes', category: 'gerencial', title: 'Curva ABC de Clientes', description: 'Classificação de clientes por volume de compras e fidelidade.', icon: Target },
    { id: 'abc_produtos', category: 'gerencial', title: 'Curva ABC de Produtos', description: 'Classificação de produtos por volume de vendas e faturamento.', icon: Layers },
    { id: 'meios_pagamento', category: 'vendas', title: 'Meios de Pagamento', description: 'Detalhamento de vendas por forma de pagamento e taxas.', icon: CreditCard },
    { id: 'estorno_devolucao', category: 'financeiro', title: 'Relatório de Estorno e Devolução', description: 'Monitoramento de estornos e devoluções realizadas.', icon: RefreshCw },
    { id: 'relatorio_custo', category: 'financeiro', title: 'Relatório de Custo', description: 'Análise detalhada dos custos de aquisição e CMV.', icon: Calculator },
    { id: 'lucro_estoque', category: 'estoque', title: 'Lucro no Estoque', description: 'Projeção de lucro bruto baseado no saldo atual de estoque.', icon: TrendingUp },
    { id: 'clube_clientes', category: 'gerencial', title: 'Relatório Cliente Clube', description: 'Análise de adesão, economia gerada e frequência de membros do clube.', icon: UserCheck },
    { id: 'clube_vendas', category: 'vendas', title: 'Vendas Cliente Clube', description: 'Comparativo de vendas entre membros do clube e clientes comuns.', icon: ShoppingCart },
    { id: 'fechamento_caixa', category: 'financeiro', title: 'Fechamento de Caixa', description: 'Relatório e histórico de fechamentos de caixas, valores declarados e diferenças apuradas.', icon: CreditCard },
  ];

  const filteredReports = allReports.filter(r => 
    r.category === selectedCategory && 
    (r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reportCategories.forEach((cat) => {
      counts[cat.id] = allReports.filter(
        (r) =>
          r.category === cat.id &&
          (r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.description.toLowerCase().includes(searchTerm.toLowerCase()))
      ).length;
    });
    return counts;
  }, [allReports, searchTerm]);

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
            onClick={() => setSelectedReportView(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full bg-[#f8fafc] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 max-w-[98vw] h-[95vh] md:max-w-[96vw] md:h-[94vh] border border-slate-200/60"
          >
            {/* Modal Header */}
            <div className="px-6 md:px-10 py-5 md:py-6 bg-white border-b border-slate-200/60 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                {selectedReportView !== 'Catálogo' && (
                  <button 
                    onClick={() => {
                      setSelectedReportView('Catálogo');
                      const today = getLocalDateString();
                      setStartDate(today);
                      setEndDate(today);
                    }}
                    className="p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center active:scale-95 shadow-xs"
                  >
                    <ChevronLeft size={16} className="text-slate-700" />
                  </button>
                )}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue to-blue-500 text-white flex items-center justify-center shadow-lg shadow-brand-blue/15 shrink-0">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-brand-blue font-black uppercase italic tracking-wider text-[10px] mb-0.5">
                    <Activity size={10} className="animate-pulse" />
                    Módulo Executivo BI
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase leading-none">
                    {selectedReportView === 'Catálogo' ? 'Catálogo de Relatórios' : selectedReportView}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {selectedReportView === 'Catálogo' 
                      ? 'Selecione um relatório analítico para carregar a inteligência de distribuição.' 
                      : `Mapeamento operacional gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 self-end sm:self-auto">
                {selectedReportView !== 'Catálogo' && (
                  <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 shadow-xs shrink-0">
                    <Calendar size={14} className="text-slate-400" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none text-[11px] font-black uppercase italic text-slate-600 focus:ring-0 p-0"
                    />
                    <span className="text-slate-300 text-[10px] font-black uppercase italic">a</span>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none text-[11px] font-black uppercase italic text-slate-600 focus:ring-0 p-0"
                    />
                  </div>
                )}
                
                {selectedReportView === 'Catálogo' && (
                  <>
                    <span className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase italic shrink-0">
                      <ClipboardList size={12} className="text-brand-blue" />
                      {allReports.length} Relatórios Ativos
                    </span>
                    <div className="relative w-64 md:w-80 shrink-0">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Search size={14} />
                      </span>
                      <input 
                        type="text" 
                        placeholder="Buscar relatório ou descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 transition-all border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 w-full"
                      />
                    </div>
                  </>
                )}

                <button 
                  onClick={() => setSelectedReportView(null)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-2xl transition-all active:scale-95 shadow-xs"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {selectedReportView === 'Catálogo' ? (
                <>
                  {/* Sidebar Categories */}
                  <div className="hidden md:block w-72 border-r border-slate-200/60 bg-white p-6 space-y-2 overflow-y-auto shrink-0 select-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Categorias de Análise</p>
                    {reportCategories.map((cat) => {
                      const isActive = selectedCategory === cat.id;
                      const count = categoryCounts[cat.id] || 0;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all border shrink-0 active:scale-95",
                            isActive 
                              ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/15 border-brand-blue" 
                              : "text-slate-600 bg-white border-slate-200/50 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900"
                          )}
                        >
                          <div className={cn("p-1.5 rounded-xl flex items-center justify-center shrink-0", isActive ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:text-brand-blue")}>
                            <cat.icon size={14} />
                          </div>
                          <span className="truncate">{cat.label}</span>
                          <span className={cn(
                            "ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full font-black",
                            isActive 
                              ? "bg-white/20 text-white" 
                              : "bg-slate-100 text-slate-400"
                          )}>
                            {count}
                          </span>
                        </button>
                      );
                    })}

                    <div className="pt-6 border-t border-slate-100 mt-6 space-y-4">
                      <div className="p-4 bg-slate-50/70 border border-slate-200/50 rounded-2xl">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Analítico</span>
                        <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase italic">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                          Operando online
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1.5 leading-normal">
                          Todos os relatórios estão integrados e consolidados em tempo real com o banco de dados principal.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reports Grid */}
                  <div className="flex-1 p-6 md:p-8 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                    {/* Mobile Category Select field */}
                    <div className="md:hidden mb-6">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Selecionar Categoria</label>
                      <div className="relative">
                        <select 
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black uppercase italic text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 appearance-none"
                        >
                          {reportCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label.toUpperCase()} ({categoryCounts[cat.id] || 0})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredReports.map((report) => {
                        const style_vendas = {
                          bg: 'bg-blue-50/80',
                          text: 'text-brand-blue',
                          hover: 'group-hover:bg-brand-blue',
                          label: 'Mapeamento de Varejo'
                        };
                        const style_financeiro = {
                          bg: 'bg-emerald-50/80',
                          text: 'text-emerald-600',
                          hover: 'group-hover:bg-emerald-600',
                          label: 'Inteligência de Caixa'
                        };
                        const style_estoque = {
                          bg: 'bg-amber-50/80',
                          text: 'text-amber-600',
                          hover: 'group-hover:bg-amber-600',
                          label: 'Previsão de Suprimentos'
                        };
                        const style_gerencial = {
                          bg: 'bg-purple-50/80',
                          text: 'text-purple-600',
                          hover: 'group-hover:bg-purple-600',
                          label: 'Controladoria Geral'
                        };

                        const style_map: Record<string, typeof style_vendas> = {
                          vendas: style_vendas,
                          financeiro: style_financeiro,
                          estoque: style_estoque,
                          gerencial: style_gerencial
                        };

                        const style = style_map[report.category] || style_vendas;

                        return (
                          <motion.button
                            whileHover={{ y: -5, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            key={report.id}
                            onClick={() => {
                              handleReportClick(report.title);
                            }}
                            className="group p-6 md:p-7 rounded-[2rem] bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all text-left flex flex-col justify-between min-h-[200px] relative overflow-hidden"
                          >
                            {/* Decorative background shape or giant icon */}
                            <div className="absolute -right-3 -bottom-3 translate-x-1 translate-y-1 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500 text-slate-900">
                              <report.icon size={110} />
                            </div>

                            {/* Top row */}
                            <div className="flex items-start justify-between gap-4 w-full">
                              <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xs shrink-0", style.bg, style.text, "group-hover:text-white", style.hover)}>
                                <report.icon size={18} className="relative z-10" />
                              </div>
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[8px] font-black uppercase italic tracking-wider bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-500 transition-colors">
                                {style.label}
                              </span>
                            </div>

                            {/* Middle Title and Content */}
                            <div className="mt-5 mb-4 flex-1">
                              <h4 className="text-sm font-black text-slate-800 group-hover:text-brand-blue transition-colors uppercase italic tracking-tight leading-tight">
                                {report.title}
                              </h4>
                              <p className="text-[11px] font-semibold text-slate-500/90 mt-1.5 leading-relaxed">
                                {report.description}
                              </p>
                            </div>

                            {/* Bottom row action feedback */}
                            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between w-full mt-auto">
                              <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase italic">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Analítico
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-black uppercase text-brand-blue italic transition-all group-hover:translate-x-1">
                                Carregar Módulo
                                <ChevronRight size={13} className="text-brand-blue" />
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                      {filteredReports.length === 0 && (
                        <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-slate-200/50 p-8 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                            <Search size={28} />
                          </div>
                          <h4 className="text-sm font-black uppercase italic text-slate-700">Nenhum relatório encontrado</h4>
                          <p className="text-xs font-semibold text-slate-400 max-w-sm mt-1 leading-relaxed">
                            Nenhum item corresponde à busca "{searchTerm}". Tente digitar outros termos ou busque em outra categoria.
                          </p>
                          <button 
                            onClick={() => setSearchTerm('')}
                            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase italic transition-all active:scale-95"
                          >
                            Limpar Filtro
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#f8fafc]">
                  {selectedReportView === 'Vendas por Período' && <SalesReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Fechamento de Caixa' && <CashClosingReport startDate={startDate} endDate={endDate} />}
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
                  {selectedReportView === 'Meios de Pagamento' && <SalesByPaymentReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Relatório de Estorno e Devolução' && <EstornoDevolucaoReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Relatório de Custo' && <CostReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Relatório de Compras' && <PurchasesReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Lucro no Estoque' && <StockProfitReport />}
                  {selectedReportView === 'Estoque Geral' && <GeneralStockReport />}
                  {selectedReportView === 'Relatório Cliente Clube' && <ClubCustomersReport />}
                  {selectedReportView === 'Vendas Cliente Clube' && <ClubSalesReport startDate={startDate} endDate={endDate} />}
                  {selectedReportView === 'Fluxo de Caixa' && (
                    <CashFlowReport startDate={startDate} endDate={endDate} />
                  )}
                  {selectedReportView === 'Contas a Pagar' && (
                    <AccountsPayableReport startDate={startDate} endDate={endDate} />
                  )}
                  {selectedReportView === 'Dashboard Executivo' && (
                    <AdvancedPerformanceDashboard 
                      startDate={startDate} 
                      endDate={endDate} 
                      onViewReport={(reportName) => handleReportClick(reportName)}
                    />
                  )}
                  
                  {!['Dashboard Executivo', 'Vendas por Período', 'Fechamento de Caixa', 'DRE Gerencial', 'Giro de Estoque', 'Curva ABC de Clientes', 'Curva ABC de Produtos', 'Comissões de Vendedores', 'Vendas por Vendedor', 'Vendas por Produto', 'Vendas por Categoria', 'Vendas por Hora', 'Estoque Crítico', 'Validade de Lotes', 'Fluxo de Caixa', 'Contas a Pagar', 'Relatório de Estorno e Devolução', 'Relatório de Custo', 'Relatório de Compras', 'Lucro no Estoque', 'Estoque Geral', 'Relatório Cliente Clube', 'Vendas Cliente Clube', 'Meios de Pagamento'].includes(selectedReportView) && (
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
  const { sales, products, expenses, systemUsers, categorias, subcategorias, paymentMethods, customers, setCustomAlert, fetchData } = useERP();
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
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Self-contained high precision UUID generator to prevent build or runtime import errors
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleGenerateTestData = async () => {
    if (products.length === 0) {
      setCustomAlert({ message: 'Necessário ter produtos cadastrados para gerar vendas de teste.', type: 'error' });
      return;
    }
    setIsSeeding(true);
    setCustomAlert({ message: 'Iniciando geração de dados reais de demonstração no banco de dados...', type: 'info' });
    
    try {
      const selectedProducts = products.filter(p => p.status !== 'Inativo' && (p.salePrice || (p as any).sale_price || 0) > 0).slice(0, 30);
      const paymentIds = paymentMethods.map(m => m.id);
      const customerIds = customers.map(c => c.id);
      const userIds = systemUsers.map(u => u.id);
      
      const salesToInsert = [];
      const movementsToInsert = [];
      const expensesToInsert = [];
      
      const companyId = (products[0] as any)?.company_id || (products[0] as any)?.companyId || null;
      const todayDate = new Date();
      
      // Generate 25 sales distributed over the last 30 days
      for (let i = 0; i < 25; i++) {
        const saleDate = new Date(todayDate);
        saleDate.setDate(todayDate.getDate() - Math.floor(Math.random() * 30));
        saleDate.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
        
        const itemsCount = 1 + Math.floor(Math.random() * 3);
        let saleTotal = 0;
        let saleCost = 0;
        const saleId = generateUUID();
        
        for (let j = 0; j < itemsCount; j++) {
          const randProd = selectedProducts[Math.floor(Math.random() * selectedProducts.length)];
          if (randProd) {
            const qty = 1 + Math.floor(Math.random() * 3);
            const itemPrice = randProd.salePrice || (randProd as any).sale_price || 10;
            const itemCost = randProd.costPrice || (randProd as any).cost_price || (itemPrice * 0.6);
            
            saleTotal += itemPrice * qty;
            saleCost += itemCost * qty;
            
            movementsToInsert.push({
              id: generateUUID(),
              product_id: randProd.id,
              type: 'VENDA',
              quantity: -qty, // Outflow of stock
              origin: `Venda #${saleId.substring(0, 8)}`,
              date: saleDate.toISOString(),
              company_id: companyId
            });
          }
        }
        
        const randomPayment = paymentIds[Math.floor(Math.random() * paymentIds.length)] || 'Dinheiro';
        const randomCustomer = customerIds.length > 0 ? customerIds[Math.floor(Math.random() * customerIds.length)] : null;
        const randomUser = userIds.length > 0 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
        
        salesToInsert.push({
          id: saleId,
          payment_method: randomPayment,
          customer_id: randomCustomer,
          user_id: randomUser,
          total: saleTotal,
          discount: 0,
          notes: 'Venda de demonstração gerada automaticamente',
          status: 'Finalizada',
          date: saleDate.toISOString(),
          tax_amount: saleTotal * 0.05, // 5% tax
          net_amount: saleTotal * 0.95,
          company_id: companyId
        });
      }
      
      // Generate 6 expenses distributed over the last 30 days
      const dExpensesList = [
        { desc: 'Aluguel do Espaço Comercial', cat: 'Infraestrutura', min: 1200, max: 1500 },
        { desc: 'Energia Elétrica Copel / Coelba', cat: 'Utilidades', min: 250, max: 480 },
        { desc: 'Assinatura Software ERP e Licenças', cat: 'Administrativo', min: 149, max: 149 },
        { desc: 'Serviço de Internet Fibra Óptica', cat: 'Utilidades', min: 99, max: 149 },
        { desc: 'Compra de Embalagens e Sacolas', cat: 'Fornecedores', min: 120, max: 280 },
        { desc: 'Material de Escritório e Limpeza', cat: 'Administrativo', min: 80, max: 180 },
      ];
      
      for (const dex of dExpensesList) {
        const eDate = new Date(todayDate);
        eDate.setDate(todayDate.getDate() - Math.floor(Math.random() * 25));
        const amount = dex.min + Math.random() * (dex.max - dex.min);
        
        expensesToInsert.push({
          id: generateUUID(),
          description: dex.desc,
          category: dex.cat,
          amount: Number(amount.toFixed(2)),
          date: eDate.toISOString().split('T')[0],
          company_id: companyId
        });
      }

      // Generate some mock cash register sessions over the last 30 days
      const registersToInsert = [];
      const closingsToInsert = [];
      const cashMovementsToInsert = [];
      
      const registerCount = 5;
      const randomUserSeeder = userIds.length > 0 ? userIds[Math.floor(Math.random() * userIds.length)] : null;
      
      for (let i = 0; i < registerCount; i++) {
        const regId = generateUUID();
        const regOpenedAt = new Date(todayDate);
        regOpenedAt.setDate(todayDate.getDate() - (i * 6 + 2)); // spaced every 6 days
        regOpenedAt.setHours(8, 0, 0, 0);
        
        const isClosed = i < 4; // 4 closed, 1 open
        const opBal = 100 + i * 50;
        
        registersToInsert.push({
          id: regId,
          opening_balance: opBal,
          status: isClosed ? 'closed' : 'open',
          opened_at: regOpenedAt.toISOString(),
          closed_at: isClosed ? new Date(regOpenedAt.getTime() + 10 * 60 * 60 * 1000).toISOString() : null, // closed 10 hrs later
          operator_id: randomUserSeeder || null,
          company_id: companyId
        });
        
        if (isClosed) {
          // Generate a closing for this register
          const randomDiff = Math.random() < 0.3 ? (Math.random() < 0.5 ? -10 : 15) : 0; // 30% chance of a difference
          const systemTot = opBal + 350 + i * 100;
          const infTot = systemTot + randomDiff;
          
          closingsToInsert.push({
            id: generateUUID(),
            cash_register_id: regId,
            total_system: systemTot,
            total_informed: infTot,
            total_difference: randomDiff,
            justification: randomDiff !== 0 ? 'Diferença de troco' : 'Tudo ok',
            closed_at: new Date(regOpenedAt.getTime() + 10 * 60 * 60 * 1000).toISOString(),
            company_id: companyId,
            approved_by: 'Gerente'
          });
          
          // Also generate a suprimento/sangria for active register movements
          cashMovementsToInsert.push({
            id: generateUUID(),
            cash_register_id: regId,
            type: 'suprimento',
            amount: 50,
            reason: 'Reforço de troco',
            created_at: new Date(regOpenedAt.getTime() + 30 * 60 * 1000).toISOString(), // 30 mins later
            company_id: companyId
          });
        }
      }
      
      if (salesToInsert.length > 0) {
        const { error: sE } = await supabase.from('sales').insert(salesToInsert);
        if (sE) throw sE;
      }
      
      if (movementsToInsert.length > 0) {
        const { error: mE } = await supabase.from('stock_movements').insert(movementsToInsert);
        if (mE) throw mE;
      }
      
      if (expensesToInsert.length > 0) {
        const { error: eE } = await supabase.from('expenses').insert(expensesToInsert);
        if (eE) throw eE;
      }

      if (registersToInsert.length > 0) {
        const { error: rE } = await supabase.from('cash_registers').insert(registersToInsert);
        if (rE) console.warn('Erro ao inserir cash_registers:', rE);
      }
      
      if (closingsToInsert.length > 0) {
        const { error: cE } = await supabase.from('cash_closings').insert(closingsToInsert);
        if (cE) console.warn('Erro ao inserir cash_closings:', cE);
      }
      
      if (cashMovementsToInsert.length > 0) {
        const { error: cmE } = await supabase.from('cash_movements').insert(cashMovementsToInsert);
        if (cmE) console.warn('Erro ao inserir cash_movements:', cmE);
      }
      
      if (fetchData) {
        await fetchData();
      }
      setCustomAlert({ message: 'Dados de demonstração inseridos com sucesso no banco de dados!', type: 'success' });
    } catch (err: any) {
      console.error('Erro ao gerar dados de teste:', err);
      setCustomAlert({ message: `Erro ao gerar dados: ${err.message || err}`, type: 'error' });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDemoData = async () => {
    setIsClearing(true);
    setCustomAlert({ message: 'Limpando dados de demonstração do banco de dados...', type: 'info' });
    try {
      const { data: salesToDelete, error: sErr } = await supabase
        .from('sales')
        .select('id')
        .eq('notes', 'Venda de demonstração gerada automaticamente');
        
      if (sErr) throw sErr;
      
      if (salesToDelete && salesToDelete.length > 0) {
        const ids = salesToDelete.map(s => s.id);
        
        for (const id of ids) {
          const { error: mErr } = await supabase
            .from('stock_movements')
            .delete()
            .ilike('origin', `%Venda #${id.substring(0, 8)}%`);
          if (mErr) console.error('Movements delete err:', mErr);
        }
        
        const { error: delSalesErr } = await supabase
          .from('sales')
          .delete()
          .in('id', ids);
        if (delSalesErr) throw delSalesErr;
      }
      
      const expenseDescs = [
        'Aluguel do Espaço Comercial',
        'Energia Elétrica Copel / Coelba',
        'Assinatura Software ERP e Licenças',
        'Serviço de Internet Fibra Óptica',
        'Compra de Embalagens e Sacolas',
        'Material de Escritório e Limpeza'
      ];
      
      const { error: eErr } = await supabase
        .from('expenses')
        .delete()
        .in('description', expenseDescs);
      if (eErr) throw eErr;
      
      if (fetchData) {
        await fetchData();
      }
      setCustomAlert({ message: 'Dados de demonstração limpos com sucesso!', type: 'success' });
    } catch (err: any) {
      console.error('Erro ao limpar dados de teste:', err);
      setCustomAlert({ message: `Erro ao limpar dados: ${err.message || err}`, type: 'error' });
    } finally {
      setIsClearing(false);
    }
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const firstDayOfMonth = `${year}-${month}-01`;
  
  const safeStartDate = startDate || firstDayOfMonth;
  const safeEndDate = endDate || getLocalDateString();
  
  // Filter active (non-cancelled) sales based on date range
  const filteredSales = sales.filter(s => {
    const d = toLocalDateString(s.date);
    const isCancelled = s.status === 'Cancelada' || s.status === 'cancelada' || s.status === 'CANCELADA' || s.status === 'Cancelado' || s.status === 'cancelado' || s.status === 'CANCEL_PEDIDO' || s.status?.toUpperCase() === 'CANCELADO' || s.status?.toUpperCase() === 'CANCELADA';
    return d >= safeStartDate && d <= safeEndDate && !isCancelled;
  });

  const filteredExpenses = expenses.filter(e => {
    const d = toLocalDateString(e.date);
    return d >= safeStartDate && d <= safeEndDate;
  });

  // Calculate Metrics
  const totalSales = filteredSales.reduce((acc, s) => acc + s.total, 0);
  
  // Calculate aggregated payment/card machine taxes safely
  const totalTax = filteredSales.reduce((acc, s) => {
    let saleTax = 0;
    let paymentsArr: any[] = [];
    if (s.payments) {
      if (Array.isArray(s.payments)) {
        paymentsArr = s.payments;
      } else if (typeof s.payments === 'string') {
        try {
          const parsed = JSON.parse(s.payments);
          if (Array.isArray(parsed)) {
            paymentsArr = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            paymentsArr = [parsed];
          }
        } catch (e) {
          console.error('Error parsing payments json string', e);
        }
      } else if (typeof s.payments === 'object') {
        paymentsArr = [s.payments];
      }
    }
    if (paymentsArr && paymentsArr.length > 0) {
      saleTax = paymentsArr.reduce((pAcc: number, p: any) => {
        const t = p.taxAmount !== undefined ? p.taxAmount : (p.tax_amount !== undefined ? p.tax_amount : 0);
        return pAcc + (Number(t) || 0);
      }, 0);
    }
    if (saleTax === 0) {
      const t = s.taxAmount !== undefined ? s.taxAmount : (s.tax_amount !== undefined ? s.tax_amount : 0);
      saleTax = Number(t) || 0;
    }
    return acc + saleTax;
  }, 0);

  // We exclude 'Compra de Mercadoria' category to avoid double-counting with CMV (cost of goods sold, totalCost)
  const totalExpenses = filteredExpenses
    .filter(e => e.category !== 'Compra de Mercadoria')
    .reduce((acc, e) => acc + e.amount, 0);

  const netRevenue = totalSales - totalTax;
  
  let totalCost = 0;
  filteredSales.forEach(sale => {
    sale.items?.forEach((item: any) => {
      const product = products.find(p => p.id === item.productId);
      const cost = (item.costPrice !== undefined && item.costPrice !== null && item.costPrice !== 0)
        ? Number(item.costPrice) 
        : (product ? Number(product.costPrice ?? 0) : 0);
      totalCost += cost * item.quantity;
    });
  });

  const grossProfit = netRevenue - totalCost;
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const netProfit = grossProfit - totalExpenses;
  const totalProfit = netProfit; // Maintain naming for compatibility
  
  const ticketMedio = totalSales / (filteredSales.length || 1);
  const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 105 : 0; // maintain alignment
  const profitMargin = grossMargin; // We will use Gross Margin for the "Margem Bruta" card

  // Vendas em Oferta
  const totalPromoSales = filteredSales.reduce((acc, s) => {
    const promoItemsTotal = s.items
      ?.filter((item: any) => item.promotionId || (item.discount && item.discount > 0) || (item.originalPrice && item.price < item.originalPrice))
      .reduce((itemAcc: number, item: any) => itemAcc + (item.price * item.quantity), 0) || 0;
    return acc + promoItemsTotal;
  }, 0);
  const promoSalesCount = filteredSales.filter(s => s.items?.some((item: any) => item.promotionId || (item.discount && item.discount > 0) || (item.originalPrice && item.price < item.originalPrice))).length;

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
    const isCancelled = s.status === 'Cancelada' || s.status === 'cancelada' || s.status === 'CANCELADA' || s.status === 'Cancelado' || s.status === 'cancelado' || s.status === 'CANCEL_PEDIDO' || s.status?.toUpperCase() === 'CANCELADO' || s.status?.toUpperCase() === 'CANCELADA';
    return d >= prevStartDate && d <= prevEndDate && !isCancelled;
  });

  const prevFilteredExpenses = expenses.filter(e => {
    const d = toLocalDateString(e.date);
    return d >= prevStartDate && d <= prevEndDate;
  });

  const prevTotalSales = prevFilteredSales.reduce((acc, s) => acc + s.total, 0);
  
  const prevTotalTax = prevFilteredSales.reduce((acc, s) => {
    let saleTax = 0;
    let paymentsArr: any[] = [];
    if (s.payments) {
      if (Array.isArray(s.payments)) {
        paymentsArr = s.payments;
      } else if (typeof s.payments === 'string') {
        try {
          const parsed = JSON.parse(s.payments);
          if (Array.isArray(parsed)) {
            paymentsArr = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            paymentsArr = [parsed];
          }
        } catch (e) {
          console.error(e);
        }
      } else if (typeof s.payments === 'object') {
        paymentsArr = [s.payments];
      }
    }
    if (paymentsArr && paymentsArr.length > 0) {
      saleTax = paymentsArr.reduce((pAcc: number, p: any) => {
        const t = p.taxAmount !== undefined ? p.taxAmount : (p.tax_amount !== undefined ? p.tax_amount : 0);
        return pAcc + (Number(t) || 0);
      }, 0);
    }
    if (saleTax === 0) {
      const t = s.taxAmount !== undefined ? s.taxAmount : (s.tax_amount !== undefined ? s.tax_amount : 0);
      saleTax = Number(t) || 0;
    }
    return acc + saleTax;
  }, 0);

  const prevTotalExpenses = prevFilteredExpenses
    .filter(e => e.category !== 'Compra de Mercadoria')
    .reduce((acc, e) => acc + e.amount, 0);

  const prevNetRevenue = prevTotalSales - prevTotalTax;
  
  let prevTotalCost = 0;
  prevFilteredSales.forEach(sale => {
    sale.items?.forEach((item: any) => {
      const product = products.find(p => p.id === item.productId);
      const cost = (item.costPrice !== undefined && item.costPrice !== null && item.costPrice !== 0)
        ? Number(item.costPrice) 
        : (product ? Number(product.costPrice ?? 0) : 0);
      prevTotalCost += cost * item.quantity;
    });
  });

  const prevGrossProfit = prevNetRevenue - prevTotalCost;
  const prevGrossMargin = prevNetRevenue > 0 ? (prevGrossProfit / prevNetRevenue) * 100 : 0;
  const prevNetProfit = prevGrossProfit - prevTotalExpenses;
  const prevTotalProfit = prevNetProfit; // Compatibility
  
  const prevTicketMedio = prevFilteredSales.length > 0 ? prevTotalSales / prevFilteredSales.length : 0;
  const prevProfitMargin = prevGrossMargin; 

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
    sale.items.forEach((item: any) => {
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
    const method = paymentMethods.find(m => 
      m.id === sale.paymentMethod || 
      m.name?.toLowerCase() === sale.paymentMethod?.toLowerCase()
    );
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
    sale.items.forEach((item: any) => {
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
    sale.items.forEach((item: any) => {
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
    <div className="space-y-8 bg-slate-50/50 -m-8 p-8 min-h-full font-sans">
      <div className="flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 border-b border-slate-200/60 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-wider text-xs mb-1">
                <Activity size={12} className="animate-pulse" />
                Módulo Executivo de BI
              </div>
              <h2 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Relatórios Avançados de Desempenho</h2>
              <p className="text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                Análise de dados estratégica, projeções de fluxo de caixa e inteligência de distribuição.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {onOpenCatalog && (
                <button 
                  onClick={onOpenCatalog}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase italic tracking-tight hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                >
                  <LayoutGrid size={14} className="text-brand-blue" />
                  Catálogo
                </button>
              )}
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl text-xs font-black uppercase italic tracking-tight hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/15 active:scale-95"
              >
                <Download size={14} />
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Banner de Dados Demonstrativos Realistas */}
          {sales.length === 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 md:p-8 rounded-3xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all animate-fade-in my-2">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                  <Activity size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-850 uppercase italic tracking-tight">Banco de Dados Vazio no Supabase</h4>
                  <p className="text-[11px] font-semibold text-slate-500/90 mt-1 max-w-2xl leading-relaxed">
                    Nenhuma venda ou despesa foi encontrada nas tabelas reais do banco de dados. Para testar e ativar as análises e gráficos reais do **Dashboard Executivo**, clique no botão para gerar 25 vendas analíticas e 6 despesas operacionais divididas nos últimos 30 dias.
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerateTestData}
                disabled={isSeeding}
                className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all shadow-lg shadow-blue-600/15 min-w-[200px] justify-center active:scale-95 cursor-pointer"
              >
                {isSeeding ? 'Gerando dados...' : 'Popular com Dados Reais'}
              </button>
            </div>
          )}

          {/* Banner para limpar dados quando populado */}
          {sales.some(s => s.notes === 'Venda de demonstração gerada automaticamente') && (
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 my-2">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-500">O banco de dados contém registros de demonstração autogerados para testes do Dashboard.</span>
              </div>
              <button
                onClick={handleClearDemoData}
                disabled={isClearing}
                className="text-[10px] font-black uppercase italic tracking-wider text-rose-500 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                {isClearing ? 'Limpando...' : 'Remover Dados Gerados'}
              </button>
            </div>
          )}

          {/* Premium Selector and Date Filters Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md shadow-slate-100 flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Beautiful Custom Pill Navigation for Report Type */}
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 pointer-events-none">Sistema Analítico Ativo</label>
              
              {/* Desktop Tabs */}
              <div className="hidden sm:flex p-1.5 bg-slate-100/80 border border-slate-200/50 rounded-2xl gap-1">
                {[
                  { id: 'Relatório de Vendas', label: 'Vendas e Receitas', icon: ShoppingBag },
                  { id: 'Relatório Financeiro', label: 'Fluxo e Despesas', icon: DollarSign },
                  { id: 'Relatório de Estoque', label: 'Posição de Estoque', icon: Package }
                ].map((tab) => {
                  const isActive = reportType === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setReportType(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase italic tracking-wide transition-all ${
                        isActive 
                          ? 'bg-white text-brand-blue shadow-md shadow-slate-200/50 scale-100 border border-slate-100' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <tab.icon size={13} className={isActive ? 'text-brand-blue' : 'text-slate-400'} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Select Field */}
              <div className="sm:hidden relative">
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-100/85 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 appearance-none"
                >
                  <option value="Relatório de Vendas">Vendas e Receitas</option>
                  <option value="Relatório Financeiro">Fluxo e Despesas</option>
                  <option value="Relatório de Estoque">Posição de Estoque</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Date Picker Group */}
            <div className="flex flex-col sm:flex-row gap-4 lg:w-auto shrink-0">
              <div className="space-y-2 sm:w-44">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Calendar size={14} />
                  </span>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/60 transition-all border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase italic focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  />
                </div>
              </div>

              <div className="space-y-2 sm:w-44">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Fim</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Calendar size={14} />
                  </span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/60 transition-all border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase italic focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Metric Grid - 4 Glowing Cards */}
        {reportType !== 'Relatório de Estoque' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Profit */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/20 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <DollarSign size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Lucro Líquido Acumulado</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase italic ${
                    profitTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {profitTrend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(profitTrend).toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">vs anterior</span>
                </div>
              </div>
            </motion.div>
            
            {/* Card 2: Ticket Medio */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/20 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <ShoppingBag size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ticket Médio por Venda</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase italic ${
                    ticketMedioTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {ticketMedioTrend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(ticketMedioTrend).toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">vs anterior</span>
                </div>
              </div>
            </motion.div>
            
            {/* Card 3: Margin */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/20 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Percent size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Margem de Lucro Bruta</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Percent size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {profitMargin.toFixed(1)}%
                </h3>
                <div className="flex flex-col gap-1.5 mt-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase italic ${
                      marginTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {marginTrend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(marginTrend).toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">vs anterior</span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase italic">
                    Margem Líquida: {netMargin.toFixed(1)}%
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Card 4: Promos */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/20 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Zap size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Vendas em Oferta / Promoção</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Zap size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  R$ {totalPromoSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <div className="flex items-center gap-1 text-[10px] font-black text-amber-600/90 uppercase italic mt-2.5">
                  {promoSalesCount} transações promocionais
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Stock Card 1: Unique Products */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/20 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Package size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Saldo de Produtos Ativos</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                  <Package size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {totalProductsInStock}
                </h3>
                <div className="text-[10px] font-black text-slate-400 uppercase italic mt-2.5">
                  Itens com saldo positivo no estoque
                </div>
              </div>
            </motion.div>
            
            {/* Stock Card 2: Stock Capitalized Value */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/20 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <DollarSign size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Valor Líquido em Estoque</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  R$ {totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
                <div className="text-[10px] font-black text-slate-400 uppercase italic mt-2.5">
                  Montante baseado nos preços de custo
                </div>
              </div>
            </motion.div>
            
            {/* Stock Card 3: Alert Levels */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/20 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <AlertCircle size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Alerta de Estoque Crítico</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${lowStockProductsCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <AlertCircle size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {lowStockProductsCount}
                </h3>
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase italic ${
                    lowStockProductsCount > 0 ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {lowStockProductsCount > 0 ? 'Alerta Ativo' : 'Nível Saudável'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Charts and Tables Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Category Distribution (Left / Right depending on type) */}
          {(reportType === 'Relatório de Vendas' || reportType === 'Relatório de Estoque') && (
            <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[380px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-[#1e293b]">Vendas por Categoria / Segmento</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Share de faturamento no período selecionado</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <PieIcon size={14} />
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="h-44 w-44 shrink-0 relative flex items-center justify-center">
                  <ResponsiveContainer id="rel-cat-pie-resp" width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
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
                        formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center metrics readout */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic">Categorias</span>
                    <span className="text-lg font-black text-slate-700">{categoryData.length}</span>
                  </div>
                </div>

                {/* Progress bar list representing legends */}
                <div className="flex-1 w-full space-y-3.5">
                  {categoryData.length > 0 ? (
                    categoryData.slice(0, 5).map((item) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="font-mono text-slate-700 font-bold">{item.value}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full" 
                            style={{ backgroundColor: item.color }} 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium italic">
                      Conversões pendentes
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Customer Rating Ranking */}
          {reportType === 'Relatório de Vendas' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[380px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-[#1e293b]">Análise de Clientes VIP</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Ranking por volume consolidado de compras</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Users size={14} />
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Rank</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Cliente VIP</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Faturamento Acumulado</th>
                      <th className="pb-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Qtd Compras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topCustomers.map((c, idx) => {
                      // Custom visual medals/badges for top 3
                      const orderBadge = 
                        idx === 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/30' :
                        idx === 1 ? 'bg-slate-100/80 text-slate-600 border border-slate-300/30' :
                        idx === 2 ? 'bg-orange-50 text-orange-700 border border-orange-200/30' :
                        'bg-slate-50 text-slate-500';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="py-3">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-lg text-[9px] font-black ${orderBadge}`}>
                              0{idx + 1}
                            </span>
                          </td>
                          <td className="py-3 text-xs font-black text-slate-800 italic uppercase">
                            {c.name}
                          </td>
                          <td className="py-3 text-xs font-bold text-slate-700 font-mono">
                            R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-right text-xs font-black text-brand-blue font-mono">
                            {c.volume}
                          </td>
                        </tr>
                      );
                    })}
                    {topCustomers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-slate-400 italic">Nenhuma compra catalogada neste intervalo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Understock Items Table */}
          {reportType === 'Relatório de Estoque' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[380px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-[#1e293b]">Estoque Abaixo do Nível de Segurança</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Produtos necessitando reposição imediata</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Package size={14} />
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Item de Estoque</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Saldo Atual</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Margem Seg. (Mín)</th>
                      <th className="pb-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Urgência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.filter(p => p.status !== 'Inativo' && p.stock <= p.minStock).slice(0, 6).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3 text-xs font-black text-slate-800 italic uppercase truncate max-w-[180px]">
                          {p.name}
                        </td>
                        <td className="py-3 text-xs font-black text-[#1e293b] font-mono">
                          {p.stock}
                        </td>
                        <td className="py-3 text-xs font-medium text-slate-500 font-mono">
                          {p.minStock}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-[8px] font-black uppercase italic ${
                            p.stock === 0 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {p.stock === 0 ? 'Sem estoque' : 'Estoque Baixo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {products.filter(p => p.status !== 'Inativo' && p.stock <= p.minStock).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-slate-400 italic">Todos os produtos ativos estão saudáveis!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cash Flow Projection (Full Width) */}
          {reportType === 'Relatório Financeiro' && (
            <div className="lg:col-span-12 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[420px]">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-8 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-[#1e293b]">Evolução / Projeção de Fluxo de Caixa (Próximas 4 Semanas)</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Balancete consolidado de receitas, despesas e saldo projetado</p>
                </div>
                
                {/* Beautiful Modern Legend Indicators */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-emerald-505 bg-emerald-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entradas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-rose-505 bg-rose-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saídas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full border border-indigo-500/30 bg-indigo-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-bold text-indigo-500">Saldo Final</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full mt-2">
                <ResponsiveContainer id="rel-proj-bar-resp" width="100%" height="100%">
                  <BarChart data={secondProjectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glowInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.6}/>
                      </linearGradient>
                      <linearGradient id="glowOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 650, fontStyle: 'italic' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                      tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#fff', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                      formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)}
                    />
                    <Bar name="Entradas" dataKey="inflows" fill="url(#glowInflow)" radius={[8, 8, 0, 0]} barSize={28} />
                    <Bar name="Saídas" dataKey="outflows" fill="url(#glowOutflow)" radius={[8, 8, 0, 0]} barSize={28} />
                    <Line name="Saldo" type="monotone" dataKey="balance" stroke="#6366F1" strokeWidth={3.5} dot={{ r: 5, fill: '#fff', stroke: '#6366F1', strokeWidth: 3 }} activeDot={{ r: 7 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Payment Methods Utilization */}
          {(reportType === 'Relatório de Vendas' || reportType === 'Relatório Financeiro') && (
            <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[385px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-[#1e293b]">Meios de Pagamentos Recorrentes</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Análise de canais e taxas de aceitação</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <CreditCard size={14} />
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="h-44 w-1/2 relative flex items-center justify-center">
                  <ResponsiveContainer id="rel-pay-pie-resp" width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2.5}
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center metrics reading */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic">Canais</span>
                    <span className="text-lg font-black text-slate-700">{paymentData.length}</span>
                  </div>
                </div>

                <div className="w-full space-y-2.5">
                  {paymentData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between border-b border-dashed border-slate-100 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs font-bold text-slate-600">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-700 font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalValue)}
                        </span>
                        <span className="text-[10px] font-black text-brand-blue bg-blue-50/50 px-1.5 py-0.5 rounded-md font-mono">({item.value}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Core Products Ranking */}
          {reportType === 'Relatório de Vendas' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[385px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-[#1e293b]">Curva ABC: Produtos mais Vendidos</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Top produtos de alta conversão física</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => onViewReport?.('Vendas por Produto')}
                    className="text-[9px] font-black font-bold uppercase italic tracking-wider text-brand-blue bg-blue-50 hover:bg-blue-100 p-2 rounded-xl transition-all"
                  >
                    Completo
                  </button>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Package size={14} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Rank</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Produto</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-center">Unidades</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">Fauramento (R$)</th>
                      <th className="pb-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Margem Média</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topProducts.map((p, idx) => {
                      const orderBadge = 
                        idx === 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/30' :
                        idx === 1 ? 'bg-slate-100/80 text-slate-600 border border-slate-300/30' :
                        idx === 2 ? 'bg-orange-50 text-orange-700 border border-orange-200/30' :
                        'bg-slate-50 text-slate-500';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="py-3">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-lg text-[9px] font-black ${orderBadge}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 text-xs font-black text-slate-800 italic uppercase truncate max-w-[150px]">
                            {p.name}
                          </td>
                          <td className="py-3 text-xs font-black text-slate-500 font-mono text-center">
                            {p.quantity} Un
                          </td>
                          <td className="py-3 text-xs font-bold text-slate-700 font-mono text-right">
                            R$ {p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1 font-mono font-black text-xs">
                              <span className={p.margin > 25 ? 'text-emerald-600' : 'text-slate-600'}>{p.margin}%</span>
                              {p.margin > 25 ? <TrendingUp size={11} className="text-emerald-500" /> : <TrendingDown size={11} className="text-rose-400" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Accounts Payable / Receivable Alerts list */}
          {reportType === 'Relatório Financeiro' && (
            <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[385px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-[#1e293b]">Títulos e Lançamentos (Próximos 30 Dias)</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Visão consolidada de contas a pagar</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Calendar size={14} />
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Tipo</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Credor / Descrição</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Vencimento</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Valor Nominal</th>
                      <th className="pb-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accounts.length > 0 ? accounts.map((a, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 text-xs font-black text-rose-500 uppercase italic">
                          {a.type}
                        </td>
                        <td className="py-3 text-xs font-bold text-slate-800 truncate max-w-[160px]">
                          {a.desc}
                        </td>
                        <td className="py-3 text-xs font-semibold text-slate-500 font-mono">
                          {a.date}
                        </td>
                        <td className="py-3 text-xs font-black text-[#1e293b] font-mono">
                          R$ {a.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-[8px] font-black uppercase italic ${
                            a.status === 'Em Dia' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs font-medium text-slate-400 italic">Não há contas a apresentar para o intervalo.</td>
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
  const { cashRegisters, cashClosings, sales, cashMovements } = useERP();
  
  const filteredRegisters = cashRegisters.filter(r => {
    const d = toLocalDateString(r.openedAt);
    return d >= startDate && d <= endDate;
  });

  const getRegisterCurrentBalance = (r: any) => {
    const isCancelledSale = (status?: string): boolean => {
      if (!status) return false;
      const s = status.toUpperCase();
      return s === 'CANCELADA' || s === 'CANCELADO' || s === 'CANCEL_PEDIDO';
    };

    const registerSales = (sales || []).filter(s => s.cashRegisterId === r.id && !isCancelledSale(s.status));
    
    let total = r.openingBalance || 0;

    registerSales.forEach(sale => {
      if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
        sale.payments.forEach((payment: any) => {
          total += payment.amount || 0;
        });
      } else if (sale.total) {
        total += sale.total || 0;
      }
    });

    const registerMovements = (cashMovements || []).filter(m => m.cashRegisterId === r.id);
    registerMovements.forEach(m => {
      if (m.type === 'suprimento') {
        total += m.amount || 0;
      } else if (m.type === 'sangria') {
        total -= m.amount || 0;
      }
    });

    return total;
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-slate-50 border border-brand-border min-w-0">
          <p className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest truncate">Caixas Abertos</p>
          <h4 className="text-xl xl:text-2xl font-black text-brand-blue break-words leading-tight">{filteredRegisters.filter(r => r.status === 'open').length}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100 min-w-0">
          <p className="text-[10px] font-black text-rose-900/40 uppercase italic tracking-widest truncate">Caixas Fechados</p>
          <h4 className="text-xl xl:text-2xl font-black text-rose-600 break-words leading-tight">{filteredRegisters.filter(r => r.status === 'closed').length}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-brand-text-main text-white shadow-xl shadow-brand-text-main/20 min-w-0">
          <p className="text-[10px] font-black text-brand-text-sec/60 uppercase italic tracking-widest truncate">Total em Caixa (Abertos)</p>
          <h4 className="text-xl xl:text-2xl font-black text-brand-text-sec break-words leading-tight">
            {formatCurrency(filteredRegisters.filter(r => r.status === 'open').reduce((acc, r) => acc + getRegisterCurrentBalance(r), 0))}
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
                  {r.userId?.slice(0, 8) || 'SISTEMA'}
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
      sale.items.forEach((item: any) => {
        const product = products.find(p => p.id === item.productId);
        const cost = product ? product.costPrice : 0;
        costOfGoods += cost * item.quantity;
      });
    });
    
    const imp = filteredExpenses
      .filter(e => ['Impostos', 'Taxas'].includes(e.category))
      .reduce((acc, e) => acc + e.amount, 0);
      
    const taxasMaquininha = filteredSales.reduce((acc, s: any) => {
      let saleTax = 0;
      let paymentsArr: any[] = [];
      
      if (s.payments) {
        if (Array.isArray(s.payments)) {
          paymentsArr = s.payments;
        } else if (typeof s.payments === 'string') {
          try {
            const parsed = JSON.parse(s.payments);
            if (Array.isArray(parsed)) {
              paymentsArr = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
              paymentsArr = [parsed];
            }
          } catch (e) {
            console.error('Error parsing payments json string in relatorios DRE', e);
          }
        } else if (typeof s.payments === 'object') {
          paymentsArr = [s.payments];
        }
      }

      if (paymentsArr && paymentsArr.length > 0) {
        saleTax = paymentsArr.reduce((pAcc: number, p: any) => {
          const t = p.taxAmount !== undefined ? p.taxAmount : (p.tax_amount !== undefined ? p.tax_amount : 0);
          return pAcc + (Number(t) || 0);
        }, 0);
      }
      
      if (saleTax === 0) {
        const t = s.taxAmount !== undefined ? s.taxAmount : (s.tax_amount !== undefined ? s.tax_amount : 0);
        saleTax = Number(t) || 0;
      }
      
      return acc + saleTax;
    }, 0);
      
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
    sale.items.forEach((item: any) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Giro Médio */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Gauge size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Giro Médio Geral</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/30 text-indigo-505 flex items-center justify-center shrink-0">
              <Gauge size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-brand-blue font-mono tracking-tight">{averageTurnover}x</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Reposições por produto
            </span>
          </div>
        </motion.div>

        {/* KPI 2: Total Items Sold */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <ShoppingBag size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Volume de Saída</span>
            <div className="w-8 h-8 rounded-xl bg-skys-50 border border-skys-100 text-sky-505 flex items-center justify-center shrink-0">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight font-mono">{totalItemsSold} un</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Total vendido no período
            </span>
          </div>
        </motion.div>

        {/* KPI 3: High Turnover Count */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Zap size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Alto Giro (&gt;=2x)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-505 flex items-center justify-center shrink-0">
              <Zap size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight font-mono">{highTurnoverCount}</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Produtos com bom giro
            </span>
          </div>
        </motion.div>

        {/* KPI 4: Low Turnover Count (Alert) */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <AlertTriangle size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest italic">Baixo Giro (&lt;0.5x)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-505 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-600 tracking-tight font-mono">{lowTurnoverCount}</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Produtos com capital parado
            </span>
          </div>
        </motion.div>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {/* Class A */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Zap size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Classe A (Estrela)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/30 text-indigo-505 flex items-center justify-center shrink-0">
              <Zap size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-indigo-600 font-mono tracking-tight">Até 80%</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Do faturamento acumulado
            </span>
          </div>
        </motion.div>

        {/* Class B */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Layers size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Classe B (Médio Impacto)</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/30 text-orange-505 flex items-center justify-center shrink-0">
              <Layers size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-orange-600 font-mono tracking-tight">Até 95%</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Do faturamento acumulado
            </span>
          </div>
        </motion.div>

        {/* Class C */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <HelpCircle size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Classe C (Baixo Impacto)</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/30 text-slate-505 flex items-center justify-center shrink-0">
              <HelpCircle size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-600 font-mono tracking-tight">Até 100%</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Do faturamento acumulado
            </span>
          </div>
        </motion.div>
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
        {/* Card 1: Total Members */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Users size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">Total de Membros Clientes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-850 font-mono tracking-tight">{clubMembers.length}</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Membros cadastrados no clube
            </span>
          </div>
        </motion.div>

        {/* Card 2: Subscription Rate */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Percent size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Taxa de Adesão Geral</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-850 font-mono tracking-tight">
              {customers.length > 0 ? ((clubMembers.length / customers.length) * 100).toFixed(1) : 0}%
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Proporção de base inscrita
            </span>
          </div>
        </motion.div>

        {/* Card 3: Monthly New Joins */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <UserPlus size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest italic">Novos Membros (Mês Atual)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <UserPlus size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-850 font-mono tracking-tight">
              {clubMembers.filter(c => {
                if (!c.clubJoinDate) return false;
                const joinDate = new Date(c.clubJoinDate);
                const now = new Date();
                return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
              }).length}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Recrutamentos recentes no mês
            </span>
          </div>
        </motion.div>
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
  const { sales, customers, products } = useERP();
  
  // Navigation tabs and filters
  const [activeTab, setActiveTab] = React.useState<'consolidado' | 'ranking' | 'vendas'>('consolidado');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [expandedSaleId, setExpandedSaleId] = React.useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  // Reset pagination state when filters or tabs change
  React.useEffect(() => {
    setCurrentPage(1);
    setExpandedSaleId(null);
  }, [activeTab, searchTerm, statusFilter]);

  // 1. Core period filtering
  const filteredSales = React.useMemo(() => {
    return (sales || []).filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  const clubSales = React.useMemo(() => {
    return filteredSales.filter(s => {
      const customer = (customers || []).find(c => c.id === s.customerId);
      return customer?.isClubMember;
    });
  }, [filteredSales, customers]);

  const normalSales = React.useMemo(() => {
    return filteredSales.filter(s => {
      const customer = (customers || []).find(c => c.id === s.customerId);
      return !customer?.isClubMember;
    });
  }, [filteredSales, customers]);

  // 2. Analytical math
  const totalClubRevenue = React.useMemo(() => clubSales.reduce((acc, s) => acc + s.total, 0), [clubSales]);
  const totalNormalRevenue = React.useMemo(() => normalSales.reduce((acc, s) => acc + s.total, 0), [normalSales]);
  const totalOverallRevenue = totalClubRevenue + totalNormalRevenue;

  const countClubSales = clubSales.length;
  const countNormalSales = normalSales.length;
  const totalSalesCount = countClubSales + countNormalSales;

  const clubTicket = countClubSales > 0 ? totalClubRevenue / countClubSales : 0;
  const normalTicket = countNormalSales > 0 ? totalNormalRevenue / countNormalSales : 0;

  const clubTicketDiffPercent = normalTicket > 0 ? ((clubTicket - normalTicket) / normalTicket) * 100 : 0;
  const clubRepresentativePercent = totalOverallRevenue > 0 ? (totalClubRevenue / totalOverallRevenue) * 100 : 0;

  const clubTotalDiscounts = React.useMemo(() => {
    return clubSales.reduce((acc, s) => acc + (s.discount || 0), 0);
  }, [clubSales]);

  const activeClubBuyersCount = React.useMemo(() => {
    const uniqueIds = new Set(clubSales.map(s => s.customerId).filter(Boolean));
    return uniqueIds.size;
  }, [clubSales]);

  const totalClubMembersInDbCount = React.useMemo(() => {
    return (customers || []).filter(c => c.isClubMember).length;
  }, [customers]);

  const clubEngagementPercent = totalClubMembersInDbCount > 0 
    ? (activeClubBuyersCount / totalClubMembersInDbCount) * 100 
    : 0;

  // 3. Chart Data
  const chartPieData = [
    { name: 'Membros Clube', value: totalClubRevenue, color: '#1E5EFF', percentage: clubRepresentativePercent.toFixed(1) },
    { name: 'Clientes Comuns', value: totalNormalRevenue, color: '#94A3B8', percentage: (100 - clubRepresentativePercent).toFixed(1) }
  ];

  const chartBarData = [
    { name: 'Clube', 'Ticket Médio (R$)': parseFloat(clubTicket.toFixed(2)), color: '#1E5EFF' },
    { name: 'Comum', 'Ticket Médio (R$)': parseFloat(normalTicket.toFixed(2)), color: '#94A3B8' }
  ];

  // 4. Ranking Tab calculation
  const rankingData = React.useMemo(() => {
    const clubMembers = (customers || []).filter(c => c.isClubMember);
    
    const rankMapped = clubMembers.map(member => {
      const memberSalesLoc = clubSales.filter(s => s.customerId === member.id);
      const totalSpentPeriod = memberSalesLoc.reduce((acc, s) => acc + s.total, 0);
      const orderCountPeriod = memberSalesLoc.length;
      const averageTicketPeriod = orderCountPeriod > 0 ? totalSpentPeriod / orderCountPeriod : 0;
      
      return {
        member,
        totalSpentPeriod,
        orderCountPeriod,
        averageTicketPeriod
      };
    });

    let result = rankMapped;
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.member.name.toLowerCase().includes(q) || 
        r.member.document.includes(q) || 
        (r.member.phone && r.member.phone.includes(q))
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(r => r.member.status === statusFilter);
    }

    return result.sort((a, b) => b.totalSpentPeriod - a.totalSpentPeriod);
  }, [customers, clubSales, searchTerm, statusFilter]);

  const totalRankPages = Math.ceil(rankingData.length / itemsPerPage) || 1;
  const paginatedRanking = React.useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return rankingData.slice(startIdx, startIdx + itemsPerPage);
  }, [rankingData, currentPage]);

  // 5. Member transitions calculation
  const transitionSalesData = React.useMemo(() => {
    let result = clubSales;
    
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(s => {
        const customer = (customers || []).find(c => c.id === s.customerId);
        const nameMatch = customer ? customer.name.toLowerCase().includes(q) : false;
        const docMatch = customer ? customer.document.includes(q) : false;
        const idMatch = s.id.toLowerCase().includes(q);
        return nameMatch || docMatch || idMatch;
      });
    }

    return [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [clubSales, customers, searchTerm]);

  const totalSalesPages = Math.ceil(transitionSalesData.length / itemsPerPage) || 1;
  const paginatedSalesList = React.useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return transitionSalesData.slice(startIdx, startIdx + itemsPerPage);
  }, [transitionSalesData, currentPage]);

  // Helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // CSV Exporters
  const exportConsolidatedCSV = () => {
    try {
      const headers = [
        'Indicador',
        'Valor Membros Clube',
        'Valor Clientes Comuns',
        'Resultado Consolidado / Referencia'
      ];
      
      const rows = [
        ['Faturamento Total', formatCurrency(totalClubRevenue), formatCurrency(totalNormalRevenue), formatCurrency(totalOverallRevenue)],
        ['Transacoes Realizadas', countClubSales, countNormalSales, totalSalesCount],
        ['Ticket Medio', formatCurrency(clubTicket), formatCurrency(normalTicket), `Membros: +${clubTicketDiffPercent.toFixed(1)}% de ganho`],
        ['Descontos Concedidos', formatCurrency(clubTotalDiscounts), '-', `Impacto direto do programa de vantagens`],
        ['Socio Ativos no Periodo', `${activeClubBuyersCount} socios`, `${totalClubMembersInDbCount} cadastrados`, `Engajamento de ${clubEngagementPercent.toFixed(1)}% da base`]
      ];

      const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Consolidado_Programa_Fidelidade_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const exportRankingCSV = () => {
    try {
      const headers = [
        'Posicao',
        'Nome do Cliente',
        'Documento',
        'Fone Contato',
        'Status Cadastro',
        'Pedidos no Periodo',
        'Total Consumido Periodo (R$)',
        'Ticket Medio Periodo (R$)',
        'Faturamento Acumulado Geral (R$)'
      ];

      const rows = rankingData.map((item, index) => [
        index + 1,
        item.member.name,
        item.member.document || 'N/I',
        item.member.phone || 'N/I',
        item.member.status,
        item.orderCountPeriod,
        item.totalSpentPeriod.toFixed(2),
        item.averageTicketPeriod.toFixed(2),
        item.member.totalSpent?.toFixed(2) || '0.00'
      ]);

      const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Ranking_Consumo_Socios_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const exportTransactionsCSV = () => {
    try {
      const headers = [
        'Data Lancamento',
        'Codigo Pedido',
        'Socio Comprador',
        'CPF/Documento',
        'Quantidade Itens',
        'Desconto (R$)',
        'Faturamento Consolidado (R$)'
      ];

      const rows = transitionSalesData.map(sale => {
        const customer = (customers || []).find(c => c.id === sale.customerId);
        const qty = sale.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        return [
          new Date(sale.date).toLocaleString('pt-BR'),
          sale.id,
          customer ? customer.name : 'Socio Final',
          customer ? customer.document : '',
          qty,
          (sale.discount || 0).toFixed(2),
          sale.total.toFixed(2)
        ];
      });

      const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Lançamentos_Socios_Foco_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Tab Selector & Action Layout */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 scrollbar-none overflow-x-auto">
          <button
            onClick={() => { setActiveTab('consolidado'); }}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase italic tracking-wider transition-all border-b-2 shrink-0 cursor-pointer",
              activeTab === 'consolidado' 
                ? "border-brand-blue text-brand-blue font-black" 
                : "border-transparent text-slate-500 hover:text-slate-850 font-bold"
            )}
          >
            <div className="flex items-center gap-2">
              <Activity size={13} />
              Desempenho Geral
            </div>
          </button>
          
          <button
            onClick={() => { setActiveTab('ranking'); }}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase italic tracking-wider transition-all border-b-2 shrink-0 cursor-pointer",
              activeTab === 'ranking' 
                ? "border-brand-blue text-brand-blue font-black" 
                : "border-transparent text-slate-500 hover:text-slate-850 font-bold"
            )}
          >
            <div className="flex items-center gap-2">
              <Trophy size={13} />
              Ranking de Sócios
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('vendas'); }}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase italic tracking-wider transition-all border-b-2 shrink-0 cursor-pointer",
              activeTab === 'vendas' 
                ? "border-brand-blue text-brand-blue font-black" 
                : "border-transparent text-slate-500 hover:text-slate-850 font-bold"
            )}
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={13} />
              Dossiê de Vendas
            </div>
          </button>
        </div>

        {/* Global Action Export Bar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={
              activeTab === 'consolidado' ? exportConsolidatedCSV :
              activeTab === 'ranking' ? exportRankingCSV : exportTransactionsCSV
            }
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 cursor-pointer"
            title="Exportar planilha analítica atual para Excel"
          >
            <Download size={13} />
            Exportar XLS (CSV)
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 cursor-pointer"
            title="Imprimir dossiê do programa"
          >
            <Printer size={13} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Strategic Fidelization KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Club Spend Revenue */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Award size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Faturamento Clube</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-250 text-indigo-505 flex items-center justify-center shrink-0">
              <Award size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">{formatCurrency(totalClubRevenue)}</h3>
            <span className="text-[10px] font-black text-indigo-600 uppercase italic mt-1.5 flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {clubRepresentativePercent.toFixed(1)}% do faturamento total
            </span>
          </div>
        </motion.div>

        {/* Average Ticket Lift comparison */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <TrendingUp size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Ticket Médio de Sócio</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{formatCurrency(clubTicket)}</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex px-1.5 py-0.2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black rounded italic leading-none">
                +{clubTicketDiffPercent.toFixed(1)}%
              </span>
              <span>vs {formatCurrency(normalTicket)} comum</span>
            </span>
          </div>
        </motion.div>

        {/* Total loyalty discount offset */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Percent size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Descontos Concedidos</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">{formatCurrency(clubTotalDiscounts)}</h3>
            <span className="text-[10px] font-black text-amber-600 uppercase italic mt-1.5 flex items-center gap-1 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Estímulo financeiro à fidelidade
            </span>
          </div>
        </motion.div>

        {/* Member buyer activation engagement */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-850 shadow-md flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Users size={140} className="text-white" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Sociabilidade de Base</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 text-brand-text-sec flex items-center justify-center shrink-0">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-brand-text-sec font-mono tracking-tight">
              {activeClubBuyersCount} <span className="text-xs font-normal text-slate-400">ativos</span>
            </h3>
            <span className="text-[10px] text-brand-text-sec/80 font-black uppercase italic mt-1.5 flex items-center gap-1 leading-none">
              <span className="font-mono bg-white/10 border border-white/5 px-1.5 py-0.2 rounded">
                {clubEngagementPercent.toFixed(1)}% engajados
              </span>
            </span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'consolidado' ? (
          <motion.div
            key="club-consolidado-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Visual Analytics Segment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Doughnut Chart of Split */}
              <div className="lg:col-span-5 bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-brand-text-main uppercase italic flex items-center gap-1.5">
                    <PieIcon size={14} className="text-brand-blue" />
                    Divisão de Entrada Comercial
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Proporção da receita liquida entre o clube e avulsos</p>
                </div>

                <div className="h-60 w-full relative my-4 flex items-center justify-center">
                  {totalOverallRevenue > 0 ? (
                    <>
                      <ResponsiveContainer id="rel-club-donut-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                        <PieChart>
                          <Pie
                            data={chartPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {chartPieData.map((entry, idx) => (
                              <Cell key={`cell-club-p-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any, name: any, props: any) => [
                            formatCurrency(Number(value) || 0) + ` (${props.payload.percentage}%)`,
                            name
                          ]} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 11, fontWeight: 700 }} />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Receita Geral</span>
                        <span className="text-base font-black text-slate-800 font-mono mt-1">{formatCurrency(totalOverallRevenue)}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{totalSalesCount} Pedidos</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 font-semibold text-xs text-center">Nenhum lançamento no período ativo.</div>
                  )}
                </div>

                {/* Pie legend items */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-4 border-t border-slate-100">
                  {chartPieData.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase italic">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name} ({p.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ticket Compare bar chart */}
              <div className="lg:col-span-7 bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-brand-text-main uppercase italic flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-brand-blue" />
                    Comparador de Ticket Médio (Clubes vs. Comuns)
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Representação visual do valor desembolsado por ticket em cada categoria de cliente</p>
                </div>

                <div className="h-60 w-full my-4">
                  {totalOverallRevenue > 0 ? (
                    <ResponsiveContainer id="rel-club-bar-resp" width="105%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                      <BarChart data={chartBarData} margin={{ top: 10, right: 35, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B', fontWeight: 800}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B', fontWeight: 800}} tickFormatter={(val) => `R$${val}`} />
                        <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 700 }} />
                        <Bar dataKey="Ticket Médio (R$)" radius={[6, 6, 0, 0]}>
                          {chartBarData.map((entry, idx) => (
                            <Cell key={`cell-club-b-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">Nenhum faturamento registrado.</div>
                  )}
                </div>

                <div className="p-3 bg-indigo-50/50 border border-indigo-100/40 rounded-2xl flex items-start gap-2.5">
                  <Activity size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold text-indigo-950 uppercase leading-normal">
                    <strong>Conclusão Comercial:</strong> Os membros do Clube de Vantagens gastam aproximadamente <strong className="font-mono text-brand-blue">{clubTicketDiffPercent.toFixed(1)}% a mais</strong> por vinda à loja do que clientes comuns. Fomentar inscrições de novos associados eleva o ticket geral de forma orgânica.
                  </p>
                </div>
              </div>
            </div>

            {/* Strategic Overview Table Benchmarks */}
            <div className="bg-white border border-slate-200 rounded-[2.2rem] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h4 className="text-sm font-black text-brand-text-main uppercase italic flex items-center gap-2">
                  <Activity size={15} className="text-brand-blue" />
                  Quadro Geral Comparativo do Período
                </h4>
                <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Indicadores estruturantes do comportamento de compras do clube vs base normalizada</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/50">
                      <th className="py-4 pl-6 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Dimensão Analítica</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Faturamento Sócios Clube</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Faturamento Clientes Comuns</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Consolidado Total / Índice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-650">
                    <tr className="hover:bg-slate-50/30">
                      <td className="py-4 pl-6 font-black text-slate-800 uppercase italic">Faturamento Bruto Liquido</td>
                      <td className="py-4 text-right font-mono text-indigo-600 font-extrabold">{formatCurrency(totalClubRevenue)}</td>
                      <td className="py-4 text-right font-mono">{formatCurrency(totalNormalRevenue)}</td>
                      <td className="py-4 text-right font-mono text-slate-800 font-black">{formatCurrency(totalOverallRevenue)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/30">
                      <td className="py-4 pl-6 font-black text-slate-800 uppercase italic">Volume de Transações</td>
                      <td className="py-4 text-right font-mono font-extrabold">{countClubSales} ordens</td>
                      <td className="py-4 text-right font-mono">{countNormalSales} ordens</td>
                      <td className="py-4 text-right font-mono text-slate-800 font-black">{totalSalesCount} ordens ({clubRepresentativePercent.toFixed(1)}% do total)</td>
                    </tr>
                    <tr className="hover:bg-slate-50/30">
                      <td className="py-4 pl-6 font-black text-slate-800 uppercase italic">Ticket Médio Operacional</td>
                      <td className="py-4 text-right font-mono text-emerald-600 font-extrabold">{formatCurrency(clubTicket)}</td>
                      <td className="py-4 text-right font-mono">{formatCurrency(normalTicket)}</td>
                      <td className="py-4 text-right">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded uppercase italic bg-emerald-50 text-emerald-600 border border-emerald-100">
                          +{clubTicketDiffPercent.toFixed(1)}% lift médio
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/30">
                      <td className="py-4 pl-6 font-black text-slate-800 uppercase italic">Programa de Fidelização (Descontos)</td>
                      <td className="py-4 text-right font-mono text-rose-600 font-extrabold">-{formatCurrency(clubTotalDiscounts)}</td>
                      <td className="py-4 text-right font-mono text-slate-300">-</td>
                      <td className="py-4 text-right text-[10px] text-slate-400 font-bold uppercase italic">Atratividade financeira ativa</td>
                    </tr>
                    <tr className="hover:bg-slate-50/30">
                      <td className="py-4 pl-6 font-black text-slate-800 uppercase italic">Fidelização da Base Cadastrada</td>
                      <td className="py-4 text-right font-extrabold text-brand-blue">{activeClubBuyersCount} sócios ativos</td>
                      <td className="py-4 text-right">{totalClubMembersInDbCount} sócios totais</td>
                      <td className="py-4 text-right">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded uppercase italic bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {clubEngagementPercent.toFixed(1)}% engajamento
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'ranking' ? (
          <motion.div
            key="club-ranking-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Interactive Filters Panel for Ranking */}
            <div className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                {/* Search Term for Customers */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Buscar Sócio</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filtrar por nome do sósio, celular ou CPF..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-705 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/20"
                    />
                  </div>
                </div>

                {/* Status Filter Dropdown */}
                <div className="flex flex-col shrink-0">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Cadastro</label>
                  <div className="flex items-center gap-2">
                    <Filter size={13} className="text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-black text-slate-700 italic focus:outline-none focus:bg-white"
                    >
                      <option value="All">Status (Todos)</option>
                      <option value="VIP">VIP</option>
                      <option value="Ativo">Ativo</option>
                      <option value="VIP_Ativo">VIP e Ativos</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

              {rankingData.length > 0 && (
                <div className="px-5 py-3.5 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-center text-right self-stretch md:self-auto min-w-[180px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Estrela do Clube</span>
                  <div className="flex justify-end gap-1.5 items-baseline mt-1 truncate">
                    <Trophy size={12} className="text-yellow-500" />
                    <span className="text-xs font-black text-slate-800 uppercase italic truncate max-w-[150px]">{rankingData[0].member.name}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-0.5 leading-none">Faturamento Período: {formatCurrency(rankingData[0].totalSpentPeriod)}</p>
                </div>
              )}
            </div>

            {/* Ranking analytical ledger */}
            <div className="bg-white border border-slate-200 rounded-[2.2rem] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-brand-text-main uppercase italic flex items-center gap-2">
                    <Trophy size={15} className="text-brand-blue" />
                    Relação Geral por Volume de Compras
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Top compradores pertencentes ao programa fidelidade por capital liquidado na janela ativa</p>
                </div>
                <span className="inline-flex px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-black text-slate-500 uppercase italic">
                  {rankingData.length} sócios mapeados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/50">
                      <th className="py-4 pl-6 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest w-16 text-center">Pos</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Sócio Comprador</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Documento (CPF)</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Status</th>
                      <th className="py-4 text-center text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Pedidos</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Desembolso Período</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Média por Compra</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest pr-6 font-mono">Consumo Histórico Geral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRanking.length > 0 ? paginatedRanking.map((item, index) => {
                      const pos = (currentPage - 1) * itemsPerPage + index + 1;
                      const hasCompletedPurchases = item.totalSpentPeriod > 0;
                      
                      return (
                        <tr 
                          key={item.member.id}
                          className="hover:bg-slate-50/40 transition-colors group"
                        >
                          {/* Position index badge */}
                          <td className="py-4 pl-6 text-center">
                            <span className={cn(
                              "inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black font-mono shadow-xs",
                              pos === 1 ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
                              pos === 2 ? "bg-slate-100 text-slate-800 border border-slate-205" :
                              pos === 3 ? "bg-amber-100 text-amber-800 border border-amber-200" :
                              "bg-slate-50 text-slate-500 border border-slate-150"
                            )}>
                              {pos}
                            </span>
                          </td>

                          {/* Member full name */}
                          <td className="py-4">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-705 uppercase italic border border-slate-200 group-hover:bg-brand-blue group-hover:text-white transition-all">
                                {item.member.name.charAt(0).toUpperCase()}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-800 uppercase italic leading-none group-hover:text-brand-blue transition-colors">
                                  {item.member.name}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase leading-none truncate max-w-[180px]">
                                  {item.member.phone || 'Sem fone'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Document reference */}
                          <td className="py-4 text-xs font-bold text-slate-600 font-mono">
                            {item.member.document || '---'}
                          </td>

                          {/* Member status badging */}
                          <td className="py-4">
                            <span className={cn(
                              "inline-flex items-center text-[9px] font-black px-2 py-0.5 rounded-full uppercase border select-none italic",
                              item.member.status === 'VIP' ? "bg-purple-50 text-purple-650 border-purple-100" :
                              item.member.status === 'Ativo' ? "bg-emerald-50 text-emerald-650 border-emerald-100" :
                              item.member.status === 'Inativo' ? "bg-slate-100 text-slate-500 border-slate-200" :
                              "bg-amber-50 text-amber-650 border-amber-100"
                            )}>
                              {item.member.status || 'Ativo'}
                            </span>
                          </td>

                          {/* Orders processed in date window */}
                          <td className="py-4 text-center">
                            <span className="text-xs font-black text-slate-800 font-mono">{item.orderCountPeriod}</span>
                          </td>

                          {/* Sum period spend */}
                          <td className="py-4 text-right">
                            <span className={cn(
                              "text-xs font-black font-mono",
                              hasCompletedPurchases ? "text-indigo-600" : "text-slate-400 italic"
                            )}>
                              {formatCurrency(item.totalSpentPeriod)}
                            </span>
                          </td>

                          {/* Avg spend in period */}
                          <td className="py-4 text-right">
                            <span className="text-xs font-black text-slate-650 font-mono">
                              {formatCurrency(item.averageTicketPeriod)}
                            </span>
                          </td>

                          {/* Historic lifetime spend */}
                          <td className="py-4 text-right pr-6">
                            <span className="text-xs font-black text-slate-850 font-mono">
                              {formatCurrency(item.member.totalSpent || 0)}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-405 text-xs font-black uppercase italic tracking-wide">
                          Nenhum sócio ativo corresponde ao termo ou status informado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Rank list pagination controls */}
              {totalRankPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase italic">Página {currentPage} de {totalRankPages} ({rankingData.length} sócios)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={cn(
                        "p-2 border border-slate-200 rounded-xl text-slate-605 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      )}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalRankPages))}
                      disabled={currentPage === totalRankPages}
                      className={cn(
                        "p-2 border border-slate-200 rounded-xl text-slate-605 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      )}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="club-vendas-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Sales List filters */}
            <div className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mapear Registro Comercial</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar lançamentos por nome do cliente, CPF ou código hash do pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-705 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/20"
                />
              </div>
            </div>

            {/* List Table ledgers */}
            <div className="bg-white border border-slate-200 rounded-[2.2rem] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-brand-text-main uppercase italic flex items-center gap-2">
                    <ClipboardList size={15} className="text-brand-blue" />
                    Lançamentos Atribuídos aos Membros do Clube
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Visão cronológica das ordens emitidas. Clique em uma linha para exibir os produtos comprados</p>
                </div>
                <span className="inline-flex px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-black text-slate-500 uppercase italic">
                  {transitionSalesData.length} registros no clube
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/50">
                      <th className="py-4 pl-6 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Data Lanc.</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">ID Chave</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Sócio Cadastrado</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Documento (CPF)</th>
                      <th className="py-4 text-center text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Itens</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Desconto Concedido</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest font-mono">Faturamento Bruto</th>
                      <th className="py-4 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSalesList.length > 0 ? paginatedSalesList.map((sale) => {
                      const customer = (customers || []).find(c => c.id === sale.customerId);
                      const isExpanded = expandedSaleId === sale.id;
                      const itemQuantitySum = sale.items.reduce((acc: number, it: any) => acc + it.quantity, 0);

                      return (
                        <React.Fragment key={sale.id}>
                          <tr 
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                            className="hover:bg-slate-50/40 transition-colors cursor-pointer"
                          >
                            {/* Timestamp */}
                            <td className="py-4 pl-6 text-xs font-bold text-slate-800 font-mono">
                              {new Date(sale.date).toLocaleString('pt-BR')}
                            </td>

                            {/* Hash code */}
                            <td className="py-4 text-[10px] font-black text-slate-405 font-mono uppercase">
                              #{sale.id.slice(0, 8)}
                            </td>

                            {/* Customer profile link */}
                            <td className="py-4">
                              <span className="text-xs font-black text-indigo-950 uppercase italic hover:text-brand-blue transition-colors">
                                {customer ? customer.name : 'Sócio Autônomo'}
                              </span>
                            </td>

                            {/* CPF */}
                            <td className="py-4 text-xs font-bold text-slate-600 font-mono">
                              {customer?.document || 'Sem documento'}
                            </td>

                            {/* Quantity of items */}
                            <td className="py-4 text-center font-mono text-xs text-slate-700">
                              {itemQuantitySum}
                            </td>

                            {/* Applied Discounts */}
                            <td className="py-4 text-right font-mono text-xs text-rose-600 font-bold">
                              {sale.discount && sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : formatCurrency(0)}
                            </td>

                            {/* Final Total spend */}
                            <td className="py-4 text-right font-mono text-xs text-indigo-700 font-black">
                              {formatCurrency(sale.total)}
                            </td>

                            {/* Expanded indicator */}
                            <td className="py-4 text-center pr-6">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-brand-blue rotate-180 transition-transform" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
                              )}
                            </td>
                          </tr>

                          {/* Expandable Purchase details drawer */}
                          {isExpanded && (
                            <tr className="bg-slate-50/40">
                              <td colSpan={8} className="py-4 px-6 md:px-10 border-t border-b border-slate-150">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart size={13} className="text-brand-blue" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Composição do pedido</span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {sale.items.map((item: any, index: number) => {
                                      const prod = (products || []).find(p => p.id === item.productId);
                                      return (
                                        <div key={index} className="p-3 bg-white border border-slate-150 rounded-2xl flex items-center justify-between shadow-xs">
                                          <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-800 uppercase italic">
                                              {prod ? prod.name : 'Produto Atribuído'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase font-mono">
                                              {item.quantity} un x {formatCurrency(item.price)}
                                            </span>
                                          </div>
                                          <span className="text-xs font-black text-slate-800 font-mono">
                                            {formatCurrency(item.price * item.quantity)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-405 text-xs font-black uppercase italic">
                          Nenhuma transação financeira foi vinculada ao Clube neste intervalo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sales Pagination */}
              {totalSalesPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-black uppercase italic">Página {currentPage} de {totalSalesPages} ({transitionSalesData.length} vendas)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={cn(
                        "p-2 border border-slate-200 rounded-xl text-slate-650 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      )}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalSalesPages))}
                      disabled={currentPage === totalSalesPages}
                      className={cn(
                        "p-2 border border-slate-200 rounded-xl text-slate-650 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      )}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommissionsReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, systemUsers, employees, customers } = useERP();
  const [commissionRate, setCommissionRate] = React.useState<number>(3); // Alíquota padrão de 3%
  const [expandedSeller, setExpandedSeller] = React.useState<string | null>(null);
  
  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  const salesByUser: Record<string, number> = {};
  const salesListByUser: Record<string, typeof sales> = {};
  
  filteredSales.forEach(sale => {
    const userId = sale.userId || 'unknown';
    salesByUser[userId] = (salesByUser[userId] || 0) + sale.total;
    if (!salesListByUser[userId]) {
      salesListByUser[userId] = [];
    }
    salesListByUser[userId].push(sale);
  });

  const rawData = Object.entries(salesByUser).map(([userId, total]) => {
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

    const commission = total * (commissionRate / 100);
    return {
      userId,
      sellerName,
      initials,
      total,
      commission
    };
  }).sort((a, b) => b.total - a.total);

  const totalSalesVolume = React.useMemo(() => {
    return rawData.reduce((sum, item) => sum + item.total, 0);
  }, [rawData]);

  const totalCommissionsPaid = React.useMemo(() => {
    return rawData.reduce((sum, item) => sum + item.commission, 0);
  }, [rawData]);

  const topSeller = rawData.length > 0 ? rawData[0] : null;

  const colors = ['#1e5eff', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#06b6d4', '#14b8a6'];
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return 'Consumidor Final';
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.name : 'Consumidor Final';
  };

  return (
    <div className="space-y-8">
      {/* Menu do Módulo e Seletor de Bonificação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-blue font-black uppercase italic tracking-wider text-[10px] mb-1">
            <Award size={11} className="text-brand-blue animate-pulse" />
            Remuneração & Incentivo
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Comissões de Vendedores</h4>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 leading-relaxed">
            Gestão estratégica de bonificações, volume comercial liquidado por operador e provisionamento de folha de pagamento.
          </p>
        </div>

        {/* Dynamic commission rate selector buttons */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-1.5 rounded-2xl shrink-0 self-start md:self-center shadow-xs">
          <span className="text-[9px] font-black uppercase text-slate-400 italic px-1.5">Alíquota Proposta:</span>
          <div className="bg-slate-200/50 p-1 rounded-xl flex items-center gap-1">
            {[1, 2, 3, 5, 8, 10].map((rate) => (
              <button
                key={rate}
                onClick={() => setCommissionRate(rate)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  commissionRate === rate 
                    ? "bg-white text-slate-800 shadow-xs font-black scale-102" 
                    : "text-slate-400 hover:text-slate-600 font-bold"
                )}
              >
                {rate}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {rawData.length > 0 ? (
        <>
          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Volume Líquido Geral */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Wallet size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Volume de Vendas</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                  <Wallet size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {formatCurrency(totalSalesVolume)}
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Vendas apuradas no período
                </span>
              </div>
            </motion.div>

            {/* KPI 2: Provisão de Comissões */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Award size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Comissão Provisionada</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Award size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-850 font-mono tracking-tight text-emerald-600">
                  {formatCurrency(totalCommissionsPaid)}
                </h3>
                <span className="text-[10px] font-black text-emerald-600 uppercase italic mt-1.5 flex items-center gap-1 file:leading-none font-bold">
                  Acordo operacional de ({commissionRate}%)
                </span>
              </div>
            </motion.div>

            {/* KPI 3: Vendedor Líder */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Trophy size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Vendedor Líder</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Trophy size={15} />
                </div>
              </div>
              <div className="mt-2 text-left">
                <h3 className="text-[15px] font-black text-slate-800 italic uppercase truncate max-w-[180px]">
                  {topSeller?.sellerName}
                </h3>
                <span className="text-[10px] font-black text-amber-600 uppercase italic mt-1.5 block leading-none">
                  Faturou {topSeller ? formatCurrency(topSeller.total) : 'R$ 0'} isolado
                </span>
              </div>
            </motion.div>

            {/* KPI 4: Operadores Ativos */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Users size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Operadores Ativos</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users size={15} />
                </div>
              </div>
              <div className="mt-2 text-left">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {rawData.length} <span className="text-xs text-slate-400 font-medium font-sans">pessoas</span>
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block leading-none">
                  Operando no período
                </span>
              </div>
            </motion.div>
          </div>

          {/* Rateio grid */}
          <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Rateio de Comissões e Demonstrativos</h4>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Clique no colaborador para visualizar o detalhamento das transações correspondentes</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <ClipboardList size={14} />
              </div>
            </div>

            {/* Accordion-list style details */}
            <div className="space-y-4">
              {rawData.map((row, i) => {
                const isExpanded = expandedSeller === row.userId;
                const percentShare = totalSalesVolume > 0 ? (row.total / totalSalesVolume) * 100 : 0;
                const rowSales = salesListByUser[row.userId] || [];
                const color = colors[i % colors.length];

                return (
                  <div key={i} className="border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-200 shadow-xs">
                    {/* Header line */}
                    <button 
                      onClick={() => setExpandedSeller(isExpanded ? null : row.userId)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 transition-all text-left",
                        isExpanded ? "bg-slate-50 border-b border-slate-200/60" : "bg-white hover:bg-slate-50/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Interactive Avatar badge with dynamic index colors matching categorization screen */}
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-inner text-white uppercase"
                          style={{ backgroundColor: color }}
                        >
                          {row.initials}
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-800 uppercase italic tracking-wider block">{row.sellerName}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase italic block mt-0.5">{rowSales.length} vendas registradas</span>
                        </div>
                      </div>

                      {/* Info layout */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-400">
                            Volume: <span className="font-mono font-black text-slate-700">{formatCurrency(row.total)}</span>
                          </p>
                          <p className="text-xs font-black text-emerald-600 mt-0.5">
                            Comissão: <span className="font-mono">{formatCurrency(row.commission)}</span>
                          </p>
                        </div>
                        <div className="text-right hidden sm:block min-w-[70px]">
                          <span className="text-[10px] font-black text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded-md">
                            {percentShare.toFixed(1)}% share
                          </span>
                        </div>
                        <div className={cn("w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-200", isExpanded && "rotate-180 bg-brand-blue/10 text-brand-blue")}>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </button>

                    {/* Expand content */}
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-white p-5 space-y-3 border-t border-slate-100"
                      >
                        {/* Key facts metrics display area inside accordion block */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 pb-4 mb-4 bg-slate-50/40 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none mb-1">Média por Venda</span>
                            <span className="text-xs font-black text-slate-850 font-mono leading-none">
                              {formatCurrency(row.total / Math.max(1, rowSales.length))}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none mb-1">Alíquota Aplicada</span>
                            <span className="text-xs font-black text-brand-blue font-mono leading-none">{commissionRate}%</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none mb-1">Comissão Média</span>
                            <span className="text-xs font-black text-emerald-600 font-mono leading-none">
                              {formatCurrency(row.commission / Math.max(1, rowSales.length))}
                            </span>
                          </div>
                        </div>

                        {/* List of individual sales table with clean headers */}
                        <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase italic border-b border-slate-100 pb-2 mb-2 select-none">
                          <div className="col-span-3">Identificador</div>
                          <div className="col-span-3">Data e Hora</div>
                          <div className="col-span-3">Cliente Comprador</div>
                          <div className="col-span-3 text-right">Faturamento / Comissão ({commissionRate}%)</div>
                        </div>

                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                          {rowSales.map((sale, saleIdx) => {
                            const customerName = getCustomerName(sale.customerId);
                            const saleDate = new Date(sale.date).toLocaleDateString('pt-BR') + ' ' + new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            const saleCommission = sale.total * (commissionRate / 100);

                            return (
                              <div key={saleIdx} className="grid grid-cols-12 items-center text-xs py-1 hover:bg-slate-50/50 rounded px-1 group transition-colors">
                                <div className="col-span-3 font-mono font-black text-slate-500 uppercase tracking-tighter">
                                  #{sale.id.substring(0, 8)}
                                </div>
                                <div className="col-span-3 font-semibold text-slate-500 font-mono text-[11px]">
                                  {saleDate}
                                </div>
                                <div className="col-span-3 font-semibold text-slate-700 truncate pr-2 uppercase text-[10px] italic">
                                  {customerName}
                                </div>
                                <div className="col-span-3 text-right flex items-center justify-end gap-2.5">
                                  <span className="font-mono font-bold text-slate-500">{formatCurrency(sale.total)}</span>
                                  <span className="font-mono font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded text-[10px] select-none shadow-xs">
                                    {formatCurrency(saleCommission)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2.2rem] border border-slate-200 p-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Award size={28} />
          </div>
          <h4 className="text-sm font-black uppercase italic text-slate-700">Nenhuma comissão elegível</h4>
          <p className="text-xs font-semibold text-slate-400 max-w-sm mt-1 leading-relaxed text-center">
            Não foram identificadas vendas realizadas por operadores ou colaboradores no período selecionado de {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}.
          </p>
        </div>
      )}
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
    sale.items.forEach((item: any) => {
      const product = products.find(p => p.id === item.productId);
      let category = 'Outros';
      if (product && product.subcategoria_id) {
        const sub = subcategorias.find(s => s.id === product.subcategoria_id);
        if (sub) {
          const cat = categorias.find(c => c.id === sub.categoria_id);
          if (cat) category = cat.nome.trim(); // Trim category name
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

  const colors = ['#1e5eff', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#06b6d4', '#14b8a6'];
  const data = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
      percentVal: totalRevenue > 0 ? (value / totalRevenue) * 100 : 0,
      percent: totalRevenue > 0 ? `${((value / totalRevenue) * 100).toFixed(1)}%` : '0%',
      color: colors[index % colors.length],
      products: Object.values(categoryProducts[name] || {}).sort((a, b) => b.total - a.total)
    }));

  // Extra executive stats
  const totalUnitsSold = React.useMemo(() => {
    let units = 0;
    filteredSales.forEach(s => {
      s.items?.forEach((i: any) => {
        units += i.quantity;
      });
    });
    return units;
  }, [filteredSales]);

  const leaderCategory = data.length > 0 ? data[0] : null;

  const avgRevenuePerCategory = React.useMemo(() => {
    const numCats = Object.keys(categoryTotals).length;
    return numCats > 0 ? totalRevenue / numCats : 0;
  }, [categoryTotals, totalRevenue]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      {/* Upper Module Title */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-brand-blue font-black uppercase italic tracking-wider text-[10px] mb-1">
            <Layers size={11} className="text-brand-blue animate-pulse" />
            Distribuição Demográfica
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Vendas por Categoria</h4>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 leading-relaxed">
            Consolidação de faturamento por grupos de produtos e análise de participação de mercado do inventário ativo.
          </p>
        </div>
      </div>

      {data.length > 0 ? (
        <>
          {/* Executive Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Faturamento Geral */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <DollarSign size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Faturamento Total</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                  <DollarSign size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {formatCurrency(totalRevenue)}
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Receita total consolidada
                </span>
              </div>
            </motion.div>

            {/* KPI 2: Categoria Líder */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Trophy size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Categoria Líder</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Trophy size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-lg font-black text-slate-800 italic uppercase truncate max-w-[180px]">
                  {leaderCategory?.name}
                </h3>
                <span className="text-[10px] font-black text-emerald-600 uppercase italic mt-1.5 flex items-center gap-1">
                  <span className="font-mono">{leaderCategory?.percent}</span> do total faturado
                </span>
              </div>
            </motion.div>

            {/* KPI 3: Volume de Saídas */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Package size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Unidades Vendidas</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Package size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {totalUnitsSold} <span className="text-xs text-slate-400 font-medium font-sans">itens</span>
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Movimentação de estoque
                </span>
              </div>
            </motion.div>

            {/* KPI 4: Ticket Médio por Categoria */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Percent size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Média por Categoria</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Percent size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {formatCurrency(avgRevenuePerCategory)}
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Distribuição proporcional
                </span>
              </div>
            </motion.div>
          </div>

          {/* Main Visual Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visual Donut Chart & Legend */}
            <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Participação de Mercado das Categorias</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Visão percentual do faturamento total</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <PieChartIcon size={14} />
                </div>
              </div>

              {/* Graphic Stage */}
              <div className="h-64 relative flex items-center justify-center">
                <ResponsiveContainer id="rel-pay-pie-2-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                  <PieChart>
                    <Pie
                      data={data}
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${formatCurrency(Number(value))}`, 'Faturamento']}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Faturado</span>
                  <span className="text-lg font-black text-slate-800 font-mono tracking-tight mt-1">
                    {new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                  </span>
                </div>
              </div>

              {/* Enhanced Interactive List Legend */}
              <div className="grid grid-cols-2 gap-3.5 mt-6 border-t border-slate-100 pt-5 pr-1 max-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                {data.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50/50 border border-slate-100">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-700 uppercase italic truncate leading-none mb-1">{entry.name}</p>
                      <p className="text-[11px] font-mono font-black text-brand-blue flex items-center justify-between">
                        <span>{entry.total}</span>
                        <span className="text-slate-400 font-semibold text-[9px] ml-1">({entry.percent})</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Details Panel */}
            <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Análise e Detalhamento</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Explore os produtos líderes por faturamento em cada categoria</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Layers size={14} />
                </div>
              </div>

              {/* Scrollable details list */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 max-h-[460px]">
                {data.map((cat, i) => {
                  const isExpanded = expandedCategory === cat.name;
                  return (
                    <div key={i} className="border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-200 shadow-xs">
                      {/* Accordion header button */}
                      <button 
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 transition-all text-left",
                          isExpanded ? "bg-slate-50 border-b border-slate-200/60" : "bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white" style={{ backgroundColor: cat.color }}></span>
                          <div>
                            <span className="text-xs font-black text-slate-800 uppercase italic tracking-wider block">{cat.name}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase italic block mt-0.5 mt-0.5">{cat.products.length} produtos vendidos</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-black text-brand-blue font-mono">{cat.total}</span>
                            <span className="text-[10px] font-black text-slate-400 font-mono ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {cat.percent}
                            </span>
                          </div>
                          <div className={cn("w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-200", isExpanded && "rotate-180 bg-brand-blue/10 text-brand-blue")}>
                            <ChevronDown size={14} />
                          </div>
                        </div>
                      </button>

                      {/* Product Details under Accordion */}
                      {isExpanded && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-white p-4 space-y-3"
                        >
                          {/* Inner Table Header */}
                          <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase italic border-b border-slate-100 pb-2">
                            <div className="col-span-6">Produto Comercializado</div>
                            <div className="col-span-2 text-center">Unidades</div>
                            <div className="col-span-4 text-right">Contribuição / Receita</div>
                          </div>

                          {/* Detail row items */}
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                            {cat.products.map((prod, idx) => {
                              const productShare = cat.value > 0 ? (prod.total / cat.value) * 100 : 0;
                              return (
                                <div key={idx} className="flex flex-col gap-1.5 py-1.5 last:border-0 hover:bg-slate-55/65 transition-colors">
                                  <div className="grid grid-cols-12 items-center text-xs">
                                    <div className="col-span-6 font-black text-slate-700 truncate pr-2 uppercase italic text-[11px]">{prod.name}</div>
                                    <div className="col-span-2 text-center font-black text-slate-800 font-mono text-[11px]">{prod.quantity}</div>
                                    <div className="col-span-4 text-right font-black text-brand-blue font-mono text-[11px]">
                                      {formatCurrency(prod.total)}
                                    </div>
                                  </div>
                                  
                                  {/* Micro progress bar details */}
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${productShare}%` }}
                                        transition={{ duration: 0.6, ease: 'easeOut' }}
                                        className="h-full rounded-full" 
                                        style={{ backgroundColor: cat.color }}
                                      />
                                    </div>
                                    <span className="text-[8px] font-mono font-black text-slate-400 shrink-0 select-none">
                                      {productShare.toFixed(1)}% do setor
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2.2rem] border border-slate-200 p-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Layers size={28} />
          </div>
          <h4 className="text-sm font-black uppercase italic text-slate-700">Nenhuma venda consolidada</h4>
          <p className="text-xs font-semibold text-slate-400 max-w-sm mt-1 leading-relaxed text-center">
            Não foram encontradas correspondências para agrupamento de produtos ou categorias no período selecionado de {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}.
          </p>
        </div>
      )}
    </div>
  );
}

function SalesByHourReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales } = useERP();
  const [chartMetric, setChartMetric] = React.useState<'vendas' | 'faturamento'>('vendas');
  
  const filteredSales = React.useMemo(() => {
    return sales.filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  const hourCounts: Record<number, number> = {};
  const hourRevenues: Record<number, number> = {};
  let totalSales = 0;
  let totalRevenue = 0;
  
  filteredSales.forEach(sale => {
    const dateObj = new Date(sale.date);
    const hour = dateObj.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    hourRevenues[hour] = (hourRevenues[hour] || 0) + (sale.total || 0);
    totalSales++;
    totalRevenue += (sale.total || 0);
  });

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6h to 23h
  
  const chartData = hours.map(hour => ({
    hour: `${hour}h`,
    vendas: hourCounts[hour] || 0,
    faturamento: hourRevenues[hour] || 0,
    fullHour: hour
  }));

  const maxVendas = Math.max(...Object.values(hourCounts), 0);
  const maxFaturamento = Math.max(...Object.values(hourRevenues), 0);

  const peakHourRecord = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0] || ["--", 0];
  const peakHour = peakHourRecord[0];

  const peakHourRevenueRecord = Object.entries(hourRevenues).sort(([, a], [, b]) => b - a)[0] || ["--", 0];
  const peakHourRevenue = peakHourRevenueRecord[0];

  const avgVendas = hours.length > 0 ? (totalSales / hours.length).toFixed(1) : 0;
  const avgRevenue = hours.length > 0 ? (totalRevenue / hours.length) : 0;
  const avgTicket = totalSales > 0 ? (totalRevenue / totalSales) : 0;

  // Turnos (Shift volume & financial metrics)
  const morningSalesCount = hours.filter(h => h < 12).reduce((sum, h) => sum + (hourCounts[h] || 0), 0);
  const morningRevenue = hours.filter(h => h < 12).reduce((sum, h) => sum + (hourRevenues[h] || 0), 0);

  const afternoonSalesCount = hours.filter(h => h >= 12 && h < 18).reduce((sum, h) => sum + (hourCounts[h] || 0), 0);
  const afternoonRevenue = hours.filter(h => h >= 12 && h < 18).reduce((sum, h) => sum + (hourRevenues[h] || 0), 0);

  const eveningSalesCount = hours.filter(h => h >= 18).reduce((sum, h) => sum + (hourCounts[h] || 0), 0);
  const eveningRevenue = hours.filter(h => h >= 18).reduce((sum, h) => sum + (hourRevenues[h] || 0), 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      {/* Module Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-blue font-black uppercase italic tracking-wider text-[10px] mb-1">
            <Clock size={11} className="text-brand-blue" />
            Análise de Tráfego Horário
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Vendas por Hora</h4>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 leading-relaxed">
            Consolidação do fluxo de consumo, faturamento gerencial e comportamento de compra ao longo do dia comercial.
          </p>
        </div>

        {/* Visual Select Metric Tab */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center shrink-0 self-start md:self-center">
          <button
            onClick={() => setChartMetric('vendas')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              chartMetric === 'vendas' 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ShoppingBag size={12} />
            Qtd. Vendas
          </button>
          <button
            onClick={() => setChartMetric('faturamento')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              chartMetric === 'faturamento' 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <DollarSign size={12} />
            Faturamento
          </button>
        </div>
      </div>

      {totalSales > 0 ? (
        <>
          {/* Executive Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Total Revenue in Period */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <DollarSign size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Faturamento Total</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                  <DollarSign size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {formatCurrency(totalRevenue)}
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  {totalSales} transações bem-sucedidas
                </span>
              </div>
            </motion.div>

            {/* KPI 2: Ticket Médio */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Percent size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ticket Médio</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Percent size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {formatCurrency(avgTicket)}
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Média de consumo por ticket
                </span>
              </div>
            </motion.div>

            {/* KPI 3: Horário de Pico (Volume) */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Clock size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Pico de Movimento</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {peakHour}h:00
                </h3>
                <span className="text-[10px] font-black text-amber-600 uppercase italic mt-1.5 flex items-center gap-1">
                  <Zap size={11} /> Estágio de {hourCounts[Number(peakHour)] || 0} compras simultâneas
                </span>
              </div>
            </motion.div>

            {/* KPI 4: Pico Financeiro */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Trophy size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Pico de Faturamento</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Trophy size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight text-emerald-600">
                  {peakHourRevenue}h:00
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Gerou {formatCurrency(hourRevenues[Number(peakHourRevenue)] || 0)} faturados
                </span>
              </div>
            </motion.div>
          </div>

          {/* Graphics Section and Shift panels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Hourly Flow Chart Panel */}
            <div className="lg:col-span-8 bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm flex flex-col justify-between min-h-[460px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">
                    Fluxo Comercial {chartMetric === 'vendas' ? '(Volume de Pedidos)' : '(Volume Financeiro)'}
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Dinâmica de faturamento e densidade por hora de atendimento</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <BarChart3 size={15} />
                </div>
              </div>

              {/* Graphic Stage */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hourChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartMetric === 'vendas' ? '#1e5eff' : '#10b981'} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={chartMetric === 'vendas' ? '#1e5eff' : '#10b981'} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="hour" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
                      tickFormatter={(val) => chartMetric === 'vendas' ? val : `R$ ${val.toLocaleString('pt-BR', { notation: 'compact' })}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(val: any) => [
                        chartMetric === 'vendas' ? `${val} vendas` : formatCurrency(Number(val)), 
                        chartMetric === 'vendas' ? 'Volume de Vendas' : 'Receita Gerada'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={chartMetric} 
                      stroke={chartMetric === 'vendas' ? '#1e5eff' : '#10b981'} 
                      strokeWidth={4}
                      fill="url(#hourChartGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Side Panel */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-6">
              {/* Shift KPI Breakdown */}
              <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200 shadow-sm space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Distribuição por Turno</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Faturamento acumulado por divisão de turnos</p>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Matutino (06h - 11h)', val: morningRevenue, qty: morningSalesCount, color: '#1e5eff' },
                    { label: 'Vespertino (12h - 17h)', val: afternoonRevenue, qty: afternoonSalesCount, color: '#10b981' },
                    { label: 'Noturno (18h - 23h)', val: eveningRevenue, qty: eveningSalesCount, color: '#818cf8' }
                  ].map((p, i) => {
                    const total = totalRevenue || 1;
                    const salesTotal = totalSales || 1;
                    const revenuePercentage = (p.val / total) * 100;
                    const selectionPercentage = chartMetric === 'vendas' ? (p.qty / salesTotal) * 100 : revenuePercentage;

                    return (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-700 block italic leading-none">{p.label}</span>
                            <span className="text-[9px] font-semibold text-slate-400 block mt-1">{p.qty} vendas efetuadas</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-800 font-mono block leading-none">{formatCurrency(p.val)}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono block mt-1">({revenuePercentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden mt-1 relative z-10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${selectionPercentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Operational Advisory Warning Box */}
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2.2rem] flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
                  <Gauge size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h5 className="text-xs font-black text-emerald-950 uppercase italic tracking-wider">Aconselhamento Operacional</h5>
                  <p className="text-[10px] font-semibold text-emerald-800/80 leading-relaxed mt-1">
                    O maior pico financeiro ocorre às <span className="font-extrabold text-emerald-950">{peakHourRevenue}h</span> ({formatCurrency(hourRevenues[Number(peakHourRevenue)] || 0)}), 
                    enquanto o pico em fluxo de e-commerce/caixa é registrado às <span className="font-extrabold text-emerald-950">{peakHour}h</span> com {hourCounts[Number(peakHour)] || 0} transações. 
                    Recomendamos escala reforçada de operadores e atendimento entre <span className="font-extrabold text-emerald-950">{Math.max(6, Number(peakHour) - 1)}h</span> e <span className="font-extrabold text-emerald-950">{Math.min(23, Number(peakHour) + 1)}h</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Saturação Grid (Heatmap Matrix) */}
          <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200/80 shadow-sm flex flex-col shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Painel Térmico de Atendimento</h4>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Analise visual rápida de saturação de equipe e vendas hora a hora</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-slate-50 border border-slate-200" />
                  <span className="text-[8px] font-black text-slate-400 uppercase italic">Ocioso</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-brand-blue/30" />
                  <span className="text-[8px] font-black text-slate-400 uppercase italic">Baixo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-brand-blue" />
                  <span className="text-[8px] font-black text-slate-400 uppercase italic font-bold">Máximo</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-18 gap-3.5">
              {hours.map((hour, idx) => {
                const count = hourCounts[hour] || 0;
                const revenue = hourRevenues[hour] || 0;
                const activeVal = chartMetric === 'vendas' ? count : revenue;
                const activeMax = chartMetric === 'vendas' ? maxVendas : maxFaturamento;
                
                // compute color opacity based on intensity
                const intensity = activeMax > 0 ? (activeVal / activeMax) : 0;
                const isPeak = chartMetric === 'vendas' ? (hour.toString() === peakHour) : (hour.toString() === peakHourRevenue);

                // color schema
                const cellBgColor = activeVal > 0 
                  ? `rgba(30, 95, 255, ${Math.max(0.08, intensity)})`
                  : '#f8fafc';

                return (
                  <motion.div 
                    key={hour}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex flex-col items-center gap-2 group cursor-default"
                  >
                    <div 
                      className={cn(
                        "w-full aspect-[4/5] rounded-xl flex flex-col items-center justify-center p-2 transition-all duration-300 relative overflow-hidden border",
                        activeVal > 0 ? "border-brand-blue/10 shadow-xs group-hover:scale-105 group-hover:shadow-md" : "border-slate-100"
                      )}
                      style={{ 
                        backgroundColor: cellBgColor
                      }}
                    >
                      {/* Peak indicator */}
                      {isPeak && (
                        <div className="absolute top-1 right-1">
                          <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-ping absolute" />
                          <span className="w-1.5 h-1.5 bg-brand-blue rounded-full relative block" />
                        </div>
                      )}
                      
                      {/* Value Display */}
                      <span className={cn(
                        "text-xs font-black font-mono transition-colors duration-300 block text-center leading-none",
                        activeVal > 0 ? "text-slate-800" : "text-slate-300"
                      )}>
                        {chartMetric === 'vendas' ? count : `${revenue.toLocaleString('pt-BR', { notation: 'compact' })}`}
                      </span>
                    </div>

                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest transition-colors block text-center",
                      activeVal > 0 ? "text-slate-700 font-bold" : "text-slate-400 font-medium"
                    )}>{hour}h</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2.2rem] border border-slate-200 p-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Clock size={28} />
          </div>
          <h4 className="text-sm font-black uppercase italic text-slate-700">Nenhum tráfego registrado</h4>
          <p className="text-xs font-semibold text-slate-400 max-w-sm mt-1 leading-relaxed text-center">
            Não foram encontradas correspondências de vendas no período selecionado de {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}.
          </p>
        </div>
      )}
    </div>
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
      sale.items.forEach((item: any) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total KPI */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Faturamento no Período</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/30 text-slate-600 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-brand-blue font-mono tracking-tight" title={stats.formattedTotalRevenue}>
              {stats.formattedTotalRevenue}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Base Calculada: {rawData.length} itens vendidos
            </span>
          </div>
        </motion.div>

        {/* Classe A */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Zap size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Classe A — Alta Importância</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Zap size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              {stats.pctA.toFixed(1)}% <span className="text-xs font-normal text-slate-400">do faturamento</span>
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              {stats.countA} produtos ({(rawData.length > 0 ? (stats.countA / rawData.length) * 100 : 0).toFixed(0)}% do mix)
            </span>
          </div>
        </motion.div>

        {/* Classe B */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Layers size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">Classe B — Média Importância</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Layers size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {stats.pctB.toFixed(1)}% <span className="text-xs font-normal text-slate-400">do faturamento</span>
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              {stats.countB} produtos ({(rawData.length > 0 ? (stats.countB / rawData.length) * 100 : 0).toFixed(0)}% do mix)
            </span>
          </div>
        </motion.div>

        {/* Classe C */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <ShoppingBag size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Classe C — Baixa Importância</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/30 text-slate-500 flex items-center justify-center shrink-0">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-500 font-mono tracking-tight">
              {stats.pctC.toFixed(1)}% <span className="text-xs font-normal text-slate-400">do faturamento</span>
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              {stats.countC} produtos ({(rawData.length > 0 ? (stats.countC / rawData.length) * 100 : 0).toFixed(0)}% do mix)
            </span>
          </div>
        </motion.div>
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
  const { sales, paymentMethods, customers, systemUsers, products } = useERP();
  
  // Tabs and drill-down state
  const [activeTab, setActiveTab] = useState<'geral' | 'detalhes'>('geral');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMethodId, searchTerm]);

  // 1. Filter sales in date range
  const filteredSales = useMemo(() => {
    return (sales || []).filter(s => {
      if (!s.date) return false;
      const d = toLocalDateString(s.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, startDate, endDate]);

  const safePaymentMethods = useMemo(() => paymentMethods || [], [paymentMethods]);

  // 2. Calculations for each payment method
  const paymentStats = useMemo(() => {
    const statsMap = new Map<string, {
      id: string;
      name: string;
      type: string;
      count: number;
      grossAmount: number;
      fees: number;
      netAmount: number;
      avgTicket: number;
      color: string;
      taxPercentage: number;
      taxFixed: number;
    }>();

    // Default system colors
    const colors = ['#10B981', '#6366F1', '#0EA5E9', '#F43F5E', '#8B5CF6', '#F59E0B', '#14B8A6', '#3B82F6', '#EC4899', '#64748B'];

    // List all methods (even unused ones during this period, for completeness)
    safePaymentMethods.forEach((method, idx) => {
      statsMap.set(method.id, {
        id: method.id,
        name: method.name,
        type: method.type || 'Outro',
        count: 0,
        grossAmount: 0,
        fees: 0,
        netAmount: 0,
        avgTicket: 0,
        color: colors[idx % colors.length],
        taxPercentage: method.taxPercentage || 0,
        taxFixed: method.taxFixed || 0
      });
    });

    // Normalize helper
    const normalize = (str?: string) => (str || '').toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // Group sales and add to stats
    filteredSales.forEach(sale => {
      const pmId = sale.paymentMethod;
      let existing = statsMap.get(pmId);

      // If it doesn't match an active paymentMethod ID, maybe it matches by name or is historic
      if (!existing && pmId) {
        // Try searching by name (robustly)
        const nPmId = normalize(pmId);
        const matchByName = safePaymentMethods.find(m => normalize(m.name) === nPmId);
        if (matchByName) {
          existing = statsMap.get(matchByName.id);
        }
      }

      const total = sale.total || 0;

      if (existing) {
        // Calculate fees for this transaction based on paymentMethod rules
        let saleFee = (total * (existing.taxPercentage / 100)) + existing.taxFixed;
        if (sale.payments && Array.isArray(sale.payments)) {
            const payment = sale.payments.find((p: any) => p.method === pmId || p.paymentMethodId === pmId);
            if (payment && payment.taxAmount !== undefined) saleFee = payment.taxAmount;
        }
        existing.count += 1;
        existing.grossAmount += total;
        existing.fees += saleFee;
        existing.netAmount += (total - saleFee);
      } else {
        // Create an ad-hoc "Historic/Other" method grouping
        const name = pmId || 'Outros';
        console.debug(`DEBUG: Adding ad-hoc payment method: "${name}" (ID: "${pmId}")`);
        const color = colors[statsMap.size % colors.length];
        
        // Let's check if we already created an ad-hoc grouping
        let adhoc = Array.from(statsMap.values()).find(x => x.name === name);
        if (!adhoc) {
          const adhocId = pmId || 'other';
          statsMap.set(adhocId, {
            id: adhocId,
            name: name,
            type: 'Outro',
            count: 1,
            grossAmount: total,
            fees: 0, // Assume 0 if unknown
            netAmount: total,
            avgTicket: total,
            color,
            taxPercentage: 0,
            taxFixed: 0
          });
        } else {
          adhoc.count += 1;
          adhoc.grossAmount += total;
          adhoc.netAmount += total;
        }
      }
    });

    // Final calculations and sorting
    return Array.from(statsMap.values())
      .filter(m => m.count > 0 || safePaymentMethods.some(pm => pm.id === m.id)) // only show if used OR defined
      .map(m => {
        return {
          ...m,
          avgTicket: m.count > 0 ? m.grossAmount / m.count : 0,
          netAmount: m.grossAmount - m.fees
        };
      })
      .sort((a, b) => b.grossAmount - a.grossAmount);
  }, [filteredSales, safePaymentMethods]);

  // Overall sums
  const totalGrossAmount = useMemo(() => filteredSales.reduce((acc, s) => acc + s.total, 0), [filteredSales]);
  const totalFeesAmount = useMemo(() => paymentStats.reduce((acc, p) => acc + p.fees, 0), [paymentStats]);
  const totalNetAmount = useMemo(() => totalGrossAmount - totalFeesAmount, [totalGrossAmount, totalFeesAmount]);
  const totalTransactionsCount = filteredSales.length;
  const overallAvgTicket = totalTransactionsCount > 0 ? totalGrossAmount / totalTransactionsCount : 0;

  // Chart structured data
  const chartPieData = useMemo(() => {
    return paymentStats
      .filter(p => p.grossAmount > 0)
      .map(p => ({
        name: p.name,
        value: p.grossAmount,
        percentage: totalGrossAmount > 0 ? ((p.grossAmount / totalGrossAmount) * 100).toFixed(1) : '0.0',
        color: p.color
      }));
  }, [paymentStats, totalGrossAmount]);

  const chartBarData = useMemo(() => {
    return paymentStats
      .filter(p => p.grossAmount > 0)
      .map(p => ({
        name: p.name,
        'Ticket Médio (R$)': parseFloat(p.avgTicket.toFixed(2)),
        'Transações': p.count,
        color: p.color
      }));
  }, [paymentStats]);

  // Selected method stats (for drill-down and transactions list)
  const selectedMethodStats = useMemo(() => {
    if (selectedMethodId === 'All') return null;
    return paymentStats.find(p => p.id === selectedMethodId) || null;
  }, [selectedMethodId, paymentStats]);

  // Filtered sales list for drill down
  const drillDownSales = useMemo(() => {
    let result = filteredSales;

    // Filter by payment method
    if (selectedMethodId !== 'All') {
      result = result.filter(s => {
        if (s.paymentMethod === selectedMethodId) return true;
        // fallback search by name if ID was saved as method name
        const matchMethod = safePaymentMethods.find(m => m.id === selectedMethodId);
        if (matchMethod && s.paymentMethod === matchMethod.id) return true;
        
        const currentPMName = safePaymentMethods.find(m => m.id === s.paymentMethod)?.name || s.paymentMethod || 'Outros';
        const targetPMName = matchMethod?.name || selectedMethodId;
        return currentPMName.toLowerCase() === targetPMName.toLowerCase();
      });
    }

    // Filter by search terms (customer or vendor)
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(s => {
        const customer = (customers || []).find(c => c.id === s.customerId);
        const seller = (systemUsers || []).find(u => u.id === s.userId);
        
        const customerName = customer ? customer.name.toLowerCase() : 'consumidor final';
        const sellerName = seller ? (seller.full_name || seller.username).toLowerCase() : 'sistema';
        const saleId = s.id.toLowerCase();

        return customerName.includes(q) || sellerName.includes(q) || saleId.includes(q);
      });
    }

    return result;
  }, [filteredSales, selectedMethodId, searchTerm, safePaymentMethods, customers, systemUsers]);

  // Granular sales paginated
  const totalPages = Math.ceil(drillDownSales.length / itemsPerPage) || 1;
  const paginatedSales = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return drillDownSales.slice(startIdx, startIdx + itemsPerPage);
  }, [drillDownSales, currentPage]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getMethodTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Dinheiro': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Pix': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      case 'Crédito': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Débito': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Fiado': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'Voucher': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'Dinheiro': return <DollarSign className="w-3.5 h-3.5" />;
      case 'Pix': return <Zap className="w-3.5 h-3.5" />;
      case 'Crédito':
      case 'Débito': return <CreditCard className="w-3.5 h-3.5" />;
      case 'Fiado': return <User className="w-3.5 h-3.5" />;
      case 'Voucher': return <Percent className="w-3.5 h-3.5" />;
      default: return <Layers className="w-3.5 h-3.5" />;
    }
  };

  // CSV Exporter for local table
  const exportToCSV = () => {
    try {
      const headers = [
        'Forma de Pagamento',
        'Tipo',
        'Taxa %',
        'Taxa Fixa (R$)',
        'Quantidade Transações',
        'Faturamento Bruto (R$)',
        'Custos Opera. (R$)',
        'Faturamento Líquido (R$)',
        'Ticket Médio (R$)',
        '% de Participação'
      ];

      const rows = paymentStats.map(stat => {
        const share = totalGrossAmount > 0 ? ((stat.grossAmount / totalGrossAmount) * 100).toFixed(1) : '0';
        return [
          stat.name,
          stat.type,
          stat.taxPercentage.toFixed(2),
          stat.taxFixed.toFixed(2),
          stat.count,
          stat.grossAmount.toFixed(2),
          stat.fees.toFixed(2),
          stat.netAmount.toFixed(2),
          stat.avgTicket.toFixed(2),
          `${share}%`
        ];
      });

      const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Analise_Meios_Pagamento_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Menu de Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 scrollbar-none overflow-x-auto">
          <button
            onClick={() => { setActiveTab('geral'); }}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase italic tracking-wider transition-all border-b-2",
              activeTab === 'geral' 
                ? "border-brand-blue text-brand-blue font-black" 
                : "border-transparent text-slate-500 hover:text-slate-850 font-bold"
            )}
          >
            <div className="flex items-center gap-2">
              <Activity size={13} />
              Visão Consolidada
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('detalhes'); }}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase italic tracking-wider transition-all border-b-2",
              activeTab === 'detalhes' 
                ? "border-brand-blue text-brand-blue font-black" 
                : "border-transparent text-slate-500 hover:text-slate-850 font-bold"
            )}
          >
            <div className="flex items-center gap-2">
              <Search size={13} />
              Investigação Detalhada
            </div>
          </button>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 cursor-pointer"
          >
            <Download size={13} />
            Exportar CSV
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={13} />
            Imprimir dossiê
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Faturamento Bruto */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Receita Bruta Total</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-150 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">{formatCurrency(totalGrossAmount)}</h3>
            <span className="text-[10px] text-slate-400 font-black uppercase italic mt-1.5 flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              100% dos fluxos de entrada
            </span>
          </div>
        </motion.div>

        {/* Tarifas Estimadas */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Percent size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tarifas Descontadas</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-150 text-rose-600 flex items-center justify-center shrink-0">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-600 font-mono tracking-tight">{formatCurrency(totalFeesAmount)}</h3>
            <span className="text-[10px] text-rose-605 font-black uppercase italic mt-1.5 flex items-center gap-1.5 leading-none">
              <span>Custo Médio:</span>
              <span className="font-mono bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                {totalGrossAmount > 0 ? ((totalFeesAmount / totalGrossAmount) * 100).toFixed(2) : '0.00'}%
              </span>
            </span>
          </div>
        </motion.div>

        {/* Faturamento Líquido */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-850 shadow-md flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Wallet size={140} className="text-white" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Recebível Líquido</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 text-brand-text-sec flex items-center justify-center shrink-0">
              <Wallet size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-brand-text-sec font-mono tracking-tight">{formatCurrency(totalNetAmount)}</h3>
            <span className="text-[10px] text-brand-text-sec/80 font-black uppercase italic mt-1.5 flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Previsão operacional líquida
            </span>
          </div>
        </motion.div>

        {/* Volume de Vendas */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <ShoppingCart size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Transações Efetuadas</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-650 flex items-center justify-center shrink-0">
              <ShoppingCart size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {totalTransactionsCount} <span className="text-xs font-normal text-slate-400">vendas</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-black uppercase italic mt-1.5 flex items-center gap-1.5 leading-none">
              <span>Tkt. Médio Geral:</span>
              <span className="font-mono text-slate-750">{formatCurrency(overallAvgTicket)}</span>
            </span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'geral' ? (
          <motion.div
            key="consolidado-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Charts & Interactive Segment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Donut Chart (Volume Split) */}
              <div className="lg:col-span-5 bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-brand-text-main uppercase italic flex items-center gap-1.5">
                    <PieIcon size={14} className="text-brand-blue" />
                    Fração de Receita (%)
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Participação de faturamento por meio de pagamento</p>
                </div>
                
                <div className="h-60 w-full relative my-4 flex items-center justify-center">
                  {chartPieData.length > 0 ? (
                    <>
                      <ResponsiveContainer id="rel-payment-donut-resp" width="100%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                        <PieChart>
                          <Pie
                            data={chartPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {chartPieData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any, name: any, props: any) => [
                            formatCurrency(Number(value) || 0) + ` (${props.payload.percentage}%)`,
                            name
                          ]} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: 11, fontWeight: 700 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Center Text inside the Donut */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançados</span>
                        <span className="text-lg font-black text-slate-800 font-mono mt-0.5">{formatCurrency(totalGrossAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 font-semibold text-xs text-center">Nenhum dado financeiro para o período.</div>
                  )}
                </div>

                {/* Quick Pie Legend */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-4 border-t border-slate-100">
                  {chartPieData.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name} ({p.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar Chart (Average Ticket comparison & Transaction limits) */}
              <div className="lg:col-span-7 bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-brand-text-main uppercase italic flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-brand-blue" />
                    Ticket Médio por Meio de Pagamento
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Comparativo do valor médio gasto por transação em cada plataforma</p>
                </div>

                <div className="h-60 w-full my-4">
                  {chartBarData.length > 0 ? (
                    <ResponsiveContainer id="rel-payment-bar-resp" width="105%" height="100%" minWidth={10} minHeight={10} debounce={1}>
                      <BarChart data={chartBarData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B', fontWeight: 700}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B', fontWeight: 700}} tickFormatter={(val) => `R$${val}`} />
                        <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 700 }} />
                        <Bar dataKey="Ticket Médio (R$)" radius={[6, 6, 0, 0]}>
                          {chartBarData.map((entry, idx) => (
                            <Cell key={`cell-bar-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">Nenhum indicador registrado.</div>
                  )}
                </div>

                <div className="p-3 bg-indigo-50/50 border border-indigo-100/40 rounded-2xl flex items-start gap-2.5">
                  <Activity size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold text-indigo-950 uppercase leading-normal">
                    <strong>Dica de Caixa:</strong> Meios com alto ticket médio mas pouca frequência podem ser impulsionados com ofertas escalonadas ou campanhas direcionadas.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Methods Analytical Ledger */}
            <div className="bg-white border border-slate-200 rounded-[2.2rem] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-brand-text-main uppercase italic flex items-center gap-2">
                    <CreditCard size={15} className="text-brand-blue" />
                    Desempenho Geral por Operador / Meio
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Mapeamento granular de transações, faturamento bruto, custos operacionais e faturamento líquido</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/50">
                      <th className="py-4 pl-6 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Canal / Meio</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Tipo de Relação</th>
                      <th className="py-4 text-center text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Transações</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Faturamento Bruto</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Tarifário do Meio</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Custos da Operadora</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Faturamento Líquido</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Ticket Médio</th>
                      <th className="py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentStats.map((stat) => {
                      const sharePercentage = totalGrossAmount > 0 ? ((stat.grossAmount / totalGrossAmount) * 100).toFixed(1) : '0.0';
                      
                      return (
                        <tr 
                          key={stat.id}
                          onClick={() => {
                            setSelectedMethodId(stat.id);
                            setActiveTab('detalhes');
                          }}
                          className="hover:bg-slate-50/50 transition-all cursor-pointer group"
                        >
                          {/* Name / Segment */}
                          <td className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-xl shrink-0 flex items-center justify-center p-0.5 text-[10px] font-black text-white" style={{ backgroundColor: stat.color }}>
                                {stat.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="text-sm font-black text-slate-805 uppercase italic group-hover:text-brand-blue transition-colors">
                                {stat.name}
                              </span>
                              {stat.count === 0 && (
                                <span className="text-[8px] font-black border border-slate-200 bg-slate-50 text-slate-405 px-1.5 py-0.2 rounded uppercase italic shrink-0">Sem Uso</span>
                              )}
                            </div>
                          </td>

                          {/* Type Badge */}
                          <td className="py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-[9px] font-black uppercase italic shrink-0",
                              getMethodTypeBadgeStyle(stat.type)
                            )}>
                              {getMethodIcon(stat.type)}
                              {stat.type}
                            </span>
                          </td>

                          {/* Transaction Count */}
                          <td className="py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black text-slate-800 font-mono">{stat.count}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase italic">({sharePercentage}% de fat.)</span>
                            </div>
                          </td>

                          {/* Gross Amount */}
                          <td className="py-4 text-right">
                            <span className="text-xs font-black text-slate-800 font-mono">{formatCurrency(stat.grossAmount)}</span>
                          </td>

                          {/* Fee configuration mapping */}
                          <td className="py-4 text-right text-[10px] font-bold text-slate-500 uppercase italic">
                            {stat.taxPercentage > 0 || stat.taxFixed > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-[10px] font-bold text-slate-600">{stat.taxPercentage}%</span>
                                {stat.taxFixed > 0 ? <span className="text-[8px]">+ R$ {stat.taxFixed.toFixed(2)} fixos</span> : null}
                              </div>
                            ) : (
                              <span className="text-slate-300">Isento</span>
                            )}
                          </td>

                          {/* Estimated operating fees paid */}
                          <td className="py-4 text-right">
                            <span className="text-xs font-black text-rose-600 font-mono">
                              {stat.fees > 0 ? `-${formatCurrency(stat.fees)}` : formatCurrency(0)}
                            </span>
                          </td>

                          {/* Net Amount */}
                          <td className="py-4 text-right">
                            <span className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(stat.netAmount)}</span>
                          </td>

                          {/* Ticket médio */}
                          <td className="py-4 text-right">
                            <span className="text-xs font-black text-brand-blue font-mono">{formatCurrency(stat.avgTicket)}</span>
                          </td>

                          {/* Chevron CTA */}
                          <td className="py-4 text-center pr-6">
                            <ChevronRight size={14} className="text-slate-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detalhes-investigacao-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Dynamic selector and searches */}
            <div className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                {/* Filter Method Selection */}
                <div className="flex flex-col shrink-0">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Meio de Captura</label>
                  <div className="flex items-center gap-2">
                    <CreditCard size={13} className="text-slate-400" />
                    <select
                      value={selectedMethodId}
                      onChange={(e) => setSelectedMethodId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-black text-slate-700 italic focus:outline-none focus:bg-white"
                    >
                      <option value="All">Meios (Todos)</option>
                      {paymentStats.map(p => (
                        <option key={p.id} value={p.id}>{p.name.toUpperCase()} ({p.count})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Search text input */}
                <div className="flex flex-col flex-1 min-w-[200px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filtrar Transações</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nome do cliente, operador do caixa ou código do pedido..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-705 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/20"
                    />
                  </div>
                </div>
              </div>
              
              {selectedMethodStats && (
                <div className="px-5 py-3.5 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-center text-right self-stretch md:self-auto min-w-[180px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Filtro Ativo: {selectedMethodStats.name}</span>
                  <div className="flex justify-end gap-2 items-baseline mt-1">
                    <span className="text-xs font-bold text-slate-500">Média:</span>
                    <span className="text-base font-black text-brand-blue font-mono">{formatCurrency(selectedMethodStats.avgTicket)}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase italic mt-0.5 leading-none">Faturamento Líquido: {formatCurrency(selectedMethodStats.netAmount)}</p>
                </div>
              )}
            </div>

            {/* Selected Method Ledger Tabular list with drill-downs */}
            <div className="bg-white border border-slate-200 rounded-[2.2rem] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-brand-text-main uppercase italic flex items-center gap-2">
                    <Activity size={15} className="text-brand-blue" />
                    Dossiê Cronológico de Lançamentos
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Clique em qualquer registro para visualizar os itens adquiridos pelo consumidor</p>
                </div>
                <span className="inline-flex px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-black text-slate-500 uppercase italic">
                  {drillDownSales.length} lançamentos encontrados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/50">
                      <th className="py-4 pl-6 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Data / Hora</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">ID Código</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Meio</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Cliente</th>
                      <th className="py-4 text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Vendedor / Caixa</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Tarifário do Meio</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Tarifa da Operadora</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Faturamento Líquido</th>
                      <th className="py-4 text-right text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Faturamento Bruto</th>
                      <th className="py-4 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSales.length > 0 ? paginatedSales.map((sale) => {
                      const customer = (customers || []).find(c => c.id === sale.customerId);
                      const seller = (systemUsers || []).find(u => u.id === sale.userId);
                      
                      // Look up current or fallback method mapping
                      const salePMId = sale.paymentMethod;
                      const normalizeStr = (str?: string) => (str || '').toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                      const normSalePM = normalizeStr(salePMId);
                      const currentMethod = safePaymentMethods.find(m => m.id === salePMId) || 
                                           safePaymentMethods.find(m => normalizeStr(m.name) === normSalePM);
                      
                      const isExpanded = expandedSaleId === sale.id;
                      
                      // Use the actual stored tax amount if present, otherwise calculate it dynamically
                      const storedFee = sale.taxAmount !== undefined ? sale.taxAmount : 0;
                      
                      // Calculate dynamic transaction gateway fees as fallback
                      const taxPct = currentMethod?.taxPercentage || 0;
                      const taxFix = currentMethod?.taxFixed || 0;
                      const fallbackFee = (sale.total * (taxPct / 100)) + taxFix;
                      
                      const calculatedFee = (storedFee > 0) ? storedFee : fallbackFee;
                      const calculatedNet = sale.total - calculatedFee;

                      const pmName = currentMethod ? currentMethod.name : (sale.paymentMethod || 'Outros');
                      const pmType = currentMethod ? currentMethod.type : 'Outro';

                      return (
                        <React.Fragment key={sale.id}>
                          <tr 
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                          >
                            {/* Timestamp */}
                            <td className="py-4 pl-6 text-xs font-bold text-slate-800 font-mono">
                              {new Date(sale.date).toLocaleString('pt-BR')}
                            </td>
                            
                            {/* ID */}
                            <td className="py-4 text-[10px] font-black text-slate-405 font-mono uppercase tracking-tight">
                              #{sale.id.slice(0, 8)}
                            </td>

                            {/* Payment Method badge */}
                            <td className="py-4">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.2 border rounded-full text-[9px] font-black uppercase italic shrink-0",
                                getMethodTypeBadgeStyle(pmType)
                              )}>
                                {getMethodIcon(pmType)}
                                {pmName}
                              </span>
                            </td>

                            {/* Customer */}
                            <td className="py-4 text-xs font-black text-slate-700 uppercase italic">
                              {customer ? customer.name : 'Consumidor Final'}
                            </td>

                            {/* Seller/Operator */}
                            <td className="py-4 text-xs font-black text-slate-700 uppercase italic">
                              {seller ? (seller.full_name || seller.username) : 'Sistema'}
                            </td>

                            {/* Tarifário do Meio (percentage/fixed) */}
                            <td className="py-4 text-right text-[10px] font-bold text-slate-500 uppercase italic">
                              {taxPct > 0 || taxFix > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-mono text-[10px] font-bold text-slate-600">{taxPct}%</span>
                                  {taxFix > 0 ? <span className="text-[8px] text-slate-400">+ R$ {taxFix.toFixed(2)}</span> : null}
                                </div>
                              ) : (
                                <span className="text-slate-300">Isento</span>
                              )}
                            </td>

                            {/* Calculated Fee for transaction */}
                            <td className="py-4 text-right">
                              <span className="text-xs font-bold text-rose-600 font-mono">
                                {calculatedFee > 0 ? `-${formatCurrency(calculatedFee)}` : formatCurrency(0)}
                              </span>
                            </td>

                            {/* Net Receivable value for transaction */}
                            <td className="py-4 text-right">
                              <span className="text-xs font-black text-emerald-600 font-mono">
                                {formatCurrency(calculatedNet)}
                              </span>
                            </td>

                            {/* Gross value */}
                            <td className="py-4 text-right">
                              <span className="text-xs font-black text-brand-blue font-mono">
                                {formatCurrency(sale.total)}
                              </span>
                            </td>

                            {/* Expander Icon */}
                            <td className="py-4 text-center pr-6">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-605 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />}
                            </td>
                          </tr>
                          
                          {/* Expanded Order Items Row */}
                          {isExpanded && (
                            <tr className="bg-slate-50/40">
                              <td colSpan={10} className="py-4 px-6 md:px-10 border-t border-b border-slate-100">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart size={13} className="text-brand-blue" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Itens comprados nesta transação</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {sale.items.map((item: any, index: number) => {
                                      const prod = (products || []).find(p => p.id === item.productId);
                                      return (
                                        <div key={index} className="p-3 bg-white border border-slate-150 rounded-2xl flex items-center justify-between shadow-xs">
                                          <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-800 uppercase italic">
                                              {prod ? prod.name : 'Produto Desconhecido'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase font-mono">
                                              {item.quantity} un x {formatCurrency(item.price)}
                                            </span>
                                          </div>
                                          <span className="text-xs font-black text-slate-800 font-mono">
                                            {formatCurrency(item.price * item.quantity)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }) : (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 text-xs font-black uppercase italic">
                          Nenhuma transação financeira corresponde aos filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {drillDownSales.length > itemsPerPage && (
                <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Mostrando {paginatedSales.length} de {drillDownSales.length} lançamentos
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(c => Math.max(c - 1, 1))}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-8 h-8 rounded-xl text-xs font-black transition-colors border",
                            page === currentPage 
                              ? "bg-brand-blue border-brand-blue text-white shadow-sm shadow-brand-blue/25" 
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(c => Math.min(c + 1, totalPages))}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CriticalStockReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { products } = useERP();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const lowStockProducts = useMemo(() => {
    return products
      .filter(p => p.status !== 'Inativo' && (p.stock || 0) <= (p.minStock || 0))
      .sort((a, b) => (a.stock || 0) - (b.stock || 0));
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl bg-orange-50/50 border border-orange-100 flex items-center gap-4 shadow-xs relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <AlertTriangle size={140} className="text-orange-900" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-150 text-orange-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="animate-pulse" />
          </div>
          <div>
            <h5 className="text-sm font-black text-orange-950 uppercase italic leading-tight">{lowStockProducts.length} Itens com Estoque Crítico</h5>
            <p className="text-[10px] font-black text-orange-600/70 uppercase italic mt-1 tracking-wider">Ação recomendada para reposição do estoque.</p>
          </div>
        </motion.div>
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
      const expiryDate = new Date(l.validade);
      const isInvalidDate = isNaN(expiryDate.getTime());
      const expiryUTC = isInvalidDate ? 0 : Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth(), expiryDate.getUTCDate());
      const now = new Date();
      const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const daysToExpiry = isInvalidDate ? 999 : Math.floor((expiryUTC - todayUTC) / (1000 * 60 * 60 * 24));
      
      console.log(`[ExpiryReport] product: ${product?.name}, validade: ${l.validade}, daysToExpiry: ${daysToExpiry}`);
      
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl bg-rose-50/50 border border-rose-100 flex items-center gap-4 shadow-xs relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <AlertCircle size={140} className="text-rose-900" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-150 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle size={22} className="animate-pulse" />
          </div>
          <div>
            <h5 className="text-sm font-black text-rose-950 uppercase italic leading-tight">{expiredCount} Lotes Vencidos</h5>
            <p className="text-[10px] font-black text-rose-600/70 uppercase italic mt-1 tracking-wider">Ação e descarte imediatos recomendados.</p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl bg-amber-50/50 border border-amber-100 flex items-center gap-4 shadow-xs relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Clock size={140} className="text-amber-900" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-150 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <h5 className="text-sm font-black text-amber-950 uppercase italic leading-tight">{soonCount} Lotes Vencendo em Breve</h5>
            <p className="text-[10px] font-black text-amber-600/70 uppercase italic mt-1 tracking-wider">Vencimento nos próximos 30 dias.</p>
          </div>
        </motion.div>
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

  // Compute key metrics for the cards
  const totalSalesVolume = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.total, 0);
  }, [data]);

  const totalSalesCount = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  const averageSaleValue = React.useMemo(() => {
    return totalSalesCount > 0 ? totalSalesVolume / totalSalesCount : 0;
  }, [totalSalesVolume, totalSalesCount]);

  const topSeller = React.useMemo(() => {
    return data.length > 0 ? data[0] : null;
  }, [data]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      {/* Module Title */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-brand-blue font-black uppercase italic tracking-wider text-[10px] mb-1">
            <Trophy size={11} className="text-brand-blue animate-bounce" />
            Performance Comercial
          </div>
          <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight italic uppercase">Vendas por Vendedor</h4>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 leading-relaxed">
            Mapeamento analítico e rankings de conversões individuais da equipe de vendas no período selecionado.
          </p>
        </div>
      </div>

      {data.length > 0 ? (
        <>
          {/* Executive Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Revenue Volume */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <DollarSign size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Volume Total Faturado</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {formatCurrency(totalSalesVolume)}
                </h3>
                <div className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Valor bruto transacionado
                </div>
              </div>
            </motion.div>

            {/* Card 2: Top Performer */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group bg-gradient-to-br from-amber-50/10 to-amber-50/40"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.04] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Trophy size={140} className="text-amber-600" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">Melhor Vendedor (Top 1)</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/50 shadow-xs">
                  <Trophy size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-lg font-black text-slate-800 italic uppercase truncate max-w-[200px]">
                  {topSeller?.sellerName}
                </h3>
                <div className="text-[10px] font-black text-emerald-600 uppercase italic mt-1.5 flex items-center gap-1">
                  <Award size={12} />
                  {formatCurrency(topSeller?.total || 0)} faturados
                </div>
              </div>
            </motion.div>

            {/* Card 3: Formatted Volume transactions */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <ShoppingBag size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Quantidade de Conversões</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShoppingBag size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {totalSalesCount} <span className="text-sm text-slate-400 font-medium">pedidos</span>
                </h3>
                <div className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Vendas executadas com sucesso
                </div>
              </div>
            </motion.div>

            {/* Card 4: Executive individual ticket avg */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group"
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
                <Percent size={140} className="text-slate-900" />
              </div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ticket Médio por Venda</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Percent size={15} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                  {formatCurrency(averageSaleValue)}
                </h3>
                <div className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
                  Média geral por transação
                </div>
              </div>
            </motion.div>
          </div>

          {/* Charts Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Visual Ranking chart */}
            <div className="lg:col-span-12 bg-white p-7 rounded-[2rem] border border-slate-200/80 shadow-xs flex flex-col shrink-0">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Gráfico Comparativo de Vendas</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Visão consolidada de valores vendidos por profissional</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <BarChart3 size={14} />
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="sellerName" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{fontSize: 10, fill: '#64748B', fontWeight: 600}}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{fontSize: 10, fill: '#64748B', fontWeight: 600}}
                      tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR', { notation: 'compact' })}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${formatCurrency(Number(value))}`, 'Faturamento']}
                    />
                    <Bar dataKey="total" fill="#1e5eff" radius={[8, 8, 0, 0]} maxBarSize={45}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#1e5eff' : index === 1 ? '#00e676' : '#818cf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Performance Listing */}
          <div className="bg-white p-7 rounded-[2.2rem] border border-slate-200/80 shadow-xs flex flex-col shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">Quadro de Líderes do Período</h4>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Ranking e market share de cada vendedor no faturamento</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Trophy size={14} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic w-16">Rank</th>
                    <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Vendedor</th>
                    <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-center w-28">Nº de Vendas</th>
                    <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic w-44">Participação % (Share)</th>
                    <th className="pb-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Total Desempenhado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.map((row, idx) => {
                    const sharePercent = totalSalesVolume > 0 ? (row.total / totalSalesVolume) * 100 : 0;
                    
                    // Award badges for top 3
                    const rankBadgeColor = 
                      idx === 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/40 font-black' :
                      idx === 1 ? 'bg-slate-100 text-slate-600 border border-slate-300/30 font-black' :
                      idx === 2 ? 'bg-orange-50 text-orange-700 border border-orange-200/30 font-black' :
                      'bg-slate-50 text-slate-400 font-bold';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[9px] uppercase italic ${rankBadgeColor}`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="py-4 text-xs font-black text-slate-800 uppercase italic">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase text-[10px] group-hover:bg-brand-blue group-hover:text-white transition-all shrink-0">
                              {row.sellerName.substring(0, 2)}
                            </span>
                            <span className="truncate">{row.sellerName}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center text-xs font-black text-slate-800 font-mono">
                          {row.count}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono font-black text-slate-700 shrink-0 w-10">
                              {sharePercent.toFixed(1)}%
                            </span>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${sharePercent}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full bg-brand-blue rounded-full" 
                                style={{
                                  backgroundColor: idx === 0 ? '#1e5eff' : idx === 1 ? '#00e676' : '#818cf8'
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-right text-xs font-black text-brand-blue font-mono">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/50 p-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Trophy size={28} />
          </div>
          <h4 className="text-sm font-black uppercase italic text-slate-700">Nenhum resultado registrado</h4>
          <p className="text-xs font-semibold text-slate-400 max-w-sm mt-1 leading-relaxed">
            Não foram encontradas transações vinculadas a vendedores no período selecionado de {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}.
          </p>
        </div>
      )}
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

  const stats = React.useMemo(() => {
    let total = 0;
    let devolucoes = 0;
    let estornos = 0;
    filteredReturns.forEach(r => {
      total += Number(r.total || 0);
      if (r.type === 'Devolução') {
        devolucoes++;
      } else {
        estornos++;
      }
    });

    return {
      total,
      devolucoes,
      estornos,
      count: filteredReturns.length
    };
  }, [filteredReturns]);

  const getProductNames = (items: any[]) => {
    return (items || []).map(item => {
      const product = products.find(p => p.id === item.productId);
      return product ? product.name : 'Produto Desconhecido';
    }).join(', ');
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Executive Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Reembolsado */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Total Desembolsado / Reembolsado</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100/50 text-rose-600 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-600 font-mono tracking-tight">
              {formatCurrency(stats.total)}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Impacto financeiro de quebras/estornos
            </span>
          </div>
        </motion.div>

        {/* Card 2: Devolucoes */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <RotateCcw size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Quantidade Devoluções</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100/50 text-orange-600 flex items-center justify-center shrink-0">
              <RotateCcw size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {stats.devolucoes} ocorrências
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Trocas físicas de produtos
            </span>
          </div>
        </motion.div>

        {/* Card 3: Estornos */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <AlertCircle size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Quantidade Estornos</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shrink-0">
              <AlertCircle size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {stats.estornos} ocorrências
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Cancelamentos financeiros de vendas
            </span>
          </div>
        </motion.div>
      </div>

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
  const [costData, setCostData] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const processCostData = React.useCallback(() => {
    setIsLoading(true);
    try {
      const filteredSales = sales.filter(s => {
        if (s.status === 'Cancelada') return false;
        const d = s.date.split('T')[0];
        return d >= startDate && d <= endDate;
      });

      const stats: Record<string, { name: string, qty: number, totalCost: number }> = {};
      
      filteredSales.forEach(sale => {
        sale.items?.forEach((item: any) => {
          const prodId = item.productId;
          const product = products.find(p => p.id === prodId);
          const cost = Number(product?.costPrice || 0);
          
          if (!stats[prodId]) {
            stats[prodId] = { name: product?.name || 'Produto Desconhecido', qty: 0, totalCost: 0 };
          }
          stats[prodId].qty += Number(item.quantity || 0);
          stats[prodId].totalCost += cost * Number(item.quantity || 0);
        });
      });

      setCostData(Object.values(stats)
        .filter(item => item.qty > 0)
        .sort((a, b) => b.totalCost - a.totalCost));
    } catch (err) {
      console.error('Error processing cost report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sales, products, startDate, endDate]);

  React.useEffect(() => {
    processCostData();
  }, [processCostData]);

  const totalCost = costData.reduce((acc, item) => acc + item.totalCost, 0);
  const totalQtySold = costData.reduce((acc, item) => acc + item.qty, 0);
  const avgItemCost = totalQtySold > 0 ? (totalCost / totalQtySold) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <RefreshCw size={32} className="text-brand-blue animate-spin" />
        <p className="text-sm font-bold text-slate-400 uppercase italic">Carregando dados de custo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 relative group overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
          <Calculator size={180} className="text-slate-900" />
        </div>
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200/50 flex items-center justify-center text-slate-400 mb-4 transition-transform group-hover:scale-105 duration-300">
            <Calculator size={32} />
          </div>
          <h4 className="text-xl font-bold text-slate-800">Relatório de Custo (CMV)</h4>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto italic font-medium">Análise detalhada do Custo de Mercadoria Vendida (CMV) e eficiência de aquisição.</p>
          
          <div className="flex items-center gap-4 mt-6">
            <button 
              onClick={() => processCostData()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase italic text-slate-600 hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
            >
              <RefreshCw size={12} className="text-brand-blue" />
              Atualizar Dados
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Cost */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Calculator size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Custo Total de Aquisição (CMV)</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/30 text-slate-605 flex items-center justify-center shrink-0">
              <Calculator size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Gasto bruto para repor estoque
            </span>
          </div>
        </motion.div>

        {/* Card 2: Quantity Sold */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <ShoppingBag size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Total de Itens Vendidos</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-brand-blue flex items-center justify-center shrink-0">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {totalQtySold} unidades
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Volume total escoado no período
            </span>
          </div>
        </motion.div>

        {/* Card 3: Avg Item Cost */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Percent size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Custo Unitário Médio</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              R$ {avgItemCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Gasto médio ponderado por unidade
            </span>
          </div>
        </motion.div>
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
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  const fetchPurchases = React.useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const targetCompanyId = user?.companyId || null;
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (
            id, product_id, quantity, unit_price, total_price
          )
        `)
        .gte('order_date', startDate + 'T00:00:00Z')
        .lte('order_date', endDate + 'T23:59:59Z')
        .order('order_date', { ascending: false });

      if (targetCompanyId) {
        query = query.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPurchases(data || []);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error fetching purchases:', error.message || error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.companyId, startDate, endDate]);

  React.useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

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
      <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 relative group overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
          <ShoppingBag size={180} className="text-slate-900" />
        </div>
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200/50 flex items-center justify-center text-slate-400 mb-4 transition-transform group-hover:scale-105 duration-300">
            <ShoppingBag size={32} />
          </div>
          <h4 className="text-xl font-bold text-slate-800">Relatório de Compras</h4>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto italic font-medium">Análise estratégica de suprimentos, comportamento de fornecedores e custos operacionais de aquisição.</p>
          
          <div className="flex items-center gap-4 mt-6">
            <button 
              onClick={() => fetchPurchases(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase italic text-slate-600 hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={12} className={cn("text-brand-blue", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
            </button>
            {lastUpdated && (
              <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        </div>
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
  const { products, categorias, subcategorias, suppliers, stockMovements } = useERP();
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

        return matchesSearch && matchesCategory && matchesSupplier && (p.stock || 0) > 0 && p.product_type !== 'KIT' && !p.base_product_id;
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
          stock: p.stock || 0,
          minStock: p.minStock,
          costPrice: p.costPrice,
          salePrice: p.salePrice,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, selectedCategory, selectedSupplier, subcategorias, categorias, stockMovements]);

  const totals = reportData.reduce((acc, item) => ({
    stock: acc.stock + item.stock,
    cost: acc.cost + (item.stock * item.costPrice),
    sale: acc.sale + (item.stock * item.salePrice)
  }), { stock: 0, cost: 0, sale: 0 });

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100 text-center">
        <Package size={48} className="mx-auto text-brand-blue mb-4" />
        <h4 className="text-xl font-bold text-slate-800">Estoque Geral</h4>
        <p className="text-sm text-slate-500 mt-2">Listagem completa de todos os produtos e suas quantidades em estoque.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Itens Fisicos */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Package size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Total de Itens Físicos</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/30 text-slate-600 flex items-center justify-center shrink-0">
              <Package size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              {totals.stock.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Volume físico unificado em estoque
            </span>
          </div>
        </motion.div>

        {/* Card 2: Custo Total do Estoque */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Custo Total em Estoque</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/30 text-slate-600 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              R$ {totals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Capital empatado em materiais físicos
            </span>
          </div>
        </motion.div>

        {/* Card 3: Valor de Venda Total */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <TrendingUp size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest italic">Potencial de Faturamento</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-150 text-brand-blue flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-brand-blue font-mono tracking-tight">
              R$ {totals.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Valor estimado de vendas brutas
            </span>
          </div>
        </motion.div>
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
      <div className="p-10 rounded-3xl bg-emerald-50 border border-emerald-100/50 text-center shadow-inner">
        <div className="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <TrendingUp size={32} className="text-emerald-600" />
        </div>
        <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Lucro no Estoque</h4>
        <p className="text-sm text-emerald-800/70 mt-2 font-medium max-w-lg mx-auto">Projeção detalhada de lucro bruto baseada no seu saldo atual de estoque.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Custo Total em Estoque */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden transition-all hover:shadow-md"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <DollarSign size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Custo Total em Estoque</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/30 text-slate-605 flex items-center justify-center shrink-0">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight">
              R$ {totals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Capital empatado em materiais físicos
            </span>
          </div>
        </motion.div>

        {/* Card 2: Venda Total Prevista */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden transition-all hover:shadow-md"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <TrendingUp size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest italic">Venda Total Prevista</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-150 text-brand-blue flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-brand-blue font-mono tracking-tight">
              R$ {totals.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Volume potencial de faturamento bruto
            </span>
          </div>
        </motion.div>

        {/* Card 3: Lucro Bruto Potencial */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden transition-all hover:shadow-md"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Percent size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Lucro Bruto Potencial</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] font-black text-emerald-600 uppercase italic mt-1.5 block">
              Margem Média Projetada: {totalMargin.toFixed(2)}%
            </span>
          </div>
        </motion.div>
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
        <table className="w-full text-left border-collapse border border-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-7 py-4 text-[11px] font-black text-slate-500 uppercase italic tracking-widest border-b border-slate-100">Produto</th>
              <th className="px-7 py-4 text-[11px] font-black text-slate-500 uppercase italic tracking-widest border-b border-slate-100 text-center">Estoque</th>
              <th className="px-7 py-4 text-[11px] font-black text-slate-500 uppercase italic tracking-widest border-b border-slate-100 text-right">Custo Total</th>
              <th className="px-7 py-4 text-[11px] font-black text-slate-500 uppercase italic tracking-widest border-b border-slate-100 text-right">Venda Total</th>
              <th className="px-7 py-4 text-[11px] font-black text-slate-500 uppercase italic tracking-widest border-b border-slate-100 text-right">Lucro Prev.</th>
              <th className="px-7 py-4 text-[11px] font-black text-slate-500 uppercase italic tracking-widest border-b border-slate-100 text-center">Margem</th>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Inflows Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <ArrowUpRight size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Entradas Totais</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 font-mono tracking-tight" title={stats.formattedInflows}>
              {stats.formattedInflows}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              {filteredSales.length} transações comerciais
            </span>
          </div>
        </motion.div>

        {/* Outflows Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <ArrowDownRight size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest italic">Saídas Totais</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100/50 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowDownRight size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-600 font-mono tracking-tight" title={stats.formattedOutflows}>
              {stats.formattedOutflows}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              {filteredExpenses.length} despesas e taxas
            </span>
          </div>
        </motion.div>

        {/* Saldo Líquido Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className={cn("p-6 rounded-3xl border shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all",
            stats.balance >= 0 
              ? "bg-white border-slate-200/80" 
              : "bg-amber-50/50 border-amber-100"
          )}
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Activity size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className={cn("text-[10px] font-black uppercase tracking-widest italic", stats.balance >= 0 ? "text-slate-400" : "text-amber-600")}>
              Saldo de Caixa
            </span>
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
              stats.balance >= 0 ? "bg-slate-50 border-slate-200 text-slate-505" : "bg-amber-50 border-amber-200 text-amber-505"
            )}>
              <Activity size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className={cn("text-2xl font-black font-mono tracking-tight", stats.balance >= 0 ? "text-slate-800" : "text-amber-700")} title={stats.formattedBalance}>
              {stats.formattedBalance}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              {stats.balance >= 0 ? 'Resultado Superavitário' : 'Resultado Deficitário'}
            </span>
          </div>
        </motion.div>

        {/* Margem Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Percent size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">Eficiência de Caixa</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-850 font-mono tracking-tight">
              {stats.margin.toFixed(1)}% <span className="text-xs font-normal text-slate-400">de margem</span>
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Retenção de caixa p/ faturamento
            </span>
          </div>
        </motion.div>
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
  const [dateFilterType, setDateFilterType] = useState<'dueDate' | 'issueDate'>('dueDate'); // Default to dueDate (Vencimento) so pending items due in the period show up!
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const todayStr = getLocalDateString();

  // Process expenses to identify exact status, due date, isOverdue, etc.
  const processedExpenses = useMemo(() => {
    return expenses.map(e => {
      const dueDateStr = getLocalDateString(e.dueDate || e.date);
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
      const targetDate = dateFilterType === 'dueDate' ? e.dueDateStr : getLocalDateString(e.date);
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
        const targetDate = dateFilterType === 'dueDate' ? item.dueDateStr : getLocalDateString(item.date);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Pending Unpaid */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <AlertCircle size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">Total Aberto (Geral)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-250 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-amber-700 font-mono tracking-tight" title={stats.formattedUnpaid}>
              {stats.formattedUnpaid}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Todas as duplicatas não pagas
            </span>
          </div>
        </motion.div>

        {/* Total Overdue */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <AlertTriangle size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest italic">Total Vencido</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100/50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} className="animate-bounce" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-700 font-mono tracking-tight" title={stats.formattedOverdue}>
              {stats.formattedOverdue}
            </h3>
            <span className="text-[10px] font-black text-rose-500 uppercase italic mt-1.5 block">
              Atenção imediata para juros e multas
            </span>
          </div>
        </motion.div>

        {/* Period Upcoming */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Clock size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">A Vencer (No Período)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tight" title={stats.formattedPeriodUpcoming}>
              {stats.formattedPeriodUpcoming}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Programado p/ os filtros selecionados
            </span>
          </div>
        </motion.div>

        {/* Period Paid */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[140px] relative overflow-hidden group transition-all"
        >
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] group-hover:scale-110 pointer-events-none transition-transform duration-500">
            <Zap size={140} className="text-slate-900" />
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Pago (No Período)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-650 flex items-center justify-center shrink-0">
              <Zap size={15} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-700 font-mono tracking-tight" title={stats.formattedPeriodPaid}>
              {stats.formattedPeriodPaid}
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic mt-1.5 block">
              Liquidados na data de referência
            </span>
          </div>
        </motion.div>
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

