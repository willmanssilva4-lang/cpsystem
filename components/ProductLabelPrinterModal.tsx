'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useERP } from '@/lib/context';
import { 
  X, Printer, Plus, Minus, Trash2, Tag, Barcode, 
  Settings, Grid, Layout, Check, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to clean text for standard Code 39 barcode compatibility
function cleanCode39Text(text: string): string {
  if (!text) return '';
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^0-9A-Z\-\.\s\$\/\+\%]/g, ''); // keep only Code 39 compatible characters
}

// Custom 100% vector SVG Code 39 Barcode Generator (Offline, DPI-independent)
export function Code39BarcodeSVG({ value, className }: { value: string; className?: string }) {
  const cleaned = cleanCode39Text(value);
  if (!cleaned) return <div className="text-[10px] text-rose-500 italic">Cód. Inválido</div>;

  const fullText = `*${cleaned}*`;
  
  // Standard Code 39 encoding map (N = narrow, W = wide)
  const charPatterns: Record<string, string> = {
    '0': 'NNNWWNWNN', '1': 'WNNWNNNNW', '2': 'NNWWNNNNW', '3': 'WNWWNNNNN',
    '4': 'NNNWNNNWW', '5': 'WNNWNNNWN', '6': 'NNWWNNNWN', '7': 'NNNWNNWNW',
    '8': 'WNNWNNWNN', '9': 'NNWWNNWNN', 'A': 'WNNNNWNNW', 'B': 'NNWNNWNNW',
    'C': 'WNWNNWNNN', 'D': 'NNNNWWNNW', 'E': 'WNNNWWNNN', 'F': 'NNWNWWNNN',
    'G': 'NNNNNWNWW', 'H': 'WNNNNWNWN', 'I': 'NNWNNWNWN', 'J': 'NNNNWWNWN',
    'K': 'WNNNNNNWW', 'L': 'NNWNNNNWW', 'M': 'WNWNNNNWN', 'N': 'NNNNWNNWW',
    'O': 'WNNNWNNWN', 'P': 'NNWNWNNWN', 'Q': 'NNNNNNWWW', 'R': 'WNNNNNWWN',
    'S': 'NNWNNNWWN', 'T': 'NNNNWNWWN', 'U': 'WWNNNNNNW', 'V': 'NWWNNNNNW',
    'W': 'WWWNNNNNN', 'X': 'NWNNWNNNW', 'Y': 'WWNNWNNNN', 'Z': 'NWWNWNNNN',
    '-': 'NWNNNNWNW', '.': 'WWNNNNWNN', ' ': 'NWWNNNWNN', '*': 'NWNNWNWNN',
    '$': 'NWNWNWNNN', '/': 'NWNWNNNWN', '+': 'NWNNNWNWN', '%': 'NNNWNWNWN'
  };

  let bars = '';
  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const pattern = charPatterns[char] || charPatterns[' ']; // fallback to space
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const sizeType = pattern[j];
      const width = sizeType === 'W' ? 3 : 1;
      bars += isBar ? `B${width}` : `W${width}`;
    }
    // Add inter-character narrow space
    if (i < fullText.length - 1) {
      bars += 'W1';
    }
  }

  let currentX = 0;
  const rects: React.ReactNode[] = [];
  const regex = /([BW])(\d+(\.\d+)?)/g;
  let match;
  let keyIdx = 0;
  
  while ((match = regex.exec(bars)) !== null) {
    const type = match[1];
    const width = parseFloat(match[2]);
    if (type === 'B') {
      rects.push(
        <rect 
          key={keyIdx++} 
          x={currentX} 
          y={0} 
          width={width} 
          height={50} 
          fill="black" 
        />
      );
    }
    currentX += width;
  }

  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      <svg 
        viewBox={`0 0 ${currentX} 50`} 
        className="w-full h-10 md:h-12" 
        preserveAspectRatio="none"
      >
        {rects}
      </svg>
      <span className="text-[9px] font-mono tracking-[0.2em] mt-0.5 text-black font-semibold uppercase">
        {cleaned}
      </span>
    </div>
  );
}

interface LabelPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedProductIds?: string[];
}

