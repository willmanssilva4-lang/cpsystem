'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Tag, Package, ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useERP } from '@/lib/context';
import { Product } from '@/lib/types';
import { cn, getLocalDateString } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Advertisement } from '@/lib/types';

function AdvertisementSystem({ ads, isFullScreen }: { ads: Advertisement[], isFullScreen?: boolean }) {
  const [index, setIndex] = useState(0);
  
  useEffect(() => {
    const activeAds = ads.filter(a => a.ativo);
    if (activeAds.length <= 1) return;
    
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % activeAds.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [ads]);

  const activeAds = ads.filter(a => a.ativo);
  const ad = activeAds[index];

  if (!ad) return null;

  return (
    <div className={cn(
      "w-full h-full animate-in fade-in duration-700",
      isFullScreen ? "" : "zoom-in-95"
    )}>
      <div className={cn(
        "relative w-full h-full overflow-hidden",
        isFullScreen ? "" : "aspect-[21/9] rounded-[3rem] border-8 border-white shadow-2xl shadow-brand-blue/10"
      )}>
        <img 
          src={ad.imagem_url} 
          alt={ad.titulo} 
          className="h-full w-full object-cover transition-all duration-1000"
          key={ad.id}
        />
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end",
          isFullScreen ? "p-12 md:p-24 pb-32" : "p-8 md:p-16"
        )}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            key={`text-${ad.id}`}
            transition={{ delay: 0.2 }}
          >
            <h2 className={cn(
              "font-black text-white uppercase italic tracking-tighter leading-none mb-4",
              isFullScreen ? "text-6xl md:text-9xl" : "text-4xl md:text-7xl"
            )}>
              {ad.titulo}
            </h2>
            <p className={cn(
              "text-white/90 font-bold uppercase tracking-wide italic",
              isFullScreen ? "text-2xl md:text-4xl" : "text-xl md:text-3xl"
            )}>
              {ad.descricao}
            </p>
          </motion.div>
        </div>
        
        {/* Indicators */}
        <div className={cn(
          "absolute flex gap-3",
          isFullScreen ? "top-12 right-12" : "top-8 right-8"
        )}>
          {activeAds.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                i === index ? (isFullScreen ? "w-12 bg-white" : "w-8 bg-white") : "w-2 bg-white/30"
              )} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PriceCheckPage() {
  const router = useRouter();
  const { products, companySettings, setCustomAlert, advertisements, promotions, subcategorias } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getProductPromoInfo = React.useCallback((product: Product) => {
    if (!promotions) return null;
    const now = new Date();
    const todayStr = getLocalDateString(now);
    
    // Find active promotions that might apply to this product
    const activePromos = promotions.filter(p => {
      const startStr = getLocalDateString(p.startDate);
      const endStr = getLocalDateString(p.endDate);
      return (
        p.status === 'ACTIVE' && 
        p.applyAutomatically &&
        startStr <= todayStr && 
        todayStr <= endStr &&
        (!p.daysOfWeek || p.daysOfWeek.includes(now.getDay()))
      );
    });

    const productSubcategory = subcategorias?.find(s => s.id === product.subcategoria_id);
    
    const applicablePromo = activePromos.find(p => 
      (p.targetType === 'PRODUCT' && (Array.isArray(p.targetId) ? p.targetId.includes(product.id) : p.targetId === product.id)) ||
      (p.targetType === 'CATEGORY' && p.targetId === productSubcategory?.categoria_id) ||
      p.targetType === 'ALL'
    );

    if (!applicablePromo) return null;

    let promoPrice = product.salePrice;
    let promoDiscount = 0;

    let basePrice = product.salePrice;

    if (applicablePromo.type === 'PRICE') {
      if (applicablePromo.productPrices && applicablePromo.productPrices[product.id]) {
        promoPrice = applicablePromo.productPrices[product.id];
        promoDiscount = basePrice - promoPrice;
      } else if (applicablePromo.discountValue) {
        promoPrice = basePrice - applicablePromo.discountValue;
        promoDiscount = applicablePromo.discountValue;
      }
    } else if (applicablePromo.type === 'PERCENTAGE' && applicablePromo.discountValue) {
      promoDiscount = basePrice * (applicablePromo.discountValue / 100);
      promoPrice = basePrice - promoDiscount;
    } else if (applicablePromo.type === 'BUY_X_GET_Y') {
      return {
        promo: applicablePromo,
        badge: `Leve ${applicablePromo.buyQuantity} Pague ${applicablePromo.payQuantity}`,
        promoPrice: null,
        promoDiscount: null
      };
    } else if (applicablePromo.type === 'COMBO') {
      return {
        promo: applicablePromo,
        badge: `Combo Especial`,
        promoPrice: null,
        promoDiscount: null
      };
    }

    return {
      promo: applicablePromo,
      badge: applicablePromo.type === 'PERCENTAGE' ? `-${applicablePromo.discountValue}%` : `OFERTA`,
      promoPrice: Math.max(0, promoPrice),
      promoDiscount
    };
  }, [promotions, subcategorias]);

  // Inactivity timer to return to ads after 5 seconds
  useEffect(() => {
    if (searchTerm || result) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        setSearchTerm('');
        setResult(null);
      }, 5000);
    }
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [searchTerm, result]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    
    // Keep input focused for the scanner
    const interval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        setCustomAlert({ message: 'Para usar tela cheia, abra o sistema em uma nova aba do navegador.', type: 'info' });
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!searchTerm.trim()) return;

    const term = searchTerm.toLowerCase().trim();
    const product = products.find(p => 
      (p.sku.toLowerCase() === term || 
      p.barcode === term ||
      p.name.toLowerCase().includes(term)) &&
      p.product_type !== 'BASE'
    );

    if (product) {
      setResult(product);
      setSearchTerm('');
      // Auto-clear result after 10 seconds to keep terminal ready for next customer
      const timer = setTimeout(() => {
        setResult(null);
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setError('Produto não encontrado.');
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const isIdle = !searchTerm && !result;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto pt-2 md:pt-4">
      {/* Full Screen Advertisement Overlay */}
      <AnimatePresence>
        {isIdle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black cursor-none"
            onClick={() => inputRef.current?.focus()}
          >
            <AdvertisementSystem ads={advertisements} isFullScreen={true} />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-xl px-8 py-4 rounded-full border border-white/20 text-white font-bold uppercase tracking-[0.2em] text-sm md:text-base animate-pulse shadow-2xl whitespace-nowrap z-50">
              PASSA O CÓDIGO DE BARRA PARA CONSULTAR
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="fixed top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
        <button 
          onClick={() => router.back()}
          className="p-3 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm shadow-lg border border-slate-200 pointer-events-auto"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>
        
        <button 
          onClick={toggleFullScreen}
          className="p-3 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm shadow-lg border border-slate-200 pointer-events-auto"
        >
          {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
          {isFullScreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
        </button>
      </div>

      <div className="w-full max-w-4xl space-y-6 md:space-y-8 pb-10 mt-8 md:mt-4">
        {/* Logo/Title Section */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-7xl font-black text-brand-blue uppercase italic tracking-tighter leading-none">
            Terminal de Consulta
          </h1>
          <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-lg md:text-2xl">
            {companySettings?.tradeName || 'MERCADINHO SUPERNICE'}
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-brand-blue/5 blur-3xl group-focus-within:bg-brand-blue/10 transition-all rounded-full" />
          <div className="relative">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors" size={32} />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Passe o código de barras ou digite o nome..."
              className="w-full pl-20 pr-8 py-6 md:py-8 bg-white border-4 border-slate-100 rounded-[2.5rem] text-2xl md:text-3xl font-black text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-brand-blue transition-all shadow-xl"
            />
          </div>
          {error && (
            <div className="absolute -bottom-10 left-0 right-0 text-center">
              <p className="text-brand-danger font-black uppercase italic tracking-wider animate-pulse">{error}</p>
            </div>
          )}
        </form>

        {/* Result Area */}
        <div className="min-h-[350px] flex items-center justify-center">
          {result ? (
            <div className="w-full bg-white rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-brand-blue/5 animate-in zoom-in-95 duration-300 flex flex-col md:flex-row items-center gap-6 md:gap-10 border-4 border-slate-50">
              <div className="w-48 h-48 md:w-64 md:h-64 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                <Package size={100} className="md:w-32 md:h-32" />
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <span className="inline-block px-4 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                    Produto Encontrado
                  </span>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                    {result.name}
                  </h2>
                  <p className="text-slate-400 font-bold text-sm md:text-base uppercase tracking-wider">
                    SKU: {result.sku}
                  </p>
                </div>

                {(() => {
                  const promoInfo = getProductPromoInfo(result);
                  if (promoInfo) {
                    if (promoInfo.promoPrice !== null) {
                      return (
                        <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-3xl border-2 border-rose-100 dark:border-rose-900/50 flex flex-col items-center md:items-start group animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-rose-600 dark:text-rose-400 font-black uppercase text-xs tracking-widest">
                              De {formatCurrency(result.salePrice || 0)} por apenas:
                            </p>
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase">
                              {promoInfo.badge}
                            </span>
                          </div>
                          <div className="text-5xl md:text-7xl font-black text-rose-600 dark:text-rose-400 leading-none tracking-tighter">
                            {formatCurrency(promoInfo.promoPrice)}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-brand-blue/5 p-6 rounded-3xl border-2 border-brand-blue/10 flex flex-col items-center md:items-start animate-in fade-in duration-300">
                          <div className="mb-2">
                            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase">
                              {promoInfo.badge}
                            </span>
                          </div>
                          <p className="text-brand-blue font-black uppercase text-xs tracking-widest mb-1">Preço de Venda</p>
                          <div className="text-5xl md:text-7xl font-black text-brand-blue leading-none tracking-tighter">
                            {formatCurrency(result.salePrice || 0)}
                          </div>
                        </div>
                      );
                    }
                  }
                  return (
                    <div className="bg-brand-blue/5 p-6 rounded-3xl border-2 border-brand-blue/10">
                      <p className="text-brand-blue font-black uppercase text-xs tracking-widest mb-1">Preço de Venda</p>
                      <div className="text-5xl md:text-7xl font-black text-brand-blue leading-none tracking-tighter">
                        {formatCurrency(result.salePrice || 0)}
                      </div>
                    </div>
                  );
                })()}

                {result.stock <= 0 && (
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase italic tracking-wider text-xs">
                    Indisponível no momento
                  </div>
                )}
              </div>
            </div>
          ) : searchTerm.trim() ? (
            <div className="text-center space-y-6 opacity-30 py-10">
              <div className="w-24 h-24 md:w-32 md:h-32 mx-auto border-4 border-dashed border-slate-300 rounded-full flex items-center justify-center text-slate-300">
                <Search size={40} className="md:w-12 md:h-12" />
              </div>
              <p className="text-lg md:text-xl font-black text-slate-400 uppercase italic tracking-widest">
                Aguardando consulta...
              </p>
            </div>
          ) : (
            <AdvertisementSystem ads={advertisements} />
          )}
        </div>
      </div>
    </div>
  );
}
