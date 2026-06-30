import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Tag, 
  Calendar, 
  Percent, 
  Package, 
  Settings, 
  Sparkles, 
  Layers, 
  ShoppingBag, 
  Filter, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { useERP } from '@/lib/context';
import { Promotion, Product, Categoria } from '@/lib/types';
import { setDBValue } from '@/lib/indexedDb';
import { getLocalDateString } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion?: Promotion;
}

export default function PromotionModal({ isOpen, onClose, promotion }: PromotionModalProps) {
  const { addPromotion, updatePromotion, products, categorias, setCustomAlert } = useERP();
  
  // Helper to normalize array-like fields that might have been saved as stringified JSON or comma-separated lists
  const normalizeArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean).map(String);
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.filter(Boolean).map(String);
          }
        } catch (e) {
          console.error("Error parsing stringified promotion array", e);
        }
      }
      if (trimmed.includes(',')) {
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (trimmed) return [trimmed];
    }
    return [];
  };

  const getInitialTargetId = () => {
    if (!promotion) return '';
    if (promotion.targetType === 'PRODUCT') {
      return normalizeArray(promotion.targetId);
    }
    if (Array.isArray(promotion.targetId)) {
      return promotion.targetId[0] || '';
    }
    if (typeof promotion.targetId === 'string') {
      const trimmed = promotion.targetId.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed[0] || '';
          }
        } catch (e) {}
      }
    }
    return promotion.targetId || '';
  };

  const [formData, setFormData] = useState<Partial<Promotion>>(
    promotion ? {
      ...promotion,
      startDate: getLocalDateString(new Date(promotion.startDate)),
      endDate: getLocalDateString(new Date(promotion.endDate)),
      onlyForClubMembers: promotion.onlyForClubMembers || false,
      applyAutomatically: promotion.applyAutomatically ?? true,
      productPrices: promotion.productPrices || {},
      targetId: getInitialTargetId(),
      comboItems: normalizeArray(promotion.comboItems),
    } : {
      name: '',
      type: 'PRICE',
      startDate: getLocalDateString(),
      endDate: getLocalDateString(new Date(new Date().setDate(new Date().getDate() + 7))),
      status: 'ACTIVE',
      targetType: 'PRODUCT',
      targetId: '',
      productPrices: {},
      discountValue: 0,
      buyQuantity: 0,
      payQuantity: 0,
      comboItems: [],
      comboPrice: 0,
      applyAutomatically: true,
      onlyForClubMembers: false,
      limitPerCustomer: 0,
      quantityLimit: 0,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    }
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(() => {
    if (promotion) {
      if (promotion.targetType === 'PRODUCT') {
        const ids = normalizeArray(promotion.targetId);
        return ids.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
      } else if (promotion.type === 'COMBO') {
        const ids = normalizeArray(promotion.comboItems);
        return ids.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
      }
    }
    return [];
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const promotionData = {
        ...formData,
        startDate: new Date(formData.startDate + 'T00:00:00').toISOString(),
        endDate: new Date(formData.endDate + 'T23:59:59').toISOString(),
      } as Promotion;

      if (promotion) {
        await updatePromotion({ ...promotionData, id: promotion.id });
        if (setCustomAlert) {
          setCustomAlert({ message: 'Campanha de preço atualizada com sucesso!', type: 'success' });
        }
      } else {
        await addPromotion(promotionData);
        if (setCustomAlert) {
          setCustomAlert({ message: 'Nova campanha criada com sucesso!', type: 'success' });
        }
      }

      await setDBValue('erp_pdv_carga_pending_products', products);
      localStorage.setItem('erp_pdv_carga_pending_flag', 'true');

      onClose();
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      if (setCustomAlert) {
        setCustomAlert({ message: 'Erro ao salvar promoção: ' + (error?.message || error), type: 'error' });
      } else {
        alert('Erro ao salvar promoção');
      }
    }
  };

  const handleProductSelect = (product: Product) => {
    if (formData.type === 'COMBO' || formData.targetType === 'PRODUCT') {
      if (!selectedProducts.find(p => p.id === product.id)) {
        const newSelected = [...selectedProducts, product];
        setSelectedProducts(newSelected);
        
        const newPrices = { ...formData.productPrices, [product.id]: product.salePrice };

        if (formData.type === 'COMBO') {
          setFormData({ ...formData, comboItems: newSelected.map(p => p.id), productPrices: newPrices });
        } else {
          setFormData({ ...formData, targetId: newSelected.map(p => p.id), productPrices: newPrices });
        }
      }
    } else {
      setSelectedProducts([product]);
      setFormData({ ...formData, targetId: product.id, productPrices: { [product.id]: product.salePrice } });
    }
    setSearchTerm('');
  };

  const removeProduct = (productId: string) => {
    const newSelected = selectedProducts.filter(p => p.id !== productId);
    setSelectedProducts(newSelected);
    
    const newPrices = { ...formData.productPrices };
    delete newPrices[productId];

    if (formData.type === 'COMBO') {
      setFormData({ ...formData, comboItems: newSelected.map(p => p.id), productPrices: newPrices });
    } else if (formData.targetType === 'PRODUCT') {
      setFormData({ ...formData, targetId: newSelected.map(p => p.id), productPrices: newPrices });
    } else {
      setFormData({ ...formData, targetId: '', productPrices: newPrices });
    }
  };

  const handlePriceChange = (productId: string, price: number) => {
    setFormData({
      ...formData,
      productPrices: {
        ...formData.productPrices,
        [productId]: price
      }
    });
  };

  const filteredProducts = searchTerm 
    ? products.filter(p => (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())) && p.product_type !== 'BASE')
    : [];

  const promoTypes = [
    {
      id: 'PRICE',
      title: 'Preço Fixo',
      desc: 'Define preços fixos dedicados aos produtos.',
      icon: Tag,
      color: 'blue'
    },
    {
      id: 'PERCENTAGE',
      title: 'Desconto %',
      desc: 'Desconto em percentual no fechamento do item.',
      icon: Percent,
      color: 'emerald'
    },
    {
      id: 'BUY_X_GET_Y',
      title: 'Leve X Pague Y',
      desc: 'Modelo leve leve pague pague (ex: compre 3, leve 1 grátis).',
      icon: ShoppingBag,
      color: 'orange'
    },
    {
      id: 'COMBO',
      title: 'Combo Especial',
      desc: 'Garante preço total para um pacote fechado.',
      icon: Layers,
      color: 'purple'
    }
  ];

  const targetTypes = [
    { id: 'PRODUCT', title: 'Produtos', desc: 'Produtos isolados', icon: Package },
    { id: 'CATEGORY', title: 'Categorias', desc: 'Sessão completa', icon: Filter },
    { id: 'ALL', title: 'Todo Mix', desc: 'Toda a loja', icon: Sparkles }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6 select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/65 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue/10 to-brand-blue/5 dark:from-brand-blue/20 dark:to-transparent border border-brand-blue/10 dark:border-brand-blue/30 flex items-center justify-center text-brand-blue shrink-0 shadow-sm">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                {promotion ? 'EDITAR OFERTA ESPECIAL' : 'NOVA PROMOÇÃO'}
                <span className="text-xs bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider scale-95">PDV</span>
              </h2>
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
                Regras de ofertas especiais e descontos automatizados
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-all hover:rotate-90 duration-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form id="promoForm" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column - Core Campaign Settings (Spans 5) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Section Group 1 */}
                <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                    <Tag size={13} className="text-brand-blue stroke-[2]" />
                    1. Identificação Básica
                  </h3>
                  
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Nome da Campanha 🔥</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-black text-slate-800 dark:text-slate-100 shadow-inner placeholder:font-normal placeholder:text-slate-400 text-xs"
                      placeholder="Ex: QUARTA MALUCA DA CARNE"
                    />
                  </div>

                  {/* Dates field */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Início</label>
                      <div className="relative">
                        <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          required
                          value={formData.startDate}
                          onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full pl-8.5 pr-2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-[11px] font-bold text-slate-700 dark:text-slate-250 transition-all shadow-inner"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Fim</label>
                      <div className="relative">
                        <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          required
                          value={formData.endDate}
                          onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full pl-8.5 pr-2 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-[11px] font-bold text-slate-700 dark:text-slate-250 transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Group 2 - Visual Promo Type Buttons */}
                <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                    <Percent size={13} className="text-emerald-500 stroke-[2.5]" />
                    2. Modalidade de Oferta
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {promoTypes.map((t) => {
                      const Icon = t.icon;
                      const isSelected = formData.type === t.id;
                      
                      let colorClasses = '';
                      if (isSelected) {
                        if (t.color === 'blue') colorClasses = 'border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-200 ring-2 ring-blue-500/10';
                        else if (t.color === 'emerald') colorClasses = 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/10';
                        else if (t.color === 'orange') colorClasses = 'border-orange-500 bg-orange-500/10 text-orange-850 dark:text-orange-200 ring-2 ring-orange-500/10';
                        else if (t.color === 'purple') colorClasses = 'border-purple-500 bg-purple-500/10 text-purple-800 dark:text-purple-200 ring-2 ring-purple-500/10';
                      } else {
                        colorClasses = 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400';
                      }

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, type: t.id as any, targetId: '', comboItems: [] });
                            setSelectedProducts([]);
                          }}
                          className={`p-3.5 rounded-xl border text-left flex flex-col transition-all cursor-pointer relative overflow-hidden group select-none ${colorClasses}`}
                        >
                          {isSelected && (
                            <span className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                              t.color === 'blue' ? 'bg-blue-500' :
                              t.color === 'emerald' ? 'bg-emerald-500' :
                              t.color === 'orange' ? 'bg-orange-500' : 'bg-purple-500'
                            }`}>
                              <Check size={9} className="stroke-[3.5]" />
                            </span>
                          )}
                          
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
                            isSelected
                              ? t.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                                t.color === 'emerald' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                                t.color === 'orange' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' :
                                'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-750'
                          }`}>
                            <Icon size={14} className="stroke-[2.5]" />
                          </div>
                          
                          <h4 className="text-[11px] font-black uppercase tracking-wider mb-0.5">{t.title}</h4>
                          <p className="text-[9px] leading-snug font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-500 transition-colors">
                            {t.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column - Target Specification & Values (Spans 7) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Render Segment Target Selector if Type isn't COMBO */}
                {formData.type !== 'COMBO' && (
                  <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                      <Filter size={13} className="text-brand-blue stroke-[2]" />
                      3. Abrangência da Campanha
                    </h3>

                    <div className="grid grid-cols-3 gap-2 px-1">
                      {targetTypes.map((tg) => {
                        const isSelected = formData.targetType === tg.id;
                        const Icon = tg.icon;

                        return (
                          <button
                            key={tg.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, targetType: tg.id as any, targetId: '' });
                              setSelectedProducts([]);
                            }}
                            className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm font-black'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-650 dark:text-slate-450'
                            }`}
                          >
                            <Icon size={14} className={`mb-1.5 ${isSelected ? 'text-brand-blue' : 'text-slate-400'}`} />
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">{tg.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* dynamic items area */}
                <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-150/80 dark:border-slate-800 shadow-sm space-y-5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                    <Settings size={13} className="text-amber-500 stroke-[2.5]" />
                    4. Configuração das Regras & Itens
                  </h3>

                  {(formData.targetType === 'PRODUCT' || formData.type === 'COMBO') && (
                    <div className="space-y-4">
                      
                      {/* Interactive Autocomplete search */}
                      <div className="relative">
                        <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider mb-2">Buscar e Adicionar Item ao Grupo</label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Digite o nome, SKU ou código..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-bold text-xs text-slate-850 dark:text-slate-100 placeholder:text-slate-400 shadow-inner"
                          />
                        </div>
                        
                        <AnimatePresence>
                          {searchTerm && filteredProducts.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              className="absolute z-10 w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-750"
                            >
                              {filteredProducts.map(product => {
                                const alreadyAdded = selectedProducts.some(sp => sp.id === product.id);
                                return (
                                  <div
                                    key={product.id}
                                    onClick={() => !alreadyAdded && handleProductSelect(product)}
                                    className={`px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center transition-colors ${alreadyAdded ? 'opacity-40 cursor-default' : ''}`}
                                  >
                                    <div className="text-left min-w-0 pr-4">
                                      <span className="font-black text-slate-700 dark:text-slate-250 text-xs block truncate uppercase italic">{product.name}</span>
                                      <span className="text-[9px] font-bold text-slate-400 font-mono">SKU: {product.sku || 'Sem SKU'}</span>
                                    </div>
                                    <span className="text-brand-blue font-black font-mono bg-brand-blue/5 dark:bg-brand-blue/15 px-2.5 py-1 rounded text-[11px] shrink-0">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.salePrice)}
                                    </span>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Display Selected Items with Pricing inputs */}
                      <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-1">
                        {selectedProducts.length === 0 ? (
                          <div className="p-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400">
                            <AlertCircle className="mx-auto text-slate-300 dark:text-slate-700 mb-1.5" size={24} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhum produto adicionado</p>
                            <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5">Use o campo de busca acima para incluir.</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {selectedProducts.map(product => {
                              const base = product.salePrice;
                              const promo = formData.productPrices?.[product.id] || 0;
                              const savedAmount = base - promo;
                              
                              return (
                                <div key={product.id} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-black text-slate-750 dark:text-slate-200 text-xs truncate uppercase italic leading-tight">{product.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Padrão: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.salePrice)}</span>
                                    </div>
                                    {formData.type === 'PRICE' && promo > 0 && savedAmount > 0 && (
                                      <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5 leading-none">
                                        <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 px-1.5 py-0.5 rounded font-black font-mono shrink-0">
                                          -{((savedAmount / base) * 105).toFixed(0)}%
                                        </span>
                                        <span className="truncate">Economia de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(savedAmount)}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {formData.type === 'PRICE' && (
                                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-2.5 pr-1 py-1 rounded-lg shadow-sm">
                                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Promo R$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.productPrices?.[product.id] || ''}
                                        onChange={e => handlePriceChange(product.id, Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="w-18 md:w-22 px-1.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono text-right focus:outline-none"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => removeProduct(product.id)}
                                    className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-lg transition-colors cursor-pointer shrink-0"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {formData.targetType === 'CATEGORY' && formData.type !== 'COMBO' && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Selecione a Categoria Alvo</label>
                      <select
                        value={formData.targetId}
                        onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-bold text-xs text-slate-700 dark:text-slate-250 shadow-sm"
                        required
                      >
                        <option value="">Selecione a categoria correspondente de produtos...</option>
                        {categorias.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nome.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.targetType === 'ALL' && formData.type !== 'COMBO' && (
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/60 rounded-xl text-left flex items-start gap-3 w-full">
                      <Sparkles size={16} className="text-brand-blue shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider leading-none mb-1">Aplicação Global</p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide leading-relaxed">
                          Esta oferta será replicada e calculada automaticamente para TODOS os produtos ativos no momento da venda no PDV.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Calculations / Values inputs depending on promo model */}
                  {!(formData.type === 'PRICE' && formData.targetType === 'PRODUCT') && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      
                      {formData.type === 'PRICE' && (
                        <div className="space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-700">
                          <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Preço Fixo Promocional Único (R$)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={formData.discountValue || ''}
                              onChange={e => setFormData({ ...formData, discountValue: e.target.value ? parseFloat(e.target.value) : 0 })}
                              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-black text-emerald-600 text-xs"
                              placeholder="0.00"
                            />
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Todos os produtos desta abrangência serão tabelados neste mesmo valor fixo.</p>
                        </div>
                      )}

                      {formData.type === 'PERCENTAGE' && (
                        <div className="space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-700">
                          <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Percentual de Desconto (%)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              required
                              value={formData.discountValue || ''}
                              onChange={e => setFormData({ ...formData, discountValue: e.target.value ? parseFloat(e.target.value) : 0 })}
                              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-black text-slate-800 dark:text-slate-100 text-xs"
                              placeholder="Ex: 15"
                            />
                          </div>
                        </div>
                      )}

                      {formData.type === 'BUY_X_GET_Y' && (
                        <div className="grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-700">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Comprar (Qtd.)</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={formData.buyQuantity || ''}
                              onChange={e => setFormData({ ...formData, buyQuantity: e.target.value ? parseInt(e.target.value) : 0 })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-black text-slate-800 dark:text-slate-100 text-xs"
                              placeholder="Ex: 3"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Pagar (Qtd.)</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={formData.payQuantity || ''}
                              onChange={e => setFormData({ ...formData, payQuantity: e.target.value ? parseInt(e.target.value) : 0 })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-black text-slate-800 dark:text-slate-100 text-xs"
                              placeholder="Ex: 2"
                            />
                          </div>
                        </div>
                      )}

                      {formData.type === 'COMBO' && (
                        <div className="space-y-1.5 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150 dark:border-slate-700">
                          <label className="block text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">Preço Fechado do Combo (R$)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={formData.comboPrice || ''}
                              onChange={e => setFormData({ ...formData, comboPrice: e.target.value ? parseFloat(e.target.value) : 0 })}
                              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-black text-emerald-600 text-xs"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* Additional / Switches settings */}
                <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                    <Settings className="text-slate-400" size={13} />
                    5. Regras Adicionais & Restrições
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    
                    {/* Apply auto switch */}
                    <label 
                      htmlFor="applyAutomatically" 
                      className={`flex items-start gap-3 p-3.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-805 cursor-pointer transition-colors ${
                        formData.applyAutomatically 
                          ? 'border-blue-500/30 dark:border-blue-500/20 bg-blue-50/5 dark:bg-blue-950/10' 
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          type="checkbox"
                          id="applyAutomatically"
                          checked={formData.applyAutomatically}
                          onChange={e => setFormData({ ...formData, applyAutomatically: e.target.checked })}
                          className="w-4 h-4 text-brand-blue rounded border-slate-300 dark:border-slate-700 focus:ring-brand-blue cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col select-none">
                        <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-250 leading-tight">Automação</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">Calcula e aplica instantaneamente sem exigir ativação manual no PDV.</span>
                      </div>
                    </label>

                    {/* Only for club switch */}
                    <label 
                      htmlFor="onlyForClubMembers" 
                      className={`flex items-start gap-3 p-3.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-805 cursor-pointer transition-colors ${
                        formData.onlyForClubMembers 
                          ? 'border-amber-500/30 dark:border-amber-500/20 bg-amber-50/5 dark:bg-amber-950/10' 
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          type="checkbox"
                          id="onlyForClubMembers"
                          checked={formData.onlyForClubMembers}
                          onChange={e => setFormData({ ...formData, onlyForClubMembers: e.target.checked })}
                          className="w-4 h-4 text-amber-500 rounded border-slate-300 dark:border-slate-700 focus:ring-amber-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col select-none">
                        <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 leading-tight">Clube Fidelidade</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">Restringe esta promoção somente a clientes vinculados ao clube.</span>
                      </div>
                    </label>

                  </div>
                </div>

              </div>
              
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-black uppercase italic tracking-wider rounded-xl transition-all shadow-md shadow-brand-blue/15 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Tag size={14} className="stroke-[2.5]" />
              <span>{promotion ? 'GRAVAR ALTERAÇÕES' : 'SALVAR CAMPANHA'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