export default function ProductLabelPrinterModal({ 
  isOpen, 
  onClose, 
  preSelectedProductIds = [] 
}: LabelPrinterModalProps) {
  const { products, companySettings } = useERP();
  
  // States for products to print
  const [itemsToPrint, setItemsToPrint] = useState<Array<{ productId: string; qty: number }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // States for Label formatting
  const [preset, setPreset] = useState<'gondola_thermal' | 'gondola_thermal_yellow' | 'gondola_a4_3cols' | 'pimaco_6180' | 'pimaco_6181' | 'pimaco_6182' | 'barcode_small' | 'jewelry_tag'>('gondola_thermal');
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showSkuCode, setShowSkuCode] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  
  // Dimensional tweaks
  const [labelWidth, setLabelWidth] = useState(80); // in mm or percentage mapping
  const [fontSizeTitle, setFontSizeTitle] = useState(12); // in pt
  const [fontSizePrice, setFontSizePrice] = useState(24); // in pt

  // Load preselected products from bulk selection
  useEffect(() => {
    if (isOpen) {
      if (preSelectedProductIds.length > 0) {
        const initial = preSelectedProductIds.map(id => ({ productId: id, qty: 1 }));
        setItemsToPrint(initial);
      } else {
        setItemsToPrint([]);
      }
    }
  }, [isOpen, preSelectedProductIds]);

  // Adjust options based on selected preset
  useEffect(() => {
    if (preset === 'gondola_thermal') {
      setShowCompanyName(true);
      setShowProductName(true);
      setShowPrice(true);
      setShowBarcode(true);
      setShowSkuCode(true);
      setFontSizeTitle(12);
      setFontSizePrice(28);
      setCustomTitle('');
    } else if (preset === 'gondola_thermal_yellow') {
      setShowCompanyName(true);
      setShowProductName(true);
      setShowPrice(true);
      setShowBarcode(true);
      setShowSkuCode(true);
      setFontSizeTitle(12);
      setFontSizePrice(32);
      setCustomTitle('💥 SUPER OFERTA 💥');
    } else if (preset === 'gondola_a4_3cols') {
      setShowCompanyName(false);
      setShowProductName(true);
      setShowPrice(true);
      setShowBarcode(true);
      setShowSkuCode(true);
      setFontSizeTitle(10);
      setFontSizePrice(20);
      setCustomTitle('');
    } else if (preset === 'pimaco_6180') {
      setShowCompanyName(true);
      setShowProductName(true);
      setShowPrice(true);
      setShowBarcode(true);
      setShowSkuCode(true);
      setFontSizeTitle(11);
      setFontSizePrice(22);
      setCustomTitle('');
    } else if (preset === 'pimaco_6181') {
      setShowCompanyName(true);
      setShowProductName(true);
      setShowPrice(true);
      setShowBarcode(true);
      setShowSkuCode(true);
      setFontSizeTitle(9);
      setFontSizePrice(18);
      setCustomTitle('');
    } else if (preset === 'pimaco_6182') {
      setShowCompanyName(false);
      setShowProductName(true);
      setShowPrice(true);
      setShowBarcode(true);
      setShowSkuCode(false);
      setFontSizeTitle(8);
      setFontSizePrice(14);
      setCustomTitle('');
    } else if (preset === 'barcode_small') {
      setShowCompanyName(false);
      setShowProductName(true);
      setShowPrice(false);
      setShowBarcode(true);
      setShowSkuCode(false);
      setFontSizeTitle(9);
      setFontSizePrice(12);
      setCustomTitle('');
    } else if (preset === 'jewelry_tag') {
      setShowCompanyName(false);
      setShowProductName(true);
      setShowPrice(true);
      setShowBarcode(true);
      setShowSkuCode(true);
      setFontSizeTitle(7);
      setFontSizePrice(10);
      setCustomTitle('');
    }
  }, [preset]);

  if (!isOpen) return null;

  // Search filter
  const filteredProducts = products.filter(p => {
    if (p.status === 'Inativo') return false;
    const term = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  });

  const handleAddProduct = (product: any) => {
    const exists = itemsToPrint.find(item => item.productId === product.id);
    if (exists) {
      setItemsToPrint(prev => 
        prev.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item)
      );
    } else {
      setItemsToPrint(prev => [...prev, { productId: product.id, qty: 1 }]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setItemsToPrint(prev => 
      prev.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setItemsToPrint(prev => prev.filter(item => item.productId !== productId));
  };

  const handleClearAll = () => {
    setItemsToPrint([]);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Dynamically compile flat array of all label items to render in preview
  const flatLabelsList: Array<any> = [];
  itemsToPrint.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      for (let i = 0; i < item.qty; i++) {
        flatLabelsList.push({
          ...product,
          labelIndex: i,
        });
      }
    }
  });

  const triggerPrint = () => {
    if (flatLabelsList.length === 0) return;
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[800] p-4 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0">
      
      {/* Dynamic CSS styles injected to handle physical page layout margins for various modes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible;
          }
          #print-area-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            margin: ${preset.includes('pimaco') || preset.includes('a4') ? '0.8cm' : '0'};
            size: ${preset.includes('pimaco') || preset.includes('a4') ? 'A4 portrait' : '80mm auto'};
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-7xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none no-print">
        
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
              <Printer className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white uppercase italic tracking-wide">
                Impressão de Etiquetas de Gôndola e Código de Barras
              </h2>
              <p className="text-slate-400 text-xs font-semibold">
                Gere e imprima etiquetas térmicas e em folhas A4 com código de barras padrão
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-650 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
          >
            <X size={18} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50 dark:bg-slate-905">
          
          {/* Left Column: Configuration Panels */}
          <div className="lg:col-span-4 p-5 md:p-6 space-y-6 overflow-y-auto max-h-[70vh] lg:max-h-none">
            
            {/* 1. Layout Preset Selection */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layout size={14} className="text-brand-blue stroke-[2.5]" />
                Selecione o Modelo de Etiqueta
              </label>

              {/* Category: Bobina Térmica */}
              <div className="space-y-2 bg-slate-100/65 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 px-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Bobina Térmica (Termo-cupom)
                </div>

                <button
                  type="button"
                  onClick={() => setPreset('gondola_thermal')}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95",
                    preset === 'gondola_thermal'
                      ? "bg-brand-blue/5 border-brand-blue ring-2 ring-brand-blue/20"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                    preset === 'gondola_thermal' ? "border-brand-blue text-brand-blue" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {preset === 'gondola_thermal' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Gôndola Térmica (80mm)</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal mt-0.5">Padrão para gôndolas e prateleiras comerciais.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPreset('gondola_thermal_yellow')}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95",
                    preset === 'gondola_thermal_yellow'
                      ? "bg-yellow-500/10 border-yellow-500 ring-2 ring-yellow-500/20"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                    preset === 'gondola_thermal_yellow' ? "border-yellow-600 text-yellow-600" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {preset === 'gondola_thermal_yellow' && <div className="w-2 h-2 rounded-full bg-yellow-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">💥 Gôndola Oferta Amarela</h4>
                    </div>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal mt-0.5">Destaque promocional vibrante e de alta conversão.</p>
                  </div>
                </button>
              </div>

              {/* Category: Folhas Pimaco A4 */}
              <div className="space-y-2 bg-slate-100/65 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 px-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Folhas Pimaco A4 (Impressora Comum)
                </div>

                <button
                  type="button"
                  onClick={() => setPreset('gondola_a4_3cols')}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95",
                    preset === 'gondola_a4_3cols'
                      ? "bg-brand-blue/5 border-brand-blue ring-2 ring-brand-blue/20"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                    preset === 'gondola_a4_3cols' ? "border-brand-blue text-brand-blue" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {preset === 'gondola_a4_3cols' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Gôndola A4 (3 Colunas)</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal mt-0.5">3 colunas para encaixe em canaleta.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPreset('pimaco_6180')}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95",
                    preset === 'pimaco_6180'
                      ? "bg-brand-blue/5 border-brand-blue ring-2 ring-brand-blue/20"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                    preset === 'pimaco_6180' ? "border-brand-blue text-brand-blue" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {preset === 'pimaco_6180' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Pimaco 6180 (A4 - 20 Etq.)</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal mt-0.5">2 colunas x 10 linhas. Ideal p/ caixas e produtos.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPreset('pimaco_6181')}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95",
                    preset === 'pimaco_6181'
                      ? "bg-brand-blue/5 border-brand-blue ring-2 ring-brand-blue/20"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                    preset === 'pimaco_6181' ? "border-brand-blue text-brand-blue" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {preset === 'pimaco_6181' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Pimaco 6181 (A4 - 30 Etq.)</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal mt-0.5">3 colunas x 10 linhas. Padrão comercial.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPreset('pimaco_6182')}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95",
                    preset === 'pimaco_6182'
                      ? "bg-brand-blue/5 border-brand-blue ring-2 ring-brand-blue/20"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                    preset === 'pimaco_6182' ? "border-brand-blue text-brand-blue" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {preset === 'pimaco_6182' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Pimaco 6182 (A4 - 80 Etq.)</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal mt-0.5">4 colunas x 20 linhas. Muito compacta.</p>
                  </div>
                </button>
              </div>

              {/* Category: Especiais */}
              <div className="space-y-2 bg-slate-100/65 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 px-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Formatos Especiais & Joias
                </div>

                <button
                  type="button"
                  onClick={() => setPreset('barcode_small')}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95",
                    preset === 'barcode_small'
                      ? "bg-brand-blue/5 border-brand-blue ring-2 ring-brand-blue/20"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                    preset === 'barcode_small' ? "border-brand-blue text-brand-blue" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {preset === 'barcode_small' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Mini Tag de Preço</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal mt-0.5">Código de barras e nome super reduzidos.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPreset('jewelry_tag')}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer active:scale-95",
                    preset === 'jewelry_tag'
                      ? "bg-brand-blue/5 border-brand-blue ring-2 ring-brand-blue/20"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                    preset === 'jewelry_tag' ? "border-brand-blue text-brand-blue" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {preset === 'jewelry_tag' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">Etiqueta p/ Joias e Óculos</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal mt-0.5">Modelo borboleta dobrável de alta precisão.</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Custom Toggle Options */}
            <div className="space-y-4 bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-250/60 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={13} className="text-brand-blue" />
                Opções de Exibição
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-2 rounded-lg transition-colors select-none">
                  <input 
                    type="checkbox" 
                    checked={showCompanyName} 
                    onChange={() => setShowCompanyName(!showCompanyName)}
                    className="w-4 h-4 rounded text-brand-blue border-slate-300 dark:border-slate-700 focus:ring-brand-blue/20"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Mostrar Nome da Empresa</span>
                </label>

                <label className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-2 rounded-lg transition-colors select-none">
                  <input 
                    type="checkbox" 
                    checked={showProductName} 
                    onChange={() => setShowProductName(!showProductName)}
                    className="w-4 h-4 rounded text-brand-blue border-slate-300 dark:border-slate-700 focus:ring-brand-blue/20"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Mostrar Nome do Produto</span>
                </label>

                <label className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-2 rounded-lg transition-colors select-none">
                  <input 
                    type="checkbox" 
                    checked={showPrice} 
                    onChange={() => setShowPrice(!showPrice)}
                    className="w-4 h-4 rounded text-brand-blue border-slate-300 dark:border-slate-700 focus:ring-brand-blue/20"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Mostrar Preço de Venda</span>
                </label>

                <label className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-2 rounded-lg transition-colors select-none">
                  <input 
                    type="checkbox" 
                    checked={showBarcode} 
                    onChange={() => setShowBarcode(!showBarcode)}
                    className="w-4 h-4 rounded text-brand-blue border-slate-300 dark:border-slate-700 focus:ring-brand-blue/20"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Mostrar Código de Barras (EAN/Code39)</span>
                </label>

                <label className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-2 rounded-lg transition-colors select-none">
                  <input 
                    type="checkbox" 
                    checked={showSkuCode} 
                    onChange={() => setShowSkuCode(!showSkuCode)}
                    className="w-4 h-4 rounded text-brand-blue border-slate-300 dark:border-slate-700 focus:ring-brand-blue/20"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Mostrar SKU / Código Interno</span>
                </label>
              </div>

              {/* Title tweak */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Texto Personalizado do Rodapé/Cabeçalho</label>
                <input 
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex: Oferta Especial ou Super Desconto!"
                  className="w-full text-xs font-semibold h-9 rounded-xl border border-slate-200 dark:border-slate-800 px-3 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-850 transition-colors focus:ring-4 focus:ring-brand-blue/10 outline-none"
                />
              </div>

              {/* Slider controls for layout resizing */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 mb-1">
                    <span>Tamanho Fonte Título</span>
                    <span className="text-brand-blue">{fontSizeTitle}pt</span>
                  </div>
                  <input 
                    type="range" 
                    min="8" 
                    max="18" 
                    value={fontSizeTitle} 
                    onChange={(e) => setFontSizeTitle(parseInt(e.target.value))}
                    className="w-full accent-brand-blue"
                  />
                </div>
                {showPrice && (
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 mb-1">
                      <span>Tamanho Fonte Preço</span>
                      <span className="text-brand-blue">{fontSizePrice}pt</span>
                    </div>
                    <input 
                      type="range" 
                      min="14" 
                      max="48" 
                      value={fontSizePrice} 
                      onChange={(e) => setFontSizePrice(parseInt(e.target.value))}
                      className="w-full accent-brand-blue"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Middle Column: Product Selector */}
          <div className="lg:col-span-4 p-5 md:p-6 flex flex-col overflow-y-auto max-h-[70vh] lg:max-h-none space-y-4">
            
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Grid size={13} className="text-brand-blue" />
                Produtos para Impressão
              </label>
              {itemsToPrint.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-extrabold uppercase text-rose-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  Limpar Lista
                </button>
              )}
            </div>

            {/* Product Autocomplete Input */}
            <div className="relative">
              <input 
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="🔍 Pesquise produtos para adicionar..."
                className="w-full text-xs font-semibold h-11 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 bg-white dark:bg-slate-850 focus:ring-4 focus:ring-brand-blue/10 outline-none"
              />

              {showProductDropdown && productSearch && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[900] max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-semibold">Nenhum produto encontrado.</div>
                  ) : (
                    filteredProducts.slice(0, 8).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className="w-full text-left p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800 dark:text-white leading-tight">{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            EAN: {p.barcode || 'S/ Código'} • SKU: {p.sku || 'S/ SKU'}
                          </span>
                        </div>
                        <span className="font-extrabold text-brand-blue bg-brand-blue/5 px-2 py-1 rounded-lg">
                          {formatCurrency(p.salePrice || 0)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {showProductDropdown && (
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setShowProductDropdown(false)} 
                />
              )}
            </div>

            {/* Items List */}
            <div className="flex-1 bg-white dark:bg-slate-850 border border-slate-250/60 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col min-h-[300px]">
              {itemsToPrint.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center">
                    <Tag className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold uppercase text-slate-650 dark:text-slate-300">Nenhum Produto Selecionado</h5>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">Busque produtos acima ou use a seleção em lote para gerar etiquetas instantaneamente.</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {itemsToPrint.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;
                    return (
                      <div key={item.productId} className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex-1 min-w-0 pr-3">
                          <h6 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                            {product.name}
                          </h6>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-extrabold text-brand-blue bg-brand-blue/5 px-1.5 py-0.5 rounded">
                              {formatCurrency(product.salePrice || 0)}
                            </span>
                            {product.barcode && (
                              <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">
                                EAN: {product.barcode}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl px-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.productId, -1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Minus size={11} className="stroke-[2.5]" />
                            </button>
                            <span className="w-8 text-center text-xs font-extrabold text-slate-800 dark:text-white">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.productId, 1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Plus size={11} className="stroke-[2.5]" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(item.productId)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                            title="Remover produto da etiqueta"
                          >
                            <Trash2 size={13} className="stroke-[2]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Visual Preview Area */}
          <div className="lg:col-span-4 p-5 md:p-6 bg-slate-100 dark:bg-slate-950 flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Sparkles size={13} className="text-brand-blue" />
              Visualização Prévia (Impressão Real)
            </label>

            {/* Simulated Sheet Frame */}
            <div className="flex-1 bg-slate-200 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-300 dark:border-slate-800/80 overflow-y-auto flex items-start justify-center min-h-[350px]">
              {flatLabelsList.length === 0 ? (
                <div className="m-auto text-center text-slate-400 p-6">
                  <p className="text-xs font-semibold leading-relaxed">
                    Selecione produtos para visualizar o layout de etiqueta em tempo real aqui.
                  </p>
                </div>
              ) : (
                <div 
                  id="print-area-wrapper"
                  className={cn(
                    "bg-white text-black p-4 w-full shadow-lg rounded-xl transition-all",
                    (preset === 'gondola_a4_3cols' || preset === 'pimaco_6180' || preset === 'pimaco_6181' || preset === 'pimaco_6182') ? "aspect-[1/1.4] max-w-full text-xs font-sans" : "max-w-[80mm] text-xs font-sans"
                  )}
                >
                  <div 
                    className={cn(
                      "grid gap-2",
                      preset === 'gondola_a4_3cols' ? "grid-cols-3" :
                      preset === 'pimaco_6180' ? "grid-cols-2" :
                      preset === 'pimaco_6181' ? "grid-cols-3" :
                      preset === 'pimaco_6182' ? "grid-cols-4" : "grid-cols-1"
                    )}
                  >
                    {flatLabelsList.map((product, index) => {
                      // Determine barcode candidate (uses barcode or fallback to SKU or default)
                      const barcodeVal = product.barcode || product.sku || '789000000000';
                      
                      if (preset === 'jewelry_tag') {
                        return (
                          <div 
                            key={`${product.id}-${index}`}
                            className="bg-white text-black border border-slate-200 flex items-center justify-between p-1 rounded overflow-hidden relative min-h-[55px]"
                            style={{ pageBreakInside: 'avoid' }}
                          >
                            {/* Left Wing - Product & Barcode */}
                            <div className="w-[45%] flex flex-col justify-center items-start text-left overflow-hidden">
                              {showProductName && (
                                <div className="font-extrabold text-slate-900 leading-none uppercase truncate w-full" style={{ fontSize: `${fontSizeTitle}px` }}>
                                  {product.name}
                                </div>
                              )}
                              {showSkuCode && (
                                <span className="text-[6px] font-mono font-bold text-slate-400 mt-0.5">
                                  SKU: {product.sku || 'N/A'}
                                </span>
                              )}
                              {showBarcode && (
                                <div className="w-full mt-1 flex justify-start scale-90 origin-left">
                                  <Code39BarcodeSVG value={barcodeVal} />
                                </div>
                              )}
                            </div>

                            {/* Butterfly Bridge Indicator */}
                            <div className="w-[10%] flex flex-col items-center justify-center shrink-0 px-0.5">
                              <div className="h-0.5 w-full bg-slate-300 border-t border-dashed border-slate-400" />
                              <span className="text-[4px] text-slate-400 font-bold uppercase tracking-tighter scale-75">DOBRA</span>
                            </div>

                            {/* Right Wing - Price & Promo */}
                            <div className="w-[45%] flex flex-col justify-center items-end text-right overflow-hidden">
                              {showPrice && (
                                <div className="flex flex-col items-end leading-none">
                                  <span className="text-[6px] font-black text-rose-500 uppercase tracking-widest leading-none mb-0.5">OFERTA</span>
                                  <span className="font-black text-slate-950 font-mono tracking-tighter leading-none" style={{ fontSize: `${fontSizePrice}px` }}>
                                    R$ {product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : '0,00'}
                                  </span>
                                </div>
                              )}
                              {customTitle && (
                                <div className="text-[5px] font-black text-emerald-600 truncate max-w-full uppercase mt-1">
                                  {customTitle}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (preset === 'gondola_thermal_yellow') {
                        return (
                          <div 
                            key={`${product.id}-${index}`}
                            className="bg-yellow-100 text-black border-2 border-red-600 flex flex-col rounded justify-between text-left overflow-hidden relative min-h-[140px]"
                            style={{ pageBreakInside: 'avoid' }}
                          >
                            {/* Top Promotion Header */}
                            <div className="bg-red-600 text-white font-black text-[10px] tracking-widest uppercase text-center py-1 flex justify-center items-center gap-1">
                              <span>{customTitle || '💥 SUPER OFERTA 💥'}</span>
                            </div>

                            <div className="p-2 flex-1 flex flex-col justify-between">
                              {/* Product Title */}
                              {showProductName && (
                                <div 
                                  className="font-black text-slate-950 leading-tight uppercase tracking-tight line-clamp-2 my-0.5"
                                  style={{ fontSize: `${fontSizeTitle}px` }}
                                >
                                  {product.name}
                                </div>
                              )}

                              {/* SKU or Internal Code */}
                              {showSkuCode && (
                                <div className="text-[8px] font-bold text-slate-500 font-mono">
                                  CÓD: {product.sku || 'N/A'} {product.section ? `• SEC: ${product.section}` : ''}
                                </div>
                              )}

                              {/* Red & Yellow Highlighted Price Tag */}
                              {showPrice && (
                                <div className="flex items-baseline gap-1 my-1 justify-between bg-yellow-300 border border-red-500 p-1.5 rounded">
                                  <span className="text-[9px] font-black text-red-600 uppercase tracking-widest leading-none">R$</span>
                                  <span 
                                    className="font-black text-red-600 font-mono tracking-tighter leading-none"
                                    style={{ fontSize: `${fontSizePrice}px` }}
                                  >
                                    {product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : '0,00'}
                                  </span>
                                  <span className="text-[7px] font-bold text-red-600 font-sans leading-none uppercase">Unit.</span>
                                </div>
                              )}

                              {/* Barcode */}
                              {showBarcode && (
                                <div className="w-full flex items-center justify-center mt-1 border-t border-dashed border-yellow-300 pt-1">
                                  <Code39BarcodeSVG value={barcodeVal} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (preset === 'pimaco_6180') {
                        return (
                          <div 
                            key={`${product.id}-${index}`}
                            className="bg-white text-black border border-slate-300 flex flex-col p-2 rounded justify-between text-left overflow-hidden relative min-h-[96px]"
                            style={{ pageBreakInside: 'avoid' }}
                          >
                            {showCompanyName && (
                              <div className="text-[8px] font-black tracking-wider uppercase text-slate-500 border-b border-slate-100 pb-0.5">
                                {companySettings?.tradeName || 'ERP Supermercado'}
                              </div>
                            )}
                            
                            {showProductName && (
                              <div 
                                className="font-extrabold text-slate-900 leading-snug uppercase tracking-tight line-clamp-1 my-0.5"
                                style={{ fontSize: `${fontSizeTitle}px` }}
                              >
                                {product.name}
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-1.5 mt-auto">
                              <div className="flex flex-col gap-0.5">
                                {showSkuCode && (
                                  <span className="text-[8px] font-bold text-slate-400 font-mono">
                                    CÓD: {product.sku || 'N/A'}
                                  </span>
                                )}
                                {showBarcode && (
                                  <div className="w-24 mt-0.5">
                                    <Code39BarcodeSVG value={barcodeVal} />
                                  </div>
                                )}
                              </div>

                              {showPrice && (
                                <div className="text-right flex flex-col justify-end">
                                  <span className="text-[7px] text-slate-400 font-bold uppercase leading-none">Preço</span>
                                  <span 
                                    className="font-black text-slate-950 font-mono tracking-tighter leading-none"
                                    style={{ fontSize: `${fontSizePrice}px` }}
                                  >
                                    R$ {product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : '0,00'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (preset === 'pimaco_6181') {
                        return (
                          <div 
                            key={`${product.id}-${index}`}
                            className="bg-white text-black border border-slate-300 flex flex-col p-1.5 rounded justify-between text-left overflow-hidden relative min-h-[80px]"
                            style={{ pageBreakInside: 'avoid' }}
                          >
                            {showProductName && (
                              <div 
                                className="font-extrabold text-slate-900 leading-tight uppercase tracking-tight line-clamp-1"
                                style={{ fontSize: `${fontSizeTitle}px` }}
                              >
                                {product.name}
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-1 mt-auto">
                              <div className="flex flex-col">
                                {showSkuCode && (
                                  <span className="text-[7px] font-mono text-slate-400">
                                    CÓD: {product.sku || 'N/A'}
                                  </span>
                                )}
                                {showBarcode && (
                                  <div className="w-20 mt-0.5">
                                    <Code39BarcodeSVG value={barcodeVal} />
                                  </div>
                                )}
                              </div>

                              {showPrice && (
                                <div className="text-right">
                                  <span 
                                    className="font-black text-slate-950 font-mono tracking-tight"
                                    style={{ fontSize: `${fontSizePrice}px` }}
                                  >
                                    R$ {product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : '0,00'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (preset === 'pimaco_6182') {
                        return (
                          <div 
                            key={`${product.id}-${index}`}
                            className="bg-white text-black border border-slate-200 flex flex-col p-1 rounded justify-between text-left overflow-hidden relative min-h-[52px]"
                            style={{ pageBreakInside: 'avoid' }}
                          >
                            {showProductName && (
                              <div 
                                className="font-black text-slate-900 leading-none uppercase tracking-tight truncate"
                                style={{ fontSize: `${fontSizeTitle}px` }}
                              >
                                {product.name}
                              </div>
                            )}

                            <div className="flex items-end justify-between gap-0.5 mt-auto">
                              {showBarcode && (
                                <div className="w-16 scale-90 -ml-1 mt-0.5">
                                  <Code39BarcodeSVG value={barcodeVal} />
                                </div>
                              )}

                              {showPrice && (
                                <span 
                                  className="font-black text-slate-950 font-mono tracking-tighter leading-none"
                                  style={{ fontSize: `${fontSizePrice}px` }}
                                >
                                  R$ {product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : '0,00'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={`${product.id}-${index}`}
                          className={cn(
                            "bg-white text-black border border-slate-300 flex flex-col p-2.5 rounded justify-between text-left overflow-hidden relative",
                            preset === 'gondola_thermal' ? "min-h-[140px]" : "",
                            preset === 'gondola_a4_3cols' ? "min-h-[120px]" : "",
                            preset === 'barcode_small' ? "min-h-[75px] justify-center text-center items-center py-1" : ""
                          )}
                          style={{
                            pageBreakInside: 'avoid'
                          }}
                        >
                          {/* Company Name */}
                          {showCompanyName && preset !== 'barcode_small' && (
                            <div className="text-[9px] font-black tracking-wider uppercase text-brand-blue border-b border-slate-100 pb-1 flex justify-between items-center">
                              <span>{companySettings?.tradeName || 'ERP Supermercado'}</span>
                              <span className="text-[7px] text-slate-400 font-mono">GÔNDOLA</span>
                            </div>
                          )}

                          {/* Product Title */}
                          {showProductName && (
                            <div 
                              className="font-extrabold text-slate-900 leading-tight uppercase tracking-tight line-clamp-2 my-1"
                              style={{ fontSize: `${fontSizeTitle}px` }}
                            >
                              {product.name}
                            </div>
                          )}

                          {/* Sku or Code Info */}
                          {showSkuCode && preset !== 'barcode_small' && (
                            <div className="text-[8px] font-bold text-slate-400 font-mono">
                              CÓD: {product.sku || 'N/A'} {product.section ? `• SEC: ${product.section}` : ''}
                            </div>
                          )}

                          {/* Price Tag with Prominent Display */}
                          {showPrice && (
                            <div className="flex items-baseline gap-1 my-1 justify-between bg-amber-500/5 p-1 rounded border border-amber-500/10">
                              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest leading-none">R$</span>
                              <span 
                                className="font-black text-slate-950 font-mono tracking-tighter leading-none"
                                style={{ fontSize: `${fontSizePrice}px` }}
                              >
                                {product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : '0,00'}
                              </span>
                              <span className="text-[7px] font-bold text-slate-400 font-sans leading-none uppercase">Unit.</span>
                            </div>
                          )}

                          {/* Custom Bottom Title Accent */}
                          {customTitle && preset !== 'barcode_small' && (
                            <div className="text-[8px] font-black text-rose-600 uppercase text-center bg-rose-50 rounded py-0.5 my-1 tracking-wider leading-tight">
                              {customTitle}
                            </div>
                          )}

                          {/* SVG Barcode Output */}
                          {showBarcode && (
                            <div className="w-full flex items-center justify-center mt-auto border-t border-dashed border-slate-100 pt-1.5 bg-white">
                              <Code39BarcodeSVG value={barcodeVal} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Print trigger button */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <button
                onClick={triggerPrint}
                disabled={flatLabelsList.length === 0}
                className={cn(
                  "flex-1 h-12 rounded-2xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98]",
                  flatLabelsList.length > 0
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/10 hover:shadow-lg cursor-pointer"
                    : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed shadow-none"
                )}
              >
                <Printer size={16} className="stroke-[2.5]" />
                <span>Imprimir Etiquetas ({flatLabelsList.length})</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
