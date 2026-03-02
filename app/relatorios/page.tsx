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
  Search,
  Printer,
  Share2,
  X
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
import { motion } from 'motion/react';
import { useERP } from '@/lib/context';

const SALES_DATA = [
  { date: '01/02', total: 4500, profit: 1200 },
  { date: '05/02', total: 5200, profit: 1500 },
  { date: '10/02', total: 3800, profit: 900 },
  { date: '15/02', total: 6100, profit: 2100 },
  { date: '20/02', total: 4900, profit: 1300 },
  { date: '25/02', total: 7200, profit: 2400 },
  { date: '28/02', total: 5800, profit: 1800 },
];

const CATEGORY_DATA = [
  { name: 'Eletrônicos', value: 45, color: '#10b981' },
  { name: 'Acessórios', value: 25, color: '#059669' },
  { name: 'Periféricos', value: 20, color: '#34d399' },
  { name: 'Serviços', value: 10, color: '#6ee7b7' },
];

const TOP_PRODUCTS = [
  { name: 'iPhone 15 Pro Max', sales: 42, revenue: 'R$ 320.000', growth: '+12%' },
  { name: 'MacBook Air M2', sales: 28, revenue: 'R$ 210.000', growth: '+8%' },
  { name: 'AirPods Pro 2', sales: 65, revenue: 'R$ 95.000', growth: '+24%' },
  { name: 'Apple Watch S9', sales: 34, revenue: 'R$ 82.000', growth: '-3%' },
];

