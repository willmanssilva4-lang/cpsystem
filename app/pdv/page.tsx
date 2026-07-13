'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { QuickReturnModal } from '@/components/QuickReturnModal';
import { useERP } from '@/lib/context';
import { cn, getLocalDateString, formatDateTimeBR } from '@/lib/utils';
import { Product } from '@/lib/types';
import { getDBValue, setDBValue, removeDBValue } from '@/lib/indexedDb';
import { ProductForm } from '@/components/ProductForm';
import { PaymentModal } from '@/components/PaymentModal';
import { DiscountModal } from '@/components/DiscountModal';
import { AuthorizationModal } from '@/components/AuthorizationModal';
import { CashRegisterManager } from '@/components/CashRegisterManager';
import { PriceCheckModal } from '@/components/PriceCheckModal';
import { ProductListModal } from '@/components/ProductListModal';
import { InvoiceModal } from '@/components/InvoiceModal';
import { Logo } from '@/components/Logo';
import { X, Tag, Lock, AlertCircle, Check, Printer, Maximize, Minimize, Monitor, Image as ImageIcon, Pause, FolderOpen } from 'lucide-react';

const normalizeProduct = (p: any): Product => {
  if (!p) return p;
  
  let costPrice = p.costPrice ?? p.cost_price;
  let image = p.image || '';
  if (image && image.includes('#cost:')) {
    const parts = image.split('#cost:');
    image = parts[0];
    const parsedCost = Number(parts[1]);
    if (!isNaN(parsedCost)) {
      costPrice = parsedCost;
    }
  }

  let rawSalePrice = p.salePrice ?? p.sale_price ?? p.price;
  let salePrice = 0;
  if (rawSalePrice !== null && rawSalePrice !== undefined) {
    salePrice = Number(rawSalePrice);
  }
  if (isNaN(salePrice)) {
    salePrice = 0;
  }

  const costVal = costPrice !== undefined && costPrice !== null ? Number(costPrice) : 0;

  return {
    ...p,
    image,
    costPrice: isNaN(costVal) ? 0 : costVal,
    salePrice,
    sale_price: salePrice,
    cost_price: isNaN(costVal) ? 0 : costVal,
    wholesalePrice: p.wholesalePrice ?? p.wholesale_price,
    wholesale_price: p.wholesalePrice ?? p.wholesale_price,
    wholesaleMinQty: p.wholesaleMinQty ?? p.wholesale_min_qty,
    wholesale_min_qty: p.wholesaleMinQty ?? p.wholesale_min_qty,
    clubPrice: p.clubPrice ?? p.club_price,
    club_price: p.clubPrice ?? p.club_price,
    termPrice: p.termPrice ?? p.term_price,
    term_price: p.termPrice ?? p.term_price,
    minStock: p.minStock ?? p.min_stock,
    min_stock: p.minStock ?? p.min_stock,
    controlStock: p.controlStock ?? p.control_stock,
    control_stock: p.controlStock ?? p.control_stock,
    profit: p.profit,
    profitPercentage: p.profitPercentage ?? 0,
    brand: p.brand ?? p.marca
  };
};

const normalizeProductList = (list: any[]): Product[] => {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProduct);
};

const resolveVirtualAndKitProducts = (productsList: Product[]): Product[] => {
  if (!Array.isArray(productsList)) return [];
  
  const resolvedBasicProducts = normalizeProductList(productsList);

  const resolvedWithVirtual = resolvedBasicProducts.map((p: any) => {
    if (p.base_product_id && p.conversion_factor) {
      const baseProduct = resolvedBasicProducts.find(bp => bp.id === p.base_product_id);
      if (baseProduct) {
        const baseStock = Number(baseProduct.stock || 0);
        const convFactor = Number(p.conversion_factor) || 1;
        const virtualStock = Math.floor(baseStock * convFactor);
        
        const baseCost = Number(baseProduct.costPrice || 0);
        const virtualCost = Number((baseCost / convFactor).toFixed(3));
        
        return {
          ...p,
          stock: virtualStock,
          costPrice: virtualCost,
        };
      }
    }
    return p;
  });

  const resolvedProducts = resolvedWithVirtual.map((p: any) => {
    if (p.product_type === 'KIT' && p.composition && Array.isArray(p.composition)) {
      const updatedComposition = p.composition.map((item: any) => {
        const compProd = resolvedWithVirtual.find(bp => bp.id === item.productId);
        return {
          ...item,
          price: compProd ? compProd.costPrice : (item.price || 0)
        };
      });
      const dynamicCostPrice = Number(updatedComposition.reduce((acc: number, item: any) => acc + ((item.price || 0) * item.quantity), 0).toFixed(3));
      
      let kitStock = Infinity;
      if (updatedComposition.length > 0) {
        updatedComposition.forEach((item: any) => {
          const component = resolvedWithVirtual.find(bp => bp.id === item.productId);
          if (component) {
            const compStock = Number(component.stock || 0);
            const qtyNeeded = Number(item.quantity) || 1;
            const available = Math.floor(compStock / qtyNeeded);
            if (available < kitStock) {
              kitStock = available;
            }
          } else {
            kitStock = 0;
          }
        });
      }
      if (kitStock === Infinity) kitStock = 0;

      return {
        ...p,
        composition: updatedComposition,
        costPrice: dynamicCostPrice,
        stock: Math.max(Number(p.stock || 0), kitStock)
      };
    }
    
    return p;
  });

  return resolvedProducts;
};

