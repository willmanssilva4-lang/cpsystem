import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, Tag, Calendar, Percent, Package, Settings, Sparkles } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Promotion, Product, Categoria } from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion?: Promotion;
}

export default function PromotionModal({ isOpen, onClose, promotion }: PromotionModalProps) {
  const { addPromotion, updatePromotion, products, categorias } = useERP();
  
  const [formData, setFormData] = useState<Partial<Promotion>>(
    promotion ? {
      ...promotion,
      startDate: getLocalDateString(new Date(promotion.startDate)),
      endDate: getLocalDateString(new Date(promotion.endDate)),
      onlyForClubMembers: promotion.onlyForClubMembers || false,
      applyAutomatically: promotion.applyAutomatically ?? true,
      productPrices: promotion.productPrices || {},
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
      if (promotion.targetType === 'PRODUCT' && promotion.targetId) {
        if (Array.isArray(promotion.targetId)) {
          return promotion.targetId.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
        }
        const product = products.find(p => p.id === promotion.targetId);
        return product ? [product] : [];
      } else if (promotion.type === 'COMBO' && promotion.comboItems) {
        return promotion.comboItems.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
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
      } else {
        await addPromotion(promotionData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('Erro ao salvar promoção');
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
    ? products.filter(p => (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm)) && p.product_type !== 'BASE')
    : [];

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/60"
      >
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {promotion ? 'Editar Oferta Especial' : 'Nova Promoção'}
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
                Configure os detalhes da sua campanha
              </p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          <form id="promoForm" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          {/* Informações Básicas */}
          <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
               <Tag size={18} className="text-brand-blue" />
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Informações da Promoção</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome da Promoção 🔥</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-black text-slate-800 shadow-inner"
                  placeholder="Ex: OFERTA QUARTA VERDE"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Promoção</label>
                <select
                  value={formData.type}
                  onChange={e => {
                    setFormData({ ...formData, type: e.target.value as any, targetId: '', comboItems: [] });
                    setSelectedProducts([]);
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-bold text-slate-700 shadow-sm appearance-none"
                >
                  <option value="PRICE">Preço Promocional Fixo</option>
                  <option value="PERCENTAGE">Desconto em %</option>
                  <option value="BUY_X_GET_Y">Leve X Pague Y</option>
                  <option value="COMBO">Combo Especial</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Início</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-bold text-slate-700 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fim</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-bold text-slate-700 shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seleção de Produtos / Alvo */}
          <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
               <Package size={18} className="text-amber-500" />
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Seleção de Produtos</h3>
            </div>
            
            {formData.type !== 'COMBO' && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aplicar em:</label>
                <select
                  value={formData.targetType}
                  onChange={e => {
                    setFormData({ ...formData, targetType: e.target.value as any, targetId: '' });
                    setSelectedProducts([]);
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-bold text-slate-700 shadow-sm appearance-none"
                >
                  <option value="PRODUCT">Produto Específico / Lista</option>
                  <option value="CATEGORY">Categoria Inteira</option>
                  <option value="ALL">Todo o Mix de Produtos</option>
                </select>
              </div>
            )}

            {(formData.targetType === 'PRODUCT' || formData.type === 'COMBO') && (
              <div className="relative border border-slate-100 rounded-xl p-5 bg-slate-50/50">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Buscar e Adicionar Produto</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Digite nome ou código do produto..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-bold text-slate-800 shadow-sm placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>
                
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="px-5 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                      >
                        <span className="font-bold text-slate-700 text-sm">{product.name}</span>
                        <span className="text-brand-blue font-black font-mono bg-brand-blue/5 px-2 py-1 rounded">R$ {product.salePrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Products List */}
                {selectedProducts.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {selectedProducts.map(product => (
                      <div key={product.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex-1">
                          <p className="font-black text-slate-800 text-sm">{product.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Preço Padrão: R$ {product.salePrice.toFixed(2)}</p>
                        </div>
                        
                        {formData.type === 'PRICE' && (
                          <div className="flex items-center gap-3 mr-6 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Novo Preço R$</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.productPrices?.[product.id] || ''}
                              onChange={e => handlePriceChange(product.id, parseFloat(e.target.value))}
                              className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-black text-emerald-600 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-inner"
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2.5 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {formData.targetType === 'CATEGORY' && formData.type !== 'COMBO' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecione a Categoria</label>
                <select
                  value={formData.targetId}
                  onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-bold text-slate-700 shadow-sm appearance-none"
                  required
                >
                  <option value="">Selecione...</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Configurações de Desconto */}
          {!(formData.type === 'PRICE' && formData.targetType === 'PRODUCT') && (
            <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
                 <Percent size={18} className="text-emerald-500" />
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Regras de Preço e Desconto</h3>
              </div>
              
              {formData.type === 'PRICE' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preço Fixo Promocional (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.discountValue || ''}
                  onChange={e => setFormData({ ...formData, discountValue: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-black text-slate-700 shadow-sm"
                  placeholder="0.00"
                />
              </div>
            )}

            {formData.type === 'PERCENTAGE' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Percentual de Desconto (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.discountValue || ''}
                  onChange={e => setFormData({ ...formData, discountValue: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-black text-slate-700 shadow-sm"
                  placeholder="Ex: 15"
                />
              </div>
            )}

            {formData.type === 'BUY_X_GET_Y' && (
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Levar (Qtd.)</label>
                  <input
                    type="number"
                    required
                    value={formData.buyQuantity || ''}
                    onChange={e => setFormData({ ...formData, buyQuantity: e.target.value ? parseInt(e.target.value) : 0 })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-black text-slate-700 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pagar (Qtd.)</label>
                  <input
                    type="number"
                    required
                    value={formData.payQuantity || ''}
                    onChange={e => setFormData({ ...formData, payQuantity: e.target.value ? parseInt(e.target.value) : 0 })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-black text-slate-700 shadow-sm"
                  />
                </div>
              </div>
            )}

            {formData.type === 'COMBO' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preço Fechado do Combo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.comboPrice || ''}
                  onChange={e => setFormData({ ...formData, comboPrice: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all font-black text-emerald-600 shadow-sm"
                />
              </div>
            )}
            </div>
          )}

          {/* Configurações Extras */}
          <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
               <Settings size={18} className="text-slate-400" />
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Regras Adicionais</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label htmlFor="applyAutomatically" className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="applyAutomatically"
                    checked={formData.applyAutomatically}
                    onChange={e => setFormData({ ...formData, applyAutomatically: e.target.checked })}
                    className="w-5 h-5 text-brand-blue rounded border-slate-300 focus:ring-brand-blue"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">Aplicar automaticamente</span>
                  <span className="text-xs text-slate-500">O PDV aplicará a oferta sem precisar de confirmação manual.</span>
                </div>
              </label>

              <label htmlFor="onlyForClubMembers" className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="onlyForClubMembers"
                    checked={formData.onlyForClubMembers}
                    onChange={e => setFormData({ ...formData, onlyForClubMembers: e.target.checked })}
                    className="w-5 h-5 text-brand-blue rounded border-slate-300 focus:ring-brand-blue"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800">Clube de Benefícios</span>
                  <span className="text-xs text-slate-500">Restringir esta oferta apenas para clientes cadastrados.</span>
                </div>
              </label>
            </div>
          </div>

          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="promoForm"
            className="px-6 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <Tag size={16} />
            <span>Salvar Oferta</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
