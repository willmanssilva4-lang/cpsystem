'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '@/lib/context';
import { 
  Printer, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Settings2, 
  RotateCcw, 
  Grid, 
  FileText, 
  Tag, 
  Sparkles,
  Barcode as BarcodeIcon,
  Check,
  Package,
  Layers,
  Building,
  AlertTriangle,
  ExternalLink,
  RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Code 39 Barcode Map (bars '1' and spaces '0')
const CODE39_MAP: Record<string, string> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
  'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
};

// Barcode SVG Renderer
function Barcode39({ value, height = 32 }: { value: string; height?: number }) {
  const cleanValue = value.toUpperCase().replace(/[^0-9A-Z\-.\s]/g, '') || '000000';
  const displayValue = `*${cleanValue}*`;
  
  let binaryString = '';
  for (let i = 0; i < displayValue.length; i++) {
    const char = displayValue[i];
    const encoded = CODE39_MAP[char] || CODE39_MAP[' '];
    binaryString += encoded + '0';
  }

  const barWidth = 1.5;
  const bars: React.ReactNode[] = [];
  
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === '1') {
      bars.push(
        <rect
          key={i}
          x={i * barWidth}
          y={0}
          width={barWidth}
          height={height}
          fill="black"
        />
      );
    }
  }

  const totalWidth = binaryString.length * barWidth;

  return (
    <div className="flex flex-col items-center justify-center bg-white p-0.5 rounded overflow-hidden select-none">
      <svg width={totalWidth} height={height} viewBox={`0 0 ${totalWidth} ${height}`} className="max-w-full block">
        {bars}
      </svg>
      <span className="text-[8px] font-mono mt-0.5 tracking-[2px] font-bold text-slate-800 leading-none">
        {cleanValue}
      </span>
    </div>
  );
}

// Layout definitions
type LayoutType = 'gondola' | 'zebra_1col' | 'zebra_2col' | 'pimaco_6180' | 'zebra_weight';

interface PrintQueueItem {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  price: number;
  brand?: string;
  copies: number;
}

