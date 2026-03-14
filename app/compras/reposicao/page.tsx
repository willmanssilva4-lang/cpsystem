'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Plus, 
  CheckCircle2,
  RefreshCcw,
  ArrowRight,
  ChevronRight,
  History,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ReposicaoPage() {
  const [replenishmentData, setReplenishmentData] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'attention'>('all');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch products with low stock
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*');
      
      if (productsError) throw productsError;

      // Filter products that need attention (stock <= min_stock)
      const lowStockProducts = productsData.filter(p => p.stock <= p.min_stock);

      // 2. For each product, fetch the last supplier and real average sales
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const items = await Promise.all(lowStockProducts.map(async (p) => {
        // Fetch last supplier from purchase_order_items
        const { data: lastPurchase } = await supabase
          .from('purchase_order_items')
          .select(`
            purchase_orders (
              suppliers ( name )
            )
          `)
          .eq('product_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const supplierName = (lastPurchase?.purchase_orders as any)?.suppliers?.name || 'Não definido';
        
        // Fetch real sales data for the last 30 days to calculate weekly average
        const { data: salesData } = await supabase
          .from('sale_items')
          .select('quantity')
          .eq('product_id', p.id)
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        const totalSold = salesData?.reduce((acc, s) => acc + s.quantity, 0) || 0;
        const avgWeeklySales = Math.round(totalSold / 4);
        
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          currentStock: p.stock,
          minStock: p.min_stock,
          avgSales: avgWeeklySales, 
          suggestedQty: Math.max(0, (p.min_stock + avgWeeklySales * 2) - p.stock),
          lastCost: `R$ ${p.cost_price.toFixed(2).replace('.', ',')}`,
          supplier: supplierName,
          costValue: p.cost_price
        };
      }));

      setReplenishmentData(items);
    } catch (error) {
      console.error('Error fetching replenishment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerateOrders = () => {
    setIsProcessing(true);
    
    // Get selected items data
    const selectedItemsData = replenishmentData
      .filter(item => selectedItems.includes(item.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        stock: `${item.currentStock} un.`,
        min: `${item.minStock} un.`,
        suggestedQty: item.suggestedQty
      }));

    // Save to localStorage so novo-pedido can pick it up
    localStorage.setItem('replenishment_items', JSON.stringify(selectedItemsData));
    
    setTimeout(() => {
      setIsProcessing(false);
      window.location.href = '/compras/novo-pedido';
    }, 1000);
  };

  const filteredItems = replenishmentData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'critical') return matchesSearch && item.currentStock <= item.minStock / 2;
    if (activeTab === 'attention') return matchesSearch && item.currentStock <= item.minStock;
    return matchesSearch;
  });

  const stats = [
    { 
      id: 'critical',
      label: 'Itens Críticos', 
      value: replenishmentData.filter(i => i.currentStock <= i.minStock / 2).length.toString(), 
      icon: AlertTriangle, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50' 
    },
    { 
      id: 'attention',
      label: 'Valor Estimado', 
      value: `R$ ${replenishmentData.reduce((acc, i) => acc + (i.suggestedQty * i.costValue), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: TrendingUp, 
      color: 'text-brand-blue', 
      bg: 'bg-slate-50' 
    },
    { 
      id: 'all',
      label: 'Fornecedores Envolvidos', 
      value: new Set(replenishmentData.map(i => i.supplier)).size.toString(), 
      icon: Truck, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
  ];

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/compras" className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
            <ArrowLeft size={14} />
            Voltar para Compras
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Sugestão de Reposição</h1>
          <p className="text-brand-blue/60 font-medium font-bold uppercase tracking-widest text-[10px]">Análise inteligente de estoque baseada em giro e estoque mínimo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-brand-border text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
            Recalcular
          </button>
          <button 
            onClick={handleGenerateOrders}
            disabled={selectedItems.length === 0 || isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {isProcessing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <RefreshCcw size={20} />
              </motion.div>
            ) : (
              <ShoppingCart size={20} />
            )}
            Gerar {selectedItems.length} Pedidos
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <button 
            key={stat.label} 
            onClick={() => stat.id !== 'attention' && setActiveTab(stat.id as any)}
            className={`p-6 rounded-[32px] border border-brand-border bg-white flex items-center gap-6 text-left transition-all hover:shadow-md active:scale-95 ${activeTab === stat.id ? 'ring-2 ring-brand-blue' : ''}`}
          >
            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-brand-text-main italic tracking-tight">{stat.value}</div>
              <div className="text-xs text-brand-text-main/40 font-bold uppercase italic tracking-wider">{stat.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Produtos que precisam de atenção</h2>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase italic tracking-tight transition-all ${activeTab === 'all' ? 'bg-white text-brand-blue shadow-sm' : 'text-brand-text-main/40 hover:text-brand-text-main'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setActiveTab('critical')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase italic tracking-tight transition-all ${activeTab === 'critical' ? 'bg-white text-rose-600 shadow-sm' : 'text-brand-text-main/40 hover:text-brand-text-main'}`}
              >
                Críticos
              </button>
              <button 
                onClick={() => setActiveTab('attention')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase italic tracking-tight transition-all ${activeTab === 'attention' ? 'bg-white text-amber-600 shadow-sm' : 'text-brand-text-main/40 hover:text-brand-text-main'}`}
              >
                Atenção
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={18} />
              <input 
                type="text" 
                placeholder="Filtrar por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-blue-hover w-full md:w-64"
              />
            </div>
            <button className="p-2 bg-slate-50 text-brand-text-main rounded-xl hover:bg-brand-border transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-20 text-center space-y-4">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="inline-block text-brand-blue"
              >
                <RefreshCcw size={48} />
              </motion.div>
              <p className="text-brand-text-main/40 font-black uppercase italic tracking-widest">Analisando estoque...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-brand-border">
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-brand-border text-brand-blue focus:ring-brand-blue-hover"
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                      onChange={() => {
                        if (selectedItems.length === filteredItems.length) setSelectedItems([]);
                        else setSelectedItems(filteredItems.map(i => i.id));
                      }}
                    />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Produto</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Estoque Atual</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Estoque Mín.</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Giro Semanal</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Sugestão</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Fornecedor</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-brand-text-main/20">
                        <Package size={48} />
                        <p className="font-black uppercase italic tracking-widest">Tudo em ordem! Nenhum item precisa de reposição.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/30 transition-colors ${selectedItems.includes(item.id) ? 'bg-slate-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-brand-border text-brand-blue focus:ring-brand-blue-hover"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-brand-blue">
                            <Package size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-brand-text-main">{item.name}</div>
                            <div className="text-[10px] font-black text-brand-text-main/40 uppercase italic">{item.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-black italic ${item.currentStock <= item.minStock / 2 ? 'text-rose-600' : 'text-brand-text-main'}`}>
                          {item.currentStock} un.
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-brand-text-main/60">{item.minStock} un.</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-brand-text-main/60">{item.avgSales} un.</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-brand-blue italic">+{item.suggestedQty}</span>
                          <button className="p-1 text-brand-text-main/20 hover:text-brand-blue transition-colors">
                            <Plus size={14} className="rotate-45" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-brand-text-main/60 uppercase italic">{item.supplier}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-brand-text-main/40 hover:text-brand-blue transition-colors">
                          <History size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="p-8 bg-slate-50 rounded-[32px] border border-brand-border flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-blue shadow-sm">
            <History size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-brand-text-main uppercase italic tracking-tight">Último Cálculo de Reposição</h3>
            <p className="text-xs text-brand-text-main/40 font-bold uppercase italic tracking-widest">Realizado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest">Total Selecionado</div>
            <div className="text-xl font-black text-brand-text-main italic">
              R$ {replenishmentData
                .filter(i => selectedItems.includes(i.id))
                .reduce((acc, i) => acc + (i.suggestedQty * i.costValue), 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button 
            onClick={handleGenerateOrders}
            disabled={selectedItems.length === 0 || isProcessing}
            className="px-8 py-4 bg-brand-text-main text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-black transition-all shadow-xl shadow-brand-text-main/20 active:scale-95 disabled:opacity-50"
          >
            Gerar Ordens de Compra
          </button>
        </div>
      </div>
    </div>
  );
}