export default function ReportsPage() {
  const { sales, products, customers } = useERP();
  const [activeReport, setActiveReport] = useState('vendas');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const reportTypes = [
    { id: 'vendas', label: 'Vendas & Faturamento', icon: TrendingUp },
    { id: 'financeiro', label: 'Fluxo de Caixa', icon: BarChart3 },
    { id: 'estoque', label: 'Estoque & Produtos', icon: ShoppingBag },
    { id: 'clientes', label: 'Análise de Clientes', icon: Users },
  ];

  const [selectedReportView, setSelectedReportView] = useState<string | null>(null);
  const [activeCentralTab, setActiveCentralTab] = useState('vendas');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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
    <div className="p-8 space-y-8 bg-white min-h-screen relative">
      {/* Report Viewer Modal */}
      {selectedReportView && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-emerald-950/60 backdrop-blur-sm"
            onClick={() => setSelectedReportView(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-6xl h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/30 shrink-0">
              <div>
                <h3 className="text-2xl font-black italic uppercase text-emerald-950">{selectedReportView}</h3>
                <p className="text-sm font-medium text-emerald-600/60">Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex items-center bg-white border border-emerald-100 rounded-2xl p-1 shadow-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-emerald-900 font-bold text-sm">
                    <span className="text-[10px] uppercase italic text-emerald-900/40">De</span>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-none outline-none focus:ring-0 text-xs font-black italic uppercase text-emerald-900 cursor-pointer w-[110px]"
                    />
                  </div>
                  <div className="w-px h-6 bg-emerald-100 mx-1"></div>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-emerald-900 font-bold text-sm">
                    <span className="text-[10px] uppercase italic text-emerald-900/40">Até</span>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-none outline-none focus:ring-0 text-xs font-black italic uppercase text-emerald-900 cursor-pointer w-[110px]"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleAction('Impressão do Relatório')}
                  className="p-3 bg-white border border-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-50 transition-all shadow-sm"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => handleExport()}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                >
                  <Download size={18} />
                  Baixar PDF
                </button>
                <button 
                  onClick={() => setSelectedReportView(null)}
                  className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-200 transition-all ml-4 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Navigation inside Modal */}
              <div className="w-72 border-r border-emerald-50 bg-emerald-50/10 flex flex-col p-6 hidden lg:flex">
                <h4 className="text-[10px] font-black uppercase italic text-emerald-900/40 mb-4 tracking-widest">Navegação Rápida</h4>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                  {[
                    'Vendas & Faturamento', 'Fechamento de Caixa', 'Vendas por Produto', 
                    'Vendas por Categoria', 'Vendas por Faixa Horária', 'Giro de Estoque', 
                    'Curva ABC de Produtos', 'ABC de Clientes', 'DRE Gerencial', 
                    'Perdas e Quebras', 'Vendas por Pagamento', 'Comissões', 'Relatório de Validade'
                  ].map((report) => (
                    <button
                      key={report}
                      onClick={() => setSelectedReportView(report)}
                      className={`w-full p-3 rounded-xl text-left text-[11px] font-black uppercase italic transition-all ${
                        selectedReportView === report 
                          ? 'bg-emerald-600 text-white shadow-md translate-x-1' 
                          : 'text-emerald-900/60 hover:bg-emerald-50 hover:text-emerald-900'
                      }`}
                    >
                      {report}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Content (Mock Data based on report type) */}
              <div className="flex-1 overflow-y-auto p-8">
                {selectedReportView === 'Vendas & Faturamento' && <SalesReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Fechamento de Caixa' && <CashClosingReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'DRE Gerencial' && <DreReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Giro de Estoque' && <StockTurnoverReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'ABC de Clientes' && <AbcCustomersReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Comissões' && <CommissionsReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Vendas por Produto' && <SalesByProductReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Vendas por Categoria' && <SalesByCategoryReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Vendas por Faixa Horária' && <SalesByHourReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Curva ABC de Produtos' && <AbcProductsReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Perdas e Quebras' && <LossesReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Vendas por Pagamento' && <SalesByPaymentReport startDate={startDate} endDate={endDate} />}
                {selectedReportView === 'Relatório de Validade' && <ExpiryReport startDate={startDate} endDate={endDate} />}
                
                {!['Vendas & Faturamento', 'Fechamento de Caixa', 'DRE Gerencial', 'Giro de Estoque', 'ABC de Clientes', 'Comissões', 'Vendas por Produto', 'Vendas por Categoria', 'Vendas por Faixa Horária', 'Curva ABC de Produtos', 'Perdas e Quebras', 'Vendas por Pagamento', 'Relatório de Validade'].includes(selectedReportView) && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-300">
                      <FileText size={40} />
                    </div>
                    <h4 className="text-xl font-black text-emerald-950 uppercase italic">Relatório em Processamento</h4>
                    <p className="text-emerald-600/60 max-w-md">Este relatório está sendo compilado com base nos dados mais recentes do sistema. Por favor, aguarde alguns instantes.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-emerald-50 bg-white flex justify-between items-center">
              <p className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest italic">Cp Sister PDV - Inteligência de Negócios</p>
              <button 
                onClick={() => setSelectedReportView(null)}
                className="text-sm font-black text-emerald-600 uppercase italic hover:underline"
              >
                Fechar Visualização
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl font-black uppercase italic text-sm flex items-center gap-3 border ${
            notification.type === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-500' 
              : 'bg-emerald-950 text-emerald-400 border-emerald-800'
          }`}
        >
          <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'success' ? 'bg-emerald-200' : 'bg-emerald-400'}`}></div>
          {notification.message}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black tracking-tight text-emerald-950 italic uppercase">Relatórios & BI</h2>
          <p className="text-emerald-600/60 font-medium">Inteligência de dados para decisões estratégicas.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 font-bold text-sm">
            <Calendar size={16} className="text-emerald-500" />
            <span>Fevereiro 2026</span>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-2xl font-bold text-sm transition-all ${
              showFilters 
                ? 'bg-emerald-950 text-white border-emerald-950' 
                : 'bg-emerald-50 text-emerald-900 border-emerald-100 hover:bg-emerald-100'
            }`}
          >
            <Filter size={16} className={showFilters ? 'text-emerald-400' : 'text-emerald-500'} />
            <span>Filtros</span>
          </button>
          <button 
            onClick={handleExport}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-2xl font-black uppercase italic text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-wait"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Download size={16} />
            )}
            {isLoading ? 'Processando...' : 'Exportar'}
          </button>
        </div>
      </div>

      {/* Filter Panel (Animated) */}
      {showFilters && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase italic text-emerald-900/40 tracking-widest">Período</label>
            <select className="w-full bg-white border border-emerald-100 rounded-xl px-3 py-2 text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option>Hoje</option>
              <option>Últimos 7 dias</option>
              <option selected>Este Mês</option>
              <option>Personalizado</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase italic text-emerald-900/40 tracking-widest">Categoria</label>
            <select className="w-full bg-white border border-emerald-100 rounded-xl px-3 py-2 text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option>Todas</option>
              <option>Eletrônicos</option>
              <option>Acessórios</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase italic text-emerald-900/40 tracking-widest">Unidade</label>
            <select className="w-full bg-white border border-emerald-100 rounded-xl px-3 py-2 text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option>Matriz</option>
              <option>Filial 01</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => {
                showToast('Filtros aplicados com sucesso!');
                setShowFilters(false);
              }}
              className="w-full py-2 bg-emerald-600 text-white rounded-xl font-black uppercase italic text-xs hover:bg-emerald-700 transition-all"
            >
              Aplicar Filtros
            </button>
          </div>
        </motion.div>
      )}

      {/* Report Navigation */}
      <div className="flex overflow-x-auto pb-2 gap-4 no-scrollbar">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => {
              setActiveReport(report.id);
              showToast(`Visualizando: ${report.label}`, 'info');
            }}
            className={`flex items-center gap-3 px-6 py-4 rounded-3xl transition-all whitespace-nowrap border ${
              activeReport === report.id 
                ? "bg-emerald-950 text-white border-emerald-950 shadow-xl shadow-emerald-950/20" 
                : "bg-white text-emerald-900/60 border-emerald-100 hover:border-emerald-300"
            }`}
          >
            <report.icon size={20} className={activeReport === report.id ? "text-emerald-400" : "text-emerald-300"} />
            <span className="font-black uppercase italic tracking-tight text-sm">{report.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts & Detailed Stats */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Chart Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black italic uppercase text-emerald-950">
                  {activeReport === 'vendas' ? 'Desempenho de Vendas' : 
                   activeReport === 'financeiro' ? 'Fluxo de Caixa' :
                   activeReport === 'estoque' ? 'Movimentação de Estoque' : 'Atividade de Clientes'}
                </h3>
                <p className="text-xs font-medium text-emerald-600/60">
                  {activeReport === 'vendas' ? 'Comparativo de faturamento e lucro bruto.' : 
                   activeReport === 'financeiro' ? 'Entradas e saídas financeiras do período.' :
                   activeReport === 'estoque' ? 'Entradas e saídas de produtos por dia.' : 'Novos clientes vs. Clientes recorrentes.'}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-black uppercase italic text-emerald-900/40">
                    {activeReport === 'vendas' ? 'Vendas' : 
                     activeReport === 'financeiro' ? 'Entradas' :
                     activeReport === 'estoque' ? 'Entradas' : 'Novos'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-200"></div>
                  <span className="text-[10px] font-black uppercase italic text-emerald-900/40">
                    {activeReport === 'vendas' ? 'Lucro' : 
                     activeReport === 'financeiro' ? 'Saídas' :
                     activeReport === 'estoque' ? 'Saídas' : 'Recorrentes'}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={
                  activeReport === 'vendas' ? SALES_DATA :
                  activeReport === 'financeiro' ? [
                    { date: '01/02', total: 3000, profit: 2500 },
                    { date: '05/02', total: 4500, profit: 3000 },
                    { date: '10/02', total: 2800, profit: 3200 },
                    { date: '15/02', total: 5500, profit: 4000 },
                    { date: '20/02', total: 4200, profit: 3500 },
                    { date: '25/02', total: 6800, profit: 5000 },
                    { date: '28/02', total: 5200, profit: 4500 },
                  ] :
                  activeReport === 'estoque' ? [
                    { date: '01/02', total: 120, profit: 80 },
                    { date: '05/02', total: 150, profit: 110 },
                    { date: '10/02', total: 90, profit: 130 },
                    { date: '15/02', total: 200, profit: 150 },
                    { date: '20/02', total: 140, profit: 120 },
                    { date: '25/02', total: 250, profit: 180 },
                    { date: '28/02', total: 180, profit: 160 },
                  ] : [
                    { date: '01/02', total: 15, profit: 45 },
                    { date: '05/02', total: 22, profit: 55 },
                    { date: '10/02', total: 18, profit: 48 },
                    { date: '15/02', total: 30, profit: 70 },
                    { date: '20/02', total: 25, profit: 65 },
                    { date: '25/02', total: 40, profit: 90 },
                    { date: '28/02', total: 35, profit: 85 },
                  ]
                }>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="100%">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: '#059669', fontWeight: 700}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: '#059669', fontWeight: 700}} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: '1px solid #dcfce7', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)', backgroundColor: '#fff' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm">
              <h4 className="text-lg font-black italic uppercase text-emerald-950 mb-6">
                {activeReport === 'vendas' ? 'Vendas por Categoria' : 
                 activeReport === 'financeiro' ? 'Distribuição de Custos' :
                 activeReport === 'estoque' ? 'Status de Estoque' : 'Segmentação de Clientes'}
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        activeReport === 'vendas' ? CATEGORY_DATA :
                        activeReport === 'financeiro' ? [
                          { name: 'Fornecedores', value: 50, color: '#10b981' },
                          { name: 'Pessoal', value: 25, color: '#059669' },
                          { name: 'Impostos', value: 15, color: '#34d399' },
                          { name: 'Outros', value: 10, color: '#6ee7b7' },
                        ] :
                        activeReport === 'estoque' ? [
                          { name: 'Em Estoque', value: 70, color: '#10b981' },
                          { name: 'Baixo Estoque', value: 15, color: '#f59e0b' },
                          { name: 'Sem Estoque', value: 10, color: '#ef4444' },
                          { name: 'Vencendo', value: 5, color: '#6366f1' },
                        ] : [
                          { name: 'Ativos', value: 60, color: '#10b981' },
                          { name: 'Inativos', value: 25, color: '#94a3b8' },
                          { name: 'Novos', value: 15, color: '#34d399' },
                        ]
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {(activeReport === 'vendas' ? CATEGORY_DATA :
                        activeReport === 'financeiro' ? [
                          { name: 'Fornecedores', value: 50, color: '#10b981' },
                          { name: 'Pessoal', value: 25, color: '#059669' },
                          { name: 'Impostos', value: 15, color: '#34d399' },
                          { name: 'Outros', value: 10, color: '#6ee7b7' },
                        ] :
                        activeReport === 'estoque' ? [
                          { name: 'Em Estoque', value: 70, color: '#10b981' },
                          { name: 'Baixo Estoque', value: 15, color: '#f59e0b' },
                          { name: 'Sem Estoque', value: 10, color: '#ef4444' },
                          { name: 'Vencendo', value: 5, color: '#6366f1' },
                        ] : [
                          { name: 'Ativos', value: 60, color: '#10b981' },
                          { name: 'Inativos', value: 25, color: '#94a3b8' },
                          { name: 'Novos', value: 15, color: '#34d399' },
                        ]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {(activeReport === 'vendas' ? CATEGORY_DATA :
                  activeReport === 'financeiro' ? [
                    { name: 'Fornecedores', value: 50, color: '#10b981' },
                    { name: 'Pessoal', value: 25, color: '#059669' },
                    { name: 'Impostos', value: 15, color: '#34d399' },
                    { name: 'Outros', value: 10, color: '#6ee7b7' },
                  ] :
                  activeReport === 'estoque' ? [
                    { name: 'Em Estoque', value: 70, color: '#10b981' },
                    { name: 'Baixo Estoque', value: 15, color: '#f59e0b' },
                    { name: 'Sem Estoque', value: 10, color: '#ef4444' },
                    { name: 'Vencendo', value: 5, color: '#6366f1' },
                  ] : [
                    { name: 'Ativos', value: 60, color: '#10b981' },
                    { name: 'Inativos', value: 25, color: '#94a3b8' },
                    { name: 'Novos', value: 15, color: '#34d399' },
                  ]).map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[10px] font-black text-emerald-900/60 uppercase italic truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm">
              <h4 className="text-lg font-black italic uppercase text-emerald-950 mb-6">
                {activeReport === 'vendas' ? 'Top Produtos' : 
                 activeReport === 'financeiro' ? 'Maiores Despesas' :
                 activeReport === 'estoque' ? 'Produtos Sem Giro' : 'Clientes VIP'}
              </h4>
              <div className="space-y-4">
                {(activeReport === 'vendas' ? TOP_PRODUCTS :
                  activeReport === 'financeiro' ? [
                    { name: 'Fornecedor AMBEV', sales: 'Bebidas', revenue: 'R$ 15.400', growth: '+5%' },
                    { name: 'Aluguel Imóvel', sales: 'Fixo', revenue: 'R$ 8.000', growth: '0%' },
                    { name: 'Energia Elétrica', sales: 'Variável', revenue: 'R$ 3.200', growth: '+12%' },
                    { name: 'Folha Pagamento', sales: 'Pessoal', revenue: 'R$ 22.000', growth: '+2%' },
                  ] :
                  activeReport === 'estoque' ? [
                    { name: 'Vinho Importado X', sales: '90 dias', revenue: 'R$ 4.500', growth: '-100%' },
                    { name: 'Azeite Especial Y', sales: '60 dias', revenue: 'R$ 2.100', growth: '-100%' },
                    { name: 'Kit Churrasco Z', sales: '45 dias', revenue: 'R$ 1.200', growth: '-100%' },
                    { name: 'Tempero Premium', sales: '30 dias', revenue: 'R$ 800', growth: '-100%' },
                  ] : [
                    { name: 'João da Silva', sales: '45 compras', revenue: 'R$ 12.400', growth: '+15%' },
                    { name: 'Maria Oliveira', sales: '38 compras', revenue: 'R$ 10.800', growth: '+8%' },
                    { name: 'Pedro Santos', sales: '32 compras', revenue: 'R$ 9.200', growth: '+22%' },
                    { name: 'Ana Costa', sales: '28 compras', revenue: 'R$ 8.500', growth: '+5%' },
                  ]).map((product) => (
                  <div key={product.name} className="flex items-center justify-between p-3 hover:bg-emerald-50 rounded-2xl transition-colors group">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-emerald-950 truncate uppercase italic">{product.name}</p>
                      <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-widest">{product.sales}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">{product.revenue}</p>
                      <p className={`text-[10px] font-black uppercase italic ${product.growth.startsWith('+') ? 'text-emerald-500' : product.growth === '0%' ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {product.growth}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Metrics & Report Center */}
        <div className="space-y-8">
          
          {/* Key Metrics */}
          <div className="bg-emerald-950 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-950/20">
            <h4 className="text-lg font-black italic uppercase text-emerald-400 mb-6">Métricas de Conversão</h4>
            <div className="space-y-6">
              <MetricRow label="Ticket Médio" value="R$ 1.420" trend="+5.2%" positive />
              <MetricRow label="Taxa de Retorno" value="68%" trend="+2.1%" positive />
              <MetricRow label="CAC Médio" value="R$ 42,50" trend="-R$ 3,10" positive />
              <MetricRow label="Churn Rate" value="1.8%" trend="+0.2%" positive={false} />
            </div>
          </div>

          {/* Report Center */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h4 className="text-lg font-black italic uppercase text-emerald-950">Central de Relatórios</h4>
              <div className="flex gap-1 p-1 bg-emerald-50 rounded-xl">
                {['vendas', 'estoque', 'financeiro'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCentralTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase italic transition-all ${
                      activeCentralTab === tab 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-emerald-600/40 hover:text-emerald-600'
                    }`}
                  >
                    {tab === 'vendas' ? 'Vendas' : tab === 'estoque' ? 'Estoque' : 'Fin.'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {activeCentralTab === 'vendas' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
                  <ReportLink title="Vendas & Faturamento" description="Visão geral completa de vendas." onClick={() => handleReportClick('Vendas & Faturamento')} />
                  <ReportLink title="Vendas por Produto" description="Ranking de itens mais vendidos." onClick={() => handleReportClick('Vendas por Produto')} />
                  <ReportLink title="Vendas por Categoria" description="Desempenho por grupo de produtos." onClick={() => handleReportClick('Vendas por Categoria')} />
                  <ReportLink title="Vendas por Faixa Horária" description="Picos de movimento na loja." onClick={() => handleReportClick('Vendas por Faixa Horária')} />
                  <ReportLink title="Vendas por Pagamento" description="Pix, Cartão, Dinheiro e Convênio." onClick={() => handleReportClick('Vendas por Pagamento')} />
                  <ReportLink title="Comissões" description="Cálculo de vendas por vendedor." onClick={() => handleReportClick('Comissões')} />
                </motion.div>
              )}
              
              {activeCentralTab === 'estoque' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
                  <ReportLink title="Giro de Estoque" description="Análise de rotatividade de produtos." onClick={() => handleReportClick('Giro de Estoque')} />
                  <ReportLink title="Curva ABC de Produtos" description="Itens mais importantes do estoque." onClick={() => handleReportClick('Curva ABC de Produtos')} />
                  <ReportLink title="Perdas e Quebras" description="Relatório de produtos avariados/vencidos." onClick={() => handleReportClick('Perdas e Quebras')} />
                  <ReportLink title="Relatório de Validade" description="Produtos próximos ao vencimento." onClick={() => handleReportClick('Relatório de Validade')} />
                </motion.div>
              )}

              {activeCentralTab === 'financeiro' && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
                  <ReportLink title="Fechamento de Caixa" description="Resumo diário de entradas e saídas." onClick={() => handleReportClick('Fechamento de Caixa')} />
                  <ReportLink title="DRE Gerencial" description="Demonstrativo de resultados simplificado." onClick={() => handleReportClick('DRE Gerencial')} />
                  <ReportLink title="ABC de Clientes" description="Classificação por volume de compra." onClick={() => handleReportClick('ABC de Clientes')} />
                </motion.div>
              )}
            </div>
            
            <button 
              onClick={() => handleAction('Carregando todos os relatórios')}
              className="w-full mt-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase italic text-xs hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <FileText size={14} />
              Ver Todos os Relatórios
            </button>
          </div>

          {/* Export Options */}
          <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100">
            <h4 className="text-xs font-black italic uppercase text-emerald-900/40 mb-4 tracking-widest">Ações Rápidas</h4>
            <div className="grid grid-cols-3 gap-2">
              <QuickActionButton icon={Printer} label="Imprimir" onClick={() => handleAction('Impressão')} />
              <QuickActionButton icon={Share2} label="Compartilhar" onClick={() => handleAction('Compartilhamento')} />
              <QuickActionButton icon={Search} label="Auditoria" onClick={() => handleAction('Auditoria')} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, trend, positive }: { label: string, value: string, trend: string, positive: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
      <div>
        <p className="text-[10px] font-black uppercase italic text-emerald-400/60 tracking-widest">{label}</p>
        <h5 className="text-xl font-black">{value}</h5>
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase italic px-2 py-1 rounded-full ${positive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
        {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
        {trend}
      </div>
    </div>
  );
}

function ReportLink({ title, description, onClick }: { title: string, description: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-emerald-50 transition-all text-left group"
    >
      <div className="min-w-0">
        <h5 className="text-sm font-black text-emerald-950 uppercase italic group-hover:text-emerald-600 transition-colors">{title}</h5>
        <p className="text-[10px] font-medium text-emerald-600/60 truncate">{description}</p>
      </div>
      <ChevronRight size={16} className="text-emerald-200 group-hover:text-emerald-500 transition-colors" />
    </button>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-3 bg-white rounded-2xl border border-emerald-100 hover:border-emerald-300 transition-all group"
    >
      <Icon size={18} className="text-emerald-300 group-hover:text-emerald-600 transition-colors" />
      <span className="text-[8px] font-black uppercase italic text-emerald-900/40">{label}</span>
    </button>
  );
}

// Mock Report Components
function CashClosingReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, expenses } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const filteredExpenses = expenses.filter(e => {
    const d = e.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const totalEntradas = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalSaidas = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const transactions = [
    ...filteredSales.map(s => ({ id: s.id, date: s.date, type: 'entrada', description: `Venda PDV #${s.id.slice(0, 6)}`, method: s.paymentMethod, amount: s.total })),
    ...filteredExpenses.map(e => ({ id: e.id, date: e.date, type: 'saida', description: e.description, method: e.category, amount: e.amount }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Entradas Totais</p>
          <h4 className="text-2xl font-black text-emerald-600">{formatCurrency(totalEntradas)}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100">
          <p className="text-[10px] font-black text-rose-900/40 uppercase italic tracking-widest">Saídas Totais</p>
          <h4 className="text-2xl font-black text-rose-600">{formatCurrency(totalSaidas)}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-emerald-950 text-white shadow-xl shadow-emerald-950/20">
          <p className="text-[10px] font-black text-emerald-400/60 uppercase italic tracking-widest">Saldo em Caixa</p>
          <h4 className="text-2xl font-black text-emerald-400">{formatCurrency(saldo)}</h4>
        </div>
      </div>
      
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-emerald-50">
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Data/Hora</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Descrição</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Categoria/Método</th>
            <th className="py-4 text-right text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          {transactions.length > 0 ? transactions.map((t) => (
            <tr key={t.id} className="hover:bg-emerald-50/50 transition-colors">
              <td className="py-4 text-sm font-bold text-emerald-900">{new Date(t.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
              <td className="py-4 text-sm font-bold text-emerald-950 uppercase italic">{t.description}</td>
              <td className="py-4 text-xs font-black text-emerald-600/60 uppercase italic">{t.method}</td>
              <td className={`py-4 text-right text-sm font-black ${t.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.amount)}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} className="py-8 text-center text-sm font-medium text-emerald-600/60">Nenhuma movimentação no período selecionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DreReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products, expenses } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const filteredExpenses = expenses.filter(e => {
    const d = e.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const receitaBruta = filteredSales.reduce((acc, s) => acc + s.total, 0);
  let cmv = 0;
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.costPrice : 0;
      cmv += cost * item.quantity;
    });
  });
  
  const impostos = filteredExpenses
    .filter(e => ['Impostos', 'Taxas'].includes(e.category))
    .reduce((acc, e) => acc + e.amount, 0);
  const receitaLiquida = receitaBruta - impostos;
  const lucroBruto = receitaLiquida - cmv;
  
  // Real expenses split by category
  const despesasOp = filteredExpenses
    .filter(e => ['Operacional', 'Fornecedores', 'Utilidades'].includes(e.category))
    .reduce((acc, e) => acc + e.amount, 0);
    
  const despesasAdm = filteredExpenses
    .filter(e => ['Administrativo', 'Infraestrutura', 'Salários'].includes(e.category))
    .reduce((acc, e) => acc + e.amount, 0);

  const ebitda = lucroBruto - despesasOp - despesasAdm;
  const depreciacao = filteredExpenses
    .filter(e => ['Depreciação', 'Amortização'].includes(e.category))
    .reduce((acc, e) => acc + e.amount, 0);
  const lucroLiquido = ebitda - depreciacao;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-4">
        <DreRow label="Receita Bruta de Vendas" value={formatCurrency(receitaBruta)} bold />
        <DreRow label="(-) Impostos sobre Vendas" value={`(${formatCurrency(impostos)})`} negative />
        <div className="h-px bg-emerald-100 my-2"></div>
        <DreRow label="Receita Líquida" value={formatCurrency(receitaLiquida)} highlight />
        <DreRow label="(-) Custo de Mercadorias (CMV)" value={`(${formatCurrency(cmv)})`} negative />
        <div className="h-px bg-emerald-100 my-2"></div>
        <DreRow label="Lucro Bruto" value={formatCurrency(lucroBruto)} highlight />
        <DreRow label="(-) Despesas Operacionais (Reais)" value={`(${formatCurrency(despesasOp)})`} negative />
        <DreRow label="(-) Despesas Administrativas (Reais)" value={`(${formatCurrency(despesasAdm)})`} negative />
        <div className="h-px bg-emerald-100 my-2"></div>
        <DreRow label="EBITDA" value={formatCurrency(ebitda)} highlight />
        <DreRow label="(-) Depreciação / Amortização" value={`(${formatCurrency(depreciacao)})`} negative />
        <div className="h-px bg-emerald-100 my-2"></div>
        <DreRow label="Lucro Líquido do Exercício" value={formatCurrency(lucroLiquido)} final />
      </div>
    </div>
  );
}

function DreRow({ label, value, bold, negative, highlight, final }: any) {
  return (
    <div className={`flex justify-between items-center p-3 rounded-xl ${highlight ? 'bg-emerald-50' : ''} ${final ? 'bg-emerald-950 text-white' : ''}`}>
      <span className={`text-sm uppercase italic tracking-tight ${bold || highlight || final ? 'font-black' : 'font-medium text-emerald-900/60'}`}>{label}</span>
      <span className={`text-sm font-black ${negative ? 'text-rose-500' : final ? 'text-emerald-400' : 'text-emerald-950'}`}>{value}</span>
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
      if (Number(turnover) > 2) { status = 'Alto Giro'; color = 'emerald'; }
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
          <div key={i} className="p-6 rounded-3xl border border-emerald-100 bg-white flex items-center justify-between shadow-sm">
            <div>
              <h5 className="text-sm font-black text-emerald-950 uppercase italic">{item.name}</h5>
              <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-widest">{item.status}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-600">{item.turnover}</p>
              <p className="text-[10px] font-black text-emerald-900/20 uppercase italic">Giro no Período</p>
            </div>
          </div>
        )) : (
          <div className="col-span-2 text-center py-8 text-emerald-600/60 font-medium">
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
        <div className="flex-1 p-4 rounded-2xl bg-emerald-600 text-white text-center">
          <p className="text-[10px] font-black uppercase italic opacity-60">Classe A</p>
          <p className="text-xl font-black">Até 80%</p>
          <p className="text-[8px] font-black uppercase italic">do Faturamento</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-emerald-400 text-white text-center">
          <p className="text-[10px] font-black uppercase italic opacity-60">Classe B</p>
          <p className="text-xl font-black">Até 95%</p>
          <p className="text-[8px] font-black uppercase italic">do Faturamento</p>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-emerald-100 text-emerald-600 text-center">
          <p className="text-[10px] font-black uppercase italic opacity-60">Classe C</p>
          <p className="text-xl font-black">Até 100%</p>
          <p className="text-[8px] font-black uppercase italic">do Faturamento</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {data.length > 0 ? data.map((c, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-50">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${c.class === 'A' ? 'bg-emerald-600' : c.class === 'B' ? 'bg-emerald-400' : 'bg-emerald-200'}`}>
                {c.class}
              </div>
              <div>
                <h5 className="text-sm font-black text-emerald-950 uppercase italic">{c.name}</h5>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-emerald-950">{c.formattedTotal}</p>
              <p className="text-[10px] font-black text-emerald-600/40 uppercase italic">Total Acumulado</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-8 text-emerald-600/60 font-medium">
            Nenhuma venda registrada no período selecionado.
          </div>
        )}
      </div>
    </div>
  );
}

function CommissionsReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const totalVendas = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const comissao = totalVendas * 0.03; // Mock flat 3%
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-emerald-50">
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Vendedor</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Vendas Totais</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Taxa (%)</th>
            <th className="py-4 text-right text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Comissão</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          <tr className="hover:bg-emerald-50/50 transition-colors">
            <td className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">
                  VP
                </div>
                <span className="text-sm font-black text-emerald-950 uppercase italic">Vendedor Padrão</span>
              </div>
            </td>
            <td className="py-4 text-sm font-bold text-emerald-900">{formatCurrency(totalVendas)}</td>
            <td className="py-4 text-xs font-black text-emerald-600/60 uppercase italic">3%</td>
            <td className="py-4 text-right text-sm font-black text-emerald-600">{formatCurrency(comissao)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SalesByProductReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

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

  const data = Object.entries(productStats)
    .map(([productId, stats]) => {
      const product = products.find(p => p.id === productId);
      return {
        name: product ? product.name : 'Produto Desconhecido',
        qty: stats.qty,
        price: stats.qty > 0 ? stats.total / stats.qty : 0,
        total: stats.total
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 50);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-emerald-50">
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Produto</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Qtd Vendida</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Preço Médio</th>
            <th className="py-4 text-right text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          {data.length > 0 ? data.map((row, i) => (
            <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
              <td className="py-4 text-sm font-black text-emerald-950 uppercase italic">{row.name}</td>
              <td className="py-4 text-sm font-bold text-emerald-900">{row.qty} un</td>
              <td className="py-4 text-xs font-black text-emerald-600/60 uppercase italic">{formatCurrency(row.price)}</td>
              <td className="py-4 text-right text-sm font-black text-emerald-600">{formatCurrency(row.total)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} className="py-8 text-center text-sm font-medium text-emerald-600/60">Nenhuma venda registrada no período selecionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SalesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalOrders = filteredSales.length;
  const ticketMedio = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  let estimatedProfit = 0;
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.costPrice : 0;
      estimatedProfit += (item.price - cost) * item.quantity;
    });
  });

  const chartDataMap = new Map();
  filteredSales.forEach(sale => {
    const d = sale.date.split('T')[0];
    const dateObj = new Date(d);
    // Adjusting for timezone offset to get the correct local day
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
    const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}`;
    
    if (!chartDataMap.has(dateStr)) {
      chartDataMap.set(dateStr, { date: dateStr, total: 0 });
    }
    chartDataMap.get(dateStr).total += sale.total;
  });

  const chartData = Array.from(chartDataMap.values()).sort((a, b) => {
    const [d1, m1] = a.date.split('/');
    const [d2, m2] = b.date.split('/');
    return new Date(2020, Number(m1)-1, Number(d1)).getTime() - new Date(2020, Number(m2)-1, Number(d2)).getTime();
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Vendas Brutas</p>
          <p className="text-xl font-black text-emerald-950">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Ticket Médio</p>
          <p className="text-xl font-black text-emerald-950">{formatCurrency(ticketMedio)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Total Pedidos</p>
          <p className="text-xl font-black text-emerald-950">{totalOrders}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-950 text-white">
          <p className="text-[10px] font-black text-emerald-400/60 uppercase italic tracking-widest">Lucro Estimado</p>
          <p className="text-xl font-black text-emerald-400">{formatCurrency(estimatedProfit)}</p>
        </div>
      </div>
      
      <div className="h-64 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#059669', fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#059669', fontWeight: 700}} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
              <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fill="#10b981" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-emerald-600/60 font-medium">
            Nenhum dado para exibir no gráfico neste período.
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h5 className="text-sm font-black text-emerald-950 uppercase italic">Resumo por Canal</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl">
            <span className="text-sm font-bold text-emerald-900 uppercase italic">Loja Física (PDV)</span>
            <span className="text-sm font-black text-emerald-600">{formatCurrency(totalRevenue)} (100%)</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl">
            <span className="text-sm font-bold text-emerald-900 uppercase italic">Delivery / Online</span>
            <span className="text-sm font-black text-emerald-600">R$ 0,00 (0%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesByCategoryReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales, products } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const categoryTotals: Record<string, number> = {};
  let totalRevenue = 0;

  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const category = product ? product.category : 'Outros';
      const itemTotal = item.price * item.quantity;
      categoryTotals[category] = (categoryTotals[category] || 0) + itemTotal;
      totalRevenue += itemTotal;
    });
  });

  const colors = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#064e3b'];
  const data = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
      percent: totalRevenue > 0 ? `${((value / totalRevenue) * 100).toFixed(1)}%` : '0%',
      color: colors[index % colors.length]
    }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-64">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
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
            <div className="w-full h-full flex items-center justify-center text-emerald-600/60 font-medium text-center">
              Nenhum dado para exibir no gráfico neste período.
            </div>
          )}
        </div>
        <div className="space-y-4 flex flex-col justify-center">
          {data.map((cat, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                <span className="text-sm font-black text-emerald-950 uppercase italic">{cat.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-emerald-600">{cat.total}</span>
                <span className="text-[10px] font-bold text-emerald-900/40 ml-2">({cat.percent})</span>
              </div>
            </div>
          ))}
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#059669', fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#059669', fontWeight: 700}} />
              <Tooltip cursor={{fill: '#f0fdf4'}} contentStyle={{ borderRadius: '24px', border: '1px solid #dcfce7' }} />
              <Bar dataKey="sales" fill="#10b981" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-emerald-600/60 font-medium">
            Nenhum dado para exibir no gráfico neste período.
          </div>
        )}
      </div>
      <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 text-center">
        <p className="text-sm font-black text-emerald-950 uppercase italic">Horário de Pico: {peakHour !== 'N/A' ? `${peakHour.replace('h', ':00')} - ${String(Number(peakHour.replace('h', ''))+1).padStart(2, '0')}:00` : 'N/A'}</p>
        <p className="text-xs font-medium text-emerald-600/60">Média de {peakSales} transações neste período.</p>
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
        <div className="p-4 rounded-2xl bg-emerald-600 text-white">
          <h5 className="text-[10px] font-black uppercase italic opacity-60">Curva A</h5>
          <p className="text-lg font-black">Até 80% do Faturamento</p>
          <p className="text-[8px] font-black uppercase italic">Alta Importância</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-400 text-white">
          <h5 className="text-[10px] font-black uppercase italic opacity-60">Curva B</h5>
          <p className="text-lg font-black">Até 95% do Faturamento</p>
          <p className="text-[8px] font-black uppercase italic">Média Importância</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-600">
          <h5 className="text-[10px] font-black uppercase italic opacity-60">Curva C</h5>
          <p className="text-lg font-black">Até 100% do Faturamento</p>
          <p className="text-[8px] font-black uppercase italic">Baixa Importância</p>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-emerald-50">
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Produto</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Classe</th>
            <th className="py-4 text-right text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Acumulado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          {data.length > 0 ? data.map((row, i) => (
            <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
              <td className="py-4 text-sm font-black text-emerald-950 uppercase italic">{row.name}</td>
              <td className="py-4">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black text-white ${row.class === 'A' ? 'bg-emerald-600' : row.class === 'B' ? 'bg-emerald-400' : 'bg-emerald-200'}`}>{row.class}</span>
              </td>
              <td className="py-4 text-right text-sm font-black text-emerald-600">{row.formattedTotal}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="py-8 text-center text-sm font-medium text-emerald-600/60">Nenhuma venda registrada no período selecionado.</td>
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
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-100">
          <p className="text-[10px] font-black text-rose-900/40 uppercase italic tracking-widest">Total de Perdas (Período)</p>
          <h4 className="text-2xl font-black text-rose-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLosses)}</h4>
        </div>
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Índice de Quebra</p>
          <h4 className="text-2xl font-black text-emerald-600">{lossIndex.toFixed(1)}%</h4>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-emerald-50">
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Produto</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Motivo</th>
            <th className="py-4 text-right text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          {data.length > 0 ? data.map((row, i) => (
            <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
              <td className="py-4 text-sm font-black text-emerald-950 uppercase italic">{row.name}</td>
              <td className="py-4 text-xs font-black text-rose-600/60 uppercase italic">{row.reason}</td>
              <td className="py-4 text-right text-sm font-black text-rose-600">{row.value}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="py-8 text-center text-sm font-medium text-emerald-600/60">Nenhuma perda registrada no período selecionado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SalesByPaymentReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { sales } = useERP();
  
  const filteredSales = sales.filter(s => {
    const d = s.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });

  const paymentTotals: Record<string, number> = {};
  filteredSales.forEach(sale => {
    paymentTotals[sale.paymentMethod] = (paymentTotals[sale.paymentMethod] || 0) + sale.total;
  });

  const colors = ['#10b981', '#059669', '#34d399', '#6ee7b7'];
  const data = Object.entries(paymentTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name: name,
      value,
      total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
      color: colors[index % colors.length]
    }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-64">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
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
            <div className="w-full h-full flex items-center justify-center text-emerald-600/60 font-medium text-center">
              Nenhum dado para exibir no gráfico neste período.
            </div>
          )}
        </div>
        <div className="space-y-4 flex flex-col justify-center">
          {data.map((pay, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pay.color }}></div>
                <span className="text-sm font-black text-emerald-950 uppercase italic">{pay.name}</span>
              </div>
              <span className="text-sm font-black text-emerald-600">{pay.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpiryReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { products } = useERP();
  
  const lowStockProducts = products
    .filter(p => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
          <Calendar size={20} />
        </div>
        <div>
          <h5 className="text-sm font-black text-orange-950 uppercase italic">Atenção: {lowStockProducts.length} Itens com Estoque Crítico</h5>
          <p className="text-[10px] font-medium text-orange-600/60 uppercase">Considere repor o estoque destes produtos.</p>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-emerald-50">
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Produto</th>
            <th className="py-4 text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Estoque Mínimo</th>
            <th className="py-4 text-right text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest">Estoque Atual</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          {lowStockProducts.length > 0 ? lowStockProducts.map((row, i) => (
            <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
              <td className="py-4 text-sm font-black text-emerald-950 uppercase italic">{row.name}</td>
              <td className="py-4 text-sm font-bold text-emerald-900">{row.minStock} un</td>
              <td className="py-4 text-right text-sm font-black text-rose-600">{row.stock} un</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="py-8 text-center text-sm font-medium text-emerald-600/60">Nenhum produto com estoque crítico.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

