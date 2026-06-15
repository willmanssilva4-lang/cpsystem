'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Plus, Image as ImageIcon, Upload, Trash2, Search, Package, History, ArrowLeftRight, Settings2, ClipboardList, TrendingUp, TrendingDown, Download, ChevronLeft, ChevronRight, RefreshCw, Tag, Layers, Box, DollarSign, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Product, CompositionItem } from '@/lib/types';
import { useERP } from '@/lib/context';
import { cn, formatDateTimeBR, formatDateBR, toLocalDateString } from '@/lib/utils';
import { InventorySessionModal } from './InventorySessionModal';

const parseCommaNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).replace(/\s/g, '').replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? 0 : num;
};

interface ProductFormProps {
  onClose: () => void;
  onSave: (product: any) => void;
  initialData?: Product;
}

function QuantityInput({ value, onChange }: { value: number, onChange: (val: number) => void }) {
  const [displayValue, setDisplayValue] = useState(value.toString().replace('.', ','));

  useEffect(() => {
    setDisplayValue(value.toString().replace('.', ','));
  }, [value]);

  return (
    <input 
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={(e) => {
        const val = e.target.value;
        setDisplayValue(val);
        
        if (!val.endsWith(',') && !val.endsWith('.')) {
          const rawValue = val.replace(',', '.');
          const newQty = parseFloat(rawValue);
          if (!isNaN(newQty)) {
            onChange(Math.round(newQty * 1000) / 1000);
          }
        }
      }}
      className="w-20 bg-slate-50 border border-brand-border px-2 py-1 rounded-lg text-center font-black text-brand-text-main outline-none focus:border-brand-blue-hover"
    />
  );
}

// Imagem padrão de uma caixa 3D (placeholder)
const DEFAULT_IMAGE = 'https://i.imgur.com/jGU5BUa.png';

