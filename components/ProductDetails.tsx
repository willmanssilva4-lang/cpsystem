'use client';

import React from 'react';
import { 
  X, 
  Package, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ArrowLeftRight,
  ClipboardList,
  Info,
  Calendar,
  User,
  Truck,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Barcode,
  Tag,
  Percent,
  Coins,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Plus,
  Compass,
  Briefcase
} from 'lucide-react';
import { useERP } from '@/lib/context';
import { Product, StockMovement } from '@/lib/types';
import { cn, formatDateTimeBR } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductDetailsProps {
  productId: string;
  onClose: () => void;
}

export function ProductDetails({ productId, onClose }: ProductDetailsProps) {
  const { products, stockMovements, categorias, subcategorias, departamentos, pricingSettings } = useERP();
  
  // Page logs pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  const getCodigoMercadologico = (product: Product) => {
    if (product.codigo_mercadologico) return product.codigo_mercadologico;
    
    // Try subcategoria
    if (product.subcategoria_id) {
        const sub = subcategorias.find(s => String(s.id) === String(product.subcategoria_id));
        if (sub) {
            const cat = categorias.find(c => String(c.id) === String(sub.categoria_id));
            const dep = cat ? departamentos.find(d => String(d.id) === String(cat.departamento_id)) : undefined;
            
            const parts = [dep?.codigo, cat?.codigo, sub?.codigo].filter(p => p !== undefined && p !== null && p !== '');
            if (parts.length > 0) return parts.join('.');
        } else {
             console.log('DEBUG: Subcategoria não encontrada para ID:', product.subcategoria_id, 'Sub Name:', product.name);
        }
    }
    
    // Fallback to category_id
    if (product.category_id) {
        const cat = categorias.find(c => String(c.id) === String(product.category_id));
        const dep = cat ? departamentos.find(d => String(d.id) === String(cat.departamento_id)) : undefined;
        
        const parts = [dep?.codigo, cat?.codigo].filter(p => p !== undefined && p !== null && p !== '');
        if (parts.length > 0) return parts.join('.');
    }
    
    return null;
  };

  // Filter logs by type state
  const [movementTypeFilter, setMovementTypeFilter] = React.useState<'TODOS' | 'ENTRADA' | 'SAÍDA' | 'AJUSTE'>('TODOS');

  // Copy indicator states
  const [copiedBarcode, setCopiedBarcode] = React.useState(false);
  const [copiedSku, setCopiedSku] = React.useState(false);

  const product = products.find(p => p.id === productId);

  // Filter and sort movements
  const movements = React.useMemo(() => {
    return stockMovements
      .filter(m => m.productId === productId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockMovements, productId]);

  const filteredMovements = React.useMemo(() => {
    return movements.filter(m => {
      if (movementTypeFilter === 'TODOS') return true;
      if (movementTypeFilter === 'ENTRADA') return m.type === 'ENTRADA' || m.type === 'COMPRA';
      if (movementTypeFilter === 'SAÍDA') return ['SAÍDA', 'SAIDA', 'VENDA', 'PERDA'].includes((m.type || '').toUpperCase());
      if (movementTypeFilter === 'AJUSTE') return m.type === 'AJUSTE';
      return true;
    });
  }, [movements, movementTypeFilter]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = React.useMemo(() => {
    return filteredMovements.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredMovements, currentPage, itemsPerPage]);

  const kitsUsingThisItem = React.useMemo(() => {
    return products.filter(p => 
      p.product_type === 'KIT' && 
      p.composition?.some(c => c.productId === productId)
    );
  }, [products, productId]);

  const stats = React.useMemo(() => {
    const entries = movements
      .filter(m => m.type === 'ENTRADA' || m.type === 'COMPRA')
      .reduce((acc, m) => acc + m.quantity, 0);
    
    const exits = movements
      .filter(m => {
        const isExit = ['SAÍDA', 'SAIDA', 'VENDA', 'PERDA'].includes((m.type || '').toUpperCase()) || m.quantity < 0;
        if (isExit) console.log(`[DEBUG_STATS] Movement matching exit:`, m);
        return isExit;
      })
      .reduce((acc, m) => acc + Math.abs(m.quantity), 0);

    console.log(`[DEBUG_STATS] Total exits calc for ${product?.name || 'Unknown'}:`, exits, 'from', movements.length, 'movements');

    let calculatedExits = exits;
    
    const adjustments = movements
      .filter(m => m.type === 'AJUSTE')
      .reduce((acc, m) => acc + m.quantity, 0);

    return { entries, exits: calculatedExits, adjustments };
  }, [movements, product]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [movementTypeFilter]);

  if (!product) return null;

  // Commercial Math
  const cost = product.costPrice || 0;
  const sale = product.salePrice || 0;
  const profit = sale - cost;
  const marginPercentage = sale > 0 ? (profit / sale) * 100 : 0;
  const markupPercentage = cost > 0 ? (profit / cost) * 100 : 0;

  // Currency utility helper
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'N/R';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleCopyBarcode = () => {
    if (product.barcode) {
      navigator.clipboard.writeText(product.barcode);
      setCopiedBarcode(true);
      setTimeout(() => setCopiedBarcode(false), 2000);
    }
  };

  const handleCopySku = () => {
    if (product.sku) {
      navigator.clipboard.writeText(product.sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="px-6 md:px-8 py-5 border-b border-slate-200/80 flex items-center justify-between bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/15 flex items-center justify-center text-brand-blue shadow-inner flex-shrink-0 overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package size={22} className="stroke-[2.5]" />
                )}
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2.5">
                  <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase italic tracking-tight leading-none">{product.name}</h2>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border leading-none",
                    product.status === 'Inativo'
                      ? "bg-rose-50 text-rose-600 border-rose-200/50"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200/55"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", product.status === 'Inativo' ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                    {product.status || 'Ativo'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <Briefcase size={12} className="text-slate-400" />
                    <span>Cód. Mercadológico: <strong className="text-slate-650">{getCodigoMercadologico(product) || 'N/A'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <Briefcase size={12} className="text-slate-400" />
                    <span>Categoria: <strong className="text-slate-650">{(() => {
                      const cat = categorias.find(c => c.id === product.category_id) || categorias.find(c => c.nome === product.category);
                      if (cat) return cat.nome;
                      return product.category;
                    })()}</strong></span>
                  </div>
                  {product.brand && product.brand !== 'PADRAO' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <Tag size={12} className="text-slate-400" />
                      <span>Marca: <strong className="text-slate-650">{product.brand}</strong></span>
                    </div>
                  )}
                  {product.section && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-l border-slate-200/60 pl-4 hidden sm:inline-flex">
                      <Compass size={12} className="text-slate-400" />
                      <span>Seção: <strong className="text-slate-650">{product.section}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2.5 bg-slate-50 hover:bg-rose-500 hover:text-white text-slate-405 hover:border-transparent rounded-full transition-all border border-slate-200 shadow-sm active:scale-95 flex items-center justify-center cursor-pointer"
              title="Fechar Detalhes"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrolling Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-8">
            
            {/* Row 1: KPI Bento Grid (Aesthetic High Contrast Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* KPI 1: Estoque Físico Real */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Estoque Físico</span>
                  {product.stock <= 0 ? (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/50">
                      <ShieldAlert size={10} />
                      SEM ESTOQUE
                    </span>
                  ) : product.stock <= (product.minStock || 0) ? (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/50">
                      <ShieldAlert size={10} />
                      BAIXO CONTROLE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                      <CheckCircle2 size={10} />
                      SEGURO
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <p className={cn(
                    "text-3xl font-black italic tracking-tighter leading-none",
                    product.stock <= (product.minStock || 0) ? "text-rose-600" : "text-slate-800"
                  )}>
                    {product.stock} <span className="text-xs uppercase font-bold not-italic">{product.unit || 'UN'}</span>
                  </p>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Mínimo cadastrado</span>
                    <span className="text-xs font-black text-slate-500 font-mono mt-0.5 block leading-none">{product.minStock || 0} {product.unit || 'UN'}</span>
                  </div>
                </div>
                {/* Micro progress bar tracking inventory health */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3.5">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      product.stock <= 0 
                        ? "w-0" 
                        : (product.stock <= (product.minStock || 0) ? "bg-amber-400 w-1/3" : "bg-emerald-500 w-full")
                    )}
                  />
                </div>
              </div>

              {/* KPI 2: Precificação de Venda */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Preço de Venda</span>
                  <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign size={13} className="stroke-[2.5]" />
                  </div>
                </div>
                <p className="text-3xl font-black text-emerald-600 italic tracking-tighter leading-none mt-1">
                  {formatCurrency(product.salePrice)}
                </p>
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-450 uppercase font-bold">
                  <span>Margem Bruta:</span>
                  <span className="text-emerald-600 font-extrabold">{marginPercentage.toFixed(1)}%</span>
                </div>
              </div>

              {/* KPI 3: Precificação de Custo */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Preço de Custo</span>
                  <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Coins size={13} />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-700 italic tracking-tighter leading-none mt-1">
                  {formatCurrency(product.costPrice)}
                </p>
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-450 uppercase font-bold">
                  <span>Markup sobre custo:</span>
                  <span className="text-slate-650 font-extrabold">{markupPercentage.toFixed(1)}%</span>
                </div>
              </div>

              {/* KPI 4: Documentação de Balanço */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">GTIN / Código de Barras</span>
                  <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-650 flex items-center justify-center">
                    <Barcode size={13} />
                  </div>
                </div>
                
                {product.barcode || product.sku ? (
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <p className="text-base font-black text-slate-800 font-mono tracking-wider truncate" title={product.barcode || product.sku}>
                      {product.barcode || product.sku}
                    </p>
                    <button 
                      onClick={handleCopyBarcode}
                      className={cn(
                        "p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-90",
                        copiedBarcode 
                          ? "bg-emerald-500 text-white border-emerald-500" 
                          : "bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-200"
                      )}
                      title="Copiar código de barras"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-black text-slate-350 italic tracking-tight uppercase leading-none mt-1">Sem código cadastrado</p>
                )}

                <div className="flex items-center justify-between mt-3 text-[9px] font-bold text-slate-400 uppercase">
                  <span className="font-mono">SKU ID: {product.sku || 'N/D'}</span>
                  {product.sku && (
                    <button 
                      onClick={handleCopySku} 
                      className={cn(
                        "hover:underline text-[9px] font-black uppercase transition-all cursor-pointer",
                        copiedSku ? "text-emerald-600" : "text-brand-blue"
                      )}
                    >
                      {copiedSku ? 'Copiado!' : 'Copiar SKU'}
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Row 2: Detailed Specs, Composition & Commercial Channels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Side Col Group (6/12 Grid) */}
              <div className="lg:col-span-6 space-y-8">
                
                {/* 1. Pricing Channels Table */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-55 flex items-center justify-center text-emerald-650 bg-emerald-50">
                      <DollarSign size={14} className="stroke-[2.5]" />
                    </div>
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-widest italic">Tabela de Preços Ativos e Canais</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Canal Venda Individual */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Padrão / Prateleira</span>
                      <span className="text-lg font-black text-slate-700 italic mt-1.5 block">{formatCurrency(product.salePrice)}</span>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 block">Venda Balcão / Regular</span>
                    </div>

                    {/* Venda Atacado */}
                    {product.wholesalePrice ? (
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col justify-between">
                        <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">Atacado Diferenciado</span>
                        <span className="text-lg font-black text-indigo-700 italic mt-1.5 block">{formatCurrency(product.wholesalePrice)}</span>
                        <span className="text-[9px] text-indigo-500 font-extrabold uppercase mt-1 block">A partir de {product.wholesaleMinQty || 1} {product.unit || 'UN'}</span>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-200 border-dashed flex flex-col justify-between opacity-60">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Atacado Diferenciado</span>
                        <span className="text-sm font-black text-slate-400 italic mt-1.5 block">Não Cadastrado</span>
                        <span className="text-[9px] text-slate-450 font-extrabold uppercase mt-1 block">Preço geral no atacado</span>
                      </div>
                    )}

                    {/* Preço Cliente Clube */}
                    {product.clubPrice ? (
                      <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col justify-between">
                        <span className="text-[9px] font-black uppercase text-purple-500 tracking-wider">Clube Fidelidade</span>
                        <span className="text-lg font-black text-purple-700 italic mt-1.5 block">{formatCurrency(product.clubPrice)}</span>
                        <span className="text-[9px] text-purple-500 font-extrabold uppercase mt-1 block">Preço exclusivo associados</span>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-200 border-dashed flex flex-col justify-between opacity-60">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Clube Fidelidade</span>
                        <span className="text-sm font-black text-slate-400 italic mt-1.5 block">Não Cadastrado</span>
                        <span className="text-[9px] text-slate-450 font-extrabold uppercase mt-1 block">Sem preço clube</span>
                      </div>
                    )}

                    {/* Preço Parcelado / Cartão */}
                    {product.termPrice ? (
                      <div className="p-4 bg-amber-50/45 rounded-2xl border border-amber-100/70 flex flex-col justify-between">
                        <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">A Prazo / Crediário</span>
                        <span className="text-lg font-black text-amber-700 italic mt-1.5 block">{formatCurrency(product.termPrice)}</span>
                        <span className="text-[9px] text-amber-550 font-extrabold uppercase mt-1 block">Condições de parcelamento</span>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-200 border-dashed flex flex-col justify-between opacity-60">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">A Prazo / Crediário</span>
                        <span className="text-sm font-black text-slate-400 italic mt-1.5 block">Preço Geral de Venda</span>
                        <span className="text-[9px] text-slate-450 font-extrabold uppercase mt-1 block">Sem taxa parcelamento</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Rentabilidade Comercial Card */}
                <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Percent size={14} className="stroke-[2.5]" />
                      </div>
                      <h3 className="text-xs font-black uppercase text-slate-705 tracking-widest italic animate-pulse">Lucratividade de Venda</h3>
                    </div>
                    <span className="text-[8px] font-black tracking-widest uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-md shadow-sm">
                      {pricingSettings.defaultMethod === 'margin' ? 'MARGEM SAUDÁVEL' : 'MARKUP SAUDÁVEL'}: {pricingSettings.defaultMethod === 'margin' ? (pricingSettings.defaultMargin || 0) : (pricingSettings.defaultMarkup || 0)}%
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-xl border border-slate-150 shadow-inner">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none">Lucro Bruto Caixa</span>
                        <span className="text-xl font-black text-emerald-600 italic block mt-2.5 leading-none">+{formatCurrency(profit)}</span>
                        <span className="text-[8px] text-slate-400 uppercase font-extrabold mt-1.5 block leading-none">Retorno líq por unidade</span>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-slate-150 shadow-inner">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none">Markup Operacional</span>
                        <span className="text-xl font-black text-emerald-600 italic block mt-2.5 leading-none">+{markupPercentage.toFixed(1)}%</span>
                        <span className="text-[8px] text-slate-400 uppercase font-extrabold mt-1.5 block leading-none font-mono">Margem sobre custo</span>
                      </div>
                    </div>

                    {/* Contribution visual progress slider */}
                    <div className="space-y-2.5 bg-white p-4.5 rounded-xl border border-slate-150">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Margem de Contribuição Relativa</span>
                        <span className="text-xs font-black text-brand-blue font-mono">{marginPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex border border-slate-200">
                        {/* Cost width */}
                        <div 
                          className="bg-slate-300 h-full transition-all duration-500" 
                          style={{ width: `${100 - marginPercentage}%` }} 
                        />
                        {/* Profit width */}
                        <div 
                          className="bg-emerald-505 bg-emerald-500 h-full transition-all duration-500" 
                          style={{ width: `${marginPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-wider">
                        <span>Custo Real ({(100 - marginPercentage).toFixed(1)}%)</span>
                        <span>Rentabilidade ({marginPercentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Logística e Fornecimento */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Truck size={14} />
                    </div>
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-widest italic">Parâmetros de Abastecimento</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Fornecedor Preferencial</span>
                      <span className="text-xs font-black text-slate-650 uppercase italic mt-1.5 block truncate">
                        {product.supplier || 'Nenhum fornecedor registrado'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Fator de Conversão</span>
                      {product.conversion_factor && product.conversion_factor !== 1 ? (
                        <span className="text-xs font-black text-slate-650 uppercase italic mt-1.5 block flex items-center gap-1">
                          <ArrowLeftRight size={12} className="text-slate-400" />
                          1 {product.unit || 'UN'} = {product.conversion_factor} {product.unit === 'UN' ? 'g/ml' : 'UN'}
                        </span>
                      ) : (
                        <span className="text-xs font-black text-slate-400 uppercase italic mt-1.5 block">Nenhum fator aplicado</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Side Col Group (6/12 Grid) */}
              <div className="lg:col-span-6 space-y-8">
                
                {/* 1. Technical specifications of product */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                      <Layers size={14} />
                    </div>
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-widest italic">Ficha Técnica e Especificações</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Marca Comercial</span>
                      <span className="text-xs font-black text-slate-650 uppercase italic mt-1.5 block">
                        {(product.brand && product.brand !== 'PADRAO') ? product.brand : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Gramatura / Densidade</span>
                      <span className="text-xs font-black text-slate-650 uppercase italic mt-1.5 block">
                        {product.gramatura || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Tipo de Embalagem</span>
                      <span className="text-xs font-black text-slate-650 uppercase italic mt-1.5 block">
                        {product.tipo_embalagem || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Tipo Geral de Produto</span>
                      <span className="text-xs font-black text-brand-blue uppercase italic mt-1.5 block">
                        {product.product_type === 'KIT' ? 'KIT de Produtos' : 
                         product.product_type === 'BASE' ? 'Insumo de Base' : 'Produto de Venda Direta'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Unidade de Medida</span>
                      <span className="text-xs font-black text-slate-650 uppercase italic mt-1.5 block font-mono">
                        {product.unit || 'UN'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Composition (if product is a KIT) */}
                {product.product_type === 'KIT' && product.composition && product.composition.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                        <Layers size={14} className="stroke-[2.5]" />
                      </div>
                      <h3 className="text-xs font-black uppercase text-slate-700 tracking-widest italic">
                        Itens Componentes deste KIT ({product.composition.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-[295px] overflow-y-auto custom-scrollbar pr-1">
                      {product.composition.map((item, idx) => {
                        const compProd = products.find(p => p.id === item.productId);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                <Package size={13} />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-slate-700 uppercase italic truncate block">{compProd?.name || 'Inexistente / Excluído'}</span>
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">
                                  SKU: {compProd?.sku || 'N/D'} • Qtd: {item.quantity} {compProd?.unit || 'UN'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-650 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                              Custo de Compra: {formatCurrency((compProd ? compProd.costPrice : (item.price || 0)) * item.quantity)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Kits using this item (if product is standard/base and forms kit) */}
                {product.product_type !== 'KIT' && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-7 h-7 rounded-lg bg-pink-51 bg-pink-50 text-pink-600 flex items-center justify-center">
                        <Layers size={14} />
                      </div>
                      <h3 className="text-xs font-black uppercase text-slate-700 tracking-widest italic">Utilizado nas Composições</h3>
                    </div>

                    {kitsUsingThisItem.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5 max-h-[195px] overflow-y-auto custom-scrollbar pr-1">
                        {kitsUsingThisItem.map(kit => (
                          <div 
                            key={kit.id} 
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded bg-white border border-slate-250 flex items-center justify-center text-slate-400">
                                <Package size={12} />
                              </div>
                              <span className="text-xs font-black text-slate-650 uppercase italic">{kit.name}</span>
                            </div>
                            <span className="text-[9px] font-black text-brand-blue bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              SKU: {kit.sku}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                        <Layers size={22} className="mx-auto text-slate-300 opacity-40 mb-2" />
                        <span className="text-[10px] font-black tracking-wider uppercase">Este item não integra nenhuma composição de KIT</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Historic Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Total Entradas</span>
                    <span className="text-[15px] font-black text-emerald-550 block mt-2 leading-none font-mono">+{stats.entries}</span>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Total Saídas</span>
                    <span className="text-[15px] font-black text-rose-550 block mt-2 leading-none font-mono">-{stats.exits}</span>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Ajustes Realizados</span>
                    <span className="text-[15px] font-black text-indigo-550 block mt-2 leading-none font-mono">
                      {stats.adjustments > 0 ? `+${stats.adjustments}` : stats.adjustments}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Row 3: Product Movement Logs with Filter tabs */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue flex-shrink-0">
                    <History size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-700 uppercase italic">Histórico de Movimentação Cronológica</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Registro de todas as mutações de saldo</p>
                  </div>
                </div>

                {/* Filter logs by type (ENTRADA, SAIDA, AJUSTE, TODOS) */}
                <div className="flex flex-wrap bg-slate-50 p-1 rounded-xl border border-slate-150">
                  {(['TODOS', 'ENTRADA', 'SAÍDA', 'AJUSTE'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMovementTypeFilter(type)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer",
                        movementTypeFilter === type 
                          ? "bg-white text-brand-blue shadow-sm" 
                          : "text-slate-400 hover:text-slate-650"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Wrapper */}
              <div className="overflow-x-auto bg-slate-50/50 rounded-2xl border border-slate-200/60 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/80 border-b border-slate-200">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data / Registro</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operação</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Origem / Referência</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Quantidade</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {paginatedMovements.length > 0 ? (
                      paginatedMovements.map((mov) => (
                        <tr key={mov.id} className="hover:bg-white transition-all group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <Calendar size={12} className="text-slate-400" />
                              <span className="text-xs font-bold text-slate-500 font-mono">{formatDateTimeBR(mov.date)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border",
                              mov.type === 'ENTRADA' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                              mov.type === 'COMPRA' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : 
                              ['SAÍDA', 'SAIDA', 'VENDA', 'PERDA'].includes((mov.type || '').toUpperCase()) ? "bg-rose-50 text-rose-600 border-rose-100" : 
                              "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                              {mov.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-black text-slate-650 uppercase italic tracking-tight">{mov.origin}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {(() => {
                              const isExit = ['SAÍDA', 'SAIDA', 'VENDA', 'PERDA'].includes((mov.type || '').toUpperCase()) || mov.quantity < 0;
                              const absQty = Math.abs(mov.quantity);
                              return (
                                <span className={cn(
                                  "text-xs font-black italic font-mono",
                                  !isExit ? "text-emerald-500" : "text-rose-550"
                                )}>
                                  {!isExit ? `+${absQty}` : `-${absQty}`} {product.unit || 'UN'}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 text-slate-400">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest">{mov.userName || mov.userId || 'Sistema'}</span>
                              <User size={12} />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-300">
                            <ClipboardList size={38} className="opacity-40 text-slate-400" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                              Sem registros de movimentações com esta classificação
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border border-slate-100 bg-slate-50/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                    Visualizando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredMovements.length)} de {filteredMovements.length} logs
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-xl border border-slate-250 text-slate-400 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all font-black uppercase italic text-[9px] flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={12} className="stroke-[2.5]" />
                      Anterior
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalPages <= 5) return true;
                          return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                        })
                        .map((page, idx, arr) => (
                          <React.Fragment key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="text-slate-300 px-1 font-bold text-xs">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-7 h-7 rounded-lg text-[10px] font-black transition-all border font-mono cursor-pointer flex items-center justify-center",
                                currentPage === page 
                                  ? "bg-brand-blue text-white border-brand-blue shadow-md" 
                                  : "text-slate-400 hover:bg-slate-50 border-slate-200 bg-white"
                              )}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-xl border border-slate-250 text-slate-400 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all font-black uppercase italic text-[9px] flex items-center gap-1 cursor-pointer"
                    >
                      Próximo
                      <ChevronRight size={12} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Footer of modal */}
          <div className="px-6 md:px-8 py-5 border-t border-slate-200 bg-white flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-850 hover:bg-slate-900 bg-slate-800 text-white text-[10px] font-black uppercase italic tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