export function LabelPrinting({ 
  initialProduct, 
  onClearInitialProduct 
}: { 
  initialProduct?: any; 
  onClearInitialProduct?: () => void;
} = {}) {
  const { products, categorias, subcategorias } = useERP();

  // Sandbox/Iframe detection
  const [isInIframe, setIsInIframe] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInIframe(window.self !== window.top);
    }
  }, []);

  // Print Queue State
  const [queue, setQueue] = useState<PrintQueueItem[]>([]);

  // Handle initial product addition if navigated from table
  React.useEffect(() => {
    if (initialProduct) {
      // Add product to queue
      setQueue(prev => {
        const exists = prev.find(item => item.id === initialProduct.id);
        if (exists) {
          return prev.map(item => item.id === initialProduct.id ? { ...item, copies: item.copies + 1 } : item);
        }
        return [...prev, {
          id: initialProduct.id,
          sku: initialProduct.sku || 'N/A',
          name: initialProduct.name,
          barcode: initialProduct.barcode || initialProduct.sku || '00000',
          price: initialProduct.salePrice || 0,
          brand: initialProduct.brand || '',
          copies: 1
        }];
      });
      if (onClearInitialProduct) {
        onClearInitialProduct();
      }
    }
  }, [initialProduct, onClearInitialProduct]);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Layout Options
  const [layout, setLayout] = useState<LayoutType>('pimaco_6180');
  const [showBorder, setShowBorder] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [companyName, setCompanyName] = useState('CPS SYSTEM');

  // Advanced Print & Alignment Options
  const [pageOrientation, setPageOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [rotation, setRotation] = useState<'0' | '90' | '180' | '270'>('0');
  const [swapDimensions, setSwapDimensions] = useState(false);

  // Manual dimensions override for page and content
  const [pageWidthOverride, setPageWidthOverride] = useState<string>('');
  const [pageHeightOverride, setPageHeightOverride] = useState<string>('');
  const [labelWidthOverride, setLabelWidthOverride] = useState<string>('');
  const [labelHeightOverride, setLabelHeightOverride] = useState<string>('');
  const [nameFontSize, setNameFontSize] = useState<string>(''); // empty means default/recommended for the chosen layout
  const [otherFontSize, setOtherFontSize] = useState<string>('0'); // offset for other elements: -3 to +6, default '0'

  // Weight products specific state
  const [weightValue, setWeightValue] = useState<string>('0.350');
  const [expiryDays, setExpiryDays] = useState<string>('5');
  const [packingDate, setPackingDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const getPageWidth = () => {
    if (pageWidthOverride.trim() !== '') return pageWidthOverride.trim() + 'mm';
    if (layout === 'pimaco_6180') return '210mm';
    if (layout === 'gondola') return swapDimensions ? '40mm' : '80mm';
    if (layout === 'zebra_1col') return swapDimensions ? '30mm' : '50mm';
    if (layout === 'zebra_2col') return swapDimensions ? '25mm' : '80mm';
    if (layout === 'zebra_weight') return swapDimensions ? '40mm' : '60mm';
    return '100%';
  };

  const getPageHeight = () => {
    if (pageHeightOverride.trim() !== '') return pageHeightOverride.trim() + 'mm';
    if (layout === 'pimaco_6180') return '297mm';
    if (layout === 'gondola') return swapDimensions ? '80mm' : '40mm';
    if (layout === 'zebra_1col') return swapDimensions ? '50mm' : '30mm';
    if (layout === 'zebra_2col') return swapDimensions ? '80mm' : '25mm';
    if (layout === 'zebra_weight') return swapDimensions ? '60mm' : '40mm';
    return 'auto';
  };

  const getLabelWidth = () => {
    if (labelWidthOverride.trim() !== '') return labelWidthOverride.trim() + 'mm';
    if (layout === 'pimaco_6180') return '66.7mm';
    if (layout === 'gondola') return swapDimensions ? '40mm' : '80mm';
    if (layout === 'zebra_1col') return swapDimensions ? '30mm' : '50mm';
    if (layout === 'zebra_2col') return swapDimensions ? '12mm' : '38mm';
    if (layout === 'zebra_weight') return swapDimensions ? '40mm' : '60mm';
    return '100%';
  };

  const getLabelHeight = () => {
    if (labelHeightOverride.trim() !== '') return labelHeightOverride.trim() + 'mm';
    if (layout === 'pimaco_6180') return '25.4mm';
    if (layout === 'gondola') return swapDimensions ? '80mm' : '40mm';
    if (layout === 'zebra_1col') return swapDimensions ? '50mm' : '30mm';
    if (layout === 'zebra_2col') return swapDimensions ? '80mm' : '25mm';
    if (layout === 'zebra_weight') return swapDimensions ? '60mm' : '40mm';
    return 'auto';
  };

  // Filter products to be selected
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.status === 'Inativo') return false;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesCategory = true;
      if (selectedCategory !== 'all') {
        if (p.subcategoria_id) {
          const sub = subcategorias.find(s => s.id === p.subcategoria_id);
          matchesCategory = sub?.categoria_id === selectedCategory;
        } else {
          matchesCategory = false;
        }
      }

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, subcategorias]);

  // Add to Queue
  const addToQueue = (product: any) => {
    setQueue(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, copies: item.copies + 1 } : item);
      }
      return [...prev, {
        id: product.id,
        sku: product.sku || 'N/A',
        name: product.name,
        barcode: product.barcode || product.sku || '00000',
        price: product.salePrice || 0,
        brand: product.brand || '',
        copies: 1
      }];
    });
  };

  // Add multiple items bulk
  const addFilteredToQueue = () => {
    filteredProducts.forEach(p => {
      addToQueue(p);
    });
  };

  // Update copies
  const updateCopies = (id: string, delta: number) => {
    setQueue(prev => prev.map(item => {
      if (item.id === id) {
        const newCopies = Math.max(1, item.copies + delta);
        return { ...item, copies: newCopies };
      }
      return item;
    }));
  };

  // Remove from Queue
  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  // Clear Queue
  const clearQueue = () => {
    setQueue([]);
  };

  // Handle direct print
  const handlePrint = () => {
    if (queue.length === 0) return;
    if (isInIframe) {
      setShowIframeModal(true);
      return;
    }
    try {
      window.print();
    } catch (e) {
      console.error(e);
      setShowIframeModal(true);
    }
  };

  // All labels mapped in array based on copy counts
  const allLabels = useMemo(() => {
    const list: PrintQueueItem[] = [];
    queue.forEach(item => {
      for (let i = 0; i < item.copies; i++) {
        list.push({ ...item });
      }
    });
    return list;
  }, [queue]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getNameFontSize = (currentLayout: LayoutType) => {
    if (nameFontSize.trim() !== '') {
      return nameFontSize.trim() + 'px';
    }
    // Default recommended font sizes
    if (currentLayout === 'pimaco_6180') return '9px';
    if (currentLayout === 'gondola') return '13px';
    if (currentLayout === 'zebra_1col') return '10px';
    if (currentLayout === 'zebra_2col') return '8px';
    if (currentLayout === 'zebra_weight') return '11.5px'; // slightly bigger default for weight
    return '10px';
  };

  const getOtherFontSize = (baseSizePx: number) => {
    const offset = parseInt(otherFontSize || '0', 10);
    if (!isNaN(offset)) {
      return Math.max(4, baseSizePx + offset) + 'px';
    }
    return baseSizePx + 'px';
  };

  const generateScaleBarcode = (sku: string, price: number, weight: number) => {
    // Keep only digits from SKU
    const numericSku = sku.replace(/\D/g, '');
    // Take last 5 digits or pad to 5 digits
    const cleanSku = numericSku.slice(-5).padStart(5, '0');
    // Calculate total price: price * weight
    const totalVal = price * weight;
    // Format price in cents, e.g. 9.07 -> 907
    const cents = Math.round(totalVal * 100);
    // Force 6 digits price representation
    const priceStr = String(cents).slice(-6).padStart(6, '0');
    // Combine EAN-13 base 12 digits: 2 + CCCCC + VVVVVV
    const base12 = '2' + cleanSku + priceStr;
    
    // Calculate EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(base12[i], 10);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return base12 + checkDigit;
  };

  const getExpiryDateStr = (packDate: string, daysStr: string) => {
    if (!packDate) return '';
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) return '';
    const date = new Date(packDate + 'T12:00:00');
    date.setDate(date.getDate() + days);
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatDateToBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="space-y-8 p-1 md:p-2">
      {/* Dynamic CSS Styles for printing matching exact layouts */}
      <style>{`
        @media print {
          /* Hide everything except the print area */
          body * {
            visibility: hidden;
            background: none !important;
          }
          #print-root, #print-root * {
            visibility: visible;
          }
          #print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Layout formatting */
          ${layout === 'pimaco_6180' ? `
            @page {
              size: A4 ${pageOrientation !== 'auto' ? pageOrientation : 'portrait'};
              margin: 0;
            }
            #print-root {
              width: 210mm;
              min-height: 297mm;
              padding-left: 5mm;
              padding-top: 10.5mm;
              padding-right: 5mm;
              box-sizing: border-box;
              display: grid !important;
              grid-template-columns: repeat(3, 66.7mm);
              grid-auto-rows: 25.4mm;
              gap: 0mm 3mm;
            }
            .print-label-item {
              width: 66.7mm;
              height: 25.4mm;
              padding: 2mm 3mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              overflow: hidden;
              page-break-inside: avoid;
              background: white !important;
              color: black !important;
              border: ${showBorder ? '0.1mm solid #e2e8f0' : 'none'} !important;
              ${rotation !== '0' ? `
                transform: rotate(${rotation}deg);
                transform-origin: center;
              ` : ''}
            }
          ` : ''}

          ${layout === 'gondola' ? `
            @page {
              size: ${getPageWidth()} ${getPageHeight()}${pageOrientation !== 'auto' ? ` ${pageOrientation}` : ''};
              margin: 0;
            }
            #print-root {
              width: ${getPageWidth()};
              display: flex !important;
              flex-direction: column;
              align-items: center;
              gap: 0;
              padding: 0;
            }
            .print-label-item {
              width: ${getLabelWidth()};
              height: ${getLabelHeight()};
              padding: 3mm 4mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              page-break-after: always;
              background: white !important;
              color: black !important;
              border: ${showBorder ? '0.1mm solid #000' : 'none'} !important;
              ${rotation !== '0' ? `
                transform: rotate(${rotation}deg);
                transform-origin: center;
              ` : ''}
            }
          ` : ''}

          ${layout === 'zebra_1col' ? `
            @page {
              size: ${getPageWidth()} ${getPageHeight()}${pageOrientation !== 'auto' ? ` ${pageOrientation}` : ''};
              margin: 0;
            }
            #print-root {
              width: ${getPageWidth()};
              display: flex !important;
              flex-direction: column;
              align-items: center;
              gap: 0;
              padding: 0;
            }
            .print-label-item {
              width: ${getLabelWidth()};
              height: ${getLabelHeight()};
              padding: 2mm 3mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              overflow: hidden;
              page-break-after: always;
              background: white !important;
              color: black !important;
              border: ${showBorder ? '0.1mm solid #000' : 'none'} !important;
              ${rotation !== '0' ? `
                transform: rotate(${rotation}deg);
                transform-origin: center;
              ` : ''}
            }
          ` : ''}

          ${layout === 'zebra_2col' ? `
            @page {
              size: ${getPageWidth()} ${getPageHeight()}${pageOrientation !== 'auto' ? ` ${pageOrientation}` : ''};
              margin: 0;
            }
            #print-root {
              width: ${getPageWidth()};
              display: grid !important;
              grid-template-columns: repeat(2, ${getLabelWidth()});
              gap: 0 4mm;
              padding: 0;
              box-sizing: border-box;
            }
            .print-label-item {
              width: ${getLabelWidth()};
              height: ${getLabelHeight()};
              padding: 1.5mm 2mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              overflow: hidden;
              page-break-inside: avoid;
              background: white !important;
              color: black !important;
              border: ${showBorder ? '0.1mm solid #000' : 'none'} !important;
              ${rotation !== '0' ? `
                transform: rotate(${rotation}deg);
                transform-origin: center;
              ` : ''}
            }
          ` : ''}

          ${layout === 'zebra_weight' ? `
            @page {
              size: ${getPageWidth()} ${getPageHeight()}${pageOrientation !== 'auto' ? ` ${pageOrientation}` : ''};
              margin: 0;
            }
            #print-root {
              width: ${getPageWidth()};
              display: flex !important;
              flex-direction: column;
              align-items: center;
              gap: 0;
              padding: 0;
            }
            .print-label-item {
              width: ${getLabelWidth()};
              height: ${getLabelHeight()};
              padding: 2mm 3mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              page-break-after: always;
              background: white !important;
              color: black !important;
              border: ${showBorder ? '0.1mm solid #000' : 'none'} !important;
              ${rotation !== '0' ? `
                transform: rotate(${rotation}deg);
                transform-origin: center;
              ` : ''}
            }
          ` : ''}
        }
      `}</style>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Queue & Settings (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Settings Panel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1e40af]">
                <Settings2 size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">1. Definições de Layout</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure o tamanho do papel e os elementos visíveis</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Layout Size Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Formato da Etiqueta / Papel</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { id: 'pimaco_6180', label: 'Pimaco A4 (3 Colunas • 6180)', desc: 'Folha A4 comum, 30 etiquetas por página' },
                    { id: 'gondola', label: 'Gôndola / Prateleira (80mm x 40mm)', desc: 'Ideal para gôndolas e destaque de preço grande' },
                    { id: 'zebra_1col', label: 'Zebra / Térmica (50mm x 30mm)', desc: '1 coluna, tamanho padrão de produto' },
                    { id: 'zebra_2col', label: 'Zebra / Térmica (2 Colunas • 38mm x 25mm)', desc: 'Rolo de 2 colunas para impressoras térmicas' },
                    { id: 'zebra_weight', label: 'Balança / Pesável (60mm x 40mm)', desc: 'Ideal para produtos pesáveis (peso, embalagem, validade e preço total)' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setLayout(opt.id as LayoutType)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border-2 transition-all flex flex-col gap-0.5 select-none cursor-pointer",
                        layout === opt.id 
                          ? "border-[#1e40af] bg-blue-50/40 text-[#1e40af] shadow-xs" 
                          : "border-slate-150 hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <span className="text-xs font-black uppercase italic tracking-wide">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium leading-normal">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Elements Toggles */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Elementos da Etiqueta</label>
                  <div className="space-y-2 bg-slate-50/60 p-4 rounded-2xl border border-slate-150">
                    {[
                      { checked: showCompany, onChange: setShowCompany, label: 'Mostrar Nome da Empresa' },
                      { checked: showPrice, onChange: setShowPrice, label: 'Mostrar Preço de Venda' },
                      { checked: showBarcode, onChange: setShowBarcode, label: 'Mostrar Código de Barras' },
                      { checked: showBrand, onChange: setShowBrand, label: 'Mostrar Marca do Produto' },
                      { checked: showBorder, onChange: setShowBorder, label: 'Mostrar Borda de Guia/Corte' },
                    ].map((item, idx) => (
                      <label key={idx} className="flex items-center gap-3 py-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => item.onChange(e.target.checked)}
                          className="w-4 h-4 text-[#1e40af] border-slate-300 rounded focus:ring-[#1e40af]/30 focus:ring-2 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {showCompany && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cabeçalho da Empresa</label>
                    <div className="relative">
                      <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value.toUpperCase())}
                        placeholder="NOME DA EMPRESA"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                      />
                    </div>
                  </div>
                )}

                {/* Tamanho da Fonte do Produto */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tamanho do Nome (Fonte)</label>
                    {nameFontSize && (
                      <button 
                        type="button"
                        onClick={() => setNameFontSize('')}
                        className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        [ Usar Padrão ]
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 bg-slate-50/60 p-3 rounded-2xl border border-slate-150">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="7"
                        max="24"
                        value={nameFontSize || (
                          layout === 'pimaco_6180' ? '9' :
                          layout === 'gondola' ? '13' :
                          layout === 'zebra_1col' ? '10' :
                          layout === 'zebra_2col' ? '8' :
                          layout === 'zebra_weight' ? '11' : '10'
                        )}
                        onChange={(e) => setNameFontSize(e.target.value)}
                        className="flex-1 accent-[#1e40af] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs font-black font-mono bg-white px-2 py-1 border border-slate-200 rounded-lg text-slate-700 w-12 text-center shrink-0">
                        {nameFontSize || (
                          layout === 'pimaco_6180' ? '9' :
                          layout === 'gondola' ? '13' :
                          layout === 'zebra_1col' ? '10' :
                          layout === 'zebra_2col' ? '8' :
                          layout === 'zebra_weight' ? '11' : '10'
                        )}px
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-normal">
                      Ajuste para aumentar ou diminuir a letra do nome do produto. Ideal para melhorar a leitura ou reduzir para nomes muito extensos!
                    </p>
                  </div>
                </div>

                {/* Tamanho dos Demais Textos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tamanho dos Demais Textos (Preço, Peso, Datas)</label>
                    {otherFontSize !== '0' && (
                      <button 
                        type="button"
                        onClick={() => setOtherFontSize('0')}
                        className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        [ Resetar ]
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 bg-slate-50/60 p-3 rounded-2xl border border-slate-150">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="-3"
                        max="6"
                        value={otherFontSize}
                        onChange={(e) => setOtherFontSize(e.target.value)}
                        className="flex-1 accent-[#1e40af] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs font-black font-mono bg-white px-2 py-1 border border-slate-200 rounded-lg text-slate-700 w-16 text-center shrink-0">
                        {parseInt(otherFontSize || '0', 10) >= 0 ? `+${otherFontSize}` : otherFontSize}px
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-normal">
                      Aumente ou diminua uniformemente as demais informações impressas na etiqueta (como Preços, Peso Líquido, Datas e Nome da Empresa).
                    </p>
                  </div>
                </div>

                {layout === 'zebra_weight' && (
                  <div className="space-y-3 bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50 animate-in fade-in duration-200">
                    <span className="text-[10px] font-black uppercase text-[#1e40af] tracking-wider block">Informações de Balança (Pesáveis)</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-500">Peso Líquido (Kg)</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          placeholder="Ex: 0.350"
                          value={weightValue}
                          onChange={(e) => setWeightValue(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-500">Validade (Dias)</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Ex: 5"
                          value={expiryDays}
                          onChange={(e) => setExpiryDays(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Data de Embalagem</label>
                      <input
                        type="date"
                        value={packingDate}
                        onChange={(e) => setPackingDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Print Orientation & Rotation Settings (Thermal Printers Fixes) */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <RotateCw size={14} className="text-[#1e40af] animate-spin-slow" />
                <h5 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Ajuste de Impressão e Alinhamento (Bobina Térmica)</h5>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Orientação da Página */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Orientação da Página</label>
                  <select
                    value={pageOrientation}
                    onChange={(e) => setPageOrientation(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1e40af] cursor-pointer"
                  >
                    <option value="auto">AUTOMÁTICO (PADRÃO)</option>
                    <option value="landscape">PAISAGEM (HORIZONTAL)</option>
                    <option value="portrait">RETRATO (VERTICAL)</option>
                  </select>
                </div>

                {/* 2. Rotação das Etiquetas */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Girar Conteúdo (Rotação)</label>
                  <select
                    value={rotation}
                    onChange={(e) => setRotation(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1e40af] cursor-pointer"
                  >
                    <option value="0">SEM ROTAÇÃO (0°)</option>
                    <option value="90">90° SENTIDO HORÁRIO</option>
                    <option value="180">180° DE PONTA-CABEÇA</option>
                    <option value="270">270° SENTIDO ANTI-HORÁRIO</option>
                  </select>
                </div>

                {/* 3. Inverter Dimensões */}
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-3 py-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={swapDimensions}
                      onChange={(e) => setSwapDimensions(e.target.checked)}
                      className="w-4 h-4 text-[#1e40af] border-slate-300 rounded focus:ring-[#1e40af]/30 focus:ring-2 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Inverter Dimensões</span>
                      <span className="text-[9px] text-slate-400 font-medium leading-none">Trocar Largura x Altura</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Overrides de Dimensão Manual (Caso a impressora force rotação errada) */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3 mt-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-[#1e40af] tracking-wider">Ajuste Fino de Dimensões (Opcional - em Milímetros)</span>
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">
                    Se sua impressora de bobina imprime deitado ou cortado, force as dimensões exatas da página e da etiqueta abaixo. Ex: Se usa etiqueta 50mm x 30mm mas a impressão sai na vertical, você pode configurar Largura da Página para 50 ou 30 para compensar!
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Largura Página (mm)</label>
                    <input
                      type="number"
                      placeholder="Ex: 50"
                      value={pageWidthOverride}
                      onChange={(e) => setPageWidthOverride(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Altura Página (mm)</label>
                    <input
                      type="number"
                      placeholder="Ex: 30"
                      value={pageHeightOverride}
                      onChange={(e) => setPageHeightOverride(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Largura Etiqueta (mm)</label>
                    <input
                      type="number"
                      placeholder="Ex: 50"
                      value={labelWidthOverride}
                      onChange={(e) => setLabelWidthOverride(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Altura Etiqueta (mm)</label>
                    <input
                      type="number"
                      placeholder="Ex: 30"
                      value={labelHeightOverride}
                      onChange={(e) => setLabelHeightOverride(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                    />
                  </div>
                </div>

                {(pageWidthOverride || pageHeightOverride || labelWidthOverride || labelHeightOverride) && (
                  <button
                    onClick={() => {
                      setPageWidthOverride('');
                      setPageHeightOverride('');
                      setLabelWidthOverride('');
                      setLabelHeightOverride('');
                    }}
                    className="text-[9px] font-bold uppercase text-rose-500 hover:text-rose-600 transition-colors cursor-pointer block mt-1 text-left"
                  >
                    [ Limpar Ajustes Finos e Usar Padrão ]
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Print Queue */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <Tag size={16} className="stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">2. Fila de Impressão</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Produtos selecionados para as etiquetas</p>
                </div>
              </div>

              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-lg text-[10px] font-black uppercase italic tracking-wider transition-all cursor-pointer"
                >
                  <RotateCcw size={11} />
                  Limpar Fila
                </button>
              )}
            </div>

            {/* Queue items list */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {queue.length > 0 ? (
                queue.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-150 group transition-all hover:bg-white hover:border-slate-350"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black font-mono uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                          {item.sku}
                        </span>
                        {item.brand && (
                          <span className="text-[9px] font-extrabold uppercase text-[#1e40af] leading-none">
                            {item.brand}
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-black text-slate-800 uppercase italic truncate max-w-[280px] mt-1.5">
                        {item.name}
                      </h5>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                        Preço Unitário: <span className="font-mono text-slate-700">{formatCurrency(item.price)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Quantity Selector */}
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                        <button
                          onClick={() => updateCopies(item.id, -1)}
                          className="w-7 h-7 rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-8 text-center text-xs font-mono font-black text-slate-800 select-none">
                          {item.copies}
                        </span>
                        <button
                          onClick={() => updateCopies(item.id, 1)}
                          className="w-7 h-7 rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="p-2 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Remover produto da fila"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 mb-3">
                    <BarcodeIcon size={20} className="stroke-[1.5]" />
                  </div>
                  <h5 className="text-xs font-black uppercase text-slate-600 italic tracking-wider">A Fila de Etiquetas está Vazia</h5>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1 max-w-xs leading-relaxed">
                    Pesquise e adicione produtos no painel ao lado para preencher sua fila de etiquetas de preço e códigos de barras.
                  </p>
                </div>
              )}
            </div>

            {/* Print trigger button */}
            {queue.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={handlePrint}
                  className="w-full h-12 bg-[#1e40af] hover:bg-[#1d4ed8] text-white rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[#1e40af]/15 cursor-pointer select-none"
                >
                  <Printer size={16} />
                  Imprimir {allLabels.length} Etiquetas
                </button>
                {isInIframe && (
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide text-center leading-relaxed">
                    ⚠️ Nota: Clique para ver instruções se a impressão falhar.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Product Search & Add (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Product search box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1e40af]/10 border border-[#1e40af]/20 flex items-center justify-center text-[#1e40af]">
                  <Search size={15} className="stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase italic tracking-tight">Buscar Produtos</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pesquise produtos ativos do catálogo</p>
                </div>
              </div>

              {filteredProducts.length > 0 && (
                <button
                  onClick={addFilteredToQueue}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e40af]/5 hover:bg-[#1e40af]/10 text-[#1e40af] border border-[#1e40af]/15 rounded-lg text-[9px] font-black uppercase italic tracking-wider transition-all cursor-pointer"
                  title="Adicionar todos os itens listados"
                >
                  <Plus size={10} />
                  Add Todos ({filteredProducts.length})
                </button>
              )}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, SKU, código..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1e40af] cursor-pointer"
                >
                  <option value="all">TODAS AS CATEGORIAS</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable products results */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredProducts.length > 0 ? (
                filteredProducts.slice(0, 50).map((prod) => {
                  const inQueue = queue.find(q => q.id === prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => addToQueue(prod)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                        inQueue 
                          ? "bg-emerald-50/50 border-emerald-250 hover:bg-emerald-50 hover:border-emerald-350" 
                          : "bg-slate-50/30 border-slate-150 hover:bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono font-black uppercase text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                            {prod.sku || 'N/A'}
                          </span>
                          {prod.brand && (
                            <span className="text-[8px] font-black uppercase text-slate-500">
                              {prod.brand}
                            </span>
                          )}
                        </div>
                        <h6 className="text-[11px] font-bold text-slate-700 uppercase italic truncate mt-1">
                          {prod.name}
                        </h6>
                        <span className="text-[10px] font-mono font-black text-brand-blue">
                          {formatCurrency(prod.salePrice)}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center justify-center">
                        {inQueue ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Check size={13} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-[#1e40af] hover:text-white hover:border-[#1e40af] transition-all">
                            <Plus size={13} strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs font-black text-slate-400 uppercase italic">
                  Nenhum produto correspondente
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LIVE PREVIEW AREA (ONLY SHOWN ON SCREEN) */}
      <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-250/50 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500 animate-pulse" />
            <h5 className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Visualização em Tempo Real (Pré-visualização)</h5>
          </div>
          <span className="text-[9px] font-mono font-black uppercase text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
            Tamanho: {layout === 'pimaco_6180' ? 'Folha A4' : 'Etiqueta Individual'}
          </span>
        </div>

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-relaxed">
          As dimensões, bordas e espaçamentos abaixo representam exatamente a folha de etiquetas que será enviada para a impressora. Para imprimir, basta usar as configurações de margem padrão do navegador.
        </p>

        {/* Dynamic preview grid on screen */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 overflow-x-auto flex justify-center max-h-[500px] overflow-y-auto">
          {layout === 'pimaco_6180' ? (
            /* Pimaco Sheet Screen representation */
            <div className="w-[210mm] min-h-[297mm] bg-white border border-slate-300 shadow-xl p-[10.5mm] pl-[5mm] pr-[5mm] grid grid-cols-3 auto-rows-[25.4mm] gap-x-[3mm] gap-y-0 scale-90 origin-top">
              {allLabels.map((lbl, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-[66.7mm] h-[25.4mm] p-2 flex flex-col justify-between items-center text-center overflow-hidden box-border font-sans select-none",
                    showBorder ? "border border-slate-100" : ""
                  )}
                >
                  {/* Top line (Header / Company Name) */}
                  {showCompany && (
                    <span style={{ fontSize: getOtherFontSize(7) }} className="font-extrabold uppercase text-slate-400 tracking-widest leading-none truncate max-w-full">
                      {companyName}
                    </span>
                  )}

                  {/* Middle Line (Product Description) */}
                  <div className="w-full text-center min-w-0">
                    <span style={{ fontSize: getNameFontSize('pimaco_6180') }} className="font-black text-slate-900 uppercase italic line-clamp-1 block leading-tight">
                      {lbl.name}
                    </span>
                    {showBrand && lbl.brand && (
                      <span style={{ fontSize: getOtherFontSize(7) }} className="font-bold text-[#1e40af] uppercase block leading-none mt-0.5">
                        {lbl.brand}
                      </span>
                    )}
                  </div>

                  {/* Core Value & Barcode Row */}
                  <div className="w-full flex items-center justify-between gap-1 mt-1 shrink-0">
                    {showBarcode && (
                      <div className="scale-75 origin-left -translate-y-1">
                        <Barcode39 value={lbl.barcode} height={16} />
                      </div>
                    )}
                    {showPrice && (
                      <div className="text-right shrink-0">
                        <span style={{ fontSize: getOtherFontSize(8) }} className="font-bold text-slate-500 block leading-none uppercase">Preço</span>
                        <span style={{ fontSize: getOtherFontSize(12) }} className="font-black font-mono text-slate-900 block leading-none mt-0.5">
                          {formatCurrency(lbl.price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Thermal/Zebra layout preview */
            <div className="flex flex-wrap gap-6 justify-center py-4">
              {allLabels.slice(0, 20).map((lbl, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "bg-white flex flex-col justify-between p-3 font-sans border border-slate-400 rounded-lg shadow-sm box-border select-none transition-all duration-300"
                  )}
                  style={{
                    width: getLabelWidth(),
                    height: getLabelHeight(),
                    transform: rotation !== '0' ? `rotate(${rotation}deg)` : undefined,
                  }}
                >
                  {layout === 'gondola' ? (
                    /* Shelf layout: Huge Price, Barcode on right or bottom */
                    <>
                      {showCompany && (
                        <div style={{ fontSize: getOtherFontSize(8) }} className="font-black uppercase text-slate-400 tracking-widest leading-none truncate border-b border-slate-100 pb-1">
                          {companyName}
                        </div>
                      )}
                      
                      <div className="min-w-0 my-1">
                        <span style={{ fontSize: getNameFontSize('gondola') }} className="font-black text-slate-950 uppercase italic line-clamp-1 block leading-tight">
                          {lbl.name}
                        </span>
                        {showBrand && lbl.brand && (
                          <span style={{ fontSize: getOtherFontSize(8) }} className="font-bold text-[#1e40af] uppercase block leading-none mt-0.5">
                            {lbl.brand}
                          </span>
                        )}
                      </div>

                      <div className="flex items-end justify-between gap-2 mt-auto shrink-0">
                        {showBarcode && (
                          <div className="scale-90 origin-left">
                            <Barcode39 value={lbl.barcode} height={20} />
                          </div>
                        )}
                        {showPrice && (
                          <div className="text-right">
                            <span style={{ fontSize: getOtherFontSize(9) }} className="font-extrabold text-[#1e40af] block leading-none uppercase tracking-wide">Valor de Venda</span>
                            <span style={{ fontSize: getOtherFontSize(20) }} className="font-black font-mono text-slate-950 block leading-none mt-1">
                              {formatCurrency(lbl.price)}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : layout === 'zebra_1col' ? (
                    /* Zebra 1 column (50x30mm) */
                    <>
                      {showCompany && (
                        <span style={{ fontSize: getOtherFontSize(7) }} className="font-black uppercase text-slate-400 tracking-wider leading-none">
                          {companyName}
                        </span>
                      )}
                      
                      <div className="w-full text-center min-w-0 my-0.5">
                        <span style={{ fontSize: getNameFontSize('zebra_1col') }} className="font-black text-slate-900 uppercase italic line-clamp-1 block">
                          {lbl.name}
                        </span>
                        {showBrand && lbl.brand && (
                          <span style={{ fontSize: getOtherFontSize(7) }} className="font-bold text-[#1e40af] uppercase block leading-none">
                            {lbl.brand}
                          </span>
                        )}
                      </div>

                      {showBarcode && (
                        <div className="scale-80">
                          <Barcode39 value={lbl.barcode} height={15} />
                        </div>
                      )}

                      {showPrice && (
                        <div style={{ fontSize: getOtherFontSize(12) }} className="text-center font-mono font-black text-slate-950 leading-none">
                          {formatCurrency(lbl.price)}
                        </div>
                      )}
                    </>
                  ) : layout === 'zebra_weight' ? (
                    /* Zebra weight/balança preview layout */
                    <div className="w-full h-full flex flex-col justify-between text-slate-950 font-sans text-[10px]">
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-0.5 shrink-0">
                        {showCompany ? (
                          <span style={{ fontSize: getOtherFontSize(7.5) }} className="font-black uppercase tracking-wider text-slate-800 leading-none truncate max-w-[55%]">
                            {companyName}
                          </span>
                        ) : (
                          <span style={{ fontSize: getOtherFontSize(7.5) }} className="font-bold text-slate-500 uppercase">PRODUTO PESÁVEL</span>
                        )}
                        <div style={{ fontSize: getOtherFontSize(6.5) }} className="flex gap-1.5 font-extrabold text-slate-600 uppercase shrink-0 leading-none">
                          <span>EMB: {formatDateToBR(packingDate)}</span>
                          {expiryDays && <span>VAL: {getExpiryDateStr(packingDate, expiryDays)}</span>}
                        </div>
                      </div>

                      {/* Product Name */}
                      <div className="my-1 text-left min-w-0 flex-1 flex flex-col justify-center">
                        <span style={{ fontSize: getNameFontSize('zebra_weight') }} className="font-black text-slate-900 uppercase leading-tight line-clamp-2">
                          {lbl.name}
                        </span>
                        {showBrand && lbl.brand && (
                          <span style={{ fontSize: getOtherFontSize(7) }} className="font-bold text-[#1e40af] uppercase mt-0.5 leading-none">
                            {lbl.brand}
                          </span>
                        )}
                      </div>

                      {/* Weight Grid Details */}
                      <div className="grid grid-cols-3 border border-slate-300 divide-x divide-slate-300 text-center shrink-0 mb-1">
                        <div className="py-0.5 px-1 bg-slate-50/50">
                          <span style={{ fontSize: getOtherFontSize(6) }} className="font-extrabold text-slate-500 uppercase block leading-none">PREÇO/KG</span>
                          <span style={{ fontSize: getOtherFontSize(9) }} className="font-black font-mono text-slate-800 leading-tight block mt-0.5">
                            {formatCurrency(lbl.price)}
                          </span>
                        </div>
                        <div className="py-0.5 px-1">
                          <span style={{ fontSize: getOtherFontSize(6) }} className="font-extrabold text-slate-500 uppercase block leading-none">PESO LÍQ.</span>
                          <span style={{ fontSize: getOtherFontSize(9) }} className="font-black font-mono text-slate-800 leading-tight block mt-0.5">
                            {Number(weightValue).toFixed(3).replace('.', ',')} kg
                          </span>
                        </div>
                        <div className="py-0.5 px-1 bg-slate-100">
                          <span style={{ fontSize: getOtherFontSize(6) }} className="font-black text-[#1e40af] uppercase block leading-none">TOTAL PAGAR</span>
                          <span style={{ fontSize: getOtherFontSize(10.5) }} className="font-black font-mono text-slate-950 leading-tight block mt-0.5">
                            {formatCurrency(lbl.price * Number(weightValue))}
                          </span>
                        </div>
                      </div>

                      {/* Barcode block */}
                      {showBarcode && (
                        <div className="w-full flex justify-center scale-90 origin-center -mb-0.5 shrink-0">
                          <Barcode39 
                            value={generateScaleBarcode(lbl.sku || lbl.barcode, lbl.price, Number(weightValue))} 
                            height={15} 
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Zebra 2 columns (38x25mm) */
                    <>
                      {showCompany && (
                        <span style={{ fontSize: getOtherFontSize(6) }} className="font-black uppercase text-slate-400 tracking-wider leading-none">
                          {companyName}
                        </span>
                      )}
                      
                      <div className="w-full text-center min-w-0">
                        <span style={{ fontSize: getNameFontSize('zebra_2col') }} className="font-black text-slate-900 uppercase italic line-clamp-1 block leading-tight">
                          {lbl.name}
                        </span>
                      </div>

                      {showBarcode && (
                        <div className="scale-70 origin-center -my-1">
                          <Barcode39 value={lbl.barcode} height={12} />
                        </div>
                      )}

                      {showPrice && (
                        <div style={{ fontSize: getOtherFontSize(10) }} className="text-center font-mono font-black text-slate-950 leading-none">
                          {formatCurrency(lbl.price)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              {allLabels.length > 20 && (
                <div className="w-full text-center text-[10px] font-black uppercase italic text-slate-400 py-3 border-t border-slate-100">
                  + {allLabels.length - 20} etiquetas ocultas na pré-visualização de tela.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Iframe Print Support Modal */}
      <AnimatePresence>
        {showIframeModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                  <AlertTriangle size={32} className="stroke-[1.5]" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-base font-black text-slate-800 uppercase italic tracking-tight">
                    Impressão Bloqueada pelo Navegador
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Como você está visualizando o ERP dentro da ferramenta do AI Studio, o navegador bloqueia a exibição de janelas de impressão (sandboxed iframe).
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-600 font-bold uppercase tracking-wide">
                💡 <span className="text-slate-800">Instruções rápidas:</span>
                <ol className="list-decimal pl-4 mt-2 space-y-1.5 font-medium text-slate-500 normal-case">
                  <li>Clique no botão abaixo para abrir o ERP em uma nova aba cheia do seu navegador.</li>
                  <li>Navegue até a aba de Produtos, clique em <strong>"Imprimir Etiquetas"</strong>.</li>
                  <li>Pronto! O diálogo de impressão abrirá normalmente sem bloqueios.</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open(window.location.origin + window.location.pathname, '_blank');
                    }
                    setShowIframeModal(false);
                  }}
                  className="flex-1 h-11 bg-[#1e40af] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-black uppercase italic tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-[#1e40af]/15 cursor-pointer select-none"
                >
                  <ExternalLink size={14} />
                  Abrir em Nova Aba
                </button>
                <button
                  type="button"
                  onClick={() => setShowIframeModal(false)}
                  className="h-11 px-5 border border-slate-250 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer select-none"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT AREA (COMPLETELY HIDDEN FROM SCREEN, TARGETED BY MEDIA PRINT CSS) */}
      <div id="print-root" className="hidden print:block">
        {allLabels.map((lbl, idx) => (
          <div key={idx} className="print-label-item">
            {layout === 'pimaco_6180' ? (
              /* Pimaco Sheet print layout */
              <>
                {showCompany && (
                  <span style={{ fontSize: getOtherFontSize(7), fontWeight: 'bold', textTransform: 'uppercase', color: '#666', letterSpacing: '0.1em', display: 'block' }}>
                    {companyName}
                  </span>
                )}
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <span style={{ fontSize: getNameFontSize('pimaco_6180'), fontWeight: 'bold', textTransform: 'uppercase', fontStyle: 'italic', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lbl.name}
                  </span>
                  {showBrand && lbl.brand && (
                    <span style={{ fontSize: getOtherFontSize(7), fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af', display: 'block' }}>
                      {lbl.brand}
                    </span>
                  )}
                </div>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  {showBarcode && (
                    <div style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>
                      <Barcode39 value={lbl.barcode} height={18} />
                    </div>
                  )}
                  {showPrice && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: getOtherFontSize(8), fontWeight: 'bold', color: '#666', display: 'block' }}>Preço</span>
                      <span style={{ fontSize: getOtherFontSize(12), fontWeight: '900', fontFamily: 'monospace', color: '#000', display: 'block' }}>
                        {formatCurrency(lbl.price)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : layout === 'gondola' ? (
              /* Gondola print layout */
              <>
                {showCompany && (
                  <div style={{ fontSize: getOtherFontSize(8), fontWeight: 'bold', textTransform: 'uppercase', color: '#666', letterSpacing: '0.1em', borderBottom: '0.1mm solid #ddd', paddingBottom: '2px' }}>
                    {companyName}
                  </div>
                )}
                
                <div style={{ margin: '4px 0' }}>
                  <span style={{ fontSize: getNameFontSize('gondola'), fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lbl.name}
                  </span>
                  {showBrand && lbl.brand && (
                    <span style={{ fontSize: getOtherFontSize(8), fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af', display: 'block' }}>
                      {lbl.brand}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', marginTop: 'auto' }}>
                  {showBarcode && (
                    <div style={{ transform: 'scale(0.95)', transformOrigin: 'left' }}>
                      <Barcode39 value={lbl.barcode} height={20} />
                    </div>
                  )}
                  {showPrice && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: getOtherFontSize(8), fontWeight: 'bold', color: '#1e40af', display: 'block', textTransform: 'uppercase' }}>Valor de Venda</span>
                      <span style={{ fontSize: getOtherFontSize(20), fontWeight: '900', fontFamily: 'monospace', color: '#000', display: 'block', lineHeight: '1' }}>
                        {formatCurrency(lbl.price)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : layout === 'zebra_1col' ? (
              /* Zebra 1 column print layout */
              <>
                {showCompany && (
                  <span style={{ fontSize: getOtherFontSize(7), fontWeight: 'bold', textTransform: 'uppercase', color: '#666', display: 'block', textAlign: 'center' }}>
                    {companyName}
                  </span>
                )}
                
                <div style={{ width: '100%', textAlign: 'center', margin: '2px 0' }}>
                  <span style={{ fontSize: getNameFontSize('zebra_1col'), fontWeight: 'bold', textTransform: 'uppercase', fontStyle: 'italic', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lbl.name}
                  </span>
                  {showBrand && lbl.brand && (
                    <span style={{ fontSize: getOtherFontSize(7), fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af', display: 'block' }}>
                      {lbl.brand}
                    </span>
                  )}
                </div>

                {showBarcode && (
                  <div style={{ transform: 'scale(0.85)', transformOrigin: 'center' }}>
                    <Barcode39 value={lbl.barcode} height={16} />
                  </div>
                )}

                {showPrice && (
                  <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: getOtherFontSize(12), fontWeight: 'bold', color: '#000' }}>
                    {formatCurrency(lbl.price)}
                  </div>
                )}
              </>
            ) : layout === 'zebra_weight' ? (
              /* Zebra weight/balança print layout */
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'sans-serif', color: '#000', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.1mm dashed #999', paddingBottom: '2px', fontSize: getOtherFontSize(7.5) }}>
                  {showCompany ? (
                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' }}>
                      {companyName}
                    </span>
                  ) : (
                    <span style={{ fontWeight: 'bold', color: '#666' }}>PRODUTO PESÁVEL</span>
                  )}
                  <div style={{ display: 'flex', gap: '6px', fontWeight: 'bold', textTransform: 'uppercase', color: '#333' }}>
                    <span>EMB: {formatDateToBR(packingDate)}</span>
                    {expiryDays && <span>VAL: {getExpiryDateStr(packingDate, expiryDays)}</span>}
                  </div>
                </div>

                <div style={{ margin: '3px 0', textAlign: 'left' }}>
                  <span style={{ fontSize: getNameFontSize('zebra_weight'), fontWeight: 'bold', textTransform: 'uppercase', display: 'block', lineHeight: '1.2' }}>
                    {lbl.name}
                  </span>
                  {showBrand && lbl.brand && (
                    <span style={{ fontSize: getOtherFontSize(7), fontWeight: 'bold', textTransform: 'uppercase', color: '#1e40af', display: 'block', marginTop: '1px' }}>
                      {lbl.brand}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '0.15mm solid #333', textAlign: 'center', fontSize: getOtherFontSize(9), marginBottom: '2px' }}>
                  <div style={{ padding: '2px 1px', borderRight: '0.15mm solid #333', background: '#f5f5f5' }}>
                    <span style={{ fontSize: getOtherFontSize(5.5), fontWeight: 'bold', display: 'block', color: '#666' }}>PREÇO/KG</span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace', display: 'block', marginTop: '1px' }}>
                      {formatCurrency(lbl.price)}
                    </span>
                  </div>
                  <div style={{ padding: '2px 1px', borderRight: '0.15mm solid #333' }}>
                    <span style={{ fontSize: getOtherFontSize(5.5), fontWeight: 'bold', display: 'block', color: '#666' }}>PESO LÍQ.</span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace', display: 'block', marginTop: '1px' }}>
                      {Number(weightValue).toFixed(3).replace('.', ',')} kg
                    </span>
                  </div>
                  <div style={{ padding: '2px 1px', background: '#e0e0e0' }}>
                    <span style={{ fontSize: getOtherFontSize(5.5), fontWeight: 'bold', display: 'block', color: '#000' }}>TOTAL PAGAR</span>
                    <span style={{ fontWeight: '950', fontFamily: 'monospace', fontSize: getOtherFontSize(10.5), display: 'block', marginTop: '1px' }}>
                      {formatCurrency(lbl.price * Number(weightValue))}
                    </span>
                  </div>
                </div>

                {showBarcode && (
                  <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(0.9)', transformOrigin: 'center', margin: '0' }}>
                    <Barcode39 
                      value={generateScaleBarcode(lbl.sku || lbl.barcode, lbl.price, Number(weightValue))} 
                      height={14} 
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Zebra 2 columns print layout */
              <>
                {showCompany && (
                  <span style={{ fontSize: getOtherFontSize(6), fontWeight: 'bold', textTransform: 'uppercase', color: '#666', display: 'block', textAlign: 'center' }}>
                    {companyName}
                  </span>
                )}
                
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <span style={{ fontSize: getNameFontSize('zebra_2col'), fontWeight: 'bold', textTransform: 'uppercase', fontStyle: 'italic', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lbl.name}
                  </span>
                </div>

                {showBarcode && (
                  <div style={{ transform: 'scale(0.7)', transformOrigin: 'center', margin: '-4px 0' }}>
                    <Barcode39 value={lbl.barcode} height={12} />
                  </div>
                )}

                {showPrice && (
                  <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: getOtherFontSize(10), fontWeight: 'bold', color: '#000' }}>
                    {formatCurrency(lbl.price)}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
