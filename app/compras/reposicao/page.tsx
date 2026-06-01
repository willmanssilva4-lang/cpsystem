'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { useERP } from '@/lib/context';

export default function ReposicaoPage() {
  const { user } = useERP();
  const [replenishmentData, setReplenishmentData] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'attention'>('all');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const targetCompanyId = user?.companyId || null;
    try {
      // 1. Fetch products with low stock
      let productsQuery = supabase
        .from('products')
        .select('*');
      
      if (targetCompanyId) {
        productsQuery = productsQuery.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
      }

      const { data: productsData, error: productsError } = await productsQuery;
      
      if (productsError) throw productsError;

      const activeProducts = (productsData || []).filter(p => p.status !== 'Inativo');
      const productIds = activeProducts.map(p => p.id);

      if (activeProducts.length === 0) {
        setReplenishmentData([]);
        setIsLoading(false);
        return;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 2. Fetch all sales movements for active products in bulk (without .in filter to prevent 400 Bad Request)
      let salesQuery = supabase
        .from('stock_movements')
        .select('product_id, quantity')
        .eq('type', 'VENDA')
        .gte('date', thirtyDaysAgo.toISOString());

      if (targetCompanyId) {
        salesQuery = salesQuery.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
      }

      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) {
        console.error('Error fetching sales database in bulk:', salesError);
      }

      const salesByProduct: Record<string, number> = {};
      if (salesData) {
        for (const s of salesData) {
          salesByProduct[s.product_id] = (salesByProduct[s.product_id] || 0) + (Number(s.quantity) || 0);
        }
      }

      // 3. Fetch purchase order items with nested purchase order suppliers in bulk (without .in filter to prevent 400 Bad Request)
      let purchaseItemsQuery = supabase
        .from('purchase_order_items')
        .select(`
          product_id,
          created_at,
          purchase_orders (
            suppliers ( name )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (targetCompanyId) {
        purchaseItemsQuery = purchaseItemsQuery.or(`company_id.eq.${targetCompanyId},company_id.is.null`);
      }

      const { data: purchaseItemsData, error: purchaseItemsError } = await purchaseItemsQuery;
      if (purchaseItemsError) {
        console.error('Error fetching purchase items in bulk:', purchaseItemsError);
      }

      const supplierByProduct: Record<string, string> = {};
      if (purchaseItemsData) {
        for (const item of purchaseItemsData) {
          if (!supplierByProduct[item.product_id]) {
            const name = (item.purchase_orders as any)?.suppliers?.name || 'Não definido';
            supplierByProduct[item.product_id] = name;
          }
        }
      }

      // 4. Compute replenishment suggestions
      const items = activeProducts.map((p) => {
        const supplierName = supplierByProduct[p.id] || 'Não definido';
        const totalSold = salesByProduct[p.id] || 0;
        const avgWeeklySales = Math.round(totalSold / 4);
        
        const currentStock = Number(p.stock || 0);
        const minStock = Number(p.min_stock || 0);
        const suggestedQty = Math.max(0, (minStock + avgWeeklySales * 2) - currentStock);

        // Include product if stock is less than or equal to min stock and min_stock is defined > 0,
        // or if suggestedQty is significant even if sales average is zero but stock is low.
        // Also fix the filter so products needing replenishment are actually outputted correctly.
        if (minStock > 0 && (currentStock <= minStock || suggestedQty > 0)) {
          // If suggested qty is 0 but we are below min, we recommend reaching the minimum plus a defaulted unit.
          const finalSuggestedQty = suggestedQty > 0 ? suggestedQty : Math.max(1, minStock - currentStock);

          return {
            id: p.id,
            name: p.name,
            category: p.category,
            currentStock: currentStock,
            minStock: minStock,
            avgSales: avgWeeklySales, 
            suggestedQty: finalSuggestedQty,
            lastCost: `R$ ${Number(p.cost_price || 0).toFixed(2).replace('.', ',')}`,
            supplier: supplierName,
            costValue: Number(p.cost_price || 0)
          };
        }
        return null;
      }).filter(i => i !== null);

      setReplenishmentData(items as any[]);
    } catch (error) {
      console.error('Error fetching replenishment data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          <div className="overflow-x-auto">
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
              <table className="w-full text-left border-collapse whitespace-nowrap">
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
                {(() => {
                  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
                  const currentItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  
                  if (filteredItems.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-brand-text-main/20">
                            <Package size={48} />
                            <p className="font-black uppercase italic tracking-widest">Tudo em ordem! Nenhum item precisa de reposição.</p>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return currentItems.map((item) => (
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
                  ));
                })()}
              </tbody>
            </table>
            )}
          </div>
          
          {filteredItems.length > 0 && (
            <div className="p-4 bg-slate-50/50 border-t border-brand-border flex items-center justify-between">
              <p className="text-sm text-brand-text-main/60 font-medium">
                Mostrando {Math.min(filteredItems.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredItems.length, currentPage * itemsPerPage)} de {filteredItems.length} registros
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft size={18} className="text-brand-text-main/40 hover:text-brand-text-main/60" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(filteredItems.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === Math.ceil(filteredItems.length / itemsPerPage) || Math.abs(page - currentPage) <= 1)
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="text-brand-text-main/40 px-1">...</span>
                          )}
                          <button 
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                              page === currentPage ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-brand-text-main/60 hover:bg-slate-200"
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredItems.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage) || Math.ceil(filteredItems.length / itemsPerPage) === 0}
                    className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight size={18} className="text-brand-text-main/40 hover:text-brand-text-main/60" />
                  </button>
                </div>
              </div>
            </div>
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