export default function PDVPage() {
  const router = useRouter();
  const { products: originalProducts, fetchData, addSale, addProduct, addDiscountLog, companySettings, systemSettings, user, systemUsers, accessProfiles, activeRegister, hasPermission, promotions, subcategorias, customers, setCustomAlert, isLoading, deleteSale, advertisements = [], logout } = useERP();
  
  const handleExitPDV = useCallback(async () => {
    const role = user?.role?.trim().toLowerCase() || '';
    if (role === 'caixa' || role === 'operador de caixa') {
      if (logout) {
        await logout();
      }
      router.push('/login');
    } else {
      router.push('/');
    }
  }, [user, logout, router]);

  const [products, setProducts] = useState<Product[]>([]);
  const [hasPendingCarga, setHasPendingCarga] = useState(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPendingFlag = localStorage.getItem('erp_pdv_carga_pending_flag') === 'true';
      setHasPendingCarga(isPendingFlag);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadInitialProducts = async () => {
        try {
          const cached = await getDBValue<Product[]>('erp_pdv_carga_products');
          if (cached && cached.length > 0) {
            const normalized = resolveVirtualAndKitProducts(cached);
            setProducts(normalized);
            isInitializedRef.current = true;
          } else if (originalProducts && originalProducts.length > 0 && !isInitializedRef.current) {
            const normalized = resolveVirtualAndKitProducts(originalProducts);
            await setDBValue('erp_pdv_carga_products', normalized);
            setProducts(normalized);
            isInitializedRef.current = true;
          }
        } catch (err) {
          console.error("Error loading products from IndexedDB:", err);
          setProducts(resolveVirtualAndKitProducts(originalProducts || []));
        }
      };
      loadInitialProducts();
    }
  }, [originalProducts]);

  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      let isCargaPending = false;
      if (e instanceof StorageEvent) {
        if (e.key === 'erp_pdv_carga_pending_flag') {
          isCargaPending = e.newValue === 'true';
        } else {
          return;
        }
      } else {
        // CustomEvent erp_pdv_carga_pending_flag_changed
        isCargaPending = true;
      }

      if (isCargaPending) {
        setHasPendingCarga(true);
        getDBValue<Product[]>('erp_pdv_carga_products').then(current => {
          if (current) setProducts(resolveVirtualAndKitProducts(current));
        });
      } else {
        setHasPendingCarga(false);
      }
    };
    window.addEventListener('storage', handleStorageChange as any);
    window.addEventListener('erp_pdv_carga_pending_flag_changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange as any);
      window.removeEventListener('erp_pdv_carga_pending_flag_changed', handleStorageChange);
    };
  }, []);

  const [cart, setCart] = useState<{ product: Product, quantity: number, discount: number, originalPrice: number, promotionId?: string, canceled?: boolean }[]>([]);
  const [barcode, setBarcode] = useState('');
  const [lastBeepedProduct, setLastBeepedProduct] = useState<string | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    const activeAds = advertisements?.filter(ad => ad.ativo) || [];
    if (activeAds.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % activeAds.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [advertisements]);

  useEffect(() => {
    const activeItems = cart.filter(item => !item.canceled);
    if (activeItems.length === 0) {
      setLastBeepedProduct(null);
      setCurrentAdIndex(0);
    }
  }, [cart]);

  const [quantity, setQuantity] = useState(1);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    // Set initial time in a timeout to avoid synchronous state update in effect
    const initialTimer = setTimeout(() => {
      setCurrentTime(new Date());
    }, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(initialTimer);
    };
  }, []);
  const [isFullScreen, setIsFullScreen] = useState(false);

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

  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCartIndex, setSelectedCartIndex] = useState(-1);
  const [isNavigatingCart, setIsNavigatingCart] = useState(false);
  const [numericBuffer, setNumericBuffer] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showSuprimentoModal, setShowSuprimentoModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [showPriceCheckModal, setShowPriceCheckModal] = useState(false);
  const [showProductListModal, setShowProductListModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [pricingMode, setPricingMode] = useState<'retail' | 'wholesale' | 'term'>('retail');
  const [isFinishingSale, setIsFinishingSale] = useState(false);
  const [showCancelItemModal, setShowCancelItemModal] = useState(false);
  const [showQuickReturnModal, setShowQuickReturnModal] = useState(false);
  const [cancelItemNumber, setCancelItemNumber] = useState('');
  const [showDiscountItemModal, setShowDiscountItemModal] = useState(false);
  const [discountItemNumber, setDiscountItemNumber] = useState('');
  const [showOldRegisterWarning, setShowOldRegisterWarning] = useState(false);
  const [oldRegisterWarningSelection, setOldRegisterWarningSelection] = useState<'continue' | 'close'>('continue');
  const hasWarnedOldRegister = useRef(false);
  const [reverseSaleId, setReverseSaleId] = useState('');
  const [discountType, setDiscountType] = useState<'item' | 'sale'>('sale');
  const [pendingDiscount, setPendingDiscount] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'cancel_item' | 'cancel_sale' | 'reverse_sale',
    data?: any
  } | null>(null);
  const [saleDiscount, setSaleDiscount] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [completedSaleSelection, setCompletedSaleSelection] = useState<'print' | 'new_sale'>('new_sale');
  
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  interface PausedSale {
    id: string;
    timestamp: string;
    cart: { product: Product, quantity: number, discount: number, originalPrice: number, promotionId?: string, canceled?: boolean }[];
    saleDiscount: number;
    selectedCustomer: any | null;
    pricingMode: 'retail' | 'wholesale' | 'term';
  }

  const [pausedSales, setPausedSales] = useState<PausedSale[]>([]);
  const [showPausedSalesDropdown, setShowPausedSalesDropdown] = useState(false);

  // Initialize and persist pausedSales in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('erp_pdv_paused_sales');
      if (saved) {
        try {
          setPausedSales(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing paused sales from localStorage:", e);
        }
      }
    }
  }, []);

  const savePausedSalesToStorage = (sales: PausedSale[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('erp_pdv_paused_sales', JSON.stringify(sales));
    }
  };

  const handlePauseCurrentSale = () => {
    if (cart.length === 0) {
      setCustomAlert({ message: 'Não há itens no carrinho para pausar.', type: 'error' });
      return;
    }

    const newPausedSale: PausedSale = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cart: [...cart],
      saleDiscount,
      selectedCustomer,
      pricingMode
    };

    const updated = [newPausedSale, ...pausedSales];
    setPausedSales(updated);
    savePausedSalesToStorage(updated);

    // Clear current cart and reset states
    setCart([]);
    setSaleDiscount(0);
    setSelectedCustomer(null);
    setPricingMode('retail');
    setSelectedCartIndex(-1);
    setIsNavigatingCart(false);

    setCustomAlert({ message: 'Venda colocada em pausa com sucesso!', type: 'success' });
  };

  const resumeSale = (pausedId: string) => {
    const selected = pausedSales.find(s => s.id === pausedId);
    if (!selected) return;

    const currentCart = [...cart];
    const currentDiscount = saleDiscount;
    const currentCust = selectedCustomer;
    const currentMode = pricingMode;

    // Load selected sale
    setCart(selected.cart);
    setSaleDiscount(selected.saleDiscount);
    setSelectedCustomer(selected.selectedCustomer);
    setPricingMode(selected.pricingMode);
    setSelectedCartIndex(-1);
    setIsNavigatingCart(false);

    let updated: PausedSale[];
    if (currentCart.length > 0) {
      // Swap current cart into the paused slot
      updated = pausedSales.map(s => s.id === pausedId ? {
        id: s.id,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        cart: currentCart,
        saleDiscount: currentDiscount,
        selectedCustomer: currentCust,
        pricingMode: currentMode
      } : s);
      setCustomAlert({ message: 'Vendas alternadas! A venda anterior foi colocada em pausa.', type: 'info' });
    } else {
      // Just remove from paused list
      updated = pausedSales.filter(s => s.id !== pausedId);
      setCustomAlert({ message: 'Venda em pausa recuperada com sucesso!', type: 'success' });
    }

    setPausedSales(updated);
    savePausedSalesToStorage(updated);
  };

  const deletePausedSale = (pausedId: string) => {
    const updated = pausedSales.filter(s => s.id !== pausedId);
    setPausedSales(updated);
    savePausedSalesToStorage(updated);
    setCustomAlert({ message: 'Venda em pausa excluída.', type: 'info' });
  };

  const handleImportCarga = async () => {
    if (typeof window !== 'undefined') {
      try {
        if (fetchData) {
          try {
            await fetchData();
          } catch (fetchErr) {
            console.warn('[PDV] Erro ao sincronizar dados na importação:', fetchErr);
          }
        }
        const pending = await getDBValue<Product[]>('erp_pdv_carga_pending_products');
        
        const isProductEqual = (p1: Product, p2: Product) => {
          const normalize = (val: any) => {
            if (val === null || val === undefined || val === '') return '';
            if (typeof val === 'number') return val;
            return String(val).trim();
          };

          const fields: (keyof Product)[] = [
            'name', 'sku', 'barcode', 'status', 'category', 'active', 'brand'
          ];

          for (const field of fields) {
            if (normalize(p1[field]) !== normalize(p2[field])) {
              return false;
            }
          }

          const numericFields: (keyof Product)[] = [
            'salePrice', 'stock', 'costPrice', 'minStock', 
            'wholesalePrice', 'wholesaleMinQty', 'clubPrice', 'termPrice'
          ];

          for (const field of numericFields) {
            const v1 = Number(p1[field]) || 0;
            const v2 = Number(p2[field]) || 0;
            if (v1 !== v2) {
              return false;
            }
          }

          return true;
        };

        const applyCarga = async (parsedRaw: Product[], isFromPending: boolean) => {
          try {
            const parsed = resolveVirtualAndKitProducts(parsedRaw);
            // Count altered products based on existing ones
            const altered = parsed.filter(current => {
              const last = products.find(p => p && p.id === current.id);
              if (!last) return true;
              return !isProductEqual(current, last);
            });

            await setDBValue('erp_pdv_carga_products', parsed);
            setProducts(parsed);
            setHasPendingCarga(false);
            
            if (systemSettings?.last_carga_at) {
              localStorage.setItem('erp_pdv_last_imported_carga_at', systemSettings.last_carga_at);
            } else {
              localStorage.setItem('erp_pdv_last_imported_carga_at', new Date().toISOString());
            }
            localStorage.removeItem('erp_pdv_carga_pending_flag');

            if (isFromPending) {
              await removeDBValue('erp_pdv_carga_pending_products');
            }

            // Play success sound C5 -> E5 -> G5
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
              gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
              oscillator.start();
              oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
              oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
              oscillator.stop(audioCtx.currentTime + 0.24);
            } catch (audioErr) {
              console.log('Audio feedback blocked', audioErr);
            }

            let alertMessage = '';
            if (products.length === 0) {
              alertMessage = `Carga inicial de ${parsed.length} produtos recebida e aplicada no PDV com sucesso!`;
            } else if (altered.length === 0) {
              alertMessage = `Carga recebida! Todos os ${parsed.length} produtos já estavam atualizados no PDV.`;
            } else {
              alertMessage = `Carga recebida! ${altered.length} ${altered.length === 1 ? 'produto atualizado' : 'produtos atualizados'} de um total de ${parsed.length} cadastrados no PDV.`;
            }

            setCustomAlert?.({
              message: alertMessage,
              type: 'success'
            });
          } catch (err) {
            console.error(err);
            setCustomAlert?.({
              message: 'Erro ao processar arquivo de carga de produtos.',
              type: 'error'
            });
          }
        };

        if (cart.length > 0) {
          setConfirmDialog({
            message: 'Você possui itens no carrinho. Deseja realmente baixar a nova carga e atualizar o cadastro de produtos?',
            onConfirm: () => {
              if (pending && pending.length > 0) {
                applyCarga(pending, true);
              } else if (originalProducts && originalProducts.length > 0) {
                applyCarga(originalProducts, false);
              } else {
                setCustomAlert?.({
                  message: 'Nenhuma carga disponível para baixar no momento.',
                  type: 'warning'
                });
              }
            }
          });
          return;
        }

        if (pending && pending.length > 0) {
          applyCarga(pending, true);
        } else {
          if (originalProducts && originalProducts.length > 0) {
            applyCarga(originalProducts, false);
          } else {
            setCustomAlert?.({
              message: 'Nenhuma carga disponível para baixar no momento.',
              type: 'warning'
            });
          }
        }
      } catch (e) {
        console.error("Error during handleImportCarga:", e);
      }
    }
  };

  const removeCustomer = () => {
    setSelectedCustomer(null);
    // Recalcular preços do carrinho se necessário
    setCart(prev => prev.map(item => ({
      ...item,
      basePrice: item.product.salePrice // Volta para o preço normal
    })));
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    if (value.length >= 3) {
      const results = customers.filter(c => 
        c.name.toLowerCase().includes(value.toLowerCase()) ||
        c.document.includes(value) ||
        (c.phone && c.phone.includes(value))
      );
      setCustomerSearchResults(results);
    } else {
      setCustomerSearchResults([]);
    }
  };

  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
    setCustomerSearch('');
    setCustomerSearchResults([]);

    // Se for cliente clube, aplicar preços especiais no carrinho
    if (customer.isClubMember) {
      setCart(prev => prev.map(item => ({
        ...item,
        basePrice: item.product.clubPrice || item.product.salePrice
      })));
      setCustomAlert?.({
        message: `CLIENTE CLUBE IDENTIFICADO: ${customer.name}. PREÇOS ESPECIAIS APLICADOS!`,
        type: 'success'
      });
    }

    // Garantir que o foco volte para o campo de busca de produtos
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const discountItemNumberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showDiscountItemModal) {
      setTimeout(() => {
        discountItemNumberRef.current?.focus();
        discountItemNumberRef.current?.select();
      }, 50);
    }
  }, [showDiscountItemModal]);

  const cancelItemNumberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCancelItemModal) {
      setTimeout(() => {
        cancelItemNumberRef.current?.focus();
        cancelItemNumberRef.current?.select();
      }, 50);
    }
  }, [showCancelItemModal]);

  useEffect(() => {
    if (activeRegister && activeRegister.openedAt && !hasWarnedOldRegister.current) {
      const openedDate = getLocalDateString(new Date(activeRegister.openedAt));
      const today = getLocalDateString();
      if (openedDate !== today) {
        hasWarnedOldRegister.current = true;
        setTimeout(() => {
          setShowOldRegisterWarning(true);
        }, 50);
      }
    }
  }, [activeRegister]);

  const reverseSaleIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showReverseModal) {
      setTimeout(() => {
        reverseSaleIdRef.current?.focus();
        reverseSaleIdRef.current?.select();
      }, 50);
    }
  }, [showReverseModal]);

  const customerSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCustomerSearch) {
      setTimeout(() => {
        customerSearchInputRef.current?.focus();
        customerSearchInputRef.current?.select();
      }, 50);
    }
  }, [showCustomerSearch]);

  const formatCurrency = (value: number | undefined | null) => {
    return (value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return formatDateTimeBR(date.toISOString());
  };

  const comboDiscount = useMemo(() => {
    if (!currentTime) return 0;
    const now = currentTime;
    const todayStr = getLocalDateString(now);
    
    const activeCombos = promotions.filter(p => {
      if (!p.startDate || !p.endDate) return false;
      const startStr = getLocalDateString(p.startDate);
      const endStr = getLocalDateString(p.endDate);
      return (
        p.status === 'ACTIVE' && 
        p.type === 'COMBO' &&
        p.applyAutomatically &&
        startStr <= todayStr && 
        todayStr <= endStr &&
        (!p.daysOfWeek || p.daysOfWeek.includes(now.getDay())) &&
        (!p.onlyForClubMembers || selectedCustomer?.isClubMember)
      );
    });

    let totalComboDiscount = 0;

    activeCombos.forEach(combo => {
      if (!combo.comboItems || combo.comboItems.length === 0 || !combo.comboPrice) return;

      let minSets = Infinity;
      
      for (const productId of combo.comboItems) {
        const cartItems = cart.filter(item => !item.canceled && item.product.id === productId);
        const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        
        const requiredQty = combo.comboItems.filter((id: any) => id === productId).length;
        
        const setsOfThisProduct = Math.floor(totalQty / requiredQty);
        if (setsOfThisProduct < minSets) {
          minSets = setsOfThisProduct;
        }
      }

      if (minSets > 0 && minSets !== Infinity) {
        let regularComboPrice = 0;
        for (const productId of combo.comboItems) {
          const product = products.find(p => p && p.id === productId);
          if (product) {
            regularComboPrice += product.salePrice;
          }
        }

        const discountPerSet = regularComboPrice - combo.comboPrice;
        if (discountPerSet > 0) {
          totalComboDiscount += discountPerSet * minSets;
        }
      }
    });

    return totalComboDiscount;
  }, [cart, promotions, products, currentTime, selectedCustomer]);

  const getProductPromoInfo = useCallback((product: Product) => {
    if (!product) return null;
    const now = new Date();
    const todayStr = getLocalDateString(now);
    
    // Find active promotions that might apply to this product
    const activePromos = (promotions || []).filter(p => {
      if (!p || !p.startDate || !p.endDate) return false;
      const startStr = getLocalDateString(p.startDate);
      const endStr = getLocalDateString(p.endDate);
      return (
        p.status === 'ACTIVE' && 
        p.applyAutomatically &&
        startStr <= todayStr && 
        todayStr <= endStr &&
        (!p.daysOfWeek || p.daysOfWeek.includes(now.getDay())) &&
        (!p.onlyForClubMembers || selectedCustomer?.isClubMember)
      );
    });

    const productSubcategory = (subcategorias || []).find(s => s && s.id === product.subcategoria_id);
    
    const applicablePromo = activePromos.find(p => 
      (p.targetType === 'PRODUCT' && (Array.isArray(p.targetId) ? p.targetId.includes(product.id) : p.targetId === product.id)) ||
      (p.targetType === 'CATEGORY' && p.targetId === productSubcategory?.categoria_id) ||
      p.targetType === 'ALL'
    );

    if (!applicablePromo) return null;

    let promoPrice = product.salePrice;
    let promoDiscount = 0;

    let basePrice = product.wholesalePrice && pricingMode === 'wholesale' ? product.wholesalePrice : product.salePrice;
    if (selectedCustomer?.isClubMember && product.clubPrice) {
      basePrice = product.clubPrice;
    }

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
  }, [promotions, subcategorias, selectedCustomer, pricingMode]);

  const validateCartStock = useCallback((proposedCart: typeof cart) => {
    // 1. Calculate aggregated physical demand of products
    const stockDemand: Record<string, number> = {};
    
    proposedCart.forEach(item => {
      const p = item.product;
      const qty = item.quantity;
      
      const currentProduct = products.find(prod => prod && prod.id === p.id);
      if (!currentProduct) return;

      if (currentProduct.product_type === 'KIT' && currentProduct.composition && currentProduct.composition.length > 0) {
        // It's a Kit! We need to add demands for all its composition items
        currentProduct.composition.forEach((comp: any) => {
          stockDemand[comp.productId] = (stockDemand[comp.productId] || 0) + (comp.quantity * qty);
        });
      } else {
        // Regular product
        stockDemand[p.id] = (stockDemand[p.id] || 0) + qty;
      }
    });

    // 2. Map virtual products (SALE with base_product_id) to their real base product demand
    // Because if multiple virtual products or components share the same base product, we want to sum them up.
    const physicalDemand: Record<string, number> = {};
    for (const [productId, demandedQty] of Object.entries(stockDemand)) {
      const p = products.find(prod => prod && prod.id === productId);
      if (!p) continue;

      if (p.product_type === 'SALE' && p.base_product_id && p.conversion_factor) {
        const baseQty = demandedQty / Number(p.conversion_factor);
        physicalDemand[p.base_product_id] = (physicalDemand[p.base_product_id] || 0) + baseQty;
      } else {
        physicalDemand[productId] = (physicalDemand[productId] || 0) + demandedQty;
      }
    }

    // 3. Compare with actual physical stock
    for (const [productId, demandedQty] of Object.entries(physicalDemand)) {
      const physicalProduct = products.find(prod => prod && prod.id === productId);
      if (!physicalProduct) continue;

      // Robust check: if controlStock is SIM, undefined, null, or anything other than NÃO, treat it as active
      const isControlActive = physicalProduct.controlStock === undefined || 
                              physicalProduct.controlStock === null || 
                              String(physicalProduct.controlStock).toUpperCase() !== 'NÃO';

      if (isControlActive) {
        const availableStock = physicalProduct.stock || 0;
        if (demandedQty > availableStock) {
          // Find if this physical product is used inside a kit in the proposed cart
          const kitUsingComp = proposedCart.find(item => {
            const p = products.find(prod => prod && prod.id === item.product.id);
            if (!p || !p.composition) return false;
            return p.composition.some((comp: any) => 
              comp.productId === productId || 
              (() => {
                const compProduct = products.find(prod => prod && prod.id === comp.productId);
                return compProduct?.base_product_id === productId;
              })()
            );
          });

          if (kitUsingComp) {
            // It's a kit component! Let's find exactly which ingredient inside this kit mapping is causing it
            const compInKit = kitUsingComp.product.composition?.find((comp: any) => 
              comp.productId === productId || 
              (() => {
                const compProd = products.find(prod => prod && prod.id === comp.productId);
                return compProd?.base_product_id === productId;
              })()
            );
            const compProduct = products.find(prod => prod && prod.id === compInKit?.productId);
            const missing = demandedQty - availableStock;

            return {
              okay: false,
              message: `O item '${compProduct?.name || physicalProduct.name}' que faz parte do kit '${kitUsingComp.product.name}' não possui estoque suficiente. Estoque disponível: ${availableStock.toFixed(3)} ${physicalProduct.unit || 'UN'}, necessário para os kits: ${demandedQty.toFixed(3)} ${physicalProduct.unit || 'UN'} (Falta: ${missing.toFixed(3)} ${physicalProduct.unit || 'UN'}).`
            };
          } else {
            // It's a regular product
            const directItem = proposedCart.find(item => item.product.id === productId || item.product.base_product_id === productId);
            const displayProductName = directItem?.product.name || physicalProduct.name;
            const missing = demandedQty - availableStock;

            return {
              okay: false,
              message: `O produto '${displayProductName}' não possui estoque suficiente. Estoque disponível: ${availableStock.toFixed(3)} ${physicalProduct.unit || 'UN'}, quantidade solicitada: ${demandedQty.toFixed(3)} ${physicalProduct.unit || 'UN'} (Falta: ${missing.toFixed(3)} ${physicalProduct.unit || 'UN'}).`
            };
          }
        }
      }
    }

    return { okay: true };
  }, [products]);

  const subtotal = cart.filter(item => !item.canceled).reduce((acc, item) => acc + (item.originalPrice * item.quantity), 0);
  const totalItemsDiscount = cart.filter(item => !item.canceled).reduce((acc, item) => acc + (item.discount * item.quantity), 0);
  const totalDiscount = totalItemsDiscount + saleDiscount + comboDiscount;
  const total = Math.max(0, subtotal - totalDiscount);

  const handleCheckout = useCallback(() => {
    if (!cart.some(item => !item.canceled)) return;
    setIsNavigatingCart(false);
    setSelectedCartIndex(-1);
    setShowPaymentModal(true);
  }, [cart]);

  const decrementLocalStock = useCallback(async (soldItems: typeof cart) => {
    setProducts(prevProducts => {
      const updatedProducts = [...prevProducts];

      const deductProductStock = (productId: string, qty: number) => {
        const idx = updatedProducts.findIndex(p => p.id === productId);
        if (idx === -1) return;

        const p = updatedProducts[idx];
        const currentStock = Number(p.stock) || 0;
        const newStock = currentStock - qty;
        
        updatedProducts[idx] = {
          ...p,
          stock: newStock
        };

        // Handle Virtual Product (SALE)
        if (p.product_type === 'SALE' && p.base_product_id) {
          const baseId = p.base_product_id;
          const convFactor = Number(p.conversion_factor) || 1;
          const baseQty = qty / convFactor;
          deductProductStock(baseId, baseQty);
        }

        // Handle Kit
        const composition = p.composition;
        if (p.product_type === 'KIT') {
          if (composition) {
            let parsedComp: any = composition;
            if (typeof parsedComp === 'string') {
              try {
                parsedComp = JSON.parse(parsedComp);
              } catch (e) {
                parsedComp = null;
              }
            }
            if (Array.isArray(parsedComp)) {
              parsedComp.forEach((comp: any) => {
                const compId = comp.productId || comp.product_id;
                const compQty = (Number(comp.quantity) || 0) * qty;
                if (compId) {
                  deductProductStock(compId, compQty);
                }
              });
            }
          }
        }
      };

      soldItems.forEach(item => {
        deductProductStock(item.product.id, item.quantity);
      });

      // Async save to IndexedDB
      setDBValue('erp_pdv_carga_products', updatedProducts).catch(err => {
        console.error('Error saving updated local products to IndexedDB:', err);
      });

      return updatedProducts;
    });
  }, []);

  const finalizeSale = async (paymentData: any) => {
    if (isFinishingSale) return;
    setIsFinishingSale(true);
    try {
      console.log('DEBUG: Finalizando venda, payments:', paymentData.payments);
      console.log('DEBUG: Taxas nos pagamentos:', paymentData.payments.map((p: any) => ({ method: p.method, taxAmount: p.taxAmount, taxPercentage: p.taxPercentage })));
      
      // Check stock with unified validation covering kits and virtual/fractioned products
      const stockCheck = validateCartStock(cart.filter(item => !item.canceled));
      if (!stockCheck.okay) {
        setCustomAlert({ message: stockCheck.message || '', type: 'error' });
        setIsFinishingSale(false);
        return;
      }

      const success = await addSale({
        date: new Date().toISOString(),
        items: cart.filter(item => !item.canceled).map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.salePrice,
          originalPrice: item.originalPrice,
          discount: item.discount,
          promotionId: item.promotionId
        })),
        subtotal: subtotal,
        discount: totalDiscount,
        additionalValue: paymentData.additionalValue || 0,
        total: paymentData.total,
        paymentMethod: paymentData.payments.length > 1 ? 'Múltiplo' : paymentData.payments[0]?.method,
        payments: paymentData.payments,
        maquininhaId: paymentData.payments[0]?.maquininhaId, // For compatibility
        taxAmount: paymentData.payments.reduce((acc: number, p: any) => acc + (p.taxAmount || 0), 0),
        netAmount: paymentData.payments.reduce((acc: number, p: any) => acc + (p.netAmount || 0), 0),
        userId: user?.email,
        companyId: user?.companyId || '',
        customerId: selectedCustomer?.id
      });
      console.log('DEBUG: Valor de taxAmount enviado para addSale:', paymentData.payments.reduce((acc: number, p: any) => acc + (p.taxAmount || 0), 0));

      if (success) {
        // Decrement local stock cache
        await decrementLocalStock(cart.filter(item => !item.canceled));

        setCart([]);
        setSaleDiscount(0);
        setSelectedCartIndex(-1);
        setIsNavigatingCart(false);
        setShowPaymentModal(false);
        setCompletedSaleSelection('new_sale');
        setCompletedSale({
          ...success,
          change: paymentData.change,
          cashReceived: paymentData.cashReceived
        });
        setSelectedCustomer(null);
        setPricingMode('retail');
      }
    } catch (err) {
      console.error('Error during finalizeSale:', err);
      setCustomAlert({ message: 'Erro ao processar a venda. Tente novamente.', type: 'error' });
    } finally {
      setIsFinishingSale(false);
    }
  };

  const checkDiscountPermission = (amount: number, type: 'percentage' | 'value') => {
    if (!user) return false;
    
    const role = user.role.toLowerCase();
    const percentage = type === 'percentage' ? amount : (amount / subtotal) * 100;

    if (role === 'administrador' || role === 'gerente') return true;
    if (role === 'fiscal de caixa' && percentage <= 10) return true;
    
    return false;
  };

  const applyDiscount = (data: any) => {
    if (discountType === 'item' && selectedCartIndex >= 0) {
      const newCart = [...cart];
      newCart[selectedCartIndex].discount = data.discountValue / newCart[selectedCartIndex].quantity;
      newCart[selectedCartIndex].product.salePrice = newCart[selectedCartIndex].originalPrice - newCart[selectedCartIndex].discount;
      setCart(newCart);
    } else {
      setSaleDiscount(data.discountValue);
    }
    
    // Log discount
    addDiscountLog({
      saleId: 'PENDING', // Will be updated on finalize if needed, or just log now
      productId: discountType === 'item' ? cart[selectedCartIndex]?.product.id : undefined,
      type: discountType,
      method: data.type,
      percentage: data.type === 'percentage' ? data.amount : undefined,
      value: data.discountValue,
      appliedBy: user?.name || 'Sistema',
      authorizedBy: pendingDiscount?.authorizedBy,
      reason: data.reason,
      date: new Date().toISOString()
    });

    setShowDiscountModal(false);
    setPendingDiscount(null);
  };

  const handlePrintReceipt = (sale: any) => {
    const customer = customers.find(c => c.id === sale.customerId);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = sale.items.map((item: any) => {
      const product = products.find(p => p && p.id === item.productId);
      return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>${item.quantity}x ${product?.name || 'Produto'}</span>
          <span>R$ ${(item.quantity * item.price).toFixed(2)}</span>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo - Venda #${sale.id.substring(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .items { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .totals { text-align: right; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0; font-size: 18px;">${companySettings?.tradeName || 'CP PDV'}</h2>
            ${companySettings?.legalName ? `<p style="margin: 2px 0; font-size: 11px;">${companySettings?.legalName}</p>` : ''}
            <p style="margin: 2px 0; font-size: 11px;">CNPJ: ${companySettings?.cnpj || ''} ${companySettings?.stateRegistration ? `| IE: ${companySettings?.stateRegistration}` : ''}</p>
            <p style="margin: 2px 0; font-size: 11px;">${companySettings?.address?.street || ''}, ${companySettings?.address?.number || ''}</p>
            <p style="margin: 2px 0; font-size: 11px;">${companySettings?.address?.neighborhood || ''} - ${companySettings?.address?.city || ''}/${companySettings?.address?.state || ''}</p>
            ${companySettings?.phone || companySettings?.email ? `
              <p style="margin: 2px 0; font-size: 11px;">
                ${companySettings?.phone ? `Fone: ${companySettings?.phone}` : ''}
                ${companySettings?.phone && companySettings?.email ? ' | ' : ''}
                ${companySettings?.email ? `Email: ${companySettings?.email}` : ''}
              </p>
            ` : ''}
            <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">
              <h3 style="margin: 5px 0;">CUPOM NÃO FISCAL</h3>
              <p style="margin: 2px 0; font-size: 11px;">Venda #${sale.id.substring(0, 8).toUpperCase()}</p>
              <p style="margin: 2px 0; font-size: 11px;">Data: ${formatDateTimeBR(sale.date)}</p>
            </div>
          </div>
          
          <div class="items">
            ${itemsHtml}
          </div>
          
          <div class="totals">
            <p>Total: R$ ${sale.total.toFixed(2)}</p>
            <p>Pagamento: ${sale.paymentMethod}</p>
          </div>
          
          <div class="footer">
            <p>Cliente: ${customer?.name || 'Consumidor Final'}</p>
            <p>Obrigado pela preferência!</p>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDiscountConfirm = (data: any) => {
    if (checkDiscountPermission(data.amount, data.type)) {
      applyDiscount(data);
    } else {
      setPendingDiscount(data);
      setShowAuthModal(true);
    }
  };

  const checkActionPermission = useCallback(() => {
    if (!user) return false;
    const role = user.role.toLowerCase();
    const isSuperAdmin = user.email?.toLowerCase() === 'willmanssilva4@gmail.com';
    return role === 'administrador' || role === 'gerente' || role === 'fiscal de caixa' || role === 'admin' || role === 'superadmin' || isSuperAdmin;
  }, [user]);

  const handleAuthorization = async (password: string) => {
    // Check if any supervisor has this code
    const cleanPassword = password.trim();
    console.log('DEBUG: Attempting authorization with password:', cleanPassword);
    const supervisor = systemUsers.find(u => {
      const match = (
        u.supervisorCode?.trim() === cleanPassword || 
        u.supervisor_code?.trim() === cleanPassword ||
        (u.supervisor_code?.includes('|') && u.supervisor_code.split('|')[1]?.trim() === cleanPassword)
      );
      const isAtivo = u.status === 'Ativo';
      const profileIdForUser = (u.profileId || u.profile_id);
      const profile = profileIdForUser ? accessProfiles.find(p => p.id === profileIdForUser) : null;
      const profileName = profile?.name?.toLowerCase() || '';
      const hasPermission = profileName.match(/administrador|gerente|fiscal de caixa|admin/);
      
      console.log('DEBUG: Checking user:', u.username, 'Match PIN:', match, 'Status:', u.status, 'ProfileIdForUser:', profileIdForUser, 'ProfileName:', profileName, 'HasPermission:', !!hasPermission);
      
      return match && isAtivo && hasPermission;
    });

    console.log('DEBUG: Supervisor found:', supervisor);
    if (supervisor || cleanPassword === '1234') { // Keep 1234 as fallback for now
      const authorizedBy = supervisor ? supervisor.username : 'Supervisor';
      
      if (pendingDiscount) {
        const authorizedLog = { ...pendingDiscount, authorizedBy };
        applyDiscount(authorizedLog);
        setPendingDiscount(null);
      } else if (pendingAction) {
        if (pendingAction.type === 'cancel_item') {
          const targetIndex = pendingAction.data.index;
          setCart(prev => prev.map((item, i) => i === targetIndex ? { ...item, canceled: true } : item));
          setSelectedCartIndex(-1);
          setIsNavigatingCart(false);
        } else if (pendingAction.type === 'cancel_sale') {
          setCart([]);
          setSaleDiscount(0);
          setSelectedCartIndex(-1);
          setIsNavigatingCart(false);
          setPricingMode('retail');
        } else if (pendingAction.type === 'reverse_sale') {
          const saleId = pendingAction.data?.saleId;
          if (saleId) {
            await deleteSale(saleId);
            setCustomAlert({ message: `Venda #${saleId} estornada com sucesso! Itens retornados ao estoque.`, type: 'success' });
          }
          setReverseSaleId('');
        }
        setPendingAction(null);
      }
      setShowAuthModal(false);
    } else {
      setCustomAlert({
        message: 'Código de autorização inválido ou usuário sem permissão!',
        type: 'error'
      });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Only focus barcode input if register is active and no modal is open
    const isModalOpen = !!(showProductModal || showPaymentModal || showDiscountModal || showAuthModal || showSangriaModal || showSuprimentoModal || showClosureModal || showReverseModal || showOldRegisterWarning || showPriceCheckModal || showProductListModal || showInvoiceModal || showCustomerSearch || showHelp || confirmDialog || completedSale);
    
    if (activeRegister && !isModalOpen) {
      barcodeInputRef.current?.focus();
    } else {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        const active = document.activeElement;
        if (active === barcodeInputRef.current || active === quantityInputRef.current) {
          active.blur();
        }
      }
    }

    return () => clearInterval(timer);
  }, [
    activeRegister, 
    showProductModal, 
    showPaymentModal, 
    showDiscountModal, 
    showAuthModal, 
    showSangriaModal, 
    showSuprimentoModal, 
    showClosureModal, 
    showReverseModal, 
    showOldRegisterWarning, 
    showPriceCheckModal, 
    showProductListModal, 
    showInvoiceModal, 
    showHelp, 
    confirmDialog, 
    showCustomerSearch,
    completedSale
  ]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const isInputFocused = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;

      // ALT+C shortcut to import product database (Carga) - available globally anytime
      if (e.altKey && !e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleImportCarga();
        return;
      }

      // Handle Numeric Buffer for Quick Actions (3 + F6, etc)
      if (!isInputFocused && e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey && !showPaymentModal && !showDiscountModal && !showAuthModal && activeRegister) {
        setNumericBuffer(prev => prev + e.key);
        // Auto-clear buffer after 2 seconds of inactivity
        setTimeout(() => setNumericBuffer(''), 2000);
        return;
      }

      if (completedSale) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          setCompletedSaleSelection(prev => prev === 'print' ? 'new_sale' : 'print');
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (completedSaleSelection === 'print') {
            handlePrintReceipt(completedSale);
          }
          setCompletedSale(null);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setCompletedSale(null);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (confirmDialog) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setConfirmDialog(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          confirmDialog.onConfirm();
          setConfirmDialog(null);
        }
        return;
      }

      if (showOldRegisterWarning) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setOldRegisterWarningSelection(prev => prev === 'continue' ? 'close' : 'continue');
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (oldRegisterWarningSelection === 'continue') {
            setShowOldRegisterWarning(false);
          } else {
            setShowOldRegisterWarning(false);
            setShowClosureModal(true);
          }
          return;
        }
      }

      // If any modal is open or register is closed, don't process global shortcuts (except Esc)
      const isModalOpen = showProductModal || showPaymentModal || showDiscountModal || showAuthModal || showSangriaModal || showSuprimentoModal || showClosureModal || showReverseModal || showOldRegisterWarning || showPriceCheckModal || showProductListModal || showInvoiceModal || !activeRegister;
      if (isModalOpen && e.key !== 'Escape') {
        return;
      }

      // * - Atalho de multiplicação global
      if (e.key === '*') {
        const active = document.activeElement;
        const isOtherInputFocused = active instanceof HTMLInputElement && active !== barcodeInputRef.current && active !== quantityInputRef.current;
        if (!isOtherInputFocused) {
          e.preventDefault();
          e.stopPropagation();
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
          return;
        }
      }

      // If help is open, only allow Esc and F1 (to toggle)
      if (showHelp && e.key !== 'Escape' && e.key !== 'F1') {
        return;
      }

      // F1 - Ajuda
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp(prev => !prev);
        setNumericBuffer('');
      }

      // F2 - Devolução Rápida
      if (e.key === 'F2') {
        e.preventDefault();
        setShowQuickReturnModal(true);
        setNumericBuffer('');
      }

      // F3 - Buscar Produto Manual
      if (e.key === 'F3') {
        e.preventDefault();
        setShowProductListModal(prev => !prev);
        setNumericBuffer('');
      }

      // F4 - Alterar Quantidade
      if (e.key === 'F4') {
        e.preventDefault();
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
        setNumericBuffer('');
      }

      // F5 - Inserir Cliente
      if (e.key === 'F5') {
        e.preventDefault();
        setShowCustomerSearch(true);
        setNumericBuffer('');
      }

      // F6 - Desconto (Item ou Venda)
      if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length === 0) return;

        let targetIndex = selectedCartIndex;
        
        // Quick Action: [Number] + F6
        if (numericBuffer) {
          const idx = parseInt(numericBuffer) - 1;
          if (idx >= 0 && idx < cart.length) {
            targetIndex = idx;
          }
          setNumericBuffer('');
        }

        if (targetIndex >= 0 && targetIndex < cart.length) {
          setDiscountType('item');
          setSelectedCartIndex(targetIndex);
          setShowDiscountModal(true);
        } else {
          // Open custom modal to ask for item number
          setShowDiscountItemModal(true);
          setDiscountItemNumber('');
        }
      }

      // F7 - Desconto na Venda Total
      if (e.key === 'F7') {
        e.preventDefault();
        if (cart.length > 0) {
          setDiscountType('sale');
          setShowDiscountModal(true);
        }
        setNumericBuffer('');
      }

      // F8 - Cancelar Item
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length === 0) return;

        let targetIndex = selectedCartIndex;

        // Quick Action: [Number] + F8
        if (numericBuffer) {
          const idx = parseInt(numericBuffer) - 1;
          if (idx >= 0 && idx < cart.length) {
            targetIndex = idx;
          }
          setNumericBuffer('');
        }

        if (targetIndex >= 0 && targetIndex < cart.length) {
          const itemToRemove = cart[targetIndex];
          setConfirmDialog({
            message: `Deseja cancelar o item: ${itemToRemove.product.name}?`,
            onConfirm: () => {
              if (checkActionPermission()) {
                setCart(prev => prev.map((item, i) => i === targetIndex ? { ...item, canceled: true } : item));
                setSelectedCartIndex(-1);
                setIsNavigatingCart(false);
              } else {
                setPendingAction({ type: 'cancel_item', data: { index: targetIndex } });
                setShowAuthModal(true);
              }
            }
          });
        } else {
          // Open custom modal to ask for item number
          setShowCancelItemModal(true);
          setCancelItemNumber('');
        }
      }

      // F9 - Cancelar Venda
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setConfirmDialog({
            message: 'Deseja cancelar a venda atual?',
            onConfirm: () => {
              if (checkActionPermission()) {
                setCart([]);
                setSaleDiscount(0);
                setSelectedCartIndex(-1);
                setIsNavigatingCart(false);
                setPricingMode('retail');
              } else {
                setPendingAction({ type: 'cancel_sale' });
                setShowAuthModal(true);
              }
            }
          });
        }
        setNumericBuffer('');
      }

      // F10 - Finalizar Venda
      if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsNavigatingCart(false);
          setSelectedCartIndex(-1);
          setShowPaymentModal(true);
        }
        setNumericBuffer('');
      }

      // F11 - Alternar Modo Precificação (Varejo / Preço 2)
      if (e.key === 'F11') {
        e.preventDefault();
        setPricingMode(prev => {
          const nextMode = prev === 'retail' ? 'term' : 'retail';
          
          // Recalculate cart prices based on the new mode
          setCart(currentCart => currentCart.map(item => {
            let newPrice = item.product.salePrice;
            if (nextMode === 'term' && item.product.termPrice) {
              newPrice = item.product.termPrice;
            } else {
              newPrice = item.product.salePrice;
            }

            return {
              ...item,
              product: { ...item.product, salePrice: newPrice },
              originalPrice: newPrice,
              discount: 0 // Reset discount when switching modes to avoid negative prices
            };
          }));
          return nextMode;
        });
        setNumericBuffer('');
      }

      // F12 - Autorização Rápida
      if (e.key === 'F12') {
        e.preventDefault();
        setShowAuthModal(true);
        setNumericBuffer('');
      }

      // Navigation Mode Keys
      if (isNavigatingCart) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCartIndex(prev => (prev < cart.length - 1 ? prev + 1 : prev));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCartIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        if (e.key === 'Delete') {
          e.preventDefault();
          if (selectedCartIndex >= 0) {
            const itemToRemove = cart[selectedCartIndex];
            setConfirmDialog({
              message: `Deseja cancelar o item: ${itemToRemove.product.name}?`,
              onConfirm: () => {
                if (checkActionPermission()) {
                  setCart(prev => prev.map((item, i) => i === selectedCartIndex ? { ...item, canceled: true } : item));
                  setSelectedCartIndex(-1);
                  setIsNavigatingCart(false);
                } else {
                  setPendingAction({ type: 'cancel_item', data: { index: selectedCartIndex } });
                  setShowAuthModal(true);
                }
              }
            });
          }
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          // Selection logic if needed, or just keep highlighted
        }
      }

      // Ctrl Actions
      if (e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 's') { e.preventDefault(); setShowSangriaModal(true); }
        if (key === 'u') { e.preventDefault(); setShowSuprimentoModal(true); }
        if (key === 'f') { e.preventDefault(); setShowClosureModal(true); }
        if (key === 'r') { e.preventDefault(); alert('Funcionalidade: Reabrir Venda (Ctrl+R)'); }
        if (key === 'p') { e.preventDefault(); setShowPriceCheckModal(true); }
        if (key === 'c') { e.preventDefault(); alert('Funcionalidade: Segunda Via Cupom (Ctrl+C)'); }
      }

      // Alt Actions (to avoid browser shortcut conflicts like Ctrl+N, Ctrl+L, Ctrl+T)
      if (e.altKey && !e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === 'n') { e.preventDefault(); setShowInvoiceModal(true); }
        if (key === 'l') { e.preventDefault(); setShowProductListModal(true); }
        if (key === 't') { 
          e.preventDefault(); 
          setShowReverseModal(true);
        }
        if (key === 'h') { e.preventDefault(); alert('Funcionalidade: Histórico Cliente (Alt+H)'); }
        if (key === 'p') { e.preventDefault(); handlePauseCurrentSale(); }
        if (key === 'z') { e.preventDefault(); toggleFullScreen(); }
      }

      // Esc - Sair / Voltar
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showAuthModal) {
          setShowAuthModal(false);
          setPendingAction(null);
          setPendingDiscount(null);
        } else if (showOldRegisterWarning) {
          setShowOldRegisterWarning(false);
        } else if (showDiscountModal) {
          setShowDiscountModal(false);
        } else if (showHelp) {
          setShowHelp(false);
        } else if (showProductModal) {
          setShowProductModal(false);
        } else if (showPaymentModal) {
          setShowPaymentModal(false);
        } else if (showSangriaModal) {
          setShowSangriaModal(false);
        } else if (showSuprimentoModal) {
          setShowSuprimentoModal(false);
        } else if (showClosureModal) {
          setShowClosureModal(false);
        } else if (showReverseModal) {
          setShowReverseModal(false);
        } else if (showPriceCheckModal) {
          setShowPriceCheckModal(false);
        } else if (showProductListModal) {
          setShowProductListModal(false);
        } else if (showInvoiceModal) {
          setShowInvoiceModal(false);
        } else if (showCancelItemModal) {
          setShowCancelItemModal(false);
        } else if (showQuickReturnModal) {
          setShowQuickReturnModal(false);
        } else if (showDiscountItemModal) {
          setShowDiscountItemModal(false);
        } else if (showCustomerSearch) {
          setShowCustomerSearch(false);
          setCustomerSearch('');
          setCustomerSearchResults([]);
        } else if (isNavigatingCart) {
          setIsNavigatingCart(false);
          setSelectedCartIndex(-1);
        } else if (searchResults.length > 0) {
          setSearchResults([]);
        } else {
          setConfirmDialog({
            message: 'Deseja sair do PDV?',
            onConfirm: handleExitPDV
          });
        }
        setNumericBuffer('');
      }
    };
 
     window.addEventListener('keydown', handleGlobalKeyDown);
     return () => {
       window.removeEventListener('keydown', handleGlobalKeyDown);
     };
  }, [cart, searchResults, showHelp, showProductModal, showPaymentModal, showDiscountModal, showAuthModal, showSangriaModal, showSuprimentoModal, showClosureModal, showReverseModal, showPriceCheckModal, showProductListModal, showInvoiceModal, showCancelItemModal, showQuickReturnModal, showDiscountItemModal, showOldRegisterWarning, oldRegisterWarningSelection, selectedCartIndex, isNavigatingCart, numericBuffer, confirmDialog, router, handleCheckout, currentProduct, activeRegister, checkActionPermission, showCustomerSearch, completedSale, completedSaleSelection, pricingMode, handleExitPDV, handleImportCarga]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNavigatingCart) {
      setIsNavigatingCart(false);
      setSelectedCartIndex(-1);
    }
    
    const value = e.target.value;
    setBarcode(value);
    
    // Search by barcode (exact match)
    const product = products.find(p => p && (p.sku === value || p.barcode === value) && p.status !== 'Inativo');
    if (product) {
      setCurrentProduct(product);
      setSearchResults([]);
      setSelectedIndex(-1);
    } else {
      setCurrentProduct(null);
      // Search by name (at least 3 chars)
      if (value.length >= 3) {
        const searchTerms = value.toLowerCase().split(' ').filter(term => term.length > 0);
        const filtered = products.filter(p => {
          if (!p || p.status === 'Inativo') return false;
          const isControlActive = p.controlStock === undefined || 
                                  p.controlStock === null || 
                                  String(p.controlStock).toUpperCase() !== 'NÃO';
          if (isControlActive) {
            const stock = parseFloat(String(p.stock));
            if (isNaN(stock) || stock <= 0) return false;
          }
          const searchableText = `${p.name || ''} ${p.sku || ''} ${p.barcode || ''}`.toLowerCase();
          return searchTerms.every(term => searchableText.includes(term));
        }).sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim())).slice(0, 50); // Limit results
        setSearchResults(filtered);
        setSelectedIndex(filtered.length > 0 ? 0 : -1);
      } else {
        setSearchResults([]);
        setSelectedIndex(-1);
      }
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.getElementById(`search-result-${selectedIndex}`);
      if (element) {
        element.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (completedSale) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter' || e.key === '*') {
      e.preventDefault();
      e.stopPropagation();
      if (currentProduct) {
        addToCart(currentProduct, quantity);
        setBarcode('');
        setQuantity(1);
        setCurrentProduct(null);
        barcodeInputRef.current?.focus();
      } else {
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (completedSale) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isNavigatingCart) return; // Let the global handler deal with it

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length === 0 && barcode.length === 0) {
        setSearchResults(products.filter(p => {
          if (!p || p.status === 'Inativo') return false;
          const isControlActive = p.controlStock === undefined || 
                                  p.controlStock === null || 
                                  String(p.controlStock).toUpperCase() !== 'NÃO';
          if (isControlActive) {
            const stock = parseFloat(String(p.stock));
            return !isNaN(stock) && stock > 0;
          }
          return true;
        }).sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim())).slice(0, 50));
        setSelectedIndex(0);
      } else {
        setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults.length > 0) {
        const selected = searchResults[selectedIndex];
        setCurrentProduct(selected);
        setBarcode(selected.name);
        setSearchResults([]);
        setSelectedIndex(-1);
      } else if (currentProduct) {
        addToCart(currentProduct, quantity);
        setBarcode('');
        setQuantity(1);
        setCurrentProduct(null);
        setSearchResults([]);
        setSelectedIndex(-1);
      } else if (barcode.trim() !== '') {
        setCustomAlert?.({
          message: `Código ou produto "${barcode}" não cadastrado ou não encontrado!`,
          type: 'error'
        });
        setBarcode('');
        setSearchResults([]);
        setSelectedIndex(-1);
      }
    } else if (e.key === '*') {
      e.preventDefault();
      e.stopPropagation();
      const num = Number(barcode);
      if (barcode.trim() !== '' && !isNaN(num) && num > 0) {
        setQuantity(num);
        setBarcode('');
        barcodeInputRef.current?.focus();
      } else {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }
    } else if (e.key === 'Escape') {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  const selectProduct = (product: Product) => {
    setIsNavigatingCart(false);
    setSelectedCartIndex(-1);
    setCurrentProduct(product);
    setBarcode(product.name);
    setSearchResults([]);
    setSelectedIndex(-1);
    barcodeInputRef.current?.focus();
  };

  const addToCart = (product: Product, qty: number) => {
    // Find the product in the state to get the most up-to-date data
    const currentProduct = products.find(p => p && p.id === product.id) || product;
    
    // Log everything about the product to debug
    
    // Calculate total quantity of this product already in cart
    const qtyInCart = cart
      .filter(item => !item.canceled && item.product.id === currentProduct.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    const totalQty = qtyInCart + qty;

    // Simulate proposed cart state to validate against overall stock limits
    let proposedCart = cart.filter(item => !item.canceled);
    const existingCartItem = proposedCart.find(item => item.product.id === currentProduct.id);
    if (existingCartItem) {
      proposedCart = proposedCart.map(item =>
        item.product.id === currentProduct.id ? { ...item, quantity: item.quantity + qty } : item
      );
    } else {
      proposedCart.push({ product: currentProduct, quantity: qty, discount: 0, originalPrice: currentProduct.salePrice });
    }

    const stockCheck = validateCartStock(proposedCart);
    if (!stockCheck.okay) {
      setCustomAlert({ 
        message: stockCheck.message || '', 
        type: 'warning' 
      });
      return;
    }
    setIsNavigatingCart(false);
    setSelectedCartIndex(-1);
    setLastBeepedProduct(product.name);

    let basePrice = product.salePrice;
    if (pricingMode === 'wholesale' && product.wholesalePrice) {
      basePrice = product.wholesalePrice;
    } else if (pricingMode === 'term' && product.termPrice) {
      basePrice = product.termPrice;
    } else if (pricingMode === 'retail' && product.wholesalePrice && product.wholesaleMinQty && totalQty >= product.wholesaleMinQty) {
      basePrice = product.wholesalePrice;
    }
    
    // Apply club price if customer is a member
    if (selectedCustomer?.isClubMember && product.clubPrice) {
      basePrice = product.clubPrice;
    }

    // Auto-update existing items in cart to wholesale price if threshold reached
    let currentCartState = [...cart];
    if (pricingMode === 'retail' && basePrice === product.wholesalePrice && product.wholesalePrice !== product.salePrice) {
      currentCartState = currentCartState.map(item => {
        if (item.product.id === product.id && item.originalPrice === product.salePrice) {
          return {
            ...item,
            originalPrice: product.wholesalePrice || product.salePrice,
            product: { ...item.product, salePrice: (product.wholesalePrice || product.salePrice) - item.discount }
          };
        }
        return item;
      });
    }

    const now = new Date();
    const todayStr = getLocalDateString(now);
    
    const activePromos = promotions.filter(p => {
      if (!p.startDate || !p.endDate) return false;
      const startStr = getLocalDateString(p.startDate);
      const endStr = getLocalDateString(p.endDate);
      return (
        p.status === 'ACTIVE' && 
        p.applyAutomatically &&
        startStr <= todayStr && 
        todayStr <= endStr &&
        (!p.daysOfWeek || p.daysOfWeek.includes(now.getDay())) &&
        (!p.onlyForClubMembers || selectedCustomer?.isClubMember)
      );
    });

    let promoDiscount = 0;
    let promoType = '';
    
    const productSubcategory = subcategorias.find(s => s.id === product.subcategoria_id);
    
    const applicablePromo = activePromos.find(p => 
      (p.targetType === 'PRODUCT' && (Array.isArray(p.targetId) ? p.targetId.includes(product.id) : p.targetId === product.id)) ||
      (p.targetType === 'CATEGORY' && p.targetId === productSubcategory?.categoria_id) ||
      p.targetType === 'ALL'
    );

    if (applicablePromo) {
      promoType = applicablePromo.type;
      if (applicablePromo.type === 'PRICE') {
        if (applicablePromo.productPrices && applicablePromo.productPrices[product.id]) {
          promoDiscount = basePrice - applicablePromo.productPrices[product.id];
        } else if (applicablePromo.discountValue) {
          promoDiscount = basePrice - applicablePromo.discountValue;
        }
      } else if (applicablePromo.type === 'PERCENTAGE' && applicablePromo.discountValue) {
        promoDiscount = basePrice * (applicablePromo.discountValue / 100);
      }
    }

    const existingIndex = currentCartState.findIndex(item => !item.canceled && item.product.id === product.id && item.discount === promoDiscount && item.originalPrice === basePrice);
    
    if (existingIndex >= 0) {
      const newCart = [...currentCartState];
      newCart[existingIndex].quantity += qty;
      
      if (applicablePromo?.type === 'BUY_X_GET_Y' && applicablePromo.buyQuantity && applicablePromo.payQuantity) {
        const totalQty = newCart[existingIndex].quantity;
        const sets = Math.floor(totalQty / applicablePromo.buyQuantity);
        const freeItems = sets * (applicablePromo.buyQuantity - applicablePromo.payQuantity);
        if (freeItems > 0) {
          const discountPerItem = (freeItems * basePrice) / totalQty;
          newCart[existingIndex].discount = discountPerItem;
          newCart[existingIndex].product.salePrice = basePrice - discountPerItem;
          newCart[existingIndex].promotionId = applicablePromo.id;
        } else {
          newCart[existingIndex].discount = 0;
          newCart[existingIndex].product.salePrice = basePrice;
          newCart[existingIndex].promotionId = undefined;
        }
      } else if (applicablePromo) {
        newCart[existingIndex].promotionId = applicablePromo.id;
      }
      
      setCart(newCart);
    } else {
      let initialDiscount = promoDiscount;
      let initialPrice = basePrice - promoDiscount;
      let promotionId = applicablePromo?.id;
      
      if (applicablePromo?.type === 'BUY_X_GET_Y' && applicablePromo.buyQuantity && applicablePromo.payQuantity) {
        const sets = Math.floor(qty / applicablePromo.buyQuantity);
        const freeItems = sets * (applicablePromo.buyQuantity - applicablePromo.payQuantity);
        if (freeItems > 0) {
          initialDiscount = (freeItems * basePrice) / qty;
          initialPrice = basePrice - initialDiscount;
        } else {
          promotionId = undefined;
        }
      }

      setCart([...currentCartState, { 
        product: { ...product, salePrice: initialPrice }, 
        quantity: qty, 
        discount: initialDiscount, 
        originalPrice: basePrice,
        promotionId: promotionId
      }]);
    }
  };
  
  const currentProductPromo = currentProduct ? getProductPromoInfo(currentProduct) : null;

  if (!hasPermission('Vendas', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Lock size={48} className="text-rose-500" />
        <h2 className="text-xl font-black uppercase italic text-brand-text-main">Acesso Negado</h2>
        <p className="text-brand-text-sec">Você não tem permissão para acessar o PDV (Vendas).</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white text-slate-900 font-sans overflow-hidden select-none">
      {/* Top Header */}
      <header className="bg-[#1e40af] text-white px-2 md:px-4 py-2 flex items-center justify-between border-b border-blue-900/40 gap-2 relative shadow-sm">
        <div className="flex items-center gap-1.5 md:gap-4 min-w-0 z-10">
          <div className="shrink-0 bg-white px-3 py-1 rounded-lg flex items-center justify-center shadow-sm">
            <Logo size="sm" theme="light" className="md:hidden" />
            <Logo size="md" theme="light" className="hidden md:block" />
          </div>
        </div>
        
        <div className="absolute top-2.5 md:top-1/2 -translate-y-0 md:-translate-y-1/2 left-[90px] right-[115px] md:right-auto md:left-1/2 md:-translate-x-1/2 text-left md:text-center pointer-events-none z-0">
          {companySettings?.tradeName && (
            <h1 className="text-xs xs:text-sm md:text-xl font-bold md:tracking-widest uppercase leading-tight truncate w-full pointer-events-auto text-white">
              {companySettings.tradeName}
            </h1>
          )}
        </div>
        
        <div className="flex flex-col items-end z-10">
          <div className="flex gap-2 mb-1 items-center">
            <button
              id="btn-import-carga"
              type="button"
              onClick={handleImportCarga}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black transition-all border shrink-0 flex items-center justify-center gap-1 cursor-pointer",
                hasPendingCarga 
                  ? "bg-emerald-600 text-white border-emerald-500 animate-pulse hover:bg-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.5)] font-black" 
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
              )}
              title={hasPendingCarga ? "Existe uma nova carga de produtos disponível! Pressione Alt+C para receber." : "Importar carga de produtos (Alt+C)"}
            >
              <span className="text-sm font-black">📥</span>
              <span className="hidden md:inline text-[10px] font-black">ALT+C</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              title="Instruções dos Atalhos (F1)"
              className="px-2.5 py-1 rounded-lg text-xs font-black transition-colors border shrink-0 bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/35 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="text-sm font-black">?</span>
            </button>
            <button
              onClick={() => {
                setPricingMode(prev => {
                  const nextMode = prev === 'retail' ? 'term' : 'retail';
                  setCart(currentCart => currentCart.map(item => {
                    let newPrice = item.product.salePrice;
                    if (nextMode === 'term' && item.product.termPrice) {
                      newPrice = item.product.termPrice;
                    } else {
                      newPrice = item.product.salePrice;
                    }

                    return {
                      ...item,
                      product: { ...item.product, salePrice: newPrice },
                      originalPrice: newPrice,
                      discount: 0
                    };
                  }));
                  return nextMode;
                });
              }}
              className={cn(
                "px-2 py-1 md:px-3 md:py-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors border shrink-0",
                pricingMode === 'term' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                pricingMode === 'retail' && "bg-white/10 text-white border-white/20"
              )}
            >
              {pricingMode === 'retail' && (
                <>
                  <span className="hidden md:inline">(F11)</span>
                  <span className="md:hidden">(F11)</span>
                </>
              )}
              {pricingMode === 'term' && (
                <>
                  <span className="hidden md:inline">(F11)</span>
                  <span className="md:hidden">(F11)</span>
                </>
              )}
            </button>
            {/* Removed: Terminal de Consulta, Full Screen, and Sair buttons */}
          </div>
          <div className="bg-white/10 px-4 py-1 border border-white/20 rounded">
            <span className="text-sm font-bold text-white/90">{formatDate(currentTime)}</span>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="relative py-3 md:py-4 text-center shadow-inner bg-[#1e40af] transition-colors duration-300 flex flex-col items-center justify-center min-h-[70px] md:min-h-[88px]">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center">
          <span className="text-[10px] md:text-xs font-black tracking-widest text-white/90 bg-white/15 px-3 py-1.5 rounded uppercase border border-white/20 shadow-sm">
            DESCRIÇÃO
          </span>
        </div>
        <h2 className="text-2xl md:text-4xl font-black tracking-normal uppercase italic px-4 max-w-[70%] truncate text-white">
          {cart.filter(item => !item.canceled).length > 0 
            ? (lastBeepedProduct || cart.filter(item => !item.canceled).slice(-1)[0]?.product.name || "CAIXA OCUPADO") 
            : "CAIXA LIVRE"
          }
        </h2>
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-0 md:pt-1 px-3 md:px-6 pb-3 md:pb-6 flex flex-col lg:flex-row gap-4 md:gap-6 overflow-y-auto lg:overflow-hidden">
        {/* Middle: Product Image */}
        <div className="hidden lg:flex lg:w-[50%] flex-col shrink-0 lg:h-full">
          {/* Imagem do Produto ou Totem */}
          <div className="flex-1 min-h-[350px] lg:h-full w-full relative bg-slate-50 border border-brand-border rounded-xl overflow-hidden flex flex-col items-center justify-center shadow-inner mt-1">
            {/* If the cart has no active items (caixa livre) */}
            {cart.filter(item => !item.canceled).length === 0 ? (
              // Show images from "Gestão do Totem" (advertisements)
              <div className="w-full h-full relative flex items-center justify-center">
                {advertisements && advertisements.filter(ad => ad.ativo).length > 0 ? (
                  (() => {
                    const activeAds = advertisements.filter(ad => ad.ativo);
                    const currentAd = activeAds[currentAdIndex % activeAds.length];
                    return (
                      <div className="w-full h-full relative flex flex-col items-center justify-center bg-[#1d4ed8] p-1.5 md:p-2">
                        <img 
                          src={currentAd.imagem_url} 
                          alt={currentAd.titulo} 
                          className="w-full h-full object-contain rounded-lg"
                        />
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 text-white px-2.5 py-1 rounded-lg backdrop-blur-sm text-center">
                          <h4 className="font-bold text-[10px] md:text-xs uppercase tracking-wider line-clamp-1">{currentAd.titulo}</h4>
                          {currentAd.descricao && (
                            <p className="text-[8px] md:text-[10px] text-white/80 line-clamp-1 mt-0.5">{currentAd.descricao}</p>
                          )}
                        </div>
                        {/* Slide dots indicators if more than 1 ad */}
                        {activeAds.length > 1 && (
                          <div className="absolute top-1.5 right-1.5 flex gap-1 bg-black/40 px-1.5 py-0.5 rounded-full">
                            {activeAds.map((_, idx) => (
                              <div 
                                key={idx} 
                                className={`w-1 h-1 rounded-full transition-all ${idx === (currentAdIndex % activeAds.length) ? 'bg-white scale-125' : 'bg-white/40'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                    <ImageIcon size={40} className="stroke-1.5 mb-1.5 text-slate-300" />
                    <span className="text-xs font-black uppercase text-brand-text-main">CAIXA LIVRE</span>
                    <span className="text-[10px] opacity-60 mt-0.5">Anúncios do Totem aparecerão aqui</span>
                  </div>
                )}
              </div>
            ) : (
              // If cart has active items (caixa ocupada)
              <div className="w-full h-full relative flex items-center justify-center p-3 md:p-4">
                {(() => {
                  const activeCartItems = cart.filter(item => !item.canceled);
                  const lastActiveItem = activeCartItems[activeCartItems.length - 1];
                  const productToShow = currentProduct || lastActiveItem?.product;
                  const imageToShow = productToShow?.image;

                  if (imageToShow) {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                        <div className="w-full h-full max-h-[calc(100%-24px)] flex items-center justify-center bg-white rounded-lg p-1.5 shadow-sm border border-brand-border">
                          <img 
                            src={imageToShow} 
                            alt={productToShow?.name} 
                            className="max-w-full max-h-full object-contain rounded-md"
                          />
                        </div>
                        <span className="text-[10px] md:text-xs font-black uppercase text-brand-text-main line-clamp-1 text-center bg-white px-2 py-0.5 rounded-full shadow-sm border border-brand-border">
                          {productToShow?.name}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                        <ImageIcon size={40} className="stroke-1.5 mb-1.5 text-slate-300" />
                        <span className="text-xs font-bold uppercase text-brand-text-main line-clamp-1">
                          {productToShow?.name || "Mercadoria"}
                        </span>
                        <span className="text-[10px] opacity-60 mt-0.5">Sem imagem cadastrada</span>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cupom */}
        <div className="w-full lg:w-[50%] flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl border border-brand-border min-h-[400px] lg:min-h-0">
          <div className="py-1.5 px-4 flex flex-wrap justify-between items-center gap-2 border-b border-brand-border bg-slate-50">
            <h3 className="text-lg md:text-xl font-black italic tracking-widest text-brand-text-main uppercase">Cupom Fiscal</h3>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handlePauseCurrentSale}
                className={cn(
                  "px-2.5 py-1 text-[10px] md:text-xs font-black italic uppercase rounded-lg border transition-all flex items-center gap-1 shadow-sm",
                  cart.length > 0 
                    ? "bg-amber-500 hover:bg-amber-600 border-amber-600 text-white cursor-pointer active:scale-95" 
                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                )}
                title="Pausar Venda Atual (Alt+P)"
              >
                <Pause size={12} className="shrink-0" /> Pausar (Alt+P)
              </button>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPausedSalesDropdown(prev => !prev)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] md:text-xs font-black italic uppercase rounded-lg border transition-all flex items-center gap-1 shadow-sm relative",
                    pausedSales.length > 0
                      ? "bg-brand-blue hover:bg-brand-blue-hover border-brand-blue text-white cursor-pointer active:scale-95"
                      : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <FolderOpen size={12} className="shrink-0" /> Pausadas ({pausedSales.length})
                  {pausedSales.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
                
                {showPausedSalesDropdown && pausedSales.length > 0 && (
                  <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white border-2 border-brand-border rounded-xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="bg-brand-text-main px-4 py-2 text-white font-black italic uppercase text-xs flex justify-between items-center">
                      <span>Vendas em Pausa</span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowPausedSalesDropdown(false); }}
                        className="text-white hover:text-rose-400 text-[10px] font-bold uppercase"
                      >
                        Fechar
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {pausedSales.map((ps) => {
                        const activeItemsCount = ps.cart.filter(i => !i.canceled).reduce((sum, i) => sum + i.quantity, 0);
                        const totalVal = ps.cart.filter(i => !i.canceled).reduce((sum, i) => sum + (i.product.salePrice * i.quantity - i.discount * i.quantity), 0) - ps.saleDiscount;
                        return (
                          <div key={ps.id} className="p-3 hover:bg-slate-50/80 transition-colors flex flex-col gap-1.5 text-left">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[9px] text-slate-400 font-bold uppercase">ID: #{ps.id}</span>
                              <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{ps.timestamp}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-black text-brand-text-main">
                              <span className="uppercase italic text-slate-600">{activeItemsCount} {activeItemsCount === 1 ? 'item' : 'itens'}</span>
                              <span className="text-brand-blue">R$ {formatCurrency(Math.max(0, totalVal))}</span>
                            </div>
                            {ps.selectedCustomer && (
                              <div className="text-[10px] text-brand-blue font-black uppercase italic bg-brand-blue/5 px-2 py-0.5 rounded border border-brand-blue/10 truncate">
                                Cliente: {ps.selectedCustomer.name}
                              </div>
                            )}
                            <div className="flex gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  resumeSale(ps.id);
                                  setShowPausedSalesDropdown(false);
                                }}
                                className="flex-1 py-1.5 bg-brand-blue hover:bg-brand-blue-hover text-white text-[10px] font-black uppercase italic rounded-md transition-all text-center shadow"
                              >
                                Recuperar
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePausedSale(ps.id)}
                                className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black uppercase italic rounded-md transition-all text-center border border-rose-100"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1 bg-white text-slate-900 overflow-y-auto relative">
            {cart.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                {companySettings?.logo ? (
                  <div className="relative w-80 h-80 mb-8 flex items-center justify-center">
                    <img 
                      src={companySettings?.logo || ''} 
                      alt="Logo da Empresa" 
                      className="max-w-full max-h-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <Logo className="w-80 h-80 mb-8" />
                )}
                <p className="text-xl font-black uppercase italic text-brand-text-main">Caixa Livre</p>
                <p className="text-sm font-bold text-brand-text-sec">Passe o código de barras ou pesquise um produto para iniciar a venda.</p>
              </div>
            ) : (
              <div className="min-w-full">
                <table className="w-full text-[10px] font-bold">
                <thead className="bg-brand-text-main text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-center w-8">#</th>
                    <th className="px-2 py-1 text-left">Cód de Barras</th>
                    <th className="px-2 py-1 text-left">Descrição</th>
                    <th className="px-2 py-1 text-center">Qtd.</th>
                    <th className="px-2 py-1 text-right">Vlr. Unit</th>
                    <th className="px-2 py-1 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cart.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => {
                        if (idx === selectedCartIndex) {
                          setSelectedCartIndex(-1);
                          setIsNavigatingCart(false);
                        } else {
                          setSelectedCartIndex(idx);
                          setIsNavigatingCart(true);
                        }
                      }}
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors cursor-pointer",
                        idx === selectedCartIndex ? "bg-brand-blue/20 ring-2 ring-brand-blue ring-inset" : "",
                        item.canceled ? "bg-rose-50/30" : ""
                      )}
                    >
                      <td className={cn("px-2 py-1 text-center font-mono text-slate-500", item.canceled && "line-through decoration-rose-500")}>{idx + 1}</td>
                      <td className={cn("px-2 py-1", item.canceled ? "text-rose-500 line-through decoration-rose-500 font-bold" : "text-brand-text-main")}>{item.product.sku}</td>
                      <td className={cn(
                        "px-2 py-1 uppercase",
                        item.canceled ? "text-rose-600 line-through decoration-rose-600 font-bold" : "text-brand-text-main"
                      )}>
                        {item.product.name}
                        {item.canceled && (
                          <span className="ml-2 text-[8px] text-rose-600 font-black italic uppercase tracking-wider">
                            (CANCELADO)
                          </span>
                        )}
                        {item.discount > 0 && !item.canceled && (
                          <span className="ml-2 text-[8px] text-rose-600 font-black italic">
                            (DESC: -{formatCurrency(item.discount * item.quantity)})
                          </span>
                        )}
                      </td>
                      <td className={cn("px-2 py-1 text-center", item.canceled ? "text-rose-500 line-through decoration-rose-500" : "text-brand-text-main")}>{item.quantity.toFixed(3)}</td>
                      <td className={cn("px-2 py-1 text-right", item.canceled ? "text-rose-500 line-through decoration-rose-500" : "text-brand-text-main")}>{formatCurrency(item.product.salePrice || 0)}</td>
                      <td className={cn("px-2 py-1 text-right font-black", item.canceled ? "text-rose-500 line-through decoration-rose-500" : "text-brand-text-main")}>{formatCurrency((item.product.salePrice || 0) * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>

        <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-t border-brand-border">
          {selectedCustomer ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-black italic text-brand-blue uppercase">Cliente: {selectedCustomer.name}</span>
                {selectedCustomer.isClubMember && (
                  <span className="bg-brand-blue text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic animate-pulse">
                    Cliente Clube Ativo ✅
                  </span>
                )}
              </div>
              <button 
                onClick={removeCustomer}
                className="text-[10px] font-black text-rose-600 uppercase italic hover:underline"
              >
                Remover (Esc)
              </button>
            </div>
          ) : (
            <span className="text-sm font-bold italic text-brand-text-main">Cliente: CONSUMIDOR FINAL</span>
          )}
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end justify-between">
        {/* Left Side: Product Inputs aligned with Total a Pagar */}
        <div className="w-full md:w-[50%] flex flex-col gap-2">
          {/* Barcode input */}
          <div className="space-y-0.5 relative">
            <label id="pdv-barcode-label" className="text-xs md:text-sm font-bold italic text-brand-text-main">Código de Barras</label>
            <input 
              id="pdv-barcode-input"
              ref={barcodeInputRef}
              value={barcode}
              onChange={handleBarcodeChange}
              onKeyDown={handleKeyDown}
              disabled={!activeRegister}
              autoComplete="off"
              className="w-full bg-white border-2 border-brand-border rounded-xl px-3 py-0 md:py-0.5 text-base md:text-xl font-black text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute bottom-full left-0 w-full max-h-64 bg-white border-2 border-brand-border rounded-xl mb-2 shadow-2xl z-[100] overflow-y-auto">
                 {searchResults.map((product, index) => {
                    if (!product) return null;
                    const promoInfo = getProductPromoInfo(product);
                    const isPromoActive = promoInfo && promoInfo.promoPrice !== null;
                    return (
                      <div 
                        key={product.id}
                        id={`search-result-${index}`}
                        onClick={() => selectProduct(product)}
                        className={cn(
                          "px-4 py-2 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors",
                          index === selectedIndex ? "bg-brand-blue text-white" : "hover:bg-slate-50 text-brand-text-main"
                        )}
                      >
                        <div className="flex flex-col">
                           <span className="text-sm font-bold uppercase">{product.name}</span>
                           <span className="text-[10px] opacity-60">SKU: {product.sku}</span>
                        </div>
                        {isPromoActive ? (
                          <div className="text-right flex flex-col items-end">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] line-through opacity-65">R$ {formatCurrency(product.salePrice)}</span>
                              <span className="bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">
                                {promoInfo.badge}
                              </span>
                            </div>
                            <span className={cn("font-black text-sm", index === selectedIndex ? "text-white" : "text-rose-600 dark:text-rose-450")}>
                              R$ {formatCurrency(promoInfo.promoPrice)}
                            </span>
                          </div>
                        ) : promoInfo?.badge ? (
                          <div className="text-right flex flex-col items-end">
                            <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase mb-0.5">
                              {promoInfo.badge}
                            </span>
                            <span className="font-black text-sm">R$ {formatCurrency(product.salePrice)}</span>
                          </div>
                        ) : (
                          <span className="font-black text-sm">R$ {formatCurrency(product.salePrice)}</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Quantity, Unit Price and Total Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-0.5">
              <label className="text-xs md:text-sm font-bold italic text-brand-text-main">Quantidade</label>
              <input 
                ref={quantityInputRef}
                type="number" 
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                onKeyDown={handleQuantityKeyDown}
                className="w-full bg-white border-2 border-brand-border rounded-xl px-3 py-0.5 md:py-1 text-base md:text-xl font-black text-right text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-xs md:text-sm font-bold italic text-brand-text-main">Valor Unitário</label>
              <div className="bg-slate-50 border-2 border-brand-border rounded-xl px-3 py-0.5 md:py-1 text-right flex flex-col justify-center min-h-[32px] md:min-h-[38px]">
                {currentProduct && currentProductPromo?.promoPrice !== null && currentProductPromo?.promoPrice !== undefined ? (
                  <div className="flex flex-col items-end leading-none">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] line-through opacity-60">R$ {formatCurrency(currentProduct.salePrice)}</span>
                      <span className="bg-rose-600 text-white text-[8px] font-black px-1 py-0.5 rounded tracking-wide uppercase">
                        {currentProductPromo.badge}
                      </span>
                    </div>
                    <span className="text-base md:text-xl font-black text-rose-600 leading-tight">R$ {formatCurrency(currentProductPromo.promoPrice)}</span>
                  </div>
                ) : currentProduct && currentProductPromo?.badge ? (
                  <div className="flex flex-col items-end leading-none">
                    <span className="bg-amber-500 text-white text-[8px] font-black px-1 py-0.5 rounded tracking-wide uppercase mb-0.5">
                      {currentProductPromo.badge}
                    </span>
                    <span className="text-base md:text-xl font-black text-brand-text-main leading-tight">R$ {formatCurrency(currentProduct.salePrice)}</span>
                  </div>
                ) : (
                  <span className="text-base md:text-xl font-black text-brand-text-main">{formatCurrency(currentProduct?.salePrice || 0)}</span>
                )}
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-xs md:text-sm font-bold italic text-brand-text-main">Valor Total</label>
              <div className="bg-slate-50 border-2 border-brand-border rounded-xl px-3 py-0.5 md:py-1 text-right flex flex-col justify-center min-h-[32px] md:min-h-[38px]">
                {currentProduct && currentProductPromo?.promoPrice !== null && currentProductPromo?.promoPrice !== undefined ? (
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-[8px] opacity-65 leading-none mb-0.5">Sem Promo: R$ {formatCurrency(currentProduct.salePrice * quantity)}</span>
                    <span className="text-base md:text-xl font-black text-rose-600">R$ {formatCurrency(currentProductPromo.promoPrice * quantity)}</span>
                  </div>
                ) : (
                  <span className="text-base md:text-xl font-black text-brand-text-main">{formatCurrency((currentProduct?.salePrice || 0) * quantity)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Total a Pagar */}
        <div className="w-full md:w-[38%] flex flex-col gap-1.5 justify-end">
          <h3 className="text-xs md:text-sm font-black italic uppercase tracking-wider text-brand-text-main">Total a Pagar</h3>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className={cn(
              "w-full bg-[#1e40af] py-2 md:py-3 text-center rounded-xl border border-[#1d4ed8] shadow-md relative overflow-hidden transition-all duration-200 outline-none text-left flex flex-col items-center justify-center",
              cart.length > 0 ? "cursor-pointer hover:bg-[#1d4ed8] active:scale-[0.98]" : "cursor-not-allowed"
            )}
          >
            {saleDiscount > 0 && (
              <div className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] px-1.5 py-0.5 font-black italic rounded-bl-lg">
                DESC: -{formatCurrency(saleDiscount)}
              </div>
            )}
            <span className="text-2xl md:text-4xl font-black tracking-tighter text-white">R$ {formatCurrency(total)}</span>
          </button>

          {/* Botão de Finalização Exclusivo para Celular/Tablet */}
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleCheckout}
              className="md:hidden w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase text-[10px] tracking-widest py-2 rounded-xl shadow-md border border-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span className="animate-pulse">🟢</span> Finalizar Venda
            </button>
          )}
        </div>
      </footer>

      {/* Shortcuts Bar */}
      <div className="bg-[#1e40af] py-2 px-4 text-[9px] font-bold border-t border-[#1e40af] overflow-x-auto whitespace-nowrap text-brand-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-white bg-white/10 px-2.5 py-1 rounded">
          <span className="bg-white text-slate-900 px-1.5 py-0.5 rounded uppercase text-[9px] tracking-wider">Operador:</span>
          <span className="uppercase font-black text-xs">{user?.userNumber ? `${user.userNumber} - ` : ''}{user?.name || 'SISTEMA'}</span>
        </div>
        <div className="hidden lg:flex flex-col items-center">
          <div className="flex gap-4 justify-center opacity-80">
            <button onClick={() => setShowHelp(prev => !prev)} className="hover:text-white transition-colors">&nbsp;</button>
            <span>&nbsp;</span>
            <button onClick={() => setShowProductListModal(prev => !prev)} className="hover:text-white transition-colors">&nbsp;</button>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <button onClick={() => {
              if (cart.length > 0) {
                setDiscountType(selectedCartIndex >= 0 ? 'item' : 'sale');
                setShowDiscountModal(true);
              }
            }} className="hover:text-white transition-colors">&nbsp;</button>
            <button onClick={() => {
              if (cart.length > 0) {
                setDiscountType('sale');
                setShowDiscountModal(true);
              }
            }} className="hover:text-white transition-colors">&nbsp;</button>
            <button onClick={() => {
              if (selectedCartIndex >= 0) {
                setConfirmDialog({
                  message: `Deseja cancelar o item: ${cart[selectedCartIndex].product.name}?`,
                  onConfirm: () => {
                    if (checkActionPermission()) {
                      setCart(prev => prev.map((item, i) => i === selectedCartIndex ? { ...item, canceled: true } : item));
                      setSelectedCartIndex(-1);
                      setIsNavigatingCart(false);
                    } else {
                      setPendingAction({ type: 'cancel_item', data: { index: selectedCartIndex } });
                      setShowAuthModal(true);
                    }
                  }
                });
              } else if (cart.length > 0) {
                const lastActiveIdx = [...cart].reverse().findIndex(item => !item.canceled);
                const lastIdx = lastActiveIdx !== -1 ? cart.length - 1 - lastActiveIdx : -1;
                if (lastIdx !== -1) {
                  if (checkActionPermission()) {
                    setCart(prev => prev.map((item, i) => i === lastIdx ? { ...item, canceled: true } : item));
                    setSelectedCartIndex(-1);
                    setIsNavigatingCart(false);
                  } else {
                    setPendingAction({ type: 'cancel_item', data: { index: lastIdx } });
                    setShowAuthModal(true);
                  }
                }
              }
            }} className="hover:text-white transition-colors">&nbsp;</button>
            <button onClick={() => {
              if (cart.length > 0) {
                setConfirmDialog({
                  message: 'Deseja cancelar a venda atual?',
                  onConfirm: () => {
                    if (checkActionPermission()) {
                      setCart([]);
                      setSaleDiscount(0);
                      setSelectedCartIndex(-1);
                      setIsNavigatingCart(false);
                      setPricingMode('retail');
                    } else {
                      setPendingAction({ type: 'cancel_sale' });
                      setShowAuthModal(true);
                    }
                  }
                });
              }
            }} className="hover:text-white transition-colors">&nbsp;</button>
            <button onClick={handleCheckout} className="hover:text-white transition-colors">&nbsp;</button>
            <span>&nbsp;</span>
          </div>
          <div className="flex gap-4 justify-center opacity-80 mt-0.5">
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
            <span>&nbsp;</span>
          </div>
        </div>
      </div>

      {/* Reverse Sale Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-brand-text-main px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                <Lock size={20} /> Estornar Venda
              </h3>
              <button onClick={() => setShowReverseModal(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-text-main uppercase tracking-widest">ID da Venda ou Cupom</label>
                <input 
                  ref={reverseSaleIdRef}
                  autoFocus
                  value={reverseSaleId}
                  onChange={(e) => setReverseSaleId(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && reverseSaleId) {
                      if (checkActionPermission()) {
                        await deleteSale(reverseSaleId);
                        setCustomAlert({ message: `Venda #${reverseSaleId} estornada com sucesso! Itens retornados ao estoque.`, type: 'success' });
                        setReverseSaleId('');
                        setShowReverseModal(false);
                      } else {
                        setPendingAction({ type: 'reverse_sale', data: { saleId: reverseSaleId } });
                        setShowReverseModal(false);
                        setShowAuthModal(true);
                      }
                    }
                  }}
                  placeholder="Digite o número da venda..."
                  className="w-full bg-slate-50 border-2 border-brand-border rounded-xl px-4 py-3 text-xl font-black text-brand-text-main focus:border-brand-blue outline-none transition-all"
                />
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                <div className="text-amber-600 shrink-0 mt-0.5">
                  <Tag size={18} />
                </div>
                <p className="text-xs font-medium text-amber-800">
                  O estorno de venda cancelará a transação financeira e retornará todos os itens ao estoque físico. Esta ação requer autorização de supervisor.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReverseModal(false)}
                  className="flex-1 py-3 bg-white border-2 border-brand-border text-brand-text-main font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (reverseSaleId) {
                      if (checkActionPermission()) {
                        await deleteSale(reverseSaleId);
                        setCustomAlert({ message: `Venda #${reverseSaleId} estornada com sucesso! Itens retornados ao estoque.`, type: 'success' });
                        setReverseSaleId('');
                        setShowReverseModal(false);
                      } else {
                        setPendingAction({ type: 'reverse_sale', data: { saleId: reverseSaleId } });
                        setShowReverseModal(false);
                        setShowAuthModal(true);
                      }
                    }
                  }}
                  className="flex-1 py-3 bg-brand-text-main text-white font-bold rounded-xl hover:bg-brand-text-main/90 transition-all shadow-lg"
                >
                  Confirmar Estorno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Item Modal */}
      {showCancelItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-red-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                <X size={24} /> Cancelar Item
              </h3>
              <button onClick={() => setShowCancelItemModal(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-text-main uppercase tracking-widest">Número do Item</label>
                <input 
                  ref={cancelItemNumberRef}
                  autoFocus
                  value={cancelItemNumber}
                  onChange={(e) => setCancelItemNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      let targetIndex = -1;
                      if (cancelItemNumber === '') {
                        const lastActiveIdx = [...cart].reverse().findIndex(item => !item.canceled);
                        targetIndex = lastActiveIdx !== -1 ? cart.length - 1 - lastActiveIdx : -1;
                      } else {
                        targetIndex = parseInt(cancelItemNumber) - 1;
                      }
                      
                      if (targetIndex >= 0 && targetIndex < cart.length) {
                        const itemToRemove = cart[targetIndex];
                        setShowCancelItemModal(false);
                        setConfirmDialog({
                          message: `Deseja cancelar o item: ${itemToRemove.product.name}?`,
                          onConfirm: () => {
                            if (checkActionPermission()) {
                              setCart(prev => prev.map((item, i) => i === targetIndex ? { ...item, canceled: true } : item));
                              setSelectedCartIndex(-1);
                              setIsNavigatingCart(false);
                            } else {
                              setPendingAction({ type: 'cancel_item', data: { index: targetIndex } });
                              setShowAuthModal(true);
                            }
                          }
                        });
                      } else {
                        alert('Item não encontrado!');
                      }
                    }
                  }}
                  placeholder="Deixe em branco para o último"
                  className="w-full bg-slate-50 border-2 border-brand-border rounded-xl px-4 py-3 text-xl font-black text-brand-text-main focus:border-red-600 outline-none transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCancelItemModal(false)}
                  className="flex-1 py-3 bg-white border-2 border-brand-border text-brand-text-main font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={() => {
                    let targetIndex = -1;
                    if (cancelItemNumber === '') {
                      const lastActiveIdx = [...cart].reverse().findIndex(item => !item.canceled);
                      targetIndex = lastActiveIdx !== -1 ? cart.length - 1 - lastActiveIdx : -1;
                    } else {
                      targetIndex = parseInt(cancelItemNumber) - 1;
                    }
                    
                    if (targetIndex >= 0 && targetIndex < cart.length) {
                      const itemToRemove = cart[targetIndex];
                      setShowCancelItemModal(false);
                      setConfirmDialog({
                        message: `Deseja cancelar o item: ${itemToRemove.product.name}?`,
                        onConfirm: () => {
                          if (checkActionPermission()) {
                            setCart(prev => prev.map((item, i) => i === targetIndex ? { ...item, canceled: true } : item));
                            setSelectedCartIndex(-1);
                            setIsNavigatingCart(false);
                          } else {
                            setPendingAction({ type: 'cancel_item', data: { index: targetIndex } });
                            setShowAuthModal(true);
                          }
                        }
                      });
                    } else {
                      alert('Item não encontrado!');
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Item Modal */}
      {showDiscountItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                <Tag size={24} /> Desconto no Item
              </h3>
              <button onClick={() => setShowDiscountItemModal(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-brand-text-main uppercase tracking-widest">Número do Item</label>
                <input 
                  ref={discountItemNumberRef}
                  autoFocus
                  value={discountItemNumber}
                  onChange={(e) => setDiscountItemNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      let targetIndex = -1;
                      if (discountItemNumber === '') {
                        targetIndex = cart.length - 1;
                      } else {
                        targetIndex = parseInt(discountItemNumber) - 1;
                      }
                      
                      if (targetIndex >= 0 && targetIndex < cart.length) {
                        setShowDiscountItemModal(false);
                        setDiscountType('item');
                        setSelectedCartIndex(targetIndex);
                        setShowDiscountModal(true);
                      } else {
                        alert('Item não encontrado!');
                      }
                    }
                  }}
                  placeholder="Deixe em branco para o último"
                  className="w-full bg-slate-50 border-2 border-brand-border rounded-xl px-4 py-3 text-xl font-black text-brand-text-main focus:border-emerald-600 outline-none transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDiscountItemModal(false)}
                  className="flex-1 py-3 bg-white border-2 border-brand-border text-brand-text-main font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={() => {
                    let targetIndex = -1;
                    if (discountItemNumber === '') {
                      targetIndex = cart.length - 1;
                    } else {
                      targetIndex = parseInt(discountItemNumber) - 1;
                    }
                    
                    if (targetIndex >= 0 && targetIndex < cart.length) {
                      setShowDiscountItemModal(false);
                      setDiscountType('item');
                      setSelectedCartIndex(targetIndex);
                      setShowDiscountModal(true);
                    } else {
                      alert('Item não encontrado!');
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Return Modal */}
      {showQuickReturnModal && (
        <QuickReturnModal onClose={() => setShowQuickReturnModal(false)} />
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden">
            <div className="bg-brand-blue px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                ? Ajuda Rápida - CpSystem
              </h3>
              <button onClick={() => setShowHelp(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-8 text-sm text-brand-text-main">
              <div className="space-y-2">
                <h4 className="font-black italic uppercase text-brand-blue border-b border-brand-border pb-1">Vendas</h4>
                <p><span className="font-bold">F1</span> - Ajuda rápida</p>
                <p><span className="font-bold">F2</span> - Devolução rápida</p>
                <p><span className="font-bold">F3</span> - Buscar produto manual</p>
                <p><span className="font-bold">F4</span> - Alterar quantidade</p>
                <p><span className="font-bold">F5</span> - Inserir cliente</p>
                <p><span className="font-bold">F6</span> - Aplicar desconto (Item)</p>
                <p><span className="font-bold">F7</span> - Desconto na venda total</p>
                <p><span className="font-bold">F8</span> - Cancelar item</p>
                <p><span className="font-bold">F9</span> - Cancelar venda</p>
                <p><span className="font-bold">F10</span> - Finalizar venda</p>
                <p><span className="font-bold">F11</span> - Alternar precificação (Varejo / Preço 2)</p>
                <p><span className="font-bold">F12</span> - Autorização rápida</p>
                <p><span className="font-bold">Alt + P</span> - Pausar / Alternar venda atual</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-black italic uppercase text-brand-blue border-b border-brand-border pb-1">Caixa & Consultas</h4>
                <p><span className="font-bold">Ctrl + S</span> - Sangria</p>
                <p><span className="font-bold">Ctrl + U</span> - Suprimento</p>
                <p><span className="font-bold">Ctrl + F</span> - Fechamento de caixa</p>
                <p><span className="font-bold">Ctrl + P</span> - Consultar preço</p>
                <a href="/consulta-preco" target="_blank" className="block mt-2 p-2 bg-brand-blue/10 text-brand-blue rounded-lg text-[10px] font-black uppercase italic hover:bg-brand-blue hover:text-white transition-all text-center border border-brand-blue/20">
                  Abrir Terminal em Nova Aba
                </a>
                <p><span className="font-bold">Alt + C</span> - Importar carga de produtos</p>
                <p><span className="font-bold">Alt + H</span> - Histórico do cliente</p>
                <p><span className="font-bold">Alt + L</span> - Lista de produtos</p>
                <p><span className="font-bold">Alt + N</span> - Nota fiscal</p>
                <p><span className="font-bold">Alt + T</span> - Troca/devolução</p>
                <div className="pt-4 text-[10px] opacity-60 italic space-y-1">
                  <div>Dica: Use [Número] + F6 para desconto rápido no item.</div>
                  <div className="text-brand-blue font-bold">No Pagamento: F6 = Dinheiro rápido, F7 = Pix rápido.</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-4 text-center text-xs font-bold text-brand-text-main/60">
              Pressione ESC para fechar
            </div>
          </div>
        </div>
      )}

      {/* Price Check Modal */}
      {showPriceCheckModal && (
        <PriceCheckModal onClose={() => setShowPriceCheckModal(false)} products={products} />
      )}

      {/* Product List Modal */}
      {showProductListModal && (
        <ProductListModal 
          onClose={() => setShowProductListModal(false)} 
          onSelectProduct={(product) => {
            selectProduct(product);
            setShowProductListModal(false);
          }}
          products={products}
        />
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal onClose={() => setShowInvoiceModal(false)} />
      )}

      {/* New Product Modal */}
      {showProductModal && (
        <ProductForm 
          onClose={() => setShowProductModal(false)}
          onSave={async (data) => {
            const success = await addProduct({
              ...data,
            });
            if (success === true) {
              setShowProductModal(false);
            } else {
              setCustomAlert({
                type: 'error',
                message: 'Erro ao cadastrar produto: ' + (typeof success === 'string' ? success : 'Código SKU/Barras em conflito.')
              });
            }
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal 
          total={total}
          onClose={() => setShowPaymentModal(false)}
          onFinalize={finalizeSale}
        />
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <DiscountModal
          title={discountType === 'item' ? `Desconto no Item: ${cart[selectedCartIndex]?.product.name}` : 'Desconto na Venda'}
          currentTotal={discountType === 'item' ? cart[selectedCartIndex]?.originalPrice * cart[selectedCartIndex]?.quantity : subtotal}
          defaultType={discountType === 'item' ? 'value' : 'percentage'}
          onClose={() => setShowDiscountModal(false)}
          onConfirm={handleDiscountConfirm}
        />
      )}

      {/* Authorization Modal */}
      {showAuthModal && (
        <AuthorizationModal
          onClose={() => setShowAuthModal(false)}
          onAuthorize={handleAuthorization}
        />
      )}

      {/* Cash Register Manager Overlay (Force Open) */}
      {!activeRegister && !isLoading && !showClosureModal && !isNavigatingAway && (
        <div className="fixed inset-0 bg-brand-text-main/90 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <Logo size="lg" theme="dark" className="mx-auto mb-4" />
              <h1 className="text-3xl font-black text-white italic tracking-widest uppercase">Acesso Bloqueado</h1>
              <p className="text-slate-400">O caixa deve estar aberto para realizar vendas.</p>
            </div>
            <CashRegisterManager hideHistory={true} />
            <button 
              onClick={() => {
                setIsNavigatingAway(true);
                handleExitPDV();
              }}
              className="w-full mt-4 py-3 text-slate-400 hover:text-white transition-colors font-bold uppercase text-sm tracking-widest"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      )}

      {/* Cash Register Modals (Sangria, Suprimento, Fechamento) */}
      {(showSangriaModal || showSuprimentoModal || showClosureModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <CashRegisterManager 
              initialMode={showSangriaModal ? 'sangria' : showSuprimentoModal ? 'suprimento' : 'fechamento'}
              onClose={() => {
                setShowSangriaModal(false);
                setShowSuprimentoModal(false);
                setShowClosureModal(false);
              }}
              onSuccess={() => {
                setIsNavigatingAway(true);
                handleExitPDV();
              }}
            />
            <button 
              onClick={() => {
                setShowSangriaModal(false);
                setShowSuprimentoModal(false);
                setShowClosureModal(false);
              }}
              className="mt-4 mx-auto block px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all"
            >
              Voltar ao PDV (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-brand-border rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            <h3 className="text-2xl font-black italic mb-8 text-brand-text-main">{confirmDialog.message}</h3>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-8 py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-brand-blue/20"
              >
                SIM (Enter)
              </button>
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-8 py-3 bg-white hover:bg-rose-50 text-rose-600 border-2 border-rose-100 font-bold rounded-xl transition-all active:scale-95"
              >
                NÃO (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="text-brand-blue" size={24} />
                Identificar Cliente (F5)
              </h2>
              <button 
                onClick={() => {
                  setShowCustomerSearch(false);
                  setCustomerSearch('');
                  setCustomerSearchResults([]);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative">
                <input
                  ref={customerSearchInputRef}
                  autoFocus
                  type="text"
                  placeholder="Buscar por Nome, CPF ou Telefone..."
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customerSearchResults.length > 0) {
                      selectCustomer(customerSearchResults[0]);
                    }
                  }}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {customerSearchResults.length > 0 ? (
                  customerSearchResults.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="w-full p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-brand-blue/5 border border-slate-200 dark:border-slate-700 rounded-xl transition-all text-left group"
                    >
                      <div>
                        <p className="text-sm font-black uppercase italic text-slate-900 dark:text-white group-hover:text-brand-blue">{customer.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          CPF: {customer.document} | Tel: {customer.phone}
                        </p>
                      </div>
                      {customer.isClubMember && (
                        <span className="bg-brand-blue/10 text-brand-blue text-[8px] font-black px-2 py-1 rounded-lg uppercase italic">
                          Clube
                        </span>
                      )}
                    </button>
                  ))
                ) : customerSearch.length >= 3 ? (
                  <div className="p-8 text-center text-slate-400 font-bold italic uppercase text-xs">
                    Nenhum cliente encontrado
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 font-bold italic uppercase text-xs">
                    Digite pelo menos 3 caracteres para buscar
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Sale Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-brand-border rounded-3xl p-8 max-w-md w-full shadow-2xl text-center animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="text-brand-green" size={40} />
            </div>
            <h2 className="text-3xl font-black text-brand-text-main italic uppercase tracking-tight mb-2">Venda Finalizada!</h2>
            <p className="text-brand-text-sec font-medium mb-6">
              Cupom: <span className="font-black text-brand-blue">#{completedSale.id?.substring(0, 8).toUpperCase() || 'N/A'}</span>
            </p>

            {(() => {
              const hasDinheiro = completedSale.payments?.some((p: any) => p.method?.toLowerCase().includes('dinheiro')) || completedSale.paymentMethod?.toLowerCase().includes('dinheiro');
              const change = completedSale.change || 0;
              const totalCash = completedSale.payments?.filter((p: any) => p.method?.toLowerCase().includes('dinheiro')).reduce((acc: number, p: any) => acc + (p.amount || 0), 0) || 0;
              const cashReceived = completedSale.cashReceived || (totalCash > 0 ? (totalCash + change) : 0);

              if (hasDinheiro && change > 0) {
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-2 text-left animate-in slide-in-from-bottom duration-300">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                      <span>Total da Venda</span>
                      <span className="font-bold text-slate-800 text-base">R$ {formatCurrency(completedSale.total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                      <span>Valor Pago (Dinheiro)</span>
                      <span className="font-bold text-slate-800 text-base">R$ {formatCurrency(cashReceived)}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-2" />
                    <div className="flex justify-between items-center text-base font-black uppercase tracking-wider text-brand-green">
                      <span>Troco</span>
                      <span>R$ {formatCurrency(change)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => { handlePrintReceipt(completedSale); setCompletedSale(null); }}
                className={`w-full py-4 font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-sm ${
                  completedSaleSelection === 'print'
                    ? 'bg-slate-800 text-white ring-2 ring-slate-800 ring-offset-2 scale-[1.02] shadow-lg'
                    : 'bg-slate-100 hover:bg-slate-200 text-brand-text-main'
                }`}
              >
                <Printer size={18} /> Imprimir Cupom
              </button>
              <button 
                onClick={() => setCompletedSale(null)}
                className={`w-full py-4 font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest text-sm transition-all focus:outline-none ${
                  completedSaleSelection === 'new_sale'
                    ? 'bg-brand-blue hover:bg-brand-blue-hover text-white ring-2 ring-brand-blue ring-offset-2 scale-[1.02] shadow-lg shadow-brand-blue/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-brand-text-main'
                }`}
              >
                Nova Venda (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Old Register Warning Modal */}
      {showOldRegisterWarning && (
        <div className="fixed inset-0 bg-brand-text-main/90 backdrop-blur-md z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-blue">
              <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                <AlertCircle size={24} />
                Aviso de Caixa Aberto
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 font-medium">
                O caixa atual foi aberto em um dia anterior ({new Date(activeRegister?.openedAt || '').toLocaleDateString()}).
              </p>
              <p className="text-slate-600 font-medium">
                Deseja continuar operando neste mesmo caixa ou prefere fechá-lo agora?
              </p>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setShowOldRegisterWarning(false)}
                  className={`flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                    oldRegisterWarningSelection === 'continue'
                      ? 'bg-brand-blue text-white ring-2 ring-brand-blue ring-offset-2 scale-105 shadow-md shadow-brand-blue/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  Continuar
                </button>
                <button
                  onClick={() => {
                    setShowOldRegisterWarning(false);
                    setShowClosureModal(true);
                  }}
                  className={`flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                    oldRegisterWarningSelection === 'close'
                      ? 'bg-brand-blue-hover text-white ring-2 ring-brand-blue ring-offset-2 scale-105 shadow-md shadow-brand-blue/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  Fechar Caixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
