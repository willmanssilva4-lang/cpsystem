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
  Package,
  MessageCircle,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';

export default function CotacoesPage() {
  const { user } = useERP();
  const [view, setView] = useState<'list' | 'create' | 'details'>('list');
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
  const [statusFilter, setStatusFilter] = useState('Todas as Cotações');
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [quotationDetails, setQuotationDetails] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleViewDetails = async (cot: any) => {
    setSelectedQuotation(cot);
    setView('details');
    setIsLoading(true);
    try {
      // Fetch full quotation details including items, suppliers, and responses
      const { data: qData } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_items (
            id,
            product_id,
            quantity,
            products ( name, sku, cost_price )
          ),
          quotation_suppliers (
            supplier_id,
            suppliers ( name, phone, email )
          ),
          quotation_responses (
            id,
            supplier_id,
            product_id,
            price
          )
        `)
        .eq('id', cot.realId)
        .single();
      
      if (qData) {
        setQuotationDetails(qData);
      }
    } catch (error) {
      console.error('Error fetching quotation details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuotationMessage = (supplierName: string) => {
    if (!quotationDetails) return '';
    
    let message = `Olá ${supplierName}, gostaria de solicitar uma cotação para os seguintes itens:\n\n`;
    
    quotationDetails.quotation_items.forEach((item: any, index: number) => {
      message += `${index + 1}. ${item.products.name} - Qtd: ${item.quantity}\n`;
    });
    
    message += `\nPor favor, envie os preços assim que possível. Obrigado!`;
    return message;
  };

  const handleSendWhatsApp = (supplier: any) => {
    const message = generateQuotationMessage(supplier.name);
    let phone = supplier.phone?.replace(/\D/g, '');
    
    if (!phone) {
      alert('Este fornecedor não possui telefone cadastrado.');
      return;
    }

    // Se o número não começar com 55 (Brasil), adiciona o prefixo
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }
    
    // Usa o formato api.whatsapp.com que costuma ser mais estável para abrir o contato direto
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = (supplier: any) => {
    const message = generateQuotationMessage(supplier.name);
    const subject = `Solicitação de Cotação: ${quotationDetails?.title}`;
    
    if (!supplier.email) {
      alert('Este fornecedor não possui e-mail cadastrado.');
      return;
    }
    
    const mailtoUrl = `mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
  };

  const handleUpdatePrice = async (productId: string, supplierId: string, price: number) => {
    if (!user?.companyId || !quotationDetails) return;

    // Optimistic update
    const updatedResponses = [...(quotationDetails.quotation_responses || [])];
    const existingIndex = updatedResponses.findIndex(r => r.product_id === productId && r.supplier_id === supplierId);
    
    if (existingIndex >= 0) {
      updatedResponses[existingIndex].price = price;
    } else {
      updatedResponses.push({
        id: 'temp-' + Date.now(),
        supplier_id: supplierId,
        product_id: productId,
        price: price
      });
    }
    
    setQuotationDetails({ ...quotationDetails, quotation_responses: updatedResponses });

    try {
      // Check if response exists in DB
      const { data: existing } = await supabase
        .from('quotation_responses')
        .select('id')
        .eq('quotation_id', quotationDetails.id)
        .eq('supplier_id', supplierId)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('quotation_responses')
          .update({ price })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('quotation_responses')
          .insert({
            company_id: user.companyId,
            quotation_id: quotationDetails.id,
            supplier_id: supplierId,
            product_id: productId,
            price
          });
      }
      
      // Refresh list in background to update best price
      fetchQuotations();
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  const handleApproveQuotation = async (supplierId: string) => {
    if (!user?.companyId || !quotationDetails) return;
    
    setIsLoading(true);
    try {
      // Update quotation status
      await supabase
        .from('quotations')
        .update({ status: 'Finalizada' })
        .eq('id', quotationDetails.id);

      // Prepare items for Novo Pedido
      const itemsForOrder = quotationDetails.quotation_items.map((item: any) => {
        const response = quotationDetails.quotation_responses?.find(
          (r: any) => r.supplier_id === supplierId && r.product_id === item.product_id
        );
        const price = response ? Number(response.price) : 0;
        
        return {
          id: item.product_id,
          name: item.products.name,
          stock: '0', // Not relevant here
          min: '0',
          suggestedQty: item.quantity,
          costValue: price
        };
      });

      // Save to localStorage
      localStorage.setItem('replenishment_items', JSON.stringify(itemsForOrder));
      localStorage.setItem('quotation_supplier_id', supplierId);
      
      // Redirect to Novo Pedido
      window.location.href = '/compras/novo-pedido';
    } catch (error) {
      console.error('Error approving quotation:', error);
      setIsLoading(false);
    }
  };

  const handleDeleteQuotation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening details
    setQuotationToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!quotationToDelete) return;

    setIsLoading(true);
    try {
      // 1. Delete items
      await supabase.from('quotation_items').delete().eq('quotation_id', quotationToDelete);
      
      // 2. Delete suppliers
      await supabase.from('quotation_suppliers').delete().eq('quotation_id', quotationToDelete);
      
      // 3. Delete responses
      await supabase.from('quotation_responses').delete().eq('quotation_id', quotationToDelete);
      
      // 4. Delete quotation
      const { error } = await supabase.from('quotations').delete().eq('id', quotationToDelete);
      
      if (error) throw error;
      
      await fetchQuotations();
      setShowDeleteConfirm(false);
      setQuotationToDelete(null);
    } catch (error) {
      console.error('Error deleting quotation:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          q.id.toLowerCase().includes(listSearchTerm.toLowerCase());
    
    if (statusFilter === 'Todas as Cotações') return matchesSearch;
    return matchesSearch && q.status === statusFilter;
  });

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
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 md:flex-none px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold text-brand-text-main focus:ring-2 focus:ring-brand-blue-hover appearance-none"
                >
                  <option value="Todas as Cotações">Todas as Cotações</option>
                  <option value="Em Aberto">Em Aberto</option>
                  <option value="Finalizada">Finalizadas</option>
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
                  onClick={() => handleViewDetails(cot)}
                  className="group bg-white border border-brand-border rounded-[32px] p-6 hover:border-brand-blue-hover hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-tight ${
                      cot.status === 'Em Aberto' ? 'bg-amber-100 text-amber-700' : 'bg-brand-border text-brand-text-main'
                    }`}>
                      {cot.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleDeleteQuotation(e, cot.realId)}
                        className="p-2 text-brand-text-main/20 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Excluir Cotação"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button className="text-brand-text-main/20 group-hover:text-brand-blue transition-colors">
                        <MoreHorizontal size={20} />
                      </button>
                    </div>
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
        ) : view === 'create' ? (
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
        ) : view === 'details' && quotationDetails ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-brand-text-main uppercase italic tracking-tight">{quotationDetails.title}</h2>
                <p className="text-sm font-bold text-brand-text-main/40 uppercase italic tracking-widest">ID: {quotationDetails.id.substring(0, 8).toUpperCase()} • {new Date(quotationDetails.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-full text-xs font-black uppercase italic tracking-tight ${
                  quotationDetails.status === 'Em Aberto' ? 'bg-amber-100 text-amber-700' : 'bg-brand-border text-brand-text-main'
                }`}>
                  {quotationDetails.status}
                </span>
                <button 
                  onClick={() => setView('list')}
                  className="px-6 py-3 bg-white border border-brand-border text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-50 transition-all"
                >
                  Voltar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-brand-border">
                      <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40">Produto</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-text-main/40 text-center">Qtd</th>
                      {quotationDetails.quotation_suppliers.map((qs: any) => (
                        <th key={qs.supplier_id} className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-brand-blue text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span>{qs.suppliers.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <button 
                                onClick={() => handleSendWhatsApp(qs.suppliers)}
                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Enviar por WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </button>
                              <button 
                                onClick={() => handleSendEmail(qs.suppliers)}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Enviar por E-mail"
                              >
                                <Mail size={14} />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {quotationDetails.quotation_items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-brand-text-main">{item.products.name}</div>
                          <div className="text-[10px] font-black text-brand-text-main/40 uppercase italic">{item.products.sku || 'Sem SKU'}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-brand-text-main/60">{item.quantity} un.</span>
                        </td>
                        {quotationDetails.quotation_suppliers.map((qs: any) => {
                          const response = quotationDetails.quotation_responses?.find(
                            (r: any) => r.supplier_id === qs.supplier_id && r.product_id === item.product_id
                          );
                          const price = response ? Number(response.price) : 0;
                          
                          return (
                            <td key={qs.supplier_id} className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-xs text-slate-400 font-bold">R$</span>
                                <input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={price || ''}
                                  placeholder="0,00"
                                  onChange={(e) => handleUpdatePrice(item.product_id, qs.supplier_id, Number(e.target.value))}
                                  className="w-24 px-2 py-1 bg-white border border-brand-border rounded-lg text-sm text-right font-bold text-slate-700 focus:ring-2 focus:ring-brand-blue-hover"
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    
                    {/* Totals Row */}
                    <tr className="bg-slate-50/50 font-black">
                      <td colSpan={2} className="px-6 py-4 text-right text-brand-text-main uppercase italic tracking-tight">
                        Total por Fornecedor
                      </td>
                      {quotationDetails.quotation_suppliers.map((qs: any) => {
                        const total = quotationDetails.quotation_items.reduce((acc: number, item: any) => {
                          const response = quotationDetails.quotation_responses?.find(
                            (r: any) => r.supplier_id === qs.supplier_id && r.product_id === item.product_id
                          );
                          const price = response ? Number(response.price) : 0;
                          return acc + (price * item.quantity);
                        }, 0);
                        
                        // Find if this is the best total
                        const allTotals = quotationDetails.quotation_suppliers.map((s: any) => {
                          return quotationDetails.quotation_items.reduce((acc: number, item: any) => {
                            const response = quotationDetails.quotation_responses?.find(
                              (r: any) => r.supplier_id === s.supplier_id && r.product_id === item.product_id
                            );
                            const price = response ? Number(response.price) : 0;
                            return acc + (price * item.quantity);
                          }, 0);
                        }).filter((t: number) => t > 0);
                        
                        const bestTotal = allTotals.length > 0 ? Math.min(...allTotals) : 0;
                        const isBest = total > 0 && total === bestTotal;

                        return (
                          <td key={qs.supplier_id} className="px-6 py-4 text-right">
                            <div className={`text-lg ${isBest ? 'text-emerald-600' : 'text-brand-text-main'}`}>
                              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            {isBest && (
                              <div className="text-[10px] text-emerald-600 uppercase tracking-widest mt-1">
                                Melhor Preço
                              </div>
                            )}
                            {total > 0 && quotationDetails.status === 'Em Aberto' && (
                              <button 
                                onClick={() => handleApproveQuotation(qs.supplier_id)}
                                className="mt-4 w-full py-2 bg-brand-blue text-white rounded-xl text-xs uppercase tracking-tight hover:bg-brand-text-main transition-all"
                              >
                                Aprovar
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-brand-text-main/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl border border-brand-border text-center space-y-6"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={40} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-brand-text-main uppercase italic tracking-tight">Confirmar Exclusão</h3>
                <p className="text-brand-text-sec font-medium">
                  Tem certeza que deseja excluir esta cotação? Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-4 bg-slate-50 text-brand-text-main rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-100 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isLoading}
                  className="px-6 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase italic tracking-tight shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
