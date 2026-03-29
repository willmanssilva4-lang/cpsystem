import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Promotion, Product, Categoria } from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

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
    } : {
      name: '',
      type: 'PRICE',
      startDate: getLocalDateString(),
      endDate: getLocalDateString(new Date(new Date().setDate(new Date().getDate() + 7))),
      status: 'ACTIVE',
      targetType: 'PRODUCT',
      targetId: '',
      discountValue: 0,
      buyQuantity: 0,
      payQuantity: 0,
      comboItems: [],
      comboPrice: 0,
      applyAutomatically: true,
      limitPerCustomer: 0,
      quantityLimit: 0,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    }
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(() => {
    if (promotion) {
      if (promotion.targetType === 'PRODUCT' && promotion.targetId) {
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
    if (formData.type === 'COMBO') {
      if (!selectedProducts.find(p => p.id === product.id)) {
        const newSelected = [...selectedProducts, product];
        setSelectedProducts(newSelected);
        setFormData({ ...formData, comboItems: newSelected.map(p => p.id) });
      }
    } else {
      setSelectedProducts([product]);
      setFormData({ ...formData, targetId: product.id });
    }
    setSearchTerm('');
  };

  const removeProduct = (productId: string) => {
    const newSelected = selectedProducts.filter(p => p.id !== productId);
    setSelectedProducts(newSelected);
    if (formData.type === 'COMBO') {
      setFormData({ ...formData, comboItems: newSelected.map(p => p.id) });
    } else {
      setFormData({ ...formData, targetId: '' });
    }
  };

  const filteredProducts = searchTerm 
    ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm))
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            {promotion ? 'Editar Promoção' : 'Nova Promoção'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Informações da Promoção</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Promoção</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Oferta Quarta Verde"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Promoção</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any, targetId: '', comboItems: [] })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRICE">Preço Promocional</option>
                  <option value="PERCENTAGE">Desconto em %</option>
                  <option value="BUY_X_GET_Y">Leve X Pague Y</option>
                  <option value="COMBO">Combo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Seleção de Produtos / Alvo */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Seleção de Produtos</h3>
            
            {formData.type !== 'COMBO' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Aplicar em:</label>
                <select
                  value={formData.targetType}
                  onChange={e => setFormData({ ...formData, targetType: e.target.value as any, targetId: '' })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRODUCT">Produto Específico</option>
                  <option value="CATEGORY">Categoria</option>
                  <option value="ALL">Todos os Produtos</option>
                </select>
              </div>
            )}

            {(formData.targetType === 'PRODUCT' || formData.type === 'COMBO') && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Produto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Digite nome ou código do produto..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      >
                        <span>{product.name}</span>
                        <span className="text-gray-500">R$ {product.salePrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Products List */}
                {selectedProducts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedProducts.map(product => (
                      <div key={product.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-800">{product.name}</p>
                          <p className="text-sm text-gray-500">Preço Normal: R$ {product.salePrice.toFixed(2)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Categoria</label>
                <select
                  value={formData.targetId}
                  onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Tipo de Desconto</h3>
            
            {formData.type === 'PRICE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Promocional (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.discountValue || ''}
                  onChange={e => setFormData({ ...formData, discountValue: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {formData.type === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.discountValue || ''}
                  onChange={e => setFormData({ ...formData, discountValue: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {formData.type === 'BUY_X_GET_Y' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leve (Quantidade)</label>
                  <input
                    type="number"
                    required
                    value={formData.buyQuantity || ''}
                    onChange={e => setFormData({ ...formData, buyQuantity: e.target.value ? parseInt(e.target.value) : 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pague (Quantidade)</label>
                  <input
                    type="number"
                    required
                    value={formData.payQuantity || ''}
                    onChange={e => setFormData({ ...formData, payQuantity: e.target.value ? parseInt(e.target.value) : 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {formData.type === 'COMBO' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço do Combo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.comboPrice || ''}
                  onChange={e => setFormData({ ...formData, comboPrice: e.target.value ? parseFloat(e.target.value) : 0 })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Configurações Extras */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Configurações Extras</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="applyAutomatically"
                  checked={formData.applyAutomatically}
                  onChange={e => setFormData({ ...formData, applyAutomatically: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="applyAutomatically" className="text-sm font-medium text-gray-700">
                  Aplicar no PDV automaticamente
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Salvar Promoção
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
