'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Plus, Image as ImageIcon, HelpCircle, Upload, Trash2, Search, Package, History, ArrowLeftRight, Settings2, ClipboardList, TrendingUp, TrendingDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, CompositionItem } from '@/lib/types';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { InventorySessionModal } from './InventorySessionModal';

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: any) => void;
  initialData?: Product;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=200&h=200&auto=format&fit=crop';

export function ProductForm({ onClose, onSave, initialData }: ProductFormProps) {
  const { products, pricingSettings, stockMovements, inventories, addStockMovement, addInventory, user, subcategorias, categorias, departamentos, lotes } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'movimentacoes' | 'ajustes' | 'inventario' | 'lotes'>('geral');
  const [showCompositionModal, setShowCompositionModal] = useState(false);
  const [kitTab, setKitTab] = useState<'info' | 'products' | 'financial'>('info');
  const [pricingMethod, setPricingMethod] = useState<'margin' | 'markup'>(pricingSettings.defaultMethod);
  const [searchTerm, setSearchTerm] = useState('');

  // Adjustment form state
  const [adjustmentType, setAdjustmentType] = useState<'ENTRADA' | 'SAÍDA'>('ENTRADA');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('Correção de Saldo');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState({
    date: '',
    status: ''
  });
  const [showInventorySession, setShowInventorySession] = useState(false);

  const [formData, setFormData] = useState<{
    sku: string;
    name: string;
    supplier: string;
    unit: string;
    costPrice: string | number;
    salePrice: string | number;
    termPrice: string | number;
    wholesalePrice: string | number;
    stock: number;
    minStock: number;
    controlStock: string;
    subcategoria_id: string;
    brand: string;
    composition: CompositionItem[];
    profit: string | number;
    profitPercentage: string | number;
    image: string;
    barcode: string;
    status: string;
    store: string;
    codigo_mercadologico?: string;
    category?: string;
    subgroup?: string;
    departamento_id?: string;
  }>({
    sku: initialData?.sku || '',
    name: initialData?.name || '',
    supplier: initialData?.supplier || '',
    unit: initialData?.unit || 'UN',
    costPrice: initialData?.costPrice ?? '',
    salePrice: initialData?.salePrice ?? '',
    termPrice: initialData?.salePrice ?? '',
    wholesalePrice: initialData?.salePrice ?? '',
    stock: initialData?.stock || 0,
    minStock: initialData?.minStock || 1,
    controlStock: 'SIM',
    subcategoria_id: initialData?.subcategoria_id || '',
    brand: initialData?.brand || 'PADRAO',
    composition: initialData?.composition || [] as CompositionItem[],
    profit: initialData?.profit ?? '',
    profitPercentage: initialData?.profitPercentage ?? (pricingSettings.defaultMethod === 'markup' ? pricingSettings.defaultMarkup : pricingSettings.defaultMargin),
    image: initialData?.image || DEFAULT_IMAGE,
    barcode: '',
    status: 'Ativo',
    store: 'Loja Principal',
    codigo_mercadologico: initialData?.codigo_mercadologico || '',
    category: 'PADRAO',
    subgroup: 'PADRAO',
    departamento_id: ''
  });

  const roundPrice = (price: number) => {
    if (!pricingSettings.autoRounding) return Math.round(price * 100) / 100;
    
    // For small prices (under 10), only round to .99 if it's very close (within 0.20)
    // Otherwise just round to 2 decimal places to avoid massive margin distortion
    const floor = Math.floor(price);
    const candidate = floor + 0.99;
    const diff = candidate - price;
    
    if (price < 10 && diff > 0.20) {
      return Math.round(price * 100) / 100;
    }
    
    return candidate;
  };

  const calculatedKitStock = React.useMemo(() => {
    if (!formData.composition || formData.composition.length === 0) return null;
    
    let minStock = Infinity;
    formData.composition.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const possible = Math.floor(product.stock / item.quantity);
        if (possible < minStock) minStock = possible;
      } else {
        minStock = 0;
      }
    });
    return minStock === Infinity ? 0 : minStock;
  }, [formData.composition, products]);

  const [categoryId, setCategoryId] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');

  useEffect(() => {
    if (initialData?.subcategoria_id) {
      const sub = subcategorias.find(s => s.id === initialData.subcategoria_id);
      if (sub) {
        setCategoryId(sub.categoria_id);
        const cat = categorias.find(c => c.id === sub.categoria_id);
        if (cat && cat.departamento_id) {
          setDepartamentoId(cat.departamento_id);
        }
      }
    }
  }, [initialData, subcategorias, categorias]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateSKU = () => {
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const barcode = `789${randomSuffix}`;
    setFormData(prev => ({ ...prev, sku: barcode }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        generateSKU();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert('A imagem deve ter no máximo 500KB. Por favor, escolha uma imagem menor.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleStockAdjustment = async () => {
    if (!initialData || adjustmentQty <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    setIsAdjusting(true);
    try {
      await addStockMovement({
        productId: initialData.id,
        type: 'AJUSTE',
        quantity: adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty,
        origin: `Ajuste: ${adjustmentReason}${adjustmentNotes ? ` - ${adjustmentNotes}` : ''}`,
        date: new Date().toISOString(),
        userId: user?.email || 'system',
        userName: user?.name || 'Sistema'
      });
      
      alert('Ajuste realizado com sucesso!');
      setAdjustmentQty(0);
      setAdjustmentNotes('');
      // Update local stock display
      setFormData(prev => ({
        ...prev,
        stock: prev.stock + (adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty)
      }));
    } catch (error) {
      console.error('Adjustment error:', error);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleStartInventory = async () => {
    setShowInventorySession(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      stock: calculatedKitStock !== null ? calculatedKitStock : formData.stock
    };
    onSave(finalData);
  };

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLFormElement | HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      
      // Allow default behavior for buttons (like opening modals) and textareas
      if (target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA') {
        // If it's a button, let it click
        if (target.tagName === 'BUTTON') {
          (target as HTMLButtonElement).click();
        }
        return;
      }
      
      e.preventDefault();
      
      const container = e.currentTarget;
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        )
      );
      
      const index = focusableElements.indexOf(target);
      if (index > -1 && index < focusableElements.length - 1) {
        focusableElements[index + 1].focus();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-white px-8 py-6 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Cadastro de Produto</h2>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Preencha os dados abaixo para continuar</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-400 transition-all active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-slate-50 px-8 flex gap-8 border-b border-slate-100">
          {[
            { id: 'geral', label: 'Dados Gerais', icon: Package },
            { id: 'movimentacoes', label: 'Movimentações', icon: History, hidden: !initialData },
            { id: 'ajustes', label: 'Ajustes de Estoque', icon: Settings2, hidden: !initialData },
            { id: 'inventario', label: 'Inventário', icon: ClipboardList, hidden: !initialData },
            { id: 'lotes', label: 'Lotes Ativos', icon: Package, hidden: !initialData },
          ].filter(t => !t.hidden).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 py-4 text-xs font-black uppercase italic tracking-widest transition-all relative",
                activeTab === tab.id ? "text-brand-blue" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-blue rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'geral' && (
            <form onSubmit={handleSubmit} onKeyDown={handleEnterAsTab} className="p-8 text-brand-text-main">
              <div className="flex flex-col lg:flex-row gap-12">
            {/* Left Side - Form Fields */}
            <div className="flex-1 space-y-6">
              {/* Row 1: Code and Description */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Código:</label>
                  <div className="flex gap-2">
                    <input 
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all" 
                    />
                    <button 
                      type="button" 
                      onClick={generateSKU}
                      className="bg-brand-blue hover:bg-brand-blue-hover text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase italic transition-all shadow-lg shadow-brand-blue/20 active:scale-95"
                    >
                      Gerar - F1
                    </button>
                  </div>
                </div>
                <div className="md:col-span-7">
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Descrição</label>
                  <input 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all" 
                  />
                </div>
              </div>

              {/* Row 2: Supplier, Brand and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Fornecedor</label>
                  <select 
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none appearance-none transition-all"
                  >
                    <option value="">Selecione um fornecedor</option>
                    <option value="PADRAO">PADRAO</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Marca:</label>
                  <select 
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  >
                    <option value="PADRAO">PADRAO</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Unidade:</label>
                  <div className="flex gap-2 items-center">
                    <select 
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                    >
                      <option value="UN">UN</option>
                      <option value="KG">KG</option>
                      <option value="LT">LT</option>
                    </select>
                    <HelpCircle size={24} className="text-slate-300" />
                  </div>
                </div>
              </div>

              {/* Row 3: Prices */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Preço de Compra:</label>
                  <input 
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      const costPrice = val === '' ? 0 : Number(val);
                      let profitPercentage = Number(formData.profitPercentage);
                      let salePrice = 0;

                      if (pricingMethod === 'markup') {
                        salePrice = costPrice * (1 + (profitPercentage / 100));
                      } else {
                        const margin = profitPercentage >= 100 ? 99.99 : profitPercentage;
                        salePrice = costPrice / (1 - (margin / 100));
                      }
                      
                      salePrice = roundPrice(salePrice);
                      const profit = Math.round((salePrice - costPrice) * 100) / 100;
                      
                      // Recalculate profit percentage based on rounded price to keep UI consistent
                      let finalProfitPercentage = profitPercentage;
                      if (costPrice > 0) {
                        if (pricingMethod === 'markup') {
                          finalProfitPercentage = (profit / costPrice) * 100;
                        } else {
                          finalProfitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                        }
                      }

                      setFormData(prev => ({ ...prev, costPrice: val === '' ? '' : costPrice, salePrice, profit, profitPercentage: Math.round(finalProfitPercentage * 100) / 100 }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Preço de Venda:</label>
                  <input 
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    readOnly={!pricingSettings.allowEditOnProduct}
                    onChange={(e) => {
                      const val = e.target.value;
                      const salePrice = val === '' ? 0 : Number(val);
                      const costPrice = Number(formData.costPrice);
                      const profit = Math.round((salePrice - costPrice) * 100) / 100;
                      let profitPercentage = 0;
                      if (pricingMethod === 'markup') {
                        profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                      } else {
                        profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                      }
                      setFormData(prev => ({ ...prev, salePrice: val === '' ? '' : salePrice, profit, profitPercentage: Math.round(profitPercentage * 100) / 100 }));
                    }}
                    className={cn(
                      "w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center outline-none transition-all",
                      pricingSettings.allowEditOnProduct 
                        ? "bg-slate-50 text-brand-blue focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Preço Aprazo:</label>
                  <input 
                    type="number"
                    name="termPrice"
                    value={formData.termPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, termPrice: val === '' ? '' : Number(val) }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Preço Atacado</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      name="wholesalePrice"
                      value={formData.wholesalePrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, wholesalePrice: val === '' ? '' : Number(val) }));
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all" 
                    />
                    <button type="button" className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-1 rounded-lg uppercase italic transition-all hover:bg-slate-200">
                      Mais Preços
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Stock */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Estoque Atual:</label>
                  <input 
                    type="number"
                    name="stock"
                    value={calculatedKitStock !== null ? calculatedKitStock : formData.stock}
                    onChange={handleChange}
                    readOnly={calculatedKitStock !== null}
                    className={cn(
                      "w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center outline-none transition-all",
                      calculatedKitStock !== null ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50 text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5"
                    )}
                  />
                  {calculatedKitStock !== null && (
                    <p className="text-[8px] text-brand-blue font-black uppercase italic mt-1 text-center">Calculado via Kit</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Est. Mínimo:</label>
                  <input 
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Controlar Estoque</label>
                  <select 
                    name="controlStock"
                    value={formData.controlStock}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  >
                    <option value="SIM">SIM</option>
                    <option value="NÃO">NÃO</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Department, Category, Subcategory, Mercadological Code */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Departamento:</label>
                  <select 
                    value={departamentoId}
                    onChange={(e) => {
                      setDepartamentoId(e.target.value);
                      setCategoryId('');
                      setFormData(prev => ({ ...prev, subcategoria_id: '' }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    {departamentos.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.codigo ? `${dept.codigo} - ` : ''}{dept.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Categoria:</label>
                  <select 
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setFormData(prev => ({ ...prev, subcategoria_id: '' }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    {categorias
                      .filter(cat => !departamentoId || cat.departamento_id === departamentoId)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.codigo ? `${cat.codigo} - ` : ''}{cat.nome}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Subcategoria:</label>
                  <select 
                    name="subcategoria_id"
                    value={formData.subcategoria_id}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    {subcategorias
                      .filter(sub => !categoryId || sub.categoria_id === categoryId)
                      .map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.codigo ? `${sub.codigo} - ` : ''}{sub.nome}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Cód. Mercadológico:</label>
                  <input 
                    type="text"
                    name="codigo_mercadologico"
                    value={formData.codigo_mercadologico || ''}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                    placeholder={
                      (() => {
                        if (!formData.subcategoria_id) return 'Automático';
                        const sub = subcategorias.find(s => s.id === formData.subcategoria_id);
                        if (!sub) return 'Automático';
                        const cat = categorias.find(c => c.id === sub.categoria_id);
                        if (!cat) return sub.codigo || 'Automático';
                        const dep = departamentos.find(d => d.id === cat.departamento_id);
                        if (!dep) return `${cat.codigo || ''}.${sub.codigo || ''}`;
                        return `${dep.codigo || ''}.${cat.codigo || ''}.${sub.codigo || ''}`;
                      })()
                    }
                  />
                </div>
              </div>

              {/* Row 6: Composition */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Composição / Ingredientes:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      readOnly
                      value={formData.composition.length > 0 ? `${formData.composition.length} Itens no Kit` : 'Nenhum'}
                      className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none transition-all cursor-default"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCompositionModal(true)}
                      className="bg-brand-blue text-white p-2.5 rounded-xl shadow-lg shadow-brand-blue/20 active:scale-95"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 8: Profit */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Lucro:</label>
                  <input 
                    type="number"
                    name="profit"
                    value={formData.profit === '' ? '' : Math.round(Number(formData.profit) * 100) / 100}
                    onChange={(e) => {
                      const val = e.target.value;
                      const profit = val === '' ? '' : Math.round(Number(val) * 100) / 100;
                      const costPrice = Number(formData.costPrice);
                      const salePrice = costPrice + (profit === '' ? 0 : profit);
                      let profitPercentage = 0;
                      if (pricingMethod === 'markup') {
                        profitPercentage = costPrice > 0 ? ((profit === '' ? 0 : profit) / costPrice) * 100 : 0;
                      } else {
                        profitPercentage = salePrice > 0 ? ((profit === '' ? 0 : profit) / salePrice) * 100 : 0;
                      }
                      setFormData(prev => ({ ...prev, profit, salePrice, profitPercentage: Math.round(profitPercentage * 100) / 100 }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest">Lucro (%):</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        disabled={!pricingSettings.allowEditOnProduct}
                        onClick={() => {
                          const costPrice = Number(formData.costPrice);
                          const salePrice = Number(formData.salePrice);
                          const profit = Math.round((salePrice - costPrice) * 100) / 100;
                          const newProfitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                          setPricingMethod('markup');
                          setFormData(prev => ({ ...prev, profitPercentage: Math.round(newProfitPercentage * 100) / 100, profit }));
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[8px] font-black uppercase italic rounded-md transition-all",
                          pricingMethod === 'markup' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600",
                          !pricingSettings.allowEditOnProduct && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        Markup
                      </button>
                      <button
                        type="button"
                        disabled={!pricingSettings.allowEditOnProduct}
                        onClick={() => {
                          const costPrice = Number(formData.costPrice);
                          const salePrice = Number(formData.salePrice);
                          const profit = Math.round((salePrice - costPrice) * 100) / 100;
                          const newProfitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                          setPricingMethod('margin');
                          setFormData(prev => ({ ...prev, profitPercentage: Math.round(newProfitPercentage * 100) / 100, profit }));
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[8px] font-black uppercase italic rounded-md transition-all",
                          pricingMethod === 'margin' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600",
                          !pricingSettings.allowEditOnProduct && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        Margem
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      name="profitPercentage"
                      value={(formData.profitPercentage as any) === '' ? '' : Math.round(Number(formData.profitPercentage) * 100) / 100}
                      readOnly={!pricingSettings.allowEditOnProduct}
                      onChange={(e) => {
                        const val = e.target.value;
                        const profitPercentage = val === '' ? '' : Number(val);
                        const costPrice = Number(formData.costPrice);
                        let salePrice = 0;
                        if (pricingMethod === 'markup') {
                          salePrice = costPrice * (1 + ((profitPercentage === '' ? 0 : profitPercentage) / 100));
                        } else {
                          const margin = (profitPercentage === '' ? 0 : profitPercentage) >= 100 ? 99.99 : (profitPercentage === '' ? 0 : profitPercentage);
                          salePrice = costPrice / (1 - (margin / 100));
                        }
                        salePrice = roundPrice(salePrice);
                        const profit = Math.round((salePrice - costPrice) * 100) / 100;
                        setFormData(prev => ({ ...prev, profitPercentage, salePrice, profit }));
                      }}
                      className={cn(
                        "w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center outline-none transition-all",
                        pricingSettings.allowEditOnProduct 
                          ? "bg-slate-50 text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5" 
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Status:</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                  >
                    <option value="Ativo">ATIVO</option>
                    <option value="Inativo">INATIVO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Side - Image Preview */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
              <div 
                onClick={triggerFileUpload}
                className="aspect-square bg-slate-50 rounded-[32px] flex items-center justify-center overflow-hidden relative border-4 border-slate-100 shadow-inner cursor-pointer group"
              >
                <Image 
                  src={formData.image} 
                  alt="Preview" 
                  fill
                  className="object-contain p-6 group-hover:scale-110 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-brand-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/90 p-3 rounded-2xl shadow-xl text-brand-blue">
                    <Upload size={32} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest">Imagem do Produto:</label>
                <div className="flex gap-2">
                  <input 
                    name="image"
                    value={formData.image.startsWith('data:') ? 'Imagem Carregada' : formData.image}
                    onChange={handleChange}
                    readOnly={formData.image.startsWith('data:')}
                    className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-bold text-slate-500 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all" 
                    placeholder="https://..."
                  />
                  <button 
                    type="button"
                    onClick={triggerFileUpload}
                    className="bg-slate-100 text-brand-blue p-2.5 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                </div>
                {formData.image.startsWith('data:') && (
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: DEFAULT_IMAGE }))}
                    className="text-[8px] font-black uppercase italic text-rose-500 text-right"
                  >
                    Remover Upload
                  </button>
                )}
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-black py-4 rounded-2xl uppercase italic tracking-widest shadow-xl shadow-brand-blue/20 transition-all active:scale-95"
                >
                  Gravar Dados
                </button>
                <button 
                  type="button"
                  onClick={onClose}
                  className="w-full bg-white hover:bg-slate-50 text-slate-400 border border-slate-200 font-black py-3 rounded-2xl uppercase italic text-[10px] tracking-widest transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

          {activeTab === 'movimentacoes' && (
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-700 uppercase italic tracking-tight">Histórico de Movimentações</h3>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">
                    <Download size={14} />
                    Exportar PDF
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem/Destino</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saldo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stockMovements
                      .filter(m => m.productId === initialData?.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((mov) => (
                        <tr key={mov.id} className="hover:bg-white transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">
                            {new Date(mov.date).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black uppercase italic",
                              mov.type === 'ENTRADA' ? "bg-emerald-100 text-emerald-600" : 
                              mov.type === 'SAÍDA' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                            )}>
                              {mov.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{mov.origin}</td>
                          <td className={cn(
                            "px-6 py-4 text-xs font-black text-center",
                            mov.quantity > 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-700 text-center">-</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">{mov.userName || mov.userId}</td>
                        </tr>
                      ))}
                    {stockMovements.filter(m => m.productId === initialData?.id).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                          Nenhuma movimentação para este produto
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-sm text-slate-500 font-medium">
                    Mostrando {stockMovements.filter(m => m.productId === initialData?.id).length} movimentações
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <ChevronLeft size={18} className="text-slate-400 cursor-pointer hover:text-slate-600" />
                      <div className="flex items-center gap-1">
                        <button className="w-8 h-8 rounded-lg text-sm font-bold transition-all bg-brand-blue text-white shadow-md shadow-brand-blue/20">1</button>
                      </div>
                      <ChevronRight size={18} className="text-slate-400 cursor-pointer hover:text-slate-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ajustes' && (
            <div className="p-8 space-y-8">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-black text-slate-700 uppercase italic tracking-tight">Ajuste Manual de Estoque</h3>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Utilize para correções pontuais de inventário</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Tipo de Ajuste:</label>
                      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button 
                          type="button"
                          onClick={() => setAdjustmentType('ENTRADA')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase italic text-xs transition-all",
                            adjustmentType === 'ENTRADA' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <TrendingUp size={16} />
                          Entrada
                        </button>
                        <button 
                          type="button"
                          onClick={() => setAdjustmentType('SAÍDA')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase italic text-xs transition-all",
                            adjustmentType === 'SAÍDA' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400 hover:text-rose-500"
                          )}
                        >
                          <TrendingDown size={16} />
                          Saída
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Quantidade:</label>
                      <input 
                        type="number"
                        value={adjustmentQty}
                        onChange={(e) => setAdjustmentQty(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xl font-black text-center text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Motivo do Ajuste:</label>
                    <select 
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                    >
                      <option value="Correção de Saldo">Correção de Saldo</option>
                      <option value="Avaria / Quebra">Avaria / Quebra</option>
                      <option value="Vencimento">Vencimento</option>
                      <option value="Bonificação">Bonificação</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 uppercase text-slate-400 tracking-widest">Observações:</label>
                    <textarea 
                      value={adjustmentNotes}
                      onChange={(e) => setAdjustmentNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all h-32 resize-none"
                      placeholder="Descreva o motivo detalhado do ajuste..."
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={handleStockAdjustment}
                    disabled={isAdjusting}
                    className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-black py-4 rounded-2xl uppercase italic tracking-widest shadow-xl shadow-brand-blue/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isAdjusting ? 'Processando...' : 'Confirmar Ajuste'}
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resumo do Estoque</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Saldo Atual:</span>
                        <span className="text-sm font-black text-slate-700">{formData.stock} UN</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Ajuste:</span>
                        <span className={cn(
                          "text-sm font-black",
                          adjustmentType === 'ENTRADA' ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {adjustmentType === 'ENTRADA' ? `+${adjustmentQty}` : `-${adjustmentQty}`} UN
                        </span>
                      </div>
                      <div className="h-px bg-slate-200" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Novo Saldo:</span>
                        <span className="text-lg font-black text-brand-blue">
                          {formData.stock + (adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty)} UN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventario' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                    <ClipboardList size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Inventário de Estoque</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gestão e Reconciliação de Contagens Físicas</p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleStartInventory}
                  className="bg-brand-blue hover:bg-brand-blue-hover text-white px-8 py-4 rounded-2xl font-black uppercase italic text-sm tracking-widest transition-all shadow-xl shadow-brand-blue/20 active:scale-95 flex items-center gap-3"
                >
                  <Plus size={20} />
                  Novo Inventário
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Data</label>
                  <input 
                    type="date" 
                    value={inventoryFilter.date}
                    onChange={(e) => setInventoryFilter(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 focus:border-brand-blue outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Status</label>
                  <select 
                    value={inventoryFilter.status}
                    onChange={(e) => setInventoryFilter(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 focus:border-brand-blue outline-none transition-all"
                  >
                    <option value="">Todos os Status</option>
                    <option value="Concluído">Finalizado</option>
                    <option value="Em Andamento">Em Andamento</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    type="button"
                    onClick={() => setInventoryFilter({ date: '', status: '' })}
                    className="w-full py-3 text-slate-400 hover:text-brand-blue text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {inventories.length > 0 ? (
                        inventories
                          .filter(inv => {
                            if (inventoryFilter.date && !inv.date.startsWith(inventoryFilter.date)) return false;
                            if (inventoryFilter.status && inv.status !== inventoryFilter.status) return false;
                            return true;
                          })
                          .map((inv, idx) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-8 py-5">
                              <span className="text-xs font-black text-slate-400">#{inventories.length - idx}</span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-700">{new Date(inv.date).toLocaleDateString('pt-BR')}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{inv.location}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-sm font-bold text-slate-600">{inv.responsible || 'Sistema'}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {inv.type || 'Geral'}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                inv.status === 'Concluído' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                              )}>
                                {inv.status === 'Concluído' ? 'Finalizado' : 'Em Andamento'}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button type="button" className="p-2 text-slate-400 hover:text-brand-blue transition-all">
                                <Settings2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4 text-slate-300">
                              <ClipboardList size={48} className="opacity-20" />
                              <p className="text-sm font-black uppercase tracking-widest">Nenhum inventário registrado</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lotes' && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                  <Package size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Lotes em Estoque</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Controle de Lotes e Validades (PEPS)</p>
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Validade</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Unit.</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd Inicial</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saldo Atual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {lotes.filter(l => l.productId === initialData?.id).length > 0 ? (
                        lotes
                          .filter(l => l.productId === initialData?.id)
                          .sort((a, b) => new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime())
                          .map((lote) => (
                            <tr key={lote.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-8 py-5">
                                <span className="text-sm font-black text-slate-700">{lote.numeroLote}</span>
                              </td>
                              <td className="px-8 py-5">
                                <span className="text-sm font-bold text-slate-600">{new Date(lote.dataEntrada).toLocaleDateString('pt-BR')}</span>
                              </td>
                              <td className="px-8 py-5">
                                <span className={cn(
                                  "text-sm font-bold",
                                  lote.validade && new Date(lote.validade) < new Date() ? "text-rose-500" : "text-slate-600"
                                )}>
                                  {lote.validade ? new Date(lote.validade).toLocaleDateString('pt-BR') : '-'}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <span className="text-sm font-black text-brand-blue">R$ {lote.custoUnit.toFixed(2)}</span>
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span className="text-sm font-bold text-slate-500">{lote.quantidadeInicial}</span>
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span className={cn(
                                  "text-sm font-black",
                                  lote.saldoAtual > 0 ? "text-emerald-600" : "text-slate-400"
                                )}>
                                  {lote.saldoAtual}
                                </span>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4 text-slate-300">
                              <Package size={48} className="opacity-20" />
                              <p className="text-sm font-black uppercase tracking-widest">Nenhum lote registrado para este produto</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composition Modal (Cadastro de Kit) */}
        {showCompositionModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" onKeyDown={handleEnterAsTab}>
            <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 max-h-[90vh]">
              {/* Header */}
              <div className="bg-brand-blue px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Cadastro de Kit</h3>
                <button 
                  type="button"
                  onClick={() => setShowCompositionModal(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-brand-border px-6 pt-4 gap-4">
                <button
                  type="button"
                  onClick={() => setKitTab('info')}
                  className={cn(
                    "pb-3 px-4 font-black uppercase italic text-xs tracking-widest transition-all border-b-2",
                    kitTab === 'info' ? "border-brand-blue-hover text-brand-blue" : "border-transparent text-brand-text-main/40 hover:text-brand-text-main/60"
                  )}
                >
                  Informações
                </button>
                <button
                  type="button"
                  onClick={() => setKitTab('products')}
                  className={cn(
                    "pb-3 px-4 font-black uppercase italic text-xs tracking-widest transition-all border-b-2",
                    kitTab === 'products' ? "border-brand-blue-hover text-brand-blue" : "border-transparent text-brand-text-main/40 hover:text-brand-text-main/60"
                  )}
                >
                  Produtos
                </button>
                <button
                  type="button"
                  onClick={() => setKitTab('financial')}
                  className={cn(
                    "pb-3 px-4 font-black uppercase italic text-xs tracking-widest transition-all border-b-2",
                    kitTab === 'financial' ? "border-brand-blue-hover text-brand-blue" : "border-transparent text-brand-text-main/40 hover:text-brand-text-main/60"
                  )}
                >
                  Resumo Financeiro
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                {kitTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Nome do Kit *</label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
                        placeholder="Ex: Kit Churrasco Premium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Código Interno</label>
                      <input 
                        type="text" 
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main outline-none"
                        placeholder="Gerado automaticamente ou digite"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Código de Barras</label>
                      <input 
                        type="text" 
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Categoria</label>
                      <select 
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all appearance-none"
                      >
                        <option value="PADRAO">Padrão</option>
                        <option value="KITS">Kits</option>
                        <option value="COMBOS">Combos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Subcategoria</label>
                      <select 
                        name="subgroup"
                        value={formData.subgroup}
                        onChange={handleChange}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all appearance-none"
                      >
                        <option value="PADRAO">Padrão</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Status</label>
                      <select 
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all appearance-none"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Loja</label>
                      <select 
                        name="store"
                        value={formData.store}
                        onChange={handleChange}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all appearance-none"
                      >
                        <option value="Loja Principal">Loja Principal</option>
                      </select>
                    </div>
                  </div>
                )}

                {kitTab === 'products' && (
                  <div className="flex flex-col gap-6 h-full">
                    {/* Search Products */}
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sec" size={18} />
                      <input 
                        type="text"
                        placeholder="Buscar produto para adicionar ao kit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-brand-border pl-12 pr-4 py-3 rounded-2xl text-sm font-bold focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
                      />
                      
                      {searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-brand-border rounded-2xl shadow-xl z-10 max-h-64 overflow-y-auto">
                          {products
                            .filter(p => p.id !== initialData?.id)
                            .filter(p => (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm)) && p.status !== 'Inativo')
                            .map(product => {
                              const isLowStock = product.stock <= product.minStock;
                              return (
                                <div key={product.id} className="p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 flex justify-between items-center transition-colors">
                                  <div>
                                    <div className="font-bold text-brand-text-main">{product.name}</div>
                                    <div className="flex gap-3 text-[10px] font-black uppercase italic mt-1">
                                      <span className={isLowStock ? "text-rose-500" : "text-brand-blue-hover"}>
                                        Estoque: {product.stock} {isLowStock && '(Baixo)'}
                                      </span>
                                      <span className="text-brand-blue/60">Custo: R$ {product.costPrice.toFixed(2)}</span>
                                      <span className="text-brand-blue/60">Venda: R$ {product.salePrice.toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const exists = formData.composition.find(item => item.productId === product.id);
                                      if (!exists) {
                                        setFormData(prev => ({
                                          ...prev,
                                          composition: [...prev.composition, { 
                                            productId: product.id, 
                                            quantity: 1,
                                            name: product.name,
                                            price: product.costPrice // Using cost price for kit composition cost
                                          }]
                                        }));
                                      }
                                      setSearchTerm('');
                                    }}
                                    className="bg-brand-border hover:bg-brand-border text-brand-text-main px-4 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all"
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Items Table */}
                    <div className="flex-1 bg-white rounded-2xl border border-brand-border overflow-hidden flex flex-col">
                      <div className="bg-slate-50 px-4 py-3 grid grid-cols-12 gap-4 border-b border-brand-border text-[10px] font-black uppercase italic text-brand-text-main/60 tracking-widest">
                        <div className="col-span-5">Produto</div>
                        <div className="col-span-2 text-center">Qtd</div>
                        <div className="col-span-2 text-right">Custo Unit.</div>
                        <div className="col-span-2 text-right">Subtotal</div>
                        <div className="col-span-1 text-center">Ação</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {formData.composition.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-brand-text-main/30 gap-2 py-8">
                            <ImageIcon size={48} />
                            <p className="font-black uppercase italic text-xs">Nenhum produto no kit</p>
                          </div>
                        ) : (
                          formData.composition.map((item, index) => {
                            const product = products.find(p => p.id === item.productId);
                            const isLowStock = product ? product.stock <= product.minStock : false;
                            
                            return (
                              <div key={item.productId} className="px-2 py-3 grid grid-cols-12 gap-4 items-center bg-white border border-slate-50 rounded-xl hover:border-brand-border transition-colors">
                                <div className="col-span-5">
                                  <div className="font-bold text-brand-text-main text-sm truncate">{item.name}</div>
                                  {isLowStock && <div className="text-[9px] text-rose-500 font-black uppercase italic">⚠️ Estoque Baixo</div>}
                                </div>
                                <div className="col-span-2 flex justify-center">
                                  <input 
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value) || 1;
                                      const newComp = [...formData.composition];
                                      newComp[index] = { ...item, quantity: newQty };
                                      setFormData(prev => ({ ...prev, composition: newComp }));
                                    }}
                                    className="w-16 bg-slate-50 border border-brand-border px-2 py-1 rounded-lg text-center font-black text-brand-text-main outline-none focus:border-brand-blue-hover"
                                  />
                                </div>
                                <div className="col-span-2 text-right font-bold text-brand-blue/80 text-sm">
                                  R$ {item.price?.toFixed(2)}
                                </div>
                                <div className="col-span-2 text-right font-black text-brand-text-main text-sm">
                                  R$ {((item.price || 0) * item.quantity).toFixed(2)}
                                </div>
                                <div className="col-span-1 flex justify-center">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        composition: prev.composition.filter((_, i) => i !== index)
                                      }));
                                    }}
                                    className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="bg-brand-text-main text-white px-6 py-4 flex justify-between items-center">
                        <div className="text-[10px] font-black uppercase italic opacity-80 tracking-widest">Custo Total do Kit</div>
                        <div className="text-xl font-black">
                          R$ {formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {kitTab === 'financial' && (
                  <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm">
                      <h4 className="text-sm font-black text-brand-text-main uppercase italic tracking-widest mb-6 border-b border-slate-50 pb-4">Formação de Preço</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Custo Total (Soma dos Produtos)</label>
                            <div className="w-full bg-slate-50 border border-brand-border px-4 py-3 rounded-2xl text-lg font-black text-brand-text-main">
                              R$ {formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toFixed(2)}
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-black uppercase italic text-brand-text-main/80 tracking-widest">
                                Margem de Lucro Desejada (%)
                              </label>
                              <div className="flex bg-slate-50 p-1 rounded-lg">
                                  <button
                                  type="button"
                                  disabled={!pricingSettings.allowEditOnProduct}
                                  onClick={() => {
                                    const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                    const salePrice = Number(formData.salePrice);
                                    const profit = Math.round((salePrice - costPrice) * 100) / 100;
                                    const newProfitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                                    setPricingMethod('markup');
                                    setFormData(prev => ({ ...prev, profitPercentage: Math.round(newProfitPercentage * 100) / 100, costPrice, profit }));
                                  }}
                                  className={cn(
                                    "px-3 py-1 text-[10px] font-black uppercase italic rounded-md transition-all",
                                    pricingMethod === 'markup' ? "bg-white text-brand-blue shadow-sm" : "text-brand-text-main/40 hover:text-brand-text-main/60",
                                    !pricingSettings.allowEditOnProduct && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  Markup
                                </button>
                                <button
                                  type="button"
                                  disabled={!pricingSettings.allowEditOnProduct}
                                  onClick={() => {
                                    const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                    const salePrice = Number(formData.salePrice);
                                    const profit = Math.round((salePrice - costPrice) * 100) / 100;
                                    const newProfitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                                    setPricingMethod('margin');
                                    setFormData(prev => ({ ...prev, profitPercentage: Math.round(newProfitPercentage * 100) / 100, costPrice, profit }));
                                  }}
                                  className={cn(
                                    "px-3 py-1 text-[10px] font-black uppercase italic rounded-md transition-all",
                                    pricingMethod === 'margin' ? "bg-white text-brand-blue shadow-sm" : "text-brand-text-main/40 hover:text-brand-text-main/60",
                                    !pricingSettings.allowEditOnProduct && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  Margem
                                </button>
                              </div>
                            </div>
                            <div className="relative">
                              <input 
                                type="number" 
                                name="profitPercentage"
                                value={formData.profitPercentage}
                                readOnly={!pricingSettings.allowEditOnProduct}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const profitPercentage = val === '' ? 0 : Number(val);
                                  const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                  let salePrice = 0;
                                  if (pricingMethod === 'markup') {
                                    salePrice = costPrice * (1 + (profitPercentage / 100));
                                  } else {
                                    const margin = profitPercentage >= 100 ? 99.99 : profitPercentage;
                                    salePrice = costPrice / (1 - (margin / 100));
                                  }
                                  salePrice = roundPrice(salePrice);
                                  const profit = Math.round((salePrice - costPrice) * 100) / 100;
                                  setFormData(prev => ({ ...prev, profitPercentage: val === '' ? '' : Math.round(profitPercentage * 100) / 100, salePrice, profit, costPrice }));
                                }}
                                className={cn(
                                  "w-full border px-4 py-3 rounded-2xl text-lg font-black outline-none transition-all",
                                  pricingSettings.allowEditOnProduct 
                                    ? "bg-white border-brand-border text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10" 
                                    : "bg-slate-50 border-brand-border text-brand-text-main/40 cursor-not-allowed"
                                )}
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-main/40 font-black">%</span>
                            </div>
                            <p className="text-[10px] text-brand-blue/60 mt-2 font-medium italic">
                              {pricingMethod === 'markup' 
                                ? "Cálculo: Custo + (Custo × Percentual)" 
                                : "Cálculo: Custo ÷ (1 - Percentual)"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Preço de Venda Final</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-main/40 font-black">R$</span>
                              <input 
                                type="number" 
                                name="salePrice"
                                value={formData.salePrice}
                                readOnly={!pricingSettings.allowEditOnProduct}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const salePrice = val === '' ? 0 : Number(val);
                                  const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                  const profit = Math.round((salePrice - costPrice) * 100) / 100;
                                  let profitPercentage = 0;
                                  if (pricingMethod === 'markup') {
                                    profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                                  } else {
                                    profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                                  }
                                  setFormData(prev => ({ ...prev, salePrice: val === '' ? '' : salePrice, profit, profitPercentage: Math.round(profitPercentage * 100) / 100, costPrice }));
                                }}
                                className={cn(
                                  "w-full pl-12 pr-4 py-3 rounded-2xl text-xl font-black border outline-none transition-all",
                                  pricingSettings.allowEditOnProduct 
                                    ? "bg-slate-50 border-brand-border text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10" 
                                    : "bg-brand-border border-brand-border text-brand-text-main/40 cursor-not-allowed"
                                )}
                              />
                            </div>
                          </div>

                          <div className="bg-brand-text-main p-5 rounded-2xl text-white">
                            <div className="text-[10px] font-black uppercase italic opacity-80 tracking-widest mb-1">Lucro Estimado</div>
                            <div className="flex items-end gap-3">
                              <div className="text-3xl font-black">R$ {Number(formData.profit || 0).toFixed(2)}</div>
                              <div className="text-brand-text-sec font-bold mb-1">({Number(formData.profitPercentage || 0).toFixed(2)}%)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="bg-white border-t border-brand-border p-6 flex justify-between items-center">
                <button 
                  type="button"
                  onClick={() => setShowCompositionModal(false)}
                  className="px-6 py-3 text-brand-text-main/60 hover:text-brand-text-main font-black uppercase italic text-xs tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      if (formData.composition.length === 0) {
                        alert('O kit precisa ter pelo menos um produto na composição.');
                        return;
                      }
                      if (!formData.name) {
                        alert('O nome do kit é obrigatório.');
                        setKitTab('info');
                        return;
                      }
                      // Recalculate cost just to be sure
                      const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                      setFormData(prev => ({ ...prev, costPrice, stock: calculatedKitStock !== null ? calculatedKitStock : prev.stock }));
                      setShowCompositionModal(false);
                    }}
                    className="bg-brand-border hover:bg-brand-border text-brand-text-main px-6 py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest transition-all active:scale-95"
                  >
                    Salvar e Continuar Editando
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (formData.composition.length === 0) {
                        alert('O kit precisa ter pelo menos um produto na composição.');
                        return;
                      }
                      if (!formData.name) {
                        alert('O nome do kit é obrigatório.');
                        setKitTab('info');
                        return;
                      }
                      const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                      onSave({ ...formData, costPrice, stock: calculatedKitStock !== null ? calculatedKitStock : formData.stock });
                      setShowCompositionModal(false);
                    }}
                    className="bg-brand-blue-hover hover:bg-brand-text-sec text-white px-8 py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest shadow-lg shadow-brand-blue-hover/30 transition-all active:scale-95"
                  >
                    Salvar Kit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showInventorySession && (
        <InventorySessionModal 
          onClose={() => setShowInventorySession(false)}
          onComplete={() => {
            setShowInventorySession(false);
            onClose(); // Close the product form as well to refresh data
          }}
        />
      )}
    </div>
  );
}
