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
  const { products, sales, customers } = useERP();

  const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
  const lowStockItems = products.filter(p => p.stock <= p.minStock);

  const [chartData, setChartData] = React.useState<any[]>([]);

  React.useEffect(() => {
    const days = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'];
    const data = days.map(day => ({
      name: day,
      receita: Math.floor(Math.random() * 150) + 50,
      despesa: Math.floor(Math.random() * 100) + 20,
    }));
    setChartData(data);
  }, []);

  const pieData = [
    { name: 'Dinheiro', value: 19.9, color: '#F9A825' },
    { name: 'Cartão', value: 56.6, color: '#1E88E5' },
    { name: 'Pix', value: 18.2, color: '#2BB673' },
    { name: 'Outros', value: 5.3, color: '#E53935' },
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-8 space-y-6 bg-brand-bg min-h-screen">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-brand-text-main">Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Receita do Dia" 
          value="R$ 12.450,00" 
          trend="8% em relação a ontem" 
          positive 
          icon={TrendingUp} 
          color="green"
        />
        <StatCard 
          title="Despesas do Dia" 
          value="R$ 2.300,00" 
          trend="5% em relação a ontem" 
          positive={false} 
          icon={CreditCard} 
          color="red"
        />
        <StatCard 
          title="Lucro do Dia" 
          value="R$ 10.150,00" 
          trend="25% em relação a ontem" 
          positive 
          icon={BarChart} 
          color="green"
        />
        <StatCard 
          title="Saldo Atual em Caixa" 
          value="R$ 78.920,35" 
          icon={Wallet} 
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-brand-card p-6 rounded-xl border border-brand-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold text-brand-text-main">Receita vs Despesas</h4>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button className="px-4 py-1.5 text-sm font-medium text-brand-text-sec hover:text-brand-text-main rounded-md transition-colors">Últimos 7 dias</button>
              <button className="px-4 py-1.5 text-sm font-medium bg-brand-blue text-white rounded-md shadow-sm">Últimos 30 dias</button>
            </div>
          </div>
          <div className="h-72 w-full">
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

        <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-sm">
          <h4 className="text-lg font-semibold text-brand-text-main mb-6">Vendas por Forma de Pagamento</h4>
          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-y-4 mt-6">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm font-medium text-brand-text-sec">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-brand-text-main">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold text-brand-text-main">Produtos com Estoque Baixo</h4>
            <button className="text-sm font-medium text-brand-text-sec hover:text-brand-blue flex items-center gap-1">
              Ver todos <ChevronDown size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="pb-3 text-sm font-medium text-brand-text-sec">Produto</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec text-center">Estoque atual</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec text-center">Minimo</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-brand-border/50">
                  <td className="py-3 text-sm font-medium text-brand-text-main">Café em Pó</td>
                  <td className="py-3 text-sm text-brand-text-main text-center">10</td>
                  <td className="py-3 text-sm text-brand-text-main text-center">20</td>
                  <td className="py-3 text-right"><ChevronUp size={16} className="text-brand-text-sec inline-block" /></td>
                </tr>
                <tr className="border-b border-brand-border/50">
                  <td className="py-3 text-sm font-medium text-brand-text-main">Detergente</td>
                  <td className="py-3 text-sm text-brand-text-main text-center">15</td>
                  <td className="py-3 text-sm text-brand-text-main text-center">30</td>
                  <td className="py-3 text-right"><ChevronUp size={16} className="text-brand-text-sec inline-block" /></td>
                </tr>
                <tr className="border-b border-brand-border/50">
                  <td className="py-3 text-sm font-medium text-brand-text-main">Arroz</td>
                  <td className="py-3 text-sm text-brand-text-main text-center">30</td>
                  <td className="py-3 text-sm text-brand-text-main text-center">50</td>
                  <td className="py-3 text-right"><ChevronUp size={16} className="text-brand-text-sec inline-block" /></td>
                </tr>
                <tr>
                  <td className="py-3 text-sm font-medium text-brand-text-main">Papel Higiênico</td>
                  <td className="py-3 text-sm text-brand-text-main text-center">40</td>
                  <td className="py-3 text-sm text-brand-text-main text-center">50</td>
                  <td className="py-3 text-right"><ChevronUp size={16} className="text-brand-text-sec inline-block" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="bg-brand-card p-6 rounded-xl border border-brand-border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold text-brand-text-main">Últimas Vendas</h4>
            <button className="text-sm font-medium text-brand-text-sec hover:text-brand-blue flex items-center gap-1">
              Ver todas <ChevronDown size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="pb-3 text-sm font-medium text-brand-text-sec">Venda</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec">Cliente</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec">Valor</th>
                  <th className="pb-3 text-sm font-medium text-brand-text-sec text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-brand-border/50">
                  <td className="py-3 text-sm font-medium text-brand-text-main">#0003453</td>
                  <td className="py-3 text-sm text-brand-text-sec">Joao Almeida</td>
                  <td className="py-3 text-sm font-medium text-brand-text-main">R$ 119,53</td>
                  <td className="py-3 text-center"><span className="bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded">Pago</span></td>
                </tr>
                <tr className="border-b border-brand-border/50">
                  <td className="py-3 text-sm font-medium text-brand-text-main">#0003452</td>
                  <td className="py-3 text-sm text-brand-text-sec">Thiago Souza</td>
                  <td className="py-3 text-sm font-medium text-brand-text-main">R$ 45,95</td>
                  <td className="py-3 text-center"><span className="bg-brand-warning text-white text-[10px] font-bold px-2 py-1 rounded">Pendente</span></td>
                </tr>
                <tr className="border-b border-brand-border/50">
                  <td className="py-3 text-sm font-medium text-brand-text-main">#0003451</td>
                  <td className="py-3 text-sm text-brand-text-sec">Antonio Pereira</td>
                  <td className="py-3 text-sm font-medium text-brand-text-main">R$ 29,95</td>
                  <td className="py-3 text-center"><span className="bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded">Pago</span></td>
                </tr>
                <tr>
                  <td className="py-3 text-sm font-medium text-brand-text-main">#0003450</td>
                  <td className="py-3 text-sm text-brand-text-sec">Novo Cliente</td>
                  <td className="py-3 text-sm font-medium text-brand-text-main">R$ 56,99</td>
                  <td className="py-3 text-center"><span className="bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded">Pago</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="bg-brand-blue hover:bg-brand-blue-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="bg-[#FFFDF5] p-6 rounded-xl border border-[#FDE68A] shadow-sm flex flex-col">
          <h4 className="text-lg font-semibold text-brand-text-main mb-6">Alertas Inteligentes</h4>
          <div className="space-y-4 flex-1">
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
              <p className="text-sm text-brand-text-main">4 produtos estão vencendo nos próximos dias</p>
            </div>
            <div className="w-full h-px bg-[#FDE68A]/50"></div>
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
              <p className="text-sm text-brand-text-main">Saldo em caixa está negativo</p>
            </div>
            <div className="w-full h-px bg-[#FDE68A]/50"></div>
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-brand-warning shrink-0 mt-0.5" />
              <p className="text-sm text-brand-text-main">Meta de vendas do mês está abaixo do esperado</p>
            </div>
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
