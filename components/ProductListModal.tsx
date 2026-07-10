import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Package, ShoppingCart } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Product } from '@/lib/types';
import { cn, getLocalDateString } from '@/lib/utils';

interface ProductListModalProps {
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  products?: Product[];
}

export function ProductListModal({ onClose, onSelectProduct, products: propProducts }: ProductListModalProps) {
  const { products: contextProducts, promotions, subcategorias } = useERP();
  const products = propProducts || contextProducts;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  const filteredProducts = React.useMemo(() => {
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
    return [...products]
      .filter(p => {
        if (p.status === 'Inativo') return false;
        const stock = parseFloat(String(p.stock));
        if (isNaN(stock) || stock <= 0) return false;
        const searchableText = `${p.name || ''} ${p.sku || ''} ${p.barcode || ''}`.toLowerCase();
        return searchTerms.length === 0 || searchTerms.every(term => searchableText.includes(term));
      })
      .sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim()))
      .slice(0, 100);
  }, [products, searchTerm]); // Limit to 100 results for performance

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const element = document.getElementById(`product-list-item-${selectedIndex}`);
      if (element) {
        element.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (filteredProducts.length > 0 && selectedIndex >= 0) {
          onSelectProduct(filteredProducts[selectedIndex]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [filteredProducts, selectedIndex, onClose, onSelectProduct]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100">Lista de Produtos</h2>
              <p className="text-xs font-medium text-slate-500">Selecione um produto para adicionar à venda (Enter)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Buscar por código, SKU ou nome..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-medium focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2" ref={listRef}>
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Package size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  id={`product-list-item-${index}`}
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors border-2",
                    selectedIndex === index 
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500" 
                      : "bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100">{product.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>SKU: {product.sku}</span>
                        {product.barcode && <span>EAN: {product.barcode}</span>}
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-bold",
                          product.stock > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        )}>
                          Estoque: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const promoInfo = getProductPromoInfo(product);
                    return (
                      <div className="text-right flex flex-col items-end">
                        {promoInfo ? (
                          promoInfo.promoPrice !== null ? (
                            <>
                              <div className="flex items-center gap-1.5 justify-end mb-0.5">
                                <span className="text-xs line-through text-slate-400 dark:text-slate-500">
                                  {formatCurrency(product.salePrice)}
                                </span>
                                <span className="bg-rose-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">
                                  {promoInfo.badge}
                                </span>
                              </div>
                              <div className="text-xl font-black text-rose-500 dark:text-rose-400 leading-none">
                                {formatCurrency(promoInfo.promoPrice)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="mb-1 leading-none">
                                <span className="bg-amber-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">
                                  {promoInfo.badge}
                                </span>
                              </div>
                              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                                {formatCurrency(product.salePrice)}
                              </div>
                            </>
                          )
                        ) : (
                          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(product.salePrice)}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-400 mt-1 justify-end">
                          <ShoppingCart size={12} />
                          <span>Selecionar</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