export function ProductForm({ onClose, onSave, initialData }: ProductFormProps) {
  const { products, pricingSettings, suppliers, stockMovements, inventories, addStockMovement, addInventory, user, subcategorias, categorias, departamentos, lotes, setCustomAlert } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const termPriceInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'movimentacoes' | 'ajustes' | 'inventario' | 'lotes'>('geral');
  const [showCompositionModal, setShowCompositionModal] = useState(false);
  const [kitTab, setKitTab] = useState<'info' | 'products' | 'financial'>('info');
  const [pricingMethod, setPricingMethod] = useState<'margin' | 'markup'>(pricingSettings.defaultMethod || 'markup');
  const [searchTerm, setSearchTerm] = useState('');
  const [imageError, setImageError] = useState(false);

  // Adjustment form state
  const [adjustmentType, setAdjustmentType] = useState<'ENTRADA' | 'SAÍDA'>('ENTRADA');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('Correção de Saldo');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;
  const validadeInitialized = useRef(false);
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
    wholesaleMinQty: string | number;
    clubPrice: string | number;
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
    validade?: string;
    product_type?: 'PADRAO' | 'BASE' | 'SALE' | 'KIT';
    base_product_id?: string;
    conversion_factor?: number;
    gramatura?: string;
    tipo_embalagem?: string;
    segmento?: string;
    section?: string;
  }>(() => {
    let initialProfit = initialData?.profit ?? '';
    let initialProfitPercentage = initialData?.profitPercentage ?? '';

    if (initialData && initialData.costPrice !== undefined && initialData.salePrice !== undefined && initialProfit === '') {
      const cost = Number(initialData.costPrice);
      const sale = Number(initialData.salePrice);
      initialProfit = Math.round((sale - cost) * 100) / 100;
      
      if (pricingSettings.defaultMethod === 'markup') {
        initialProfitPercentage = cost > 0 ? Math.round((initialProfit / cost) * 100) / 100 * 100 : 0;
      } else {
        initialProfitPercentage = sale > 0 ? Math.round((initialProfit / sale) * 100) / 100 * 100 : 0;
      }
    } else if (initialProfitPercentage === '') {
      initialProfitPercentage = (pricingSettings.defaultMethod === 'markup' ? pricingSettings.defaultMarkup : pricingSettings.defaultMargin) ?? '';
    }

    return {
      sku: initialData?.sku || '',
      name: initialData?.name || '',
      supplier: initialData?.supplier || '',
      unit: initialData?.unit || 'UN',
      costPrice: (() => {
        if (initialData?.costPrice === undefined || initialData?.costPrice === null) return '';
        const num = initialData.costPrice;
        return num.toFixed(3).replace('.', ',');
      })(),
      salePrice: initialData?.salePrice ?? '',
      termPrice: initialData?.termPrice ?? '',
      wholesalePrice: initialData?.wholesalePrice ?? '',
      wholesaleMinQty: initialData?.wholesaleMinQty || 0,
      clubPrice: initialData?.clubPrice ?? '',
      stock: initialData?.stock || 0,
      minStock: initialData?.minStock || 1,
      controlStock: typeof initialData?.controlStock === 'boolean'
        ? (initialData.controlStock ? 'SIM' : 'NÃO')
        : (initialData?.controlStock || 'SIM'),
      subcategoria_id: initialData?.subcategoria_id || '',
      brand: initialData?.brand || 'PADRAO',
      composition: (() => {
        const rawComp = initialData?.composition || [];
        return rawComp.map((item: any) => {
          const matchedProd = products.find(p => p.id === item.productId);
          return {
            ...item,
            price: matchedProd ? matchedProd.costPrice : (item.price || 0)
          };
        });
      })() as CompositionItem[],
      profit: initialProfit,
      profitPercentage: initialProfitPercentage,
      image: initialData?.image || DEFAULT_IMAGE,
      barcode: initialData?.barcode || '',
      status: initialData?.status || 'Ativo',
      store: 'Loja Principal',
      codigo_mercadologico: initialData?.codigo_mercadologico || '',
      category: initialData?.category || '',
      subgroup: 'PADRAO',
      departamento_id: '',
      validade: initialData?.validade || (() => {
        if (!initialData?.id) return '';
        const productLotes = lotes.filter(l => l.productId === initialData.id);
        if (productLotes.length === 0) return '';
        // Find the lot with the latest expiration date or latest entry date
        const latestLote = [...productLotes].sort((a, b) => {
          if (a.validade && b.validade) {
            return new Date(b.validade).getTime() - new Date(a.validade).getTime();
          }
          const timeB = b.dataEntrada ? new Date(b.dataEntrada).getTime() : 0;
          const timeA = a.dataEntrada ? new Date(a.dataEntrada).getTime() : 0;
          return timeB - timeA;
        })[0];
        return latestLote.validade || '';
      })(),
      product_type: initialData?.product_type || 'SALE',
      base_product_id: initialData?.base_product_id || '',
      conversion_factor: initialData?.conversion_factor || 1,
      gramatura: initialData?.gramatura || '',
      tipo_embalagem: initialData?.tipo_embalagem || '',
      segmento: initialData?.segmento || '',
      section: initialData?.section || '',
    };
  });

  useEffect(() => {
    // Lock body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [formData.image]);

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
        const stock = Number(product.stock) || 0;
        const possible = Math.floor(stock / item.quantity);
        if (possible < minStock) minStock = possible;
      } else {
        minStock = 0;
      }
    });
    return minStock === Infinity ? 0 : minStock;
  }, [formData.composition, products]);

  const calculatedVirtualStock = React.useMemo(() => {
    if (formData.product_type !== 'SALE' || !formData.base_product_id || !formData.conversion_factor) return null;
    
    const baseProduct = products.find(p => p.id === formData.base_product_id);
    if (baseProduct) {
      return Math.floor((Number(baseProduct.stock) || 0) * Number(formData.conversion_factor));
    }
    return 0;
  }, [formData.product_type, formData.base_product_id, formData.conversion_factor, products]);

  const calculatedVirtualCost = React.useMemo(() => {
    if (formData.product_type !== 'SALE' || !formData.base_product_id || !formData.conversion_factor) return null;
    
    const baseProduct = products.find(p => p.id === formData.base_product_id);
    if (baseProduct) {
      const baseCost = (Number(baseProduct.costPrice) || 0);
      const convFactor = Number(formData.conversion_factor) || 1;
      return baseCost / convFactor;
    }
    return 0;
  }, [formData.product_type, formData.base_product_id, formData.conversion_factor, products]);

  const uniqueSegmentos = React.useMemo(() => {
    const segs = new Set<string>();
    departamentos.forEach(d => { 
      if (d.segmento) {
        d.segmento.split(',').forEach(s => segs.add(s.trim().toUpperCase()));
      }
    });
    products.forEach(p => { if (p.segmento) segs.add(p.segmento.trim().toUpperCase()); });
    if (formData.segmento) segs.add(formData.segmento.trim().toUpperCase());
    return Array.from(segs).filter(Boolean).sort();
  }, [departamentos, products, formData.segmento]);

  const uniqueSecoes = React.useMemo(() => {
    const secs = new Set<string>();
    departamentos.forEach(d => { 
      if (d.secao) {
        d.secao.split(',').forEach(s => secs.add(s.trim().toUpperCase()));
      }
    });
    products.forEach(p => { if (p.section) secs.add(p.section.trim().toUpperCase()); });
    if (formData.section) secs.add(formData.section.trim().toUpperCase());
    return Array.from(secs).filter(Boolean).sort();
  }, [departamentos, products, formData.section]);

  const uniqueBrands = React.useMemo(() => {
    const brands = new Set<string>();
    brands.add('PADRAO');
    products.forEach(p => { if (p.brand) brands.add(p.brand.trim().toUpperCase()); });
    if (formData.brand) brands.add(formData.brand.trim().toUpperCase());
    return Array.from(brands).filter(Boolean).sort();
  }, [products, formData.brand]);

  const [categoryId, setCategoryId] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');

  // Sincronizar custo virtual (SALE type) e custo do kit (KIT type) com formData para cálculos de margem
  useEffect(() => {
    let effectiveCost = null;
    
    if (formData.product_type === 'SALE' && calculatedVirtualCost !== null) {
      effectiveCost = calculatedVirtualCost;
    } else if (formData.product_type === 'KIT' && formData.composition && formData.composition.length > 0) {
      effectiveCost = Number((formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0)).toFixed(3));
    }
    
    if (effectiveCost !== null) {
      const currentCost = parseCommaNumber(formData.costPrice);
      
      // Use a small epsilon for floating point comparison
      if (Math.abs(effectiveCost - currentCost) > 0.01) {
        const salePrice = parseCommaNumber(formData.salePrice);
        const profit = Math.round((salePrice - effectiveCost) * 100) / 100;
        
        let profitPercentage = 0;
        if (pricingMethod === 'markup') {
          profitPercentage = effectiveCost > 0 ? (profit / effectiveCost) * 100 : 0;
        } else {
          profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
        }
        
        setFormData(prev => ({
          ...prev,
          costPrice: (effectiveCost as number).toFixed(3).replace('.', ','),
          profit,
          profitPercentage: Math.round(profitPercentage * 100) / 100
        }));
      }
    }
  }, [calculatedVirtualCost, formData.product_type, formData.composition, pricingMethod, formData.salePrice, formData.costPrice]);

  useEffect(() => {
    if (initialData?.id && !formData.validade && lotes.length > 0 && !validadeInitialized.current) {
      const productLotes = lotes.filter(l => l.productId === initialData.id);
      if (productLotes.length > 0) {
        const latestLote = [...productLotes].sort((a, b) => {
          if (a.validade && b.validade) {
            return new Date(b.validade).getTime() - new Date(a.validade).getTime();
          }
          const timeB = b.dataEntrada ? new Date(b.dataEntrada).getTime() : 0;
          const timeA = a.dataEntrada ? new Date(a.dataEntrada).getTime() : 0;
          return timeB - timeA;
        })[0];
        if (latestLote.validade) {
          setFormData(prev => ({ ...prev, validade: latestLote.validade }));
          validadeInitialized.current = true;
        }
      }
    }
  }, [initialData?.id, lotes, formData.validade]);

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

  const displayStock = calculatedKitStock !== null 
    ? calculatedKitStock 
    : (calculatedVirtualStock !== null ? calculatedVirtualStock : formData.stock);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Check if it's a text-like input to apply uppercase
    let finalValue = value;
    const target = e.target as any;
    const isTextLikeInput = (target.tagName === 'INPUT' && (target.type === 'text' || !target.type)) || target.tagName === 'TEXTAREA';
    const shouldAvoidUppercase = ['status', 'id', 'subcategoria_id', 'image', 'base_product_id', 'product_type', 'unit'].includes(name);

    if (isTextLikeInput && !shouldAvoidUppercase) {
      finalValue = value.toUpperCase();
    }

    setFormData(prev => {
      const newState = { ...prev, [name]: finalValue };
      
      // Clear base product info if type is not SALE
      if (name === 'product_type' && value !== 'SALE') {
        newState.base_product_id = '';
        newState.conversion_factor = 1;
      }
      
      return newState;
    });
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
      } else if (e.key === 'F11') {
        e.preventDefault();
        termPriceInputRef.current?.focus();
        termPriceInputRef.current?.select();
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
        setImageError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleStockAdjustment = async () => {
    if (!initialData || adjustmentQty <= 0) {
      setCustomAlert({
        message: 'Informe uma quantidade válida.',
        type: 'warning'
      });
      return;
    }

    setIsAdjusting(true);
    try {
      await addStockMovement({
        companyId: user?.companyId || '',
        productId: initialData.id,
        type: 'AJUSTE',
        quantity: adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty,
        origin: `Ajuste: ${adjustmentReason}${adjustmentNotes ? ` - ${adjustmentNotes}` : ''}`,
        date: new Date().toISOString(),
        userId: user?.email || 'system',
        userName: user?.name || 'Sistema'
      });
      
      setCustomAlert({
        message: 'Ajuste realizado com sucesso!',
        type: 'success'
      });
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
    
    if (!formData.sku || formData.sku.trim() === '') {
      if (setCustomAlert) {
        setCustomAlert({
          type: 'error',
          message: 'Aviso do Sistema: Produto não pode ser salvo: preencha o código de barra!'
        });
      }
      return;
    }
    
    let finalCodigoMercadologico = formData.codigo_mercadologico;
    if (!finalCodigoMercadologico && formData.subcategoria_id) {
      const sub = subcategorias.find(s => s.id === formData.subcategoria_id);
      if (sub) {
        const cat = categorias.find(c => c.id === sub.categoria_id);
        if (cat) {
          const dep = departamentos.find(d => d.id === cat.departamento_id);
          if (dep) {
            finalCodigoMercadologico = `${dep.codigo || ''}.${cat.codigo || ''}.${sub.codigo || ''}`;
          } else {
            finalCodigoMercadologico = `${cat.codigo || ''}.${sub.codigo || ''}`;
          }
        } else {
          finalCodigoMercadologico = sub.codigo || '';
        }
      }
    }

    const parseCommaNumber = (val: string | number | undefined): number => {
      if (val === undefined || val === null || val === '') return 0;
      const str = String(val).replace(/\s/g, '').replace(',', '.');
      const num = Number(str);
      return isNaN(num) ? 0 : num;
    };

    const finalData = {
      ...formData,
      codigo_mercadologico: finalCodigoMercadologico,
      stock: displayStock,
      costPrice: calculatedVirtualCost !== null ? calculatedVirtualCost : parseCommaNumber(formData.costPrice),
      salePrice: parseCommaNumber(formData.salePrice),
      termPrice: parseCommaNumber(formData.termPrice),
      wholesalePrice: parseCommaNumber(formData.wholesalePrice),
      clubPrice: parseCommaNumber(formData.clubPrice),
      profit: parseCommaNumber(formData.profit),
      profitPercentage: parseCommaNumber(formData.profitPercentage)
    };
    onSave(finalData);
  };

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLFormElement | HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      
      // Allow default behavior for textareas and buttons
      if (target.tagName === 'TEXTAREA') {
        return;
      }
      if (target.tagName === 'BUTTON') {
        (target as HTMLButtonElement).click();
        return;
      }

      // Check if it's the search input inside composition/kits
      if (target instanceof HTMLInputElement && target.placeholder && target.placeholder.toLowerCase().includes('buscar')) {
        return; // Let the user search, don't submit/save the whole form
      }
      
      // If we are in the main form, allow the Enter key to naturally submit and save the form
      if (e.currentTarget.tagName === 'FORM') {
        return;
      }

      // Otherwise, if we are in a sub-modal (like composition), simulate clicking the save button
      e.preventDefault();
      const saveKitButton = e.currentTarget.querySelector('button[className*="bg-brand-blue-hover"]') as HTMLButtonElement;
      if (saveKitButton) {
        saveKitButton.click();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-0 md:p-4 lg:p-6 overflow-hidden transition-all duration-300">
      <div className="bg-white w-full h-full md:max-w-7xl md:h-[90vh] md:rounded-[32px] md:border md:border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-white px-6 md:px-8 py-5 flex justify-between items-center border-b border-slate-100/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner flex-shrink-0">
              <Package size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-sans font-black text-slate-800 tracking-tight uppercase italic flex flex-wrap items-center gap-2">
                {initialData ? 'Edição de Produto' : 'Novo Produto'}
                {initialData && (
                  <span className="bg-brand-blue/10 text-brand-blue font-bold px-2.5 py-0.5 rounded-full text-[10px] tracking-widest uppercase italic border border-brand-blue/20">
                    SKU: {formData.sku || initialData.sku || 'N/D'}
                  </span>
                )}
              </h2>
              <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                {initialData ? `Altamente configurável | Editando: ${formData.name || ''}` : 'Painel administrativo de cadastro de produtos'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="bg-slate-100 hover:bg-rose-500 hover:text-white p-2.5 rounded-full text-slate-400 transition-all duration-200 active:scale-95 shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-slate-50/60 px-6 md:px-8 border-b border-slate-100">
          <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'geral', label: 'Dados Gerais', icon: Package },
              { id: 'movimentacoes', label: 'Movimentações', icon: History, hidden: !initialData || !initialData.id },
              { id: 'ajustes', label: 'Ajustes de Estoque', icon: Settings2, hidden: !initialData || !initialData.id },
              { id: 'inventario', label: 'Inventário', icon: ClipboardList, hidden: !initialData || !initialData.id },
              { id: 'lotes', label: 'Lotes Ativos', icon: Package, hidden: !initialData || !initialData.id },
            ].filter(t => !t.hidden).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setHistoryPage(1);
                }}
                className={cn(
                  "flex items-center gap-2 py-3.5 text-xs font-black uppercase italic tracking-widest transition-all relative active:scale-95 whitespace-nowrap",
                  activeTab === tab.id 
                    ? "text-brand-blue font-bold" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <tab.icon size={14} className={cn("stroke-[2.5]", activeTab === tab.id ? "text-brand-blue" : "text-slate-400")} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {activeTab === 'geral' && (
            <form onSubmit={handleSubmit} onKeyDown={handleEnterAsTab} className="p-6 md:p-8 text-brand-text-main">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
                {/* Left Side - Form Fields */}
                <div className="flex-1 space-y-6 min-w-0 w-full">
                  
                  {/* Card: Identificação */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 hover:border-slate-200/80 transition-all">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-600">
                        <Tag size={14} className="stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest italic">Identificação Básica</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Descrição */}
                      <div className="md:col-span-8">
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Descrição / Nome do Produto:</label>
                        <input 
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Ex: Coca-Cola Lata 350ml"
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm" 
                        />
                      </div>
                      
                      {/* Unidade */}
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Unidade Comercial:</label>
                        <select 
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm cursor-pointer"
                        >
                          <option value="UN">UN (Unidade)</option>
                          <option value="KG">KG (Quilograma)</option>
                          <option value="G">G (Grama)</option>
                          <option value="LT">LT (Litro)</option>
                          <option value="ML">ML (Mililitro)</option>
                          <option value="CX">CX (Caixa)</option>
                          <option value="PC">PC (Peça)</option>
                          <option value="PT">PT (Pacote)</option>
                          <option value="FD">FD (Fardo)</option>
                          <option value="DZ">DZ (Dúzia)</option>
                          <option value="M">M (Metro)</option>
                          <option value="M2">M2 (Metro Quadrado)</option>
                          <option value="M3">M3 (Metro Cúbico)</option>
                          <option value="RL">RL (Rolo)</option>
                          <option value="PR">PR (Par)</option>
                          <option value="BD">BD (Balde)</option>
                          <option value="GL">GL (Galão)</option>
                          <option value="JG">JG (Jogo)</option>
                          <option value="KT">KT (Kit)</option>
                        </select>
                      </div>

                      {/* Código Interno / SKU */}
                      <div className="md:col-span-6">
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest" title="Código interno do sistema (SKU)">Código Interno / EAN:</label>
                        <div className="flex gap-2">
                          <input 
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            placeholder="789..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.preventDefault();
                            }}
                            className="flex-1 min-w-0 bg-slate-50/50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm" 
                          />
                          <button 
                            type="button" 
                            onClick={generateSKU}
                            className="bg-brand-blue hover:bg-brand-blue-hover text-white text-[10px] font-bold px-3 py-2.5 rounded-xl uppercase italic transition-all shadow-md shadow-brand-blue/10 active:scale-95 flex-shrink-0 flex items-center gap-1"
                            title="Gerar SKU Aleatório (F1)"
                          >
                            <RefreshCw size={12} className="stroke-[3]" />
                            <span>Gerar</span>
                          </button>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="md:col-span-6">
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Estado de Venda / Status:</label>
                        <select 
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-black text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm cursor-pointer"
                        >
                          <option value="Ativo">🟢 ATIVO NO PDV / PEDIDO</option>
                          <option value="Inativo">🔴 INATIVO / SUSPENSO</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Card: Classificação Comercial */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 hover:border-slate-200/80 transition-all">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                        <Layers size={14} className="stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest italic">Classificação Comercial</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Departamento */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Departamento:</label>
                        <select 
                          value={departamentoId}
                          onChange={(e) => {
                            setDepartamentoId(e.target.value);
                            setCategoryId('');
                            setFormData(prev => ({ 
                              ...prev, 
                              subcategoria_id: '',
                              codigo_mercadologico: '',
                              category: ''
                            }));
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {departamentos.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.codigo ? `${dept.codigo} - ` : ''}{dept.nome}</option>
                          ))}
                        </select>
                      </div>

                      {/* Categoria */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Categoria:</label>
                        <select 
                          value={categoryId}
                          disabled={!departamentoId}
                          onChange={(e) => {
                            const newCatId = e.target.value;
                            setCategoryId(newCatId);
                            setFormData(prev => {
                              const cat = categorias.find(c => c.id === newCatId);
                              return { 
                                ...prev, 
                                subcategoria_id: '',
                                codigo_mercadologico: '',
                                category: cat ? cat.nome : 'PADRAO'
                              };
                            });
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Selecione...</option>
                          {categorias
                            .filter(cat => !departamentoId || cat.departamento_id === departamentoId)
                            .map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.codigo ? `${cat.codigo} - ` : ''}{cat.nome}</option>
                            ))}
                        </select>
                      </div>

                      {/* Subcategoria */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Subcategoria:</label>
                        <select 
                          name="subcategoria_id"
                          value={formData.subcategoria_id}
                          disabled={!categoryId}
                          onChange={(e) => {
                            handleChange(e);
                            setFormData(prev => ({ ...prev, codigo_mercadologico: '' }));
                          }}
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Selecione...</option>
                          {subcategorias
                            .filter(sub => !categoryId || sub.categoria_id === categoryId)
                            .map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.codigo ? `${sub.codigo} - ` : ''}{sub.nome}</option>
                            ))}
                        </select>
                      </div>

                      {/* Marca */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Marca comercial:</label>
                        <input 
                          list="brands-list"
                          name="brand"
                          value={formData.brand}
                          onChange={handleChange}
                          placeholder="Ex: PADRAO"
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm" 
                        />
                        <datalist id="brands-list">
                          {uniqueBrands.map(brand => (
                            <option key={brand} value={brand} />
                          ))}
                        </datalist>
                      </div>

                      {/* Fornecedor */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Fornecedor principal:</label>
                        <input 
                          list="suppliers-list"
                          name="supplier"
                          value={formData.supplier}
                          onChange={handleChange}
                          placeholder="Ex: Fornecedor PADRAO"
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm" 
                        />
                        <datalist id="suppliers-list">
                          <option value="PADRAO" />
                          {(() => {
                            const uniqueSuppliers = Array.from(new Set([
                              ...suppliers.map(sup => sup.name?.trim().toUpperCase()),
                              ...products.map(p => p.supplier?.trim().toUpperCase())
                            ].filter(Boolean))).sort();
                            return uniqueSuppliers.map(s => (
                              <option key={s} value={s} />
                            ));
                          })()}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  {/* Card: Especificações de Embalagem e Logística */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 hover:border-slate-200/80 transition-all">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                        <Box size={14} className="stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest italic">Especificações Físicas e Logística</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Gramatura */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Gramatura / Volume:</label>
                        <input 
                          name="gramatura"
                          value={formData.gramatura}
                          onChange={handleChange}
                          placeholder="Ex: 500g, 1kg, 200ml"
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm" 
                        />
                      </div>

                      {/* Tipo de Embalagem */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Tipo de Embalagem:</label>
                        <input 
                          name="tipo_embalagem"
                          value={formData.tipo_embalagem}
                          onChange={handleChange}
                          placeholder="Ex: Lata, Plástico, Vidro"
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm" 
                        />
                      </div>

                      {/* Seção */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Seção / Corredor:</label>
                        <input 
                          list="secoes-list"
                          name="section"
                          value={formData.section || ''}
                          onChange={handleChange}
                          placeholder="Ex: Frios"
                          className="w-full bg-slate-50/50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all duration-200 shadow-sm transition-all" 
                        />
                        <datalist id="secoes-list">
                          {uniqueSecoes.map(sec => (
                            <option key={sec} value={sec} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  {/* Card: Preçário e Margem Financeira */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 hover:border-slate-200/80 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                          <DollarSign size={14} className="stroke-[2.5]" />
                        </div>
                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest italic">Preçário e Margens Financeiras</h4>
                      </div>

                      {/* MKP vs MRG Selection Slider Pill */}
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          disabled={!pricingSettings.allowEditOnProduct}
                          onClick={() => {
                            const costPrice = parseCommaNumber(formData.costPrice);
                            const salePrice = parseCommaNumber(formData.salePrice);
                            const profit = Math.round((salePrice - costPrice) * 100) / 100;
                            const newProfitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                            setPricingMethod('markup');
                            setFormData(prev => ({ ...prev, profitPercentage: Math.round(newProfitPercentage * 100) / 100, profit }));
                          }}
                          className={cn(
                            "px-3 py-1 text-[10px] font-black uppercase italic rounded-lg transition-all",
                            pricingMethod === 'markup' 
                              ? "bg-white text-brand-blue shadow-sm shadow-slate-200" 
                              : "text-slate-400 hover:text-slate-600",
                            !pricingSettings.allowEditOnProduct && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          Markup (MKP)
                        </button>
                        <button
                          type="button"
                          disabled={!pricingSettings.allowEditOnProduct}
                          onClick={() => {
                            const costPrice = parseCommaNumber(formData.costPrice);
                            const salePrice = parseCommaNumber(formData.salePrice);
                            const profit = Math.round((salePrice - costPrice) * 100) / 100;
                            const newProfitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                            setPricingMethod('margin');
                            setFormData(prev => ({ ...prev, profitPercentage: Math.round(newProfitPercentage * 100) / 100, profit }));
                          }}
                          className={cn(
                            "px-3 py-1 text-[10px] font-black uppercase italic rounded-lg transition-all",
                            pricingMethod === 'margin' 
                              ? "bg-white text-brand-blue shadow-sm shadow-slate-200" 
                              : "text-slate-400 hover:text-slate-600",
                            !pricingSettings.allowEditOnProduct && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          Margem (MRG)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Sub-Grids of main Pricing Strategy */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        {/* Custo */}
                        <div>
                          <label className="block text-[9px] font-black mb-1 uppercase text-slate-400 tracking-wider">Custo Unitário:</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                            <input 
                              type="text"
                              inputMode="decimal"
                              name="costPrice"
                              value={calculatedVirtualCost !== null ? calculatedVirtualCost.toFixed(3).replace('.', ',') : ((formData.costPrice as any) === '' ? '' : formData.costPrice.toString().replace('.', ','))}
                              readOnly={calculatedKitStock !== null || calculatedVirtualCost !== null}
                              onChange={(e) => {
                                const val = e.target.value.replace('.', ',');
                                const normalized = val.replace(',', '.');
                                const costPrice = normalized === '' ? 0 : Number(normalized);
                                let profitPercentage = parseCommaNumber(formData.profitPercentage);
                                let salePrice = 0;

                                if (pricingMethod === 'markup') {
                                  salePrice = costPrice * (1 + (profitPercentage / 100));
                                } else {
                                  const margin = profitPercentage >= 100 ? 99.99 : profitPercentage;
                                  salePrice = costPrice / (1 - (margin / 100));
                                }
                                
                                salePrice = roundPrice(salePrice);
                                const profit = Math.round((salePrice - costPrice) * 100) / 100;
                                
                                let finalProfitPercentage = profitPercentage;
                                if (costPrice > 0) {
                                  if (pricingMethod === 'markup') {
                                    finalProfitPercentage = (profit / costPrice) * 100;
                                  } else {
                                    finalProfitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                                  }
                                }

                                if (normalized === '' || !isNaN(Number(normalized))) {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    costPrice: normalized, 
                                    salePrice, 
                                    profit, 
                                    profitPercentage: Math.round(finalProfitPercentage * 100) / 100 
                                  }));
                                }
                              }}
                              onBlur={() => {
                                const currentVal = formData.costPrice;
                                if (currentVal !== '') {
                                  const parsed = Number(String(currentVal).replace(',', '.'));
                                  if (!isNaN(parsed)) {
                                    setFormData(prev => ({
                                      ...prev,
                                      costPrice: parsed.toFixed(3).replace('.', ',')
                                    }));
                                  }
                                }
                              }}
                              className="w-full bg-white border border-slate-200/80 pl-8 pr-3 py-2 rounded-xl text-sm font-black text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all shadow-xs" 
                            />
                          </div>
                        </div>

                        {/* Lucro R$ */}
                        <div>
                          <label className="block text-[9px] font-black mb-1 uppercase text-slate-400 tracking-wider">Lucro Líquido:</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                            <input 
                              type="text"
                              inputMode="decimal"
                              name="profit"
                              value={(formData.profit as any) === '' ? '' : formData.profit.toString().replace('.', ',')}
                              onChange={(e) => {
                                const val = e.target.value.replace('.', ',');
                                const normalized = val.replace(',', '.');
                                const profit = normalized === '' ? 0 : Number(normalized);
                                const costPrice = parseCommaNumber(formData.costPrice);
                                const salePrice = costPrice + profit;
                                let profitPercentage = 0;
                                if (pricingMethod === 'markup') {
                                  profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                                } else {
                                  profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                                }
                                if (normalized === '' || !isNaN(Number(normalized))) {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    profit: normalized, 
                                    salePrice, 
                                    profitPercentage: Math.round(profitPercentage * 100) / 100 
                                  }));
                                }
                              }}
                              className="w-full bg-white border border-slate-200/80 pl-8 pr-3 py-2 rounded-xl text-sm font-black text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all shadow-xs" 
                            />
                          </div>
                        </div>

                        {/* Lucro % (MKP/MRG) */}
                        <div>
                          <label className="block text-[9px] font-black mb-1 uppercase text-slate-400 tracking-wider">
                            Coeficiente ({(pricingMethod === 'markup' ? 'MKP' : 'MRG')}):
                          </label>
                          <div className="relative">
                            <input 
                              type="text"
                              inputMode="decimal"
                              name="profitPercentage"
                              value={(formData.profitPercentage as any) === '' ? '' : formData.profitPercentage.toString().replace('.', ',')}
                              readOnly={!pricingSettings.allowEditOnProduct}
                              onChange={(e) => {
                                const val = e.target.value.replace('.', ',');
                                const normalized = val.replace(',', '.');
                                const profitPercentage = normalized === '' ? 0 : Number(normalized);
                                const costPrice = parseCommaNumber(formData.costPrice);
                                let salePrice = 0;
                                if (pricingMethod === 'markup') {
                                  salePrice = costPrice * (1 + (profitPercentage / 100));
                                } else {
                                  const margin = profitPercentage >= 100 ? 99.99 : profitPercentage;
                                  salePrice = costPrice / (1 - (margin / 100));
                                }
                                salePrice = roundPrice(salePrice);
                                const profit = Math.round((salePrice - costPrice) * 100) / 100;
                                if (normalized === '' || !isNaN(Number(normalized))) {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    profitPercentage: normalized, 
                                    salePrice, 
                                    profit 
                                  }));
                                }
                              }}
                              className={cn(
                                "w-full border border-slate-200/80 px-3 py-2 rounded-xl text-sm font-black text-center outline-none transition-all pr-7 shadow-xs",
                                pricingSettings.allowEditOnProduct 
                                  ? "bg-white text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5" 
                                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                              )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">%</span>
                          </div>
                        </div>

                        {/* Venda principal */}
                        <div className="bg-emerald-50 border border-emerald-200/60 p-1.5 rounded-xl">
                          <label className="block text-[8px] font-black uppercase text-emerald-600 tracking-wider mb-0.5 ml-1">Preço Venda (PDV):</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xs">R$</span>
                            <input 
                              type="text"
                              inputMode="decimal"
                              name="salePrice"
                              value={(formData.salePrice as any) === '' ? '' : formData.salePrice.toString().replace('.', ',')}
                              readOnly={!pricingSettings.allowEditOnProduct}
                              onChange={(e) => {
                                const val = e.target.value.replace('.', ',');
                                const normalized = val.replace(',', '.');
                                const salePrice = normalized === '' ? 0 : Number(normalized);
                                const costPrice = parseCommaNumber(formData.costPrice);
                                const profit = Math.round((salePrice - costPrice) * 100) / 100;
                                let profitPercentage = 0;
                                if (pricingMethod === 'markup') {
                                  profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                                } else {
                                  profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                                }
                                if (normalized === '' || !isNaN(Number(normalized))) {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    salePrice: normalized, 
                                    profit, 
                                    profitPercentage: Math.round(profitPercentage * 100) / 100 
                                  }));
                                }
                              }}
                              className={cn(
                                "w-full border-0 px-2 pl-7.5 py-1.5 rounded-lg text-sm font-black text-center outline-none transition-all",
                                pricingSettings.allowEditOnProduct 
                                  ? "bg-white text-emerald-700 shadow-sm focus:ring-2 focus:ring-emerald-400" 
                                  : "bg-amber-100/50 text-slate-400 cursor-not-allowed"
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Outros Preços Adicionais */}
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-dashed border-slate-100 pb-1.5 font-sans">Preços Especiais & Canais Regulados</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Preço 2 */}
                          <div>
                            <label className="block text-[9px] font-black mb-1 uppercase text-slate-400 tracking-wider">Preço Prazo / 2:</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                              <input 
                                ref={termPriceInputRef}
                                type="text"
                                inputMode="decimal"
                                name="termPrice"
                                value={(formData.termPrice as any) === '' ? '' : formData.termPrice.toString().replace('.', ',')}
                                onChange={(e) => {
                                  const val = e.target.value.replace('.', ',');
                                  const normalized = val.replace(',', '.');
                                  if (normalized === '' || !isNaN(Number(normalized))) {
                                    setFormData(prev => ({ ...prev, termPrice: normalized }));
                                  }
                                }}
                                className="w-full bg-slate-50 border border-slate-200/80 pl-8 pr-3 py-2.5 rounded-xl text-sm font-black text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all shadow-xs" 
                              />
                            </div>
                          </div>

                          {/* Preço Atacado */}
                          <div>
                            <label className="block text-[9px] font-black mb-1 uppercase text-slate-400 tracking-wider">Atacado:</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                              <input 
                                type="text"
                                inputMode="decimal"
                                name="wholesalePrice"
                                value={(formData.wholesalePrice as any) === '' ? '' : formData.wholesalePrice.toString().replace('.', ',')}
                                onChange={(e) => {
                                  const val = e.target.value.replace('.', ',');
                                  const normalized = val.replace(',', '.');
                                  if (normalized === '' || !isNaN(Number(normalized))) {
                                    setFormData(prev => ({ ...prev, wholesalePrice: normalized }));
                                  }
                                }}
                                className="w-full bg-slate-50 border border-slate-200/80 pl-8 pr-3 py-2.5 rounded-xl text-sm font-black text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all shadow-xs" 
                              />
                            </div>
                          </div>

                          {/* Qtd Mínima Atacado */}
                          <div>
                            <label className="block text-[9px] font-black mb-1 uppercase text-slate-400 tracking-wider">Qtd Min Atacado:</label>
                            <input 
                              type="number"
                              name="wholesaleMinQty"
                              value={formData.wholesaleMinQty}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({ ...prev, wholesaleMinQty: val === '' ? 0 : Number(val) }));
                              }}
                              placeholder="Ex: 3"
                              className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all shadow-xs" 
                            />
                          </div>

                          {/* Clube */}
                          <div className="bg-sky-50 border border-sky-100 p-1 rounded-xl">
                            <label className="block text-[8px] font-black uppercase text-sky-600 tracking-wider mb-0.5 ml-1">Preço Clube / VIP:</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-600 font-extrabold text-xs">R$</span>
                              <input 
                                type="text"
                                inputMode="decimal"
                                name="clubPrice"
                                value={(formData.clubPrice as any) === '' ? '' : formData.clubPrice.toString().replace('.', ',')}
                                onChange={(e) => {
                                  const val = e.target.value.replace('.', ',');
                                  const normalized = val.replace(',', '.');
                                  if (normalized === '' || !isNaN(Number(normalized))) {
                                    setFormData(prev => ({ ...prev, clubPrice: normalized }));
                                  }
                                }}
                                className="w-full border-0 px-2 pl-7 py-1.5 rounded-lg text-sm font-black text-center outline-none bg-white text-sky-700 shadow-sm focus:ring-2 focus:ring-sky-400" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card: Gestão de Estoque */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 hover:border-slate-200/80 transition-all">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600">
                        <ClipboardList size={14} className="stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest italic">Estoque e Demais Parâmetros</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Estoque Atual */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Estoque Físico:</label>
                        <input 
                          type="number"
                          name="stock"
                          value={displayStock}
                          onChange={handleChange}
                          readOnly={calculatedKitStock !== null || calculatedVirtualStock !== null}
                          className={cn(
                            "w-full border px-3 py-2.5 rounded-xl text-sm font-black text-center outline-none transition-all shadow-xs",
                            (calculatedKitStock !== null || calculatedVirtualStock !== null) 
                              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
                              : "bg-slate-50 border-slate-200 px-3 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5"
                          )}
                        />
                        {calculatedKitStock !== null && (
                          <span className="inline-block bg-brand-blue/10 text-brand-blue font-bold px-1.5 py-0.5 rounded text-[8px] tracking-widest uppercase italic mt-1.5 text-center w-full">Kit Vinculado</span>
                        )}
                        {calculatedVirtualStock !== null && (
                          <span className="inline-block bg-brand-blue/10 text-brand-blue font-bold px-1.5 py-0.5 rounded text-[8px] tracking-widest uppercase italic mt-1.5 text-center w-full">Virtual (Prod Base)</span>
                        )}
                      </div>

                      {/* Estoque Mínimo */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Estoque Mínimo:</label>
                        <input 
                          type="number"
                          name="minStock"
                          value={formData.minStock}
                          onChange={handleChange}
                          className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-black text-center text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all shadow-xs" 
                        />
                      </div>

                      {/* Controlar Estoque */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Controlar Estoque?</label>
                        <select 
                          name="controlStock"
                          value={formData.controlStock}
                          onChange={handleChange}
                          className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all cursor-pointer shadow-xs"
                        >
                          <option value="SIM">SIM, CONTROLAR</option>
                          <option value="NÃO">NÃO CONTROLAR</option>
                        </select>
                      </div>

                      {/* Validade */}
                      <div>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Data de Validade:</label>
                        <input 
                          type="date"
                          name="validade"
                          value={formData.validade}
                          onChange={handleChange}
                          className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all cursor-pointer shadow-xs" 
                        />
                      </div>
                    </div>

                    {/* Código Mercadológico */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Cód. Mercadológico / Classificação:</label>
                      <input 
                        type="text"
                        name="codigo_mercadologico"
                        value={formData.codigo_mercadologico || ''}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200/80 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-500 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all placeholder-slate-400"
                        placeholder={
                          (() => {
                            if (!formData.subcategoria_id) return 'Código gerado automaticamente';
                            const sub = subcategorias.find(s => s.id === formData.subcategoria_id);
                            if (!sub) return 'Código gerado automaticamente';
                            const cat = categorias.find(c => c.id === sub.categoria_id);
                            if (!cat) return sub.codigo || 'Código gerado automaticamente';
                            const dep = departamentos.find(d => d.id === cat.departamento_id);
                            if (!dep) return `${cat.codigo || ''}.${sub.codigo || ''}`;
                            return `${dep.codigo || ''}.${cat.codigo || ''}.${sub.codigo || ''}`;
                          })()
                        }
                      />
                    </div>
                  </div>

                  {/* Card: Tipo de Venda & Vínculos Complexos */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 hover:border-slate-200/80 transition-all">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                        <Layers size={14} className="stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest italic">Tipo comercial do produto</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Tipo */}
                      <div className={cn(
                        "md:col-span-12",
                        formData.product_type !== 'BASE' && "md:col-span-4"
                      )}>
                        <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Tipo de Item:</label>
                        <select 
                          name="product_type"
                          value={formData.product_type}
                          onChange={handleChange}
                          className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-black text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all cursor-pointer shadow-xs"
                        >
                          <option value="SALE">PRODUTO DE VENDA COLOQUIAL</option>
                          <option value="BASE">PRODUTO BASE (ESTOQUE REAL)</option>
                          <option value="KIT">KIT / COMBO COMPOSTO</option>
                        </select>
                      </div>

                      {formData.product_type === 'SALE' && (
                        <>
                          {/* Produto Base */}
                          <div className="md:col-span-5">
                            <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Vincular Produto Base (Estoque Real):</label>
                            <select 
                              name="base_product_id"
                              value={formData.base_product_id}
                              onChange={handleChange}
                              className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all cursor-pointer shadow-xs"
                            >
                              <option value="">Nenhum (Estoque Direto no Item)</option>
                              {products.filter(p => p.product_type === 'BASE' && p.id !== initialData?.id).map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                              ))}
                              {products.filter(p => p.product_type === 'BASE' && p.id !== initialData?.id).length === 0 && (
                                <option disabled>Nenhum produto base cadastrado</option>
                              )}
                            </select>
                          </div>
                          
                          {/* Fator de conversão */}
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Fator de Conversão:</label>
                            <input 
                              type="number"
                              step="any"
                              name="conversion_factor"
                              disabled={!formData.base_product_id}
                              value={formData.conversion_factor}
                              onChange={handleChange}
                              className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs" 
                              placeholder="Ex: 900"
                            />
                          </div>
                        </>
                      )}

                      {formData.product_type === 'KIT' && (
                        <div className="md:col-span-8">
                          <label className="block text-[10px] font-black mb-1.5 uppercase text-slate-400 tracking-widest">Componentes do Combo:</label>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 flex items-center">
                              {formData.composition.length > 0 ? (
                                <span className="font-extrabold text-brand-blue italic">{formData.composition.length} produtos adicionados ao kit</span>
                              ) : (
                                "Nenhum produto vinculado ainda"
                              )}
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setShowCompositionModal(true)}
                              className="bg-brand-blue hover:bg-brand-blue-hover text-white px-4 py-2.5 rounded-xl shadow-md shadow-brand-blue/10 active:scale-95 flex items-center gap-2 text-xs font-black uppercase italic transition-all"
                            >
                              <Plus size={14} className="stroke-[3]" />
                              Configure Kit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

            <div className="w-full lg:w-56 flex flex-col gap-6">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
                <div 
                  onClick={triggerFileUpload}
                  className="aspect-square bg-slate-50 rounded-[32px] flex items-center justify-center overflow-hidden relative border-4 border-slate-100 shadow-inner cursor-pointer group"
                >
                  {!imageError ? (
                    <Image 
                      src={formData.image} 
                      alt="Preview" 
                      fill
                      className="object-contain p-6 group-hover:scale-110 transition-transform"
                      referrerPolicy="no-referrer"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <ImageIcon size={48} />
                      <span className="text-[10px] font-black uppercase italic">Sem Imagem</span>
                    </div>
                  )}
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
                    onClick={() => {
                      setFormData(prev => ({ ...prev, image: DEFAULT_IMAGE }));
                      setImageError(false);
                    }}
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Histórico de Movimentações</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Visão detalhada do fluxo de entrada, saída e saldo de estoque</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-650 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm active:scale-95">
                    <Download size={13} className="stroke-[2.5]" />
                    Exportar PDF
                  </button>
                </div>
              </div>

              {/* Cards de Estatísticas e Visão Geral */}
              {(() => {
                const productMovements = stockMovements.filter(m => m.productId === initialData?.id);
                
                let totalEntradas = 0;
                let totalSaidas = 0;

                for (const m of productMovements) {
                  const mTypeStr = (m.type || '').toString().toUpperCase().trim();
                  let mModifier = 1;
                  if (['SAIDA', 'SAÍDA', 'VENDA', 'PERDA'].includes(mTypeStr)) {
                    mModifier = -1;
                  }
                  
                  // Calculate net change of stock for this movement
                  const netChange = (m.quantity !== undefined ? m.quantity : 0) * mModifier;
                  
                  if (netChange > 0) {
                    totalEntradas += netChange;
                  } else if (netChange < 0) {
                    totalSaidas += Math.abs(netChange);
                  }
                }

                const currentStock = initialData?.stock ?? 0;
                const minStock = initialData?.minStock ?? 0;
                const minReached = currentStock <= minStock;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Estoque de Segurança */}
                    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:shadow-md hover:border-slate-200/80 transition-all duration-300 relative overflow-hidden">
                      <div className="space-y-1.5 z-10">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Estoque Disponível</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={cn(
                            "text-3xl font-black italic tracking-tighter leading-none shrink-0",
                            currentStock <= 0 ? "text-rose-600" : minReached ? "text-amber-500" : "text-brand-blue"
                          )}>
                            {Number.isInteger(currentStock) ? currentStock : currentStock.toFixed(3)}
                          </span>
                          <span className="text-xs text-slate-400 font-extrabold uppercase">{initialData?.unit || 'UN'}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 block">
                          Mínimo de Segurança: <strong className="font-extrabold">{minStock} {initialData?.unit || 'UN'}</strong>
                        </span>
                      </div>
                      <div className={cn(
                        "p-3.5 rounded-xl border z-10 transition-colors duration-250",
                        currentStock <= 0 ? "bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-100/60" : 
                        minReached ? "bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-100/60" : 
                        "bg-brand-blue/5 border-brand-blue/10 text-brand-blue group-hover:bg-brand-blue/10"
                      )}>
                        <Package size={22} className="stroke-[2.2]" />
                      </div>
                    </div>

                    {/* Card 2: Entradas Acumuladas */}
                    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:shadow-md hover:border-slate-200/80 transition-all duration-300 relative overflow-hidden">
                      <div className="space-y-1.5 z-10">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Total de Entradas</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-emerald-600 italic tracking-tighter leading-none shrink-0">
                            +{Number.isInteger(totalEntradas) ? totalEntradas : totalEntradas.toFixed(3)}
                          </span>
                          <span className="text-xs text-slate-400 font-extrabold uppercase">{initialData?.unit || 'UN'}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
                          Compras e reposições de estoque
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 z-10 group-hover:bg-emerald-100/60 transition-colors duration-250">
                        <ArrowUpRight size={22} className="stroke-[2.5]" />
                      </div>
                    </div>

                    {/* Card 3: Saídas Acumuladas */}
                    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:shadow-md hover:border-slate-200/80 transition-all duration-300 relative overflow-hidden">
                      <div className="space-y-1.5 z-10">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Total de Saídas</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-rose-600 italic tracking-tighter leading-none shrink-0">
                            -{Number.isInteger(totalSaidas) ? totalSaidas : totalSaidas.toFixed(3)}
                          </span>
                          <span className="text-xs text-slate-400 font-extrabold uppercase">{initialData?.unit || 'UN'}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
                          Vendas faturadas e ajustes negativos
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 z-10 group-hover:bg-rose-100/60 transition-colors duration-250">
                        <ArrowDownRight size={22} className="stroke-[2.5]" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#fcfdfe] border-b border-slate-150">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Data/Hora</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Tipo de Transação</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono font-bold">Origem/Histórico</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono text-center">Quantidade</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono text-center">Saldo Resultante</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const filtered = stockMovements
                        .filter(m => m.productId === initialData?.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                      
                      // Calcular os saldos retroativos com precisão absoluta
                      const movementBalances: Record<string, number> = {};
                      let currentBalance = initialData?.stock ?? 0;
                      for (let i = 0; i < filtered.length; i++) {
                        const m = filtered[i];
                        movementBalances[m.id] = currentBalance;
                        
                        const mTypeStr = (m.type || '').toString().toUpperCase().trim();
                        let mModifier = 1;
                        if (['SAIDA', 'SAÍDA', 'VENDA', 'PERDA'].includes(mTypeStr)) {
                          mModifier = -1;
                        }
                        const netChange = (m.quantity !== undefined ? m.quantity : 0) * mModifier;
                        currentBalance -= netChange;
                      }

                      const totalHistoryItems = filtered.length;
                      const paginated = filtered.slice(
                        (historyPage - 1) * itemsPerPage,
                        historyPage * itemsPerPage
                      );

                      return (
                        <>
                          {paginated.map((mov) => {
                            const resBalance = movementBalances[mov.id] ?? 0;
                            
                            const mTypeStr = (mov.type || '').toString().toUpperCase().trim();
                            let mModifier = 1;
                            if (['SAIDA', 'SAÍDA', 'VENDA', 'PERDA'].includes(mTypeStr)) {
                              mModifier = -1;
                            }
                            const netChange = (mov.quantity !== undefined ? mov.quantity : 0) * mModifier;
                            const isPositive = netChange > 0;
                            const isNegValue = netChange < 0;
                            
                            return (
                              <tr key={mov.id} className="hover:bg-slate-50/40 transition-colors group">
                                <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                                  {formatDateTimeBR(mov.date)}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                      mTypeStr === 'ENTRADA' || mTypeStr === 'COMPRA' || mTypeStr === 'DEVOLUÇÃO' || mTypeStr === 'DEVOLUCAO'
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                        : mTypeStr === 'SAÍDA' || mTypeStr === 'SAIDA' || mTypeStr === 'VENDA'
                                        ? "bg-rose-50 text-rose-700 border-rose-100" 
                                        : "bg-amber-50 text-amber-700 border-amber-100"
                                    )}>
                                      {mTypeStr === 'ENTRADA' || mTypeStr === 'COMPRA' || mTypeStr === 'DEVOLUÇÃO' || mTypeStr === 'DEVOLUCAO' ? (
                                        <TrendingUp size={11} className="stroke-[2.5]" />
                                      ) : mTypeStr === 'SAÍDA' || mTypeStr === 'SAIDA' || mTypeStr === 'VENDA' ? (
                                        <TrendingDown size={11} className="stroke-[2.5]" />
                                      ) : (
                                        <RefreshCw size={11} className="stroke-[2.5]" />
                                      )}
                                      {mov.type}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-semibold text-slate-605 max-w-xs truncate" title={mov.origin}>
                                  {mov.origin}
                                </td>
                                <td className={cn(
                                  "px-6 py-4 text-xs font-black text-center whitespace-nowrap",
                                  isPositive ? "text-emerald-600" : isNegValue ? "text-rose-600" : "text-slate-650"
                                )}>
                                  {isPositive ? `+${mov.quantity}` : isNegValue ? `-${mov.quantity}` : mov.quantity}
                                </td>
                                <td className="px-6 py-4 text-xs font-black text-slate-700 text-center bg-slate-50/20 group-hover:bg-slate-50/40 transition-colors">
                                  {Number.isInteger(resBalance) ? resBalance : resBalance.toFixed(3)}
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-400 max-w-[120px] truncate" title={mov.userName || mov.userId}>
                                  {mov.userName || mov.userId}
                                </td>
                              </tr>
                            );
                          })}
                          {totalHistoryItems === 0 && (
                            <tr>
                              <td colSpan={6} className="px-6 py-16 text-center">
                                <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                    <History size={20} />
                                  </div>
                                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mt-1">Sem Histórico de Estoque</h4>
                                  <p className="text-[10px] text-slate-400 uppercase font-block tracking-widest leading-relaxed">
                                    ESTE PRODUTO AINDA NÃO APRESENTOU MOVIMENTAÇÕES DE ESTOQUE REGISTRADAS.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
                {(() => {
                  const filteredCount = stockMovements.filter(m => m.productId === initialData?.id).length;
                  const totalHistoryPages = Math.ceil(filteredCount / itemsPerPage);
                  
                  return (
                    <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                      <p className="text-sm text-slate-500 font-medium">
                        Mostrando {filteredCount > 0 ? (historyPage - 1) * itemsPerPage + 1 : 0} a {Math.min(historyPage * itemsPerPage, filteredCount)} de {filteredCount} movimentações
                      </p>
                      {totalHistoryPages > 1 && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <button 
                              type="button"
                              onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                              disabled={historyPage === 1}
                              className="p-2 text-slate-400 hover:text-brand-blue disabled:opacity-30 transition-colors"
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalHistoryPages }, (_, i) => i + 1)
                                .filter(p => totalHistoryPages <= 5 || Math.abs(p - historyPage) <= 1 || p === 1 || p === totalHistoryPages)
                                .map((p, idx, arr) => (
                                  <React.Fragment key={p}>
                                    {idx > 0 && arr[idx-1] !== p - 1 && <span className="text-slate-300">...</span>}
                                    <button 
                                      type="button"
                                      onClick={() => setHistoryPage(p)}
                                      className={cn(
                                        "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                                        historyPage === p ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" : "text-slate-400 hover:bg-white hover:text-slate-600"
                                      )}
                                    >
                                      {p}
                                    </button>
                                  </React.Fragment>
                                ))}
                            </div>
                            <button 
                              type="button"
                              onClick={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                              disabled={historyPage === totalHistoryPages}
                              className="p-2 text-slate-400 hover:text-brand-blue disabled:opacity-30 transition-colors"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'ajustes' && (
            <div className="p-8 space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Settings2 size={16} className="stroke-[2.5]" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Ajuste Manual de Estoque</h3>
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Configure correções pontuais, avarias ou auditorias físicas de inventário</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Col */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tipo de Ajuste */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Tipo de Ajuste:</label>
                      <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <button 
                          type="button"
                          onClick={() => setAdjustmentType('ENTRADA')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black uppercase italic text-xs transition-all duration-200 cursor-pointer",
                            adjustmentType === 'ENTRADA' 
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15" 
                              : "text-slate-450 hover:text-slate-705"
                          )}
                        >
                          <TrendingUp size={14} className="stroke-[2.5]" />
                          Entrada
                        </button>
                        <button 
                          type="button"
                          onClick={() => setAdjustmentType('SAÍDA')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black uppercase italic text-xs transition-all duration-200 cursor-pointer",
                            adjustmentType === 'SAÍDA' 
                              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/15" 
                              : "text-slate-450 hover:text-rose-600"
                          )}
                        >
                          <TrendingDown size={14} className="stroke-[2.5]" />
                          Saída
                        </button>
                      </div>
                    </div>

                    {/* Quantidade */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3 flex flex-col justify-between">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Quantidade a ser Ajustada:</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdjustmentQty(prev => Math.max(0, prev - 1))}
                          className="w-11 h-11 shrink-0 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-extrabold hover:text-slate-800 transition-colors cursor-pointer active:scale-90"
                        >
                          <Minus size={16} className="stroke-[2.5]" />
                        </button>
                        <input 
                          type="number"
                          min="0"
                          step="any"
                          value={adjustmentQty || ''}
                          onChange={(e) => setAdjustmentQty(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-slate-50/50 border border-slate-200 h-11 rounded-xl text-center text-lg font-black text-slate-800 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() => setAdjustmentQty(prev => prev + 1)}
                          className="w-11 h-11 shrink-0 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-extrabold hover:text-slate-800 transition-colors cursor-pointer active:scale-90"
                        >
                          <Plus size={16} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Motivo do Ajuste */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Motivo do Ajuste:</label>
                    <select 
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full bg-slate-50/60 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all cursor-pointer"
                    >
                      <option value="Correção de Saldo">Correção de Saldo</option>
                      <option value="Avaria / Quebra">Avaria / Quebra</option>
                      <option value="Vencimento">Vencimento</option>
                      <option value="Bonificação">Bonificação</option>
                      <option value="Doação">Doação</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  {/* Observações */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Observações / Detalhes:</label>
                    <textarea 
                      value={adjustmentNotes}
                      onChange={(e) => setAdjustmentNotes(e.target.value)}
                      className="w-full bg-slate-50/60 border border-slate-200 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-750 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all h-28 resize-none placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="Adicione informações adicionais sobre esta alteração manual de estoque..."
                    />
                  </div>

                  {/* Botão de Confirmação */}
                  <button 
                    type="button"
                    onClick={handleStockAdjustment}
                    disabled={isAdjusting || adjustmentQty <= 0}
                    className={cn(
                      "w-full text-white font-black py-4 rounded-2xl uppercase italic tracking-widest shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer",
                      adjustmentType === 'ENTRADA' 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10" 
                        : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/10"
                    )}
                  >
                    {isAdjusting ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />
                        Processando...
                      </>
                    ) : (
                      <>
                        Confirmar Ajuste Manual
                      </>
                    )}
                  </button>
                </div>

                {/* Sidebar Card Col */}
                <div className="space-y-6">
                  {/* Card Resumo do Estoque */}
                  <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <History size={14} className="stroke-[2.5]" />
                      </div>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Previsão Demonstrada</h4>
                    </div>

                    <div className="space-y-4">
                      {/* Saldo Atual */}
                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-150 shadow-inner">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Atual:</span>
                        <span className="text-sm font-black text-slate-700">{displayStock} {initialData?.unit || 'UN'}</span>
                      </div>

                      {/* Transição do Ajuste */}
                      <div className="flex items-center justify-between px-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ajuste</span>
                          <span className={cn(
                            "text-sm font-black",
                            adjustmentType === 'ENTRADA' ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {adjustmentType === 'ENTRADA' ? `+ ${adjustmentQty}` : `- ${adjustmentQty}`} {initialData?.unit || 'UN'}
                          </span>
                        </div>
                        <ArrowRight size={16} className="text-slate-350" />
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resultará</span>
                          <span className={cn(
                            "text-sm font-black",
                            displayStock + (adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty) < 0 ? "text-rose-600" : "text-brand-blue"
                          )}>
                            {displayStock + (adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty)} {initialData?.unit || 'UN'}
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200" />

                      {/* Novo Saldo */}
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] font-black text-slate-550 uppercase tracking-wider">Novo Saldo Projetado:</span>
                        <span className={cn(
                          "text-xl font-black italic tracking-tighter",
                          displayStock + (adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty) < 0 ? "text-rose-600" : "text-brand-blue"
                        )}>
                          {displayStock + (adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty)} {initialData?.unit || 'UN'}
                        </span>
                      </div>
                    </div>

                    {/* Alertas específicos dependendo do saldo projetado */}
                    {(() => {
                      const projected = displayStock + (adjustmentType === 'ENTRADA' ? adjustmentQty : -adjustmentQty);
                      const minStock = initialData?.minStock ?? 0;
                      
                      if (projected < 0) {
                        return (
                          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-2.5 items-start">
                            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase text-rose-700 block tracking-wider leading-none">Saldo Negativo Detectado</span>
                              <p className="text-[9px] text-rose-500 leading-relaxed font-bold uppercase tracking-wide">Atenção! Esta ação deixará o estoque no valor negativo de {projected}. Verifique a consistência.</p>
                            </div>
                          </div>
                        );
                      }
                      
                      if (projected <= minStock) {
                        return (
                          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-2.5 items-start">
                            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5 stroke-[2.5]" />
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider leading-none">Estoque Crítico / Baixo</span>
                              <p className="text-[9px] text-amber-500 leading-relaxed font-bold uppercase tracking-wide">O novo saldo de {projected} estará igual ou abaixo do estoque mínimo definido de {minStock}. Recomenda-se providenciar novas compras.</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl flex gap-2.5 items-start">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-emerald-700 block tracking-wider leading-none">Estoque Saudável</span>
                            <p className="text-[9px] text-emerald-650 leading-relaxed font-bold uppercase tracking-wide">Com o saldo projetado em {projected}, o produto permanecerá com nível de estoque seguro de segurança.</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Informativo Extra */}
                  <div className="bg-slate-50 p-5 rounded-[20px] border border-slate-150 space-y-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none block">Normativa de Auditoria</span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                      Todo ajuste manual gera uma movimentação correspondente no registro histórico que poderá ser consultado a qualquer momento na aba Movimentações com registro automático de data, horário e operador.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventario' && (
            <div className="space-y-6 animate-in fade-in duration-300 text-slate-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <ClipboardList size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Inventário de Estoque</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gestão e Reconciliação de Contagens Físicas</p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleStartInventory}
                  className="bg-brand-blue hover:bg-brand-blue-hover text-white px-6 h-11 rounded-xl font-black uppercase italic text-xs tracking-widest transition-all shadow-md shadow-brand-blue/15 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  Novo Inventário
                </button>
              </div>

              {/* Stats Panel */}
              {(() => {
                const totalAuditorias = inventories.length;
                const concluidas = inventories.filter(inv => inv.status === 'Concluído').length;
                const emAndamento = inventories.length - concluidas;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Auditorias */}
                    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:shadow-md hover:border-slate-200/80 transition-all duration-300 relative overflow-hidden">
                      <div className="space-y-1 z-10">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Total de Auditorias</span>
                        <span className="text-3xl font-black text-slate-800 italic tracking-tighter leading-none block">
                          {totalAuditorias}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
                          Contagens físicas cadastradas
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-slate-500 z-10 group-hover:bg-slate-100 transition-colors duration-250 shadow-inner">
                        <ClipboardList size={20} className="stroke-[2.2]" />
                      </div>
                    </div>

                    {/* Concluídas */}
                    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:shadow-md hover:border-slate-200/80 transition-all duration-300 relative overflow-hidden">
                      <div className="space-y-1 z-10">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Concluídas</span>
                        <span className="text-3xl font-black text-emerald-650 italic tracking-tighter leading-none block font-mono">
                          {concluidas}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600 block uppercase tracking-wide">
                          Estoques atualizados com sucesso
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 z-10 group-hover:bg-emerald-100/60 transition-colors duration-250">
                        <CheckCircle2 size={20} className="stroke-[2.2]" />
                      </div>
                    </div>

                    {/* Em Andamento */}
                    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:shadow-md hover:border-slate-200/80 transition-all duration-300 relative overflow-hidden">
                      <div className="space-y-1 z-10">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Em Andamento</span>
                        <span className="text-3xl font-black text-amber-500 italic tracking-tighter leading-none block font-mono">
                          {emAndamento}
                        </span>
                        <span className="text-[9px] font-bold text-amber-600 block uppercase tracking-wide">
                          Aguardando finalização ou contagem
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50 text-amber-600 z-10 group-hover:bg-amber-100/60 transition-colors duration-250">
                        <RefreshCw size={20} className="stroke-[2.2] animate-spin-[20s]" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Filters */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block leading-none">Filtrar por Data:</label>
                  <input 
                    type="date" 
                    value={inventoryFilter.date}
                    onChange={(e) => setInventoryFilter(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50/60 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block leading-none">Filtrar por Status:</label>
                  <select 
                    value={inventoryFilter.status}
                    onChange={(e) => setInventoryFilter(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-50/60 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-650 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Todos os Status</option>
                    <option value="Concluído">Finalizado (Concluído)</option>
                    <option value="Em Andamento">Em Andamento</option>
                  </select>
                </div>
                <div>
                  {(inventoryFilter.date || inventoryFilter.status) ? (
                    <button 
                      type="button"
                      onClick={() => setInventoryFilter({ date: '', status: '' })}
                      className="w-full h-10 border border-dashed border-rose-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      Limpar Filtros
                    </button>
                  ) : (
                    <div className="text-[10px] text-slate-450 font-semibold px-1 py-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center uppercase tracking-wider whitespace-nowrap">
                      Nenhum filtro ativo no momento
                    </div>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#fcfdfe] border-b border-slate-150">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Nº Ref</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Data do Inventário</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Operador Responsável</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Tipo / Escopo</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Situação</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const filteredList = inventories.filter(inv => {
                          if (inventoryFilter.date && toLocalDateString(inv.date) !== inventoryFilter.date) return false;
                          if (inventoryFilter.status && inv.status !== inventoryFilter.status) return false;
                          return true;
                        });

                        if (filteredList.length > 0) {
                          return filteredList.map((inv, idx) => (
                            <tr key={inv.id} className="hover:bg-slate-50/45 transition-colors group">
                              <td className="px-6 py-4">
                                <span className="text-xs font-mono font-black text-slate-400">#{inventories.length - idx}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-800">{formatDateBR(inv.date)}</span>
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">{inv.location || 'Depósito Principal'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-semibold text-slate-600 block max-w-[150px] truncate" title={inv.responsible || 'Sistema'}>
                                  {inv.responsible || 'Sistema'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  {inv.type || 'Geral'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                  inv.status === 'Concluído' 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                                    : "bg-amber-50 text-amber-700 border-amber-150"
                                )}>
                                  {inv.status === 'Concluído' ? (
                                    <>
                                      <CheckCircle2 size={10} className="stroke-[2.5]" />
                                      Finalizado
                                    </>
                                  ) : (
                                    <>
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                      Em Andamento
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  type="button" 
                                  onClick={handleStartInventory}
                                  className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-all cursor-pointer active:scale-90"
                                  title="Ajustar / Ver Inventário"
                                >
                                  <Settings2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ));
                        }

                        return (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                  <ClipboardList size={20} />
                                </div>
                                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mt-1">Sem Inventários Localizados</h4>
                                <p className="text-[10px] text-slate-400 uppercase font-block tracking-widest leading-relaxed">
                                  {inventories.length > 0 
                                    ? "A busca não retornou resultados com os filtros ativos." 
                                    : "Este produto ainda não possui contagens físicas ou auditorias cadastradas."}
                                </p>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lotes' && (() => {
            const productLotes = lotes.filter(l => l.productId === initialData?.id);
            const totalLotes = productLotes.length;
            const totalSaldo = productLotes.reduce((acc, l) => acc + l.saldoAtual, 0);
            
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);

            const expiredLotesCount = productLotes.filter(l => l.validade && new Date(l.validade) < now).length;
            const criticalLotesCount = productLotes.filter(l => l.validade && new Date(l.validade) >= now && new Date(l.validade) <= thirtyDaysFromNow).length;
            const activeLotesCount = productLotes.filter(l => l.saldoAtual > 0).length;

            const averageCost = productLotes.length > 0
              ? productLotes.reduce((acc, l) => acc + (l.custoUnit || 0), 0) / productLotes.length
              : initialData?.costPrice || 0;

            const isReconciled = totalSaldo === (initialData?.stock || 0);

            return (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Header Section */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner flex-shrink-0">
                    <Package size={22} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Lotes em Estoque</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">
                      Controle inteligente de lotes, validades e rastreamento PEPS (Primeiro que Entra, Primeiro que Sai)
                    </p>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Saldo total em lotes */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Consolidado em Lotes</span>
                      {isReconciled ? (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                          <CheckCircle2 size={10} />
                          CONCILIADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/50" title={`Diferença de ${(initialData?.stock || 0) - totalSaldo} unidades em relação ao cadastro`}>
                          <AlertTriangle size={10} />
                          DIVERGENTE
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-black text-slate-800 italic tracking-tighter leading-none mt-1">
                        {totalSaldo} <span className="text-xs uppercase font-bold not-italic text-slate-400">{initialData?.unit || 'UN'}</span>
                      </p>
                      <span className="text-[9px] text-slate-400 uppercase font-extrabold mt-1.5 block">
                        Estoque Cadastrado: <strong className="text-slate-600">{initialData?.stock || 0} {initialData?.unit || 'UN'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Batches count */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Lotes Ativos</span>
                      <div className="w-5 h-5 rounded bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <Box size={12} className="stroke-[2.5]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-brand-blue italic tracking-tighter leading-none mt-1">
                        {activeLotesCount} <span className="text-xs uppercase font-bold not-italic text-slate-400">ativos</span>
                      </p>
                      <span className="text-[9px] text-slate-400 uppercase font-extrabold mt-1.5 block">
                        Total cadastrado: {totalLotes} lotes
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Expiry Status */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Validades</span>
                      {expiredLotesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/50 animate-pulse">
                          CRÍTICO
                        </span>
                      ) : criticalLotesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/50">
                          ATENÇÃO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                          SEGURO
                        </span>
                      )}
                    </div>
                    <div>
                      {expiredLotesCount > 0 ? (
                        <p className="text-2xl font-black text-rose-600 italic tracking-tighter leading-none mt-1">
                          {expiredLotesCount} <span className="text-xs uppercase font-bold not-italic text-rose-400">vencidos</span>
                        </p>
                      ) : criticalLotesCount > 0 ? (
                        <p className="text-2xl font-black text-amber-600 italic tracking-tighter leading-none mt-1">
                          {criticalLotesCount} <span className="text-xs uppercase font-bold not-italic text-amber-400">em alerta</span>
                        </p>
                      ) : (
                        <p className="text-2xl font-black text-emerald-600 italic tracking-tighter leading-none mt-1">
                          100% <span className="text-xs uppercase font-bold not-italic text-emerald-400">regular</span>
                        </p>
                      )}
                      <span className="text-[9px] text-slate-400 uppercase font-extrabold mt-1.5 block">
                        Monitoramento contínuo
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Average Cost */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Custo Médio Lotes</span>
                      <div className="w-5 h-5 rounded bg-emerald-55 flex items-center justify-center text-emerald-650 bg-emerald-50">
                        <DollarSign size={12} className="stroke-[2.5]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-emerald-600 italic tracking-tighter leading-none mt-1">
                        R$ {averageCost.toFixed(2)}
                      </p>
                      <span className="text-[9px] text-slate-400 uppercase font-extrabold mt-1.5 block">
                        Custo do Cadastro: R$ {initialData?.costPrice?.toFixed(2) || '0,00'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Batches Table Card */}
                <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/65 border-b border-slate-150">
                          <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Lote ID / Fila PEPS</th>
                          <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Data Entrada</th>
                          <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Vencimento / Status</th>
                          <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Valor de Custo</th>
                          <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none text-center">Quantidades (Inicial → Atual)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productLotes.length > 0 ? (
                          productLotes
                            .sort((a, b) => {
                              const tA = a.dataEntrada ? new Date(a.dataEntrada).getTime() : 0;
                              const tB = b.dataEntrada ? new Date(b.dataEntrada).getTime() : 0;
                              return tA - tB;
                            })
                            .map((lote, index) => {
                              const isExpired = lote.validade && new Date(lote.validade) < now;
                              const isCritical = lote.validade && !isExpired && new Date(lote.validade) <= thirtyDaysFromNow;
                              const isPepsNext = index === 0 && lote.saldoAtual > 0;

                              return (
                                <tr key={lote.id} className="hover:bg-slate-50/40 transition-colors group">
                                  <td className="px-8 py-4">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-sm font-black text-slate-700 font-mono tracking-wide">{lote.numeroLote}</span>
                                      {isPepsNext ? (
                                        <span className="inline-flex self-start px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[8px] font-black uppercase tracking-wider rounded-md">
                                          PRÓXIMO A SAIR (PEPS)
                                        </span>
                                      ) : lote.saldoAtual > 0 ? (
                                        <span className="inline-flex self-start px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded-md">
                                          Fila: {index + 1}º
                                        </span>
                                      ) : (
                                        <span className="inline-flex self-start px-2 py-0.5 bg-slate-50 text-slate-355 text-[8px] font-bold text-slate-400 uppercase tracking-wider rounded-md">
                                          Esgotado
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-8 py-4">
                                    <span className="text-xs font-bold text-slate-600 font-mono">{formatDateBR(lote.dataEntrada)}</span>
                                  </td>
                                  <td className="px-8 py-4">
                                    {lote.validade ? (
                                      <div className="flex flex-col gap-1">
                                        <span className={cn(
                                          "text-xs font-black font-mono",
                                          isExpired ? "text-rose-600" : isCritical ? "text-amber-600" : "text-emerald-600"
                                        )}>
                                          {formatDateBR(lote.validade)}
                                        </span>
                                        <span className={cn(
                                          "inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border leading-none",
                                          isExpired 
                                            ? "bg-rose-50 text-rose-600 border-rose-200/50" 
                                            : isCritical 
                                              ? "bg-amber-50 text-amber-600 border-amber-200/50 animate-pulse" 
                                              : "bg-emerald-50 text-emerald-600 border-emerald-200/55"
                                        )}>
                                          <span className={cn("w-1 h-1 rounded-full", isExpired ? "bg-rose-500" : isCritical ? "bg-amber-500" : "bg-emerald-500")} />
                                          {isExpired ? 'Vencido / Descartar' : isCritical ? 'Atenção. Próx. Vencimento' : 'Seguro'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sem Vencimento</span>
                                    )}
                                  </td>
                                  <td className="px-8 py-4">
                                    <span className="text-sm font-black text-emerald-650 font-mono text-emerald-600">
                                      R$ {(lote.custoUnit || 0).toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="px-8 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="text-xs font-bold text-slate-450 font-mono">{lote.quantidadeInicial ?? lote.saldoAtual}</span>
                                      <span className="text-[10px] text-slate-300">→</span>
                                      <span className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-inner border",
                                        lote.saldoAtual > 0 
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                          : "bg-slate-50 text-slate-400 border-slate-150"
                                      )}>
                                        {lote.saldoAtual} {initialData?.unit || 'UN'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-4 text-slate-350">
                                <Package size={40} className="stroke-[1.5] opacity-40" />
                                <p className="text-[10px] font-black uppercase tracking-widest font-mono">
                                  Nenhum registro de lote ativo localizado para este produto
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
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
              <div className="p-6 overflow-y-auto scrollbar-hide flex-1 bg-slate-50/30">
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
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Departamento</label>
                      <select 
                        value={departamentoId}
                        onChange={(e) => {
                          setDepartamentoId(e.target.value);
                          setCategoryId('');
                          setFormData(prev => ({ 
                            ...prev, 
                            subcategoria_id: '',
                            codigo_mercadologico: '',
                            category: ''
                          }));
                        }}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all appearance-none"
                      >
                        <option value="">Selecione...</option>
                        {departamentos.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.codigo ? `${dept.codigo} - ` : ''}{dept.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Categoria</label>
                      <select 
                        value={categoryId}
                        onChange={(e) => {
                          const newCatId = e.target.value;
                          setCategoryId(newCatId);
                          setFormData(prev => {
                            const cat = categorias.find(c => c.id === newCatId);
                            return { 
                              ...prev, 
                              subcategoria_id: '',
                              codigo_mercadologico: '',
                              category: cat ? cat.nome : 'PADRAO'
                            };
                          });
                        }}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all appearance-none"
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
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Subcategoria</label>
                      <select 
                        name="subcategoria_id"
                        value={formData.subcategoria_id}
                        onChange={(e) => {
                          handleChange(e);
                          setFormData(prev => ({ ...prev, codigo_mercadologico: '' }));
                        }}
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all appearance-none"
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
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Segmento</label>
                      <input 
                        list="segmentos-list-quick"
                        name="segmento"
                        value={formData.segmento || ''}
                        onChange={handleChange}
                        placeholder="Ex: Automotivo"
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
                      />
                      <datalist id="segmentos-list-quick">
                        {uniqueSegmentos.map(seg => (
                          <option key={seg} value={seg} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Seção</label>
                      <input 
                        list="secoes-list-quick"
                        name="section"
                        value={formData.section || ''}
                        onChange={handleChange}
                        placeholder="Ex: Frios"
                        className="w-full bg-white border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
                      />
                      <datalist id="secoes-list-quick">
                        {uniqueSecoes.map(sec => (
                          <option key={sec} value={sec} />
                        ))}
                      </datalist>
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
                      <label className="block text-[10px] font-black mb-1 uppercase italic text-brand-text-main/80 tracking-widest">Estoque Calculado</label>
                      <input 
                        type="number" 
                        value={calculatedKitStock !== null ? calculatedKitStock : 0}
                        readOnly
                        className="w-full bg-slate-50 border border-brand-border px-4 py-3 rounded-2xl text-sm font-bold text-brand-text-main/60 outline-none cursor-not-allowed"
                      />
                      <p className="text-[8px] text-brand-blue font-black uppercase italic mt-1">Baseado nos produtos do kit</p>
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
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-brand-border rounded-2xl shadow-xl z-10 max-h-64 overflow-y-auto scrollbar-hide">
                          {products
                            .filter(p => p.id !== initialData?.id)
                            .filter(p => (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm)))
                            .map(product => {
                              const isLowStock = product.stock <= product.minStock;
                              return (
                                <div key={product.id} className="p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 flex justify-between items-center transition-colors">
                                  <div>
                                    <div className="font-bold text-brand-text-main text-xs">{product.name} {product.gramatura && <span className="text-brand-blue-hover/60">({product.gramatura})</span>}</div>
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
                      <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2">
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
                                  <div className="font-bold text-brand-text-main text-xs truncate">{product?.name || 'Item'} {product?.gramatura && <span className="text-brand-blue-hover/60">({product.gramatura})</span>}</div>
                                  {isLowStock && <div className="text-[9px] text-rose-500 font-black uppercase italic">⚠️ Estoque Baixo</div>}
                                </div>
                                <div className="col-span-2 flex justify-center">
                                  <QuantityInput 
                                    value={Number(item.quantity.toFixed(3))}
                                    onChange={(newQty) => {
                                      const newComp = [...formData.composition];
                                      newComp[index] = { ...item, quantity: newQty };
                                      setFormData(prev => ({ ...prev, composition: newComp }));
                                    }}
                                  />
                                </div>
                                <div className="col-span-2 text-right font-bold text-brand-blue/80 text-sm">
                                  R$ {item.price?.toFixed(3)}
                                </div>
                                <div className="col-span-2 text-right font-black text-brand-text-main text-sm">
                                  R$ {((item.price || 0) * item.quantity).toFixed(3)}
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
                          R$ {formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toFixed(3)}
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
                              R$ {formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toFixed(3)}
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
                                    const salePrice = parseCommaNumber(formData.salePrice);
                                    const profit = salePrice - costPrice;
                                    const newProfitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                                    setPricingMethod('markup');
                                    setFormData(prev => ({ ...prev, profitPercentage: newProfitPercentage, costPrice: costPrice.toFixed(3).replace('.', ','), profit }));
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
                                    const salePrice = parseCommaNumber(formData.salePrice);
                                    const profit = salePrice - costPrice;
                                    const newProfitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                                    setPricingMethod('margin');
                                    setFormData(prev => ({ ...prev, profitPercentage: newProfitPercentage, costPrice: costPrice.toFixed(3).replace('.', ','), profit }));
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
                                type="text" 
                                inputMode="decimal"
                                name="profitPercentage"
                                value={(formData.profitPercentage as any) === '' ? '' : formData.profitPercentage.toString().replace('.', ',')}
                                readOnly={!pricingSettings.allowEditOnProduct}
                                onChange={(e) => {
                                  const val = e.target.value.replace('.', ',');
                                  const normalized = val.replace(',', '.');
                                  const profitPercentage = normalized === '' ? 0 : Number(normalized);
                                  const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                  let salePrice = 0;
                                  if (pricingMethod === 'markup') {
                                    salePrice = costPrice * (1 + (profitPercentage / 100));
                                  } else {
                                    const margin = profitPercentage >= 100 ? 99.99 : profitPercentage;
                                    salePrice = costPrice / (1 - (margin / 100));
                                  }
                                  const profit = (salePrice - costPrice);
                                  if (normalized === '' || !isNaN(Number(normalized))) {
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      profitPercentage: normalized, 
                                      salePrice: Math.round(salePrice * 100) / 100, 
                                      profit: Math.round(profit * 100) / 100, 
                                      costPrice: costPrice.toFixed(3).replace('.', ',') 
                                    }));
                                  }
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
                                type="text"
                                inputMode="decimal"
                                name="salePrice"
                                value={(formData.salePrice as any) === '' ? '' : formData.salePrice.toString().replace('.', ',')}
                                readOnly={!pricingSettings.allowEditOnProduct}
                                onChange={(e) => {
                                  const val = e.target.value.replace('.', ',');
                                  const normalized = val.replace(',', '.');
                                  const salePrice = normalized === '' ? 0 : Number(normalized);
                                  const costPrice = formData.composition.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
                                  const profit = (salePrice - costPrice);
                                  let profitPercentage = 0;
                                  if (pricingMethod === 'markup') {
                                    profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0;
                                  } else {
                                    profitPercentage = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                                  }
                                  if (normalized === '' || !isNaN(Number(normalized))) {
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      salePrice: normalized, 
                                      profit: Math.round(profit * 100) / 100, 
                                      profitPercentage: Math.round(profitPercentage * 100) / 100, 
                                      costPrice 
                                    }));
                                  }
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
                      onSave({ ...formData, costPrice, stock: displayStock });
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
