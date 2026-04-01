'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  FileText,
  Truck,
  DollarSign,
  ArrowRight,
  MoreHorizontal,
  ChevronDown,
  Trash2,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';

export default function CotacoesPage() {
  const { user } = useERP();
  const [view, setView] = useState<'list' | 'create'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [limitDate, setLimitDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [listSearchTerm, setListSearchTerm] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchQuotations = useCallback(async () => {
    if (!user?.companyId) return;
    const { data: quotationsData } = await supabase
      .from('quotations')
      .select(`
        *,
        quotation_items ( id ),
        quotation_suppliers ( 
          suppliers ( name )
        ),
        quotation_responses ( price )
      `)
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false });

    if (quotationsData) {
      const formatted = quotationsData.map(q => {
        const prices = q.quotation_responses?.map((r: any) => Number(r.price)) || [];
        const bestPrice = prices.length > 0 ? Math.min(...prices) : 0;

        return {
          id: q.id.substring(0, 8).toUpperCase(),
          realId: q.id,
          title: q.title,
          date: new Date(q.created_at).toLocaleDateString('pt-BR'),
          status: q.status,
          suppliers: q.quotation_suppliers?.map((s: any) => s.suppliers?.name).filter(Boolean) || [],
          items: q.quotation_items?.length || 0,
          bestPrice: bestPrice > 0 ? `R$ ${bestPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Pendente'
        };
      });
      setQuotations(formatted);
    }
  }, [user?.companyId]);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch Products
      const { data: products } = await supabase.from('products').select('id, name, sku, cost_price').eq('company_id', user?.companyId || null).order('name');
      if (products) setProductsList(products);

      // Fetch Suppliers
      const { data: suppliers } = await supabase.from('suppliers').select('id, name').eq('company_id', user?.companyId || null).order('name');
      if (suppliers) setSuppliersList(suppliers);

      // Fetch Quotations
      await fetchQuotations();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchQuotations, user?.companyId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length >= 2) {
      const filtered = productsList.filter(p => 
        p.name.toLowerCase().includes(value.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 10);
      setSearchResults(filtered);
      setSelectedIndex(filtered.length > 0 ? 0 : -1);
    } else {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectProduct(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setSearchResults([]);
      setSelectedIndex(-1);
      setShowProductSearch(false);
    }
  };

  const selectProduct = (product: any) => {
    // Check if product already in items
    if (items.some(i => i.id === product.id)) {
      setSearchResults([]);
      setSelectedIndex(-1);
      setSearchTerm('');
      setShowProductSearch(false);
      return;
    }

    const newItem = {
      id: product.id,
      name: product.name,
      qty: 1,
      lastCost: product.cost_price || 0
    };

    setItems([...items, newItem]);
    setSearchResults([]);
    setSelectedIndex(-1);
    setSearchTerm('');
    setShowProductSearch(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleUpdateQty = (id: string, qty: number) => {
    setItems(items.map(item => item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
  };

  const handleSave = async () => {
    if (!title) {
      console.warn('Título não informado');
      return;
    }
    if (items.length === 0) {
      console.warn('Nenhum item adicionado');
      return;
    }
    if (selectedSuppliers.length === 0) {
      console.warn('Nenhum fornecedor selecionado');
      return;
    }
    
    setIsLoading(true);
    try {
      // 1. Insert Quotation
      const { data: quotation, error: qError } = await supabase
        .from('quotations')
        .insert({
          company_id: user?.companyId || null,
          title,
          status: 'Em Aberto',
          limit_date: limitDate || null
        })
        .select()
        .single();

      if (qError) throw qError;

      // 2. Insert Items
      const itemsToInsert = items.map(item => ({
        company_id: user?.companyId || null,
        quotation_id: quotation.id,
        product_id: item.id,
        quantity: item.qty
      }));

      const { error: iError } = await supabase.from('quotation_items').insert(itemsToInsert);
      if (iError) throw iError;

      // 3. Insert Suppliers
      const suppliersToInsert = selectedSuppliers.map(sId => ({
        company_id: user?.companyId || null,
        quotation_id: quotation.id,
        supplier_id: sId
      }));

      const { error: sError } = await supabase.from('quotation_suppliers').insert(suppliersToInsert);
      if (sError) throw sError;

      console.log('Cotação lançada com sucesso!');
      setView('list');
      setItems([]);
      setSelectedSuppliers([]);
      setTitle('');
      setLimitDate('');
      await fetchQuotations();
    } catch (error) {
      console.error('Error saving quotation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSupplier = (id: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const filteredQuotations = quotations.filter(q => 
    q.title.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
    q.id.toLowerCase().includes(listSearchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/compras" className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
            <ArrowLeft size={14} />
            Voltar para Compras
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Cotações de Preços</h1>
          <p className="text-brand-blue/60 font-medium">Compare preços entre fornecedores e garanta a melhor margem.</p>
        </div>
        <button 
          onClick={() => setView('create')}
          className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-text-main transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
        >
          <Plus size={20} />
          Nova Cotação
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30 p-4 rounded-[24px] border border-brand-border">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar cotação por título ou ID..."
                  value={listSearchTerm}
                  onChange={(e) => setListSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm focus:ring-2 focus:ring-brand-blue-hover"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold text-brand-text-main hover:bg-slate-50 transition-all">
                  <Filter size={18} />
                  Filtros
                </button>
                <select className="flex-1 md:flex-none px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue-hover appearance-none">
                  <option>Todas as Cotações</option>
                  <option>Em Aberto</option>
                  <option>Finalizadas</option>
                </select>
              </div>
            </div>

            {/* Cotations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuotations.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText size={40} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-black text-brand-text-main uppercase italic">Nenhuma cotação encontrada</h3>
                  <p className="text-brand-text-sec">Crie uma nova cotação para começar a comparar preços.</p>
                </div>
              ) : (
                filteredQuotations.map((cot, index) => (
                <motion.div
                  key={cot.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white border border-brand-border rounded-[32px] p-6 hover:border-brand-blue-hover hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-tight ${
                      cot.status === 'Em Aberto' ? 'bg-amber-100 text-amber-700' : 'bg-brand-border text-brand-text-main'
                    }`}>
                      {cot.status}
                    </span>
                    <button className="text-brand-text-main/20 group-hover:text-brand-blue transition-colors">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-1 mb-6">
                    <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight leading-tight">{cot.title}</h3>
                    <p className="text-xs font-bold text-brand-text-main/40 uppercase italic tracking-widest">{cot.id} • {cot.date}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-50 text-brand-blue p-2 rounded-lg">
                          <Truck size={16} />
                        </div>
                        <span className="text-xs font-bold text-brand-text-main/60 uppercase italic">Fornecedores</span>
                      </div>
                      <span className="text-sm font-black text-brand-text-main italic">{cot.suppliers.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-50 text-brand-blue p-2 rounded-lg">
                          <DollarSign size={16} />
                        </div>
                        <span className="text-xs font-bold text-brand-text-main/60 uppercase italic">Melhor Preço</span>
                      </div>
                      <span className="text-sm font-black text-brand-blue italic">{cot.bestPrice}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {cot.suppliers.map((s: string, i: number) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-brand-border border-2 border-white flex items-center justify-center text-[10px] font-black text-brand-blue italic uppercase">
                          {s[0]}
                        </div>
                      ))}
                    </div>
                    <button className="flex items-center gap-2 text-xs font-black text-brand-blue uppercase italic tracking-widest hover:gap-3 transition-all">
                      Detalhes
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
        ) : (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Create Cotation UI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Basic Info */}
                <div className="p-8 rounded-[32px] border border-brand-border bg-slate-50/30 space-y-6">
                  <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Informações Básicas</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Título da Cotação</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Cotação Bebidas Março"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-4 bg-white border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-main/40 uppercase italic tracking-widest ml-1">Data Limite</label>
                      <input 
                        type="date" 
                        value={limitDate}
                        onChange={(e) => setLimitDate(e.target.value)}
                        className="w-full px-4 py-4 bg-white border border-brand-border rounded-2xl text-brand-text-main font-bold focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Selection */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-brand-text-main uppercase italic tracking-tight">Produtos para Cotar</h2>
                    <button 
                      onClick={() => setShowProductSearch(!showProductSearch)}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-border text-brand-text-main rounded-xl text-xs font-black uppercase italic tracking-tight hover:bg-brand-border transition-all"
                    >
                      <Plus size={16} className={showProductSearch ? 'rotate-45 transition-transform' : 'transition-transform'} />
                      Adicionar Produto
                    </button>
                  </div>

                  <AnimatePresence>
                    {showProductSearch && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="relative"
                      >
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />
                          <input 
                            ref={searchInputRef}
                            type="text" 
                            placeholder="Buscar produto por nome ou SKU..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                            autoFocus
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-brand-blue rounded-2xl text-brand-text-main font-bold focus:ring-0"
                          />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-brand-border rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                            {searchResults.map((product, index) => (
                              <button
                                key={product.id}
                                onClick={() => selectProduct(product)}
                                className={cn(
                                  "w-full flex items-center justify-between px-6 py-4 text-left transition-colors border-b border-brand-border last:border-0",
                                  selectedIndex === index ? "bg-brand-blue/5 border-l-4 border-l-brand-blue" : "hover:bg-slate-50"
                                )}
                              >
                                <div>
                                  <div className="font-bold text-brand-text-main">{product.name}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{product.sku || 'Sem SKU'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-black text-brand-blue">Custo: R$ {Number(product.cost_price).toFixed(2)}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-brand-border">
                          <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Produto</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Qtd. Estimada</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Último Custo</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                              Nenhum produto adicionado à cotação.
                            </td>
                          </tr>
                        ) : (
                          items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-brand-text-main">{item.name}</span>
                              </td>
                              <td className="px-6 py-4">
                                <input 
                                  type="number" 
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => handleUpdateQty(item.id, Number(e.target.value))}
                                  className="w-24 px-3 py-1 bg-slate-50 border border-brand-border rounded-lg text-sm font-black text-brand-text-main italic focus:ring-2 focus:ring-brand-blue-hover"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-brand-text-main/60">R$ {Number(item.lastCost).toFixed(2).replace('.', ',')}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-rose-300 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Suppliers Selection */}
              <div className="space-y-8">
                <div className="p-8 rounded-[32px] border border-brand-border bg-white space-y-6">
                  <h3 className="text-lg font-black text-brand-text-main uppercase italic tracking-tight">Fornecedores Participantes</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={16} />
                      <input 
                        type="text" 
                        placeholder="Buscar fornecedor..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-blue-hover"
                      />
                    </div>
                    <div className="space-y-2">
                      {suppliersList.map((s) => (
                        <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={selectedSuppliers.includes(s.id)}
                            onChange={() => toggleSupplier(s.id)}
                            className="w-4 h-4 rounded border-brand-border text-brand-blue focus:ring-brand-blue-hover" 
                          />
                          <span className="text-sm font-bold text-brand-text-main group-hover:text-brand-blue transition-colors">{s.name}</span>
                        </label>
                      ))}
                      {suppliersList.length === 0 && (
                        <p className="text-xs text-slate-400 italic">Nenhum fornecedor cadastrado.</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={handleSave}
                    disabled={isLoading}
                    className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight shadow-xl shadow-brand-blue/20 hover:bg-brand-text-main transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Lançando...' : 'Lançar Cotação'}
                  </button>
                  <button 
                    onClick={() => setView('list')}
                    className="w-full py-4 bg-white border border-brand-border text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
