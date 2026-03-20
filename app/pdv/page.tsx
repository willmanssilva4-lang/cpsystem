'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/types';
import { ProductForm } from '@/components/ProductForm';
import { PaymentModal } from '@/components/PaymentModal';
import { DiscountModal } from '@/components/DiscountModal';
import { AuthorizationModal } from '@/components/AuthorizationModal';
import { CashRegisterManager } from '@/components/CashRegisterManager';
import { PriceCheckModal } from '@/components/PriceCheckModal';
import { ProductListModal } from '@/components/ProductListModal';
import { InvoiceModal } from '@/components/InvoiceModal';
import { Logo } from '@/components/Logo';
import { HelpCircle, X, Tag, Lock, AlertCircle } from 'lucide-react';

export default function PDVPage() {
  const router = useRouter();
  const { products, addSale, addProduct, addDiscountLog, companySettings, user, systemUsers, accessProfiles, activeRegister, hasPermission, promotions, subcategorias } = useERP();
  const [cart, setCart] = useState<{ product: Product, quantity: number, discount: number, originalPrice: number, promotionId?: string }[]>([]);
  const [barcode, setBarcode] = useState('');

  const [quantity, setQuantity] = useState(1);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
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
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [showPriceCheckModal, setShowPriceCheckModal] = useState(false);
  const [showProductListModal, setShowProductListModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCancelItemModal, setShowCancelItemModal] = useState(false);
  const [cancelItemNumber, setCancelItemNumber] = useState('');
  const [showDiscountItemModal, setShowDiscountItemModal] = useState(false);
  const [discountItemNumber, setDiscountItemNumber] = useState('');
  const [showOldRegisterWarning, setShowOldRegisterWarning] = useState(false);
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
      const openedDate = new Date(activeRegister.openedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
  };

  const comboDiscount = useMemo(() => {
    const now = new Date();
    const activeCombos = promotions.filter(p => 
      p.status === 'ACTIVE' && 
      p.type === 'COMBO' &&
      p.applyAutomatically &&
      new Date(p.startDate) <= now && 
      new Date(p.endDate) >= now &&
      (!p.daysOfWeek || p.daysOfWeek.includes(now.getDay()))
    );

    let totalComboDiscount = 0;

    activeCombos.forEach(combo => {
      if (!combo.comboItems || combo.comboItems.length === 0 || !combo.comboPrice) return;

      let minSets = Infinity;
      
      for (const productId of combo.comboItems) {
        const cartItems = cart.filter(item => item.product.id === productId);
        const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        
        const requiredQty = combo.comboItems.filter(id => id === productId).length;
        
        const setsOfThisProduct = Math.floor(totalQty / requiredQty);
        if (setsOfThisProduct < minSets) {
          minSets = setsOfThisProduct;
        }
      }

      if (minSets > 0 && minSets !== Infinity) {
        let regularComboPrice = 0;
        for (const productId of combo.comboItems) {
          const product = products.find(p => p.id === productId);
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
  }, [cart, promotions, products]);

  const subtotal = cart.reduce((acc, item) => acc + (item.originalPrice * item.quantity), 0);
  const totalItemsDiscount = cart.reduce((acc, item) => acc + (item.discount * item.quantity), 0);
  const totalDiscount = totalItemsDiscount + saleDiscount + comboDiscount;
  const total = Math.max(0, subtotal - totalDiscount);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    setIsNavigatingCart(false);
    setSelectedCartIndex(-1);
    setShowPaymentModal(true);
  }, [cart]);

  const finalizeSale = async (paymentData: any) => {
    const success = await addSale({
      date: new Date().toISOString(),
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.salePrice,
        originalPrice: item.originalPrice,
        discount: item.discount,
        promotionId: item.promotionId
      })),
      subtotal: subtotal,
      discount: totalDiscount,
      total: paymentData.total,
      paymentMethod: paymentData.payments.length > 1 ? 'Múltiplo' : paymentData.payments[0]?.method,
      payments: paymentData.payments,
      maquininhaId: paymentData.payments[0]?.maquininhaId, // For compatibility
      taxAmount: paymentData.payments.reduce((acc: number, p: any) => acc + (p.taxAmount || 0), 0),
      netAmount: paymentData.payments.reduce((acc: number, p: any) => acc + (p.netAmount || 0), 0),
      userId: user?.email
    });

    if (success) {
      setCart([]);
      setSaleDiscount(0);
      setSelectedCartIndex(-1);
      setIsNavigatingCart(false);
      setShowPaymentModal(false);
      // Removed alert to speed up PDV flow
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
    return role === 'administrador' || role === 'gerente' || role === 'fiscal de caixa';
  }, [user]);

  const handleAuthorization = async (password: string) => {
    // Check if any supervisor has this code
    const supervisor = systemUsers.find(u => 
      u.supervisorCode === password && 
      u.status === 'Ativo' &&
      (u.profileId ? accessProfiles.find(p => p.id === u.profileId)?.name?.toLowerCase() : '')?.match(/administrador|gerente|fiscal de caixa/)
    );

    if (supervisor || password === '1234') { // Keep 1234 as fallback for now
      const authorizedBy = supervisor ? supervisor.username : 'Supervisor';
      
      if (pendingDiscount) {
        const authorizedLog = { ...pendingDiscount, authorizedBy };
        applyDiscount(authorizedLog);
        setPendingDiscount(null);
      } else if (pendingAction) {
        if (pendingAction.type === 'cancel_item') {
          const targetIndex = pendingAction.data.index;
          setCart(prev => prev.filter((_, i) => i !== targetIndex));
          setSelectedCartIndex(-1);
          setIsNavigatingCart(false);
        } else if (pendingAction.type === 'cancel_sale') {
          setCart([]);
          setSaleDiscount(0);
          setSelectedCartIndex(-1);
          setIsNavigatingCart(false);
        } else if (pendingAction.type === 'reverse_sale') {
          // In a real app, we would call a function to reverse the sale in the database
          alert(`Venda #${pendingAction.data?.saleId || '1103'} estornada com sucesso! Itens retornados ao estoque.`);
          setReverseSaleId('');
        }
        setPendingAction(null);
      }
      setShowAuthModal(false);
    } else {
      alert('Código de autorização inválido ou usuário sem permissão!');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Only focus barcode input if register is active and no modal is open
    const isModalOpen = showProductModal || showPaymentModal || showDiscountModal || showAuthModal || showSangriaModal || showSuprimentoModal || showClosureModal || showReverseModal || showOldRegisterWarning || showPriceCheckModal || showProductListModal || showInvoiceModal;
    if (activeRegister && !isModalOpen && !showHelp && !confirmDialog) {
      barcodeInputRef.current?.focus();
    }

    return () => clearInterval(timer);
  }, [activeRegister, showProductModal, showPaymentModal, showDiscountModal, showAuthModal, showSangriaModal, showSuprimentoModal, showClosureModal, showReverseModal, showOldRegisterWarning, showPriceCheckModal, showProductListModal, showInvoiceModal, showHelp, confirmDialog]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const isInputFocused = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;

      // Handle Numeric Buffer for Quick Actions (3 + F6, etc)
      if (!isInputFocused && e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey && !showPaymentModal && !showDiscountModal && !showAuthModal && activeRegister) {
        setNumericBuffer(prev => prev + e.key);
        // Auto-clear buffer after 2 seconds of inactivity
        setTimeout(() => setNumericBuffer(''), 2000);
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

      // If any modal is open or register is closed, don't process global shortcuts (except Esc)
      const isModalOpen = showProductModal || showPaymentModal || showDiscountModal || showAuthModal || showSangriaModal || showSuprimentoModal || showClosureModal || showReverseModal || showOldRegisterWarning || showPriceCheckModal || showProductListModal || showInvoiceModal || !activeRegister;
      if (isModalOpen && e.key !== 'Escape') {
        return;
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

      // F2 - Modo Navegação / Focar Lista
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsNavigatingCart(true);
          setSelectedCartIndex(0);
        }
        setNumericBuffer('');
      }

      // F3 - Buscar Produto Manual
      if (e.key === 'F3') {
        e.preventDefault();
        setIsNavigatingCart(false);
        setSelectedCartIndex(-1);
        barcodeInputRef.current?.focus();
        setNumericBuffer('');
      }

      // F4 - Alterar Quantidade
      if (e.key === 'F4') {
        e.preventDefault();
        if (isNavigatingCart && selectedCartIndex >= 0) {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        } else if (currentProduct) {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        }
        setNumericBuffer('');
      }

      // F5 - Inserir Cliente
      if (e.key === 'F5') {
        e.preventDefault();
        alert('Funcionalidade: Inserir Cliente (F5)');
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
                setCart(prev => prev.filter((_, i) => i !== targetIndex));
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
                  setCart(prev => prev.filter((_, i) => i !== selectedCartIndex));
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
        if (key === 'e') { e.preventDefault(); alert('Funcionalidade: Consultar Estoque (Alt+E)'); }
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
        } else if (showDiscountItemModal) {
          setShowDiscountItemModal(false);
        } else if (isNavigatingCart) {
          setIsNavigatingCart(false);
          setSelectedCartIndex(-1);
        } else if (searchResults.length > 0) {
          setSearchResults([]);
        } else {
          setConfirmDialog({
            message: 'Deseja sair do PDV?',
            onConfirm: () => router.push('/')
          });
        }
        setNumericBuffer('');
      }
    };
 
     window.addEventListener('keydown', handleGlobalKeyDown);
     return () => {
       window.removeEventListener('keydown', handleGlobalKeyDown);
     };
  }, [cart, searchResults, showHelp, showProductModal, showPaymentModal, showDiscountModal, showAuthModal, showSangriaModal, showSuprimentoModal, showClosureModal, showReverseModal, showPriceCheckModal, showProductListModal, showInvoiceModal, showCancelItemModal, showDiscountItemModal, showOldRegisterWarning, selectedCartIndex, isNavigatingCart, numericBuffer, confirmDialog, router, handleCheckout, currentProduct, activeRegister, checkActionPermission]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNavigatingCart) {
      setIsNavigatingCart(false);
      setSelectedCartIndex(-1);
    }
    
    const value = e.target.value;
    setBarcode(value);
    
    // Search by barcode (exact match)
    const product = products.find(p => p.sku === value && p.status !== 'Inativo');
    if (product) {
      setCurrentProduct(product);
      setSearchResults([]);
      setSelectedIndex(-1);
    } else {
      setCurrentProduct(null);
      // Search by name (at least 3 chars)
      if (value.length >= 3) {
        const filtered = products.filter(p => 
          (p.name.toLowerCase().includes(value.toLowerCase()) ||
          p.sku.toLowerCase().includes(value.toLowerCase())) &&
          p.status !== 'Inativo'
        ).slice(0, 50); // Limit results
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
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentProduct) {
        addToCart(currentProduct, quantity);
        setBarcode('');
        setQuantity(1);
        setCurrentProduct(null);
        barcodeInputRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isNavigatingCart) return; // Let the global handler deal with it

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length === 0 && barcode.length === 0) {
        setSearchResults(products.filter(p => p.status !== 'Inativo').slice(0, 50));
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
      }
    } else if (e.key === '*') {
      e.preventDefault();
      if (currentProduct) {
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
    setIsNavigatingCart(false);
    setSelectedCartIndex(-1);

    const now = new Date();
    const activePromos = promotions.filter(p => 
      p.status === 'ACTIVE' && 
      p.applyAutomatically &&
      new Date(p.startDate) <= now && 
      new Date(p.endDate) >= now &&
      (!p.daysOfWeek || p.daysOfWeek.includes(now.getDay()))
    );

    let promoDiscount = 0;
    let promoType = '';
    
    const productSubcategory = subcategorias.find(s => s.id === product.subcategoria_id);
    
    const applicablePromo = activePromos.find(p => 
      (p.targetType === 'PRODUCT' && p.targetId === product.id) ||
      (p.targetType === 'CATEGORY' && p.targetId === productSubcategory?.categoria_id) ||
      p.targetType === 'ALL'
    );

    if (applicablePromo) {
      promoType = applicablePromo.type;
      if (applicablePromo.type === 'PRICE' && applicablePromo.discountValue) {
        promoDiscount = product.salePrice - applicablePromo.discountValue;
      } else if (applicablePromo.type === 'PERCENTAGE' && applicablePromo.discountValue) {
        promoDiscount = product.salePrice * (applicablePromo.discountValue / 100);
      }
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id && item.discount === promoDiscount);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += qty;
      
      if (applicablePromo?.type === 'BUY_X_GET_Y' && applicablePromo.buyQuantity && applicablePromo.payQuantity) {
        const totalQty = newCart[existingIndex].quantity;
        const sets = Math.floor(totalQty / applicablePromo.buyQuantity);
        const freeItems = sets * (applicablePromo.buyQuantity - applicablePromo.payQuantity);
        if (freeItems > 0) {
          const discountPerItem = (freeItems * product.salePrice) / totalQty;
          newCart[existingIndex].discount = discountPerItem;
          newCart[existingIndex].product.salePrice = product.salePrice - discountPerItem;
          newCart[existingIndex].promotionId = applicablePromo.id;
        } else {
          newCart[existingIndex].discount = 0;
          newCart[existingIndex].product.salePrice = product.salePrice;
          newCart[existingIndex].promotionId = undefined;
        }
      } else if (applicablePromo) {
        newCart[existingIndex].promotionId = applicablePromo.id;
      }
      
      setCart(newCart);
    } else {
      let initialDiscount = promoDiscount;
      let initialPrice = product.salePrice - promoDiscount;
      let promotionId = applicablePromo?.id;
      
      if (applicablePromo?.type === 'BUY_X_GET_Y' && applicablePromo.buyQuantity && applicablePromo.payQuantity) {
        const sets = Math.floor(qty / applicablePromo.buyQuantity);
        const freeItems = sets * (applicablePromo.buyQuantity - applicablePromo.payQuantity);
        if (freeItems > 0) {
          initialDiscount = (freeItems * product.salePrice) / qty;
          initialPrice = product.salePrice - initialDiscount;
        } else {
          promotionId = undefined;
        }
      }

      setCart([...cart, { 
        product: { ...product, salePrice: initialPrice }, 
        quantity: qty, 
        discount: initialDiscount, 
        originalPrice: product.salePrice,
        promotionId: promotionId
      }]);
    }
  };

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
      <header className="bg-brand-text-main text-white px-4 py-2 flex items-center justify-between border-b border-brand-text-main">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" hideText theme="dark" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-widest uppercase">{companySettings.tradeName || 'MERCADINHO SUPERNICE'}</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex gap-2 mb-1">
            <button className="size-6 bg-brand-blue-hover hover:bg-brand-text-sec flex items-center justify-center font-bold text-xs transition-colors">_</button>
            <button 
              onClick={() => setConfirmDialog({
                message: 'Deseja sair do PDV?',
                onConfirm: () => router.push('/')
              })}
              className="size-6 bg-rose-600 hover:bg-rose-500 flex items-center justify-center font-bold text-xs transition-colors"
            >
              X
            </button>
          </div>
          <div className="bg-brand-text-main px-4 py-1 border border-brand-text-main rounded">
            <span className="text-sm font-bold text-slate-50">{formatDate(currentTime)}</span>
          </div>
        </div>
      </header>

      {/* Sale Info Bar */}
      <div className="bg-slate-50 px-6 py-1 flex items-center gap-8 text-xs font-bold border-b border-brand-border text-brand-text-main">
        <div className="flex gap-2">
          <span className="text-brand-blue/60">N° Venda:</span>
          <span>1104</span>
        </div>
        <div className="flex gap-2">
          <span className="text-brand-blue/60">Atendente:</span>
          <span className="uppercase">{user?.name || 'SISTEMA'}</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked readOnly className="size-3 accent-brand-blue" />
          <span>Leitor Codigo De barras - F2</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" className="size-3 accent-brand-blue" />
          <span>Venda Atacado</span>
        </div>
      </div>

      {/* Status Bar */}
      <div className={cn(
        "py-2 text-center shadow-inner transition-colors duration-300",
        cart.length > 0 ? "bg-brand-blue" : "bg-brand-blue-hover"
      )}>
        <h2 className="text-4xl font-black tracking-[0.2em] uppercase italic text-white">
          {cart.length > 0 ? "CAIXA OCUPADO" : "CAIXA DISPONIVEL"}
        </h2>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-6 flex flex-col lg:flex-row gap-4 md:gap-6 overflow-y-auto lg:overflow-hidden">
        {/* Middle: Inputs */}
        <div className="w-full lg:w-[50%] flex flex-col gap-3 shrink-0">
          <div className="space-y-1 relative">
            <label className="text-lg md:text-2xl font-bold italic text-brand-text-main">Código de Barras</label>
            <input 
              ref={barcodeInputRef}
              value={barcode}
              onChange={handleBarcodeChange}
              onKeyDown={handleKeyDown}
              disabled={!activeRegister}
              className="w-full bg-white border-2 border-brand-border rounded-xl px-3 py-2 text-xl md:text-3xl font-black text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full max-h-64 bg-white border-2 border-brand-border rounded-xl mt-2 shadow-2xl z-[100] overflow-y-auto">
                {searchResults.map((product, index) => (
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
                    <span className="font-black text-sm">R$ {formatCurrency(product.salePrice)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-lg md:text-2xl font-bold italic text-brand-text-main">Quantidade</label>
              <input 
                ref={quantityInputRef}
                type="number" 
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                onKeyDown={handleQuantityKeyDown}
                className="w-full bg-white border-2 border-brand-border rounded-xl px-3 py-2 text-xl md:text-3xl font-black text-right text-brand-text-main focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-lg md:text-2xl font-bold italic text-brand-text-main">Valor Unitário</label>
              <div className="bg-slate-50 border-2 border-brand-border rounded-xl px-3 py-2 text-right">
                <span className="text-xl md:text-3xl font-black text-brand-text-main">{formatCurrency(currentProduct?.salePrice || 0)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-lg md:text-2xl font-bold italic text-brand-text-main">Valor Total</label>
            <div className="bg-slate-50 border-2 border-brand-border rounded-xl px-3 py-2 text-right">
              <span className="text-2xl md:text-4xl font-black text-brand-text-main">{formatCurrency((currentProduct?.salePrice || 0) * quantity)}</span>
            </div>
          </div>
        </div>

        {/* Right: Cupom */}
        <div className="w-full lg:w-[50%] flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl border border-brand-border min-h-[400px] lg:min-h-0">
          <div className="py-1 text-center border-b border-brand-border bg-slate-50">
            <h3 className="text-lg md:text-2xl font-black italic tracking-widest text-brand-text-main uppercase">Cupom Fiscal</h3>
          </div>
          
          <div className="flex-1 bg-white text-slate-900 overflow-y-auto">
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
                      idx === selectedCartIndex ? "bg-brand-blue/20 ring-2 ring-brand-blue ring-inset" : ""
                    )}
                  >
                    <td className="px-2 py-1 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="px-2 py-1 text-brand-text-main">{item.product.sku}</td>
                    <td className="px-2 py-1 uppercase text-brand-text-main">
                      {item.product.name}
                      {item.discount > 0 && (
                        <span className="ml-2 text-[8px] text-rose-600 font-black italic">
                          (DESC: -{formatCurrency(item.discount * item.quantity)})
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center text-brand-text-main">{item.quantity.toFixed(3)}</td>
                    <td className="px-2 py-1 text-right text-brand-text-main">{formatCurrency(item.product.salePrice)}</td>
                    <td className="px-2 py-1 text-right text-brand-text-main font-black">{formatCurrency(item.product.salePrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-t border-brand-border">
            <span className="text-sm font-bold italic text-brand-text-main">Cliente: CONSUMIDOR FINAL</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-end">
        <div className={cn(
          "flex-1 py-4 text-center rounded-xl border-2 border-brand-border shadow-lg transition-colors duration-300",
          cart.length > 0 ? "bg-brand-blue" : "bg-brand-blue-hover"
        )}>
          <h3 className="text-3xl md:text-5xl font-black italic tracking-[0.1em] uppercase text-white">
            {cart.length > 0 ? "CAIXA OCUPADO" : "CAIXA LIVRE"}
          </h3>
        </div>
        
        <div className="w-full md:w-[40%] flex flex-col gap-2">
          <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-wider text-brand-text-main">Total a Pagar</h3>
          <div className="bg-brand-text-main py-4 text-center rounded-xl border-2 border-brand-blue shadow-lg relative overflow-hidden">
            {saleDiscount > 0 && (
              <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] px-2 py-0.5 font-black italic rounded-bl-lg">
                DESC: -{formatCurrency(saleDiscount)}
              </div>
            )}
            <span className="text-4xl md:text-6xl font-black tracking-tighter text-white">R$ {formatCurrency(total)}</span>
          </div>
        </div>
      </footer>

      {/* Shortcuts Bar */}
      <div className="bg-brand-text-main py-1 px-4 text-[9px] font-bold border-t border-brand-text-main overflow-x-auto whitespace-nowrap text-brand-border">
        <div className="flex gap-4 justify-center opacity-80">
          <span>F1 - Ajuda</span>
          <span>|</span>
          <span>F2 - Navegar</span>
          <span>|</span>
          <span>F3 - Buscar</span>
          <span>|</span>
          <span>F4 - Qtd</span>
          <span>|</span>
          <span>F5 - Cliente</span>
          <span>|</span>
          <button onClick={() => {
            if (cart.length > 0) {
              setDiscountType(selectedCartIndex >= 0 ? 'item' : 'sale');
              setShowDiscountModal(true);
            }
          }} className="hover:text-white transition-colors">F6 - Desc. Item</button>
          <span>|</span>
          <button onClick={() => {
            if (cart.length > 0) {
              setDiscountType('sale');
              setShowDiscountModal(true);
            }
          }} className="hover:text-white transition-colors">F7 - Desc. Total</button>
          <span>|</span>
          <button onClick={() => {
            if (selectedCartIndex >= 0) {
              setConfirmDialog({
                message: `Deseja cancelar o item: ${cart[selectedCartIndex].product.name}?`,
                onConfirm: () => {
                  if (checkActionPermission()) {
                    setCart(prev => prev.filter((_, i) => i !== selectedCartIndex));
                    setSelectedCartIndex(-1);
                    setIsNavigatingCart(false);
                  } else {
                    setPendingAction({ type: 'cancel_item', data: { index: selectedCartIndex } });
                    setShowAuthModal(true);
                  }
                }
              });
            } else if (cart.length > 0) {
              const lastIdx = cart.length - 1;
              if (checkActionPermission()) {
                setCart(prev => prev.slice(0, -1));
                setSelectedCartIndex(-1);
                setIsNavigatingCart(false);
              } else {
                setPendingAction({ type: 'cancel_item', data: { index: lastIdx } });
                setShowAuthModal(true);
              }
            }
          }} className="hover:text-white transition-colors">F8 - Canc. Item</button>
          <span>|</span>
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
                  } else {
                    setPendingAction({ type: 'cancel_sale' });
                    setShowAuthModal(true);
                  }
                }
              });
            }
          }} className="hover:text-white transition-colors">F9 - Canc. Venda</button>
          <span>|</span>
          <button onClick={handleCheckout} className="hover:text-white transition-colors">F10 - Finalizar</button>
          <span>|</span>
          <span>Esc - Sair</span>
        </div>
        <div className="flex gap-4 justify-center opacity-80 mt-0.5">
          <span>Ctrl+S - Sangria</span>
          <span>|</span>
          <span>Ctrl+U - Suprimento</span>
          <span>|</span>
          <span>Ctrl+F - Fechamento</span>
          <span>|</span>
          <span>Ctrl+R - Reabrir</span>
          <span>|</span>
          <span>Ctrl+E - Estoque</span>
          <span>|</span>
          <span>Ctrl+P - Preço</span>
          <span>|</span>
          <span>Alt+H - Histórico</span>
          <span>|</span>
          <span>Alt+L - Lista</span>
          <span>|</span>
          <span>Alt+N - NF</span>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && reverseSaleId) {
                      if (checkActionPermission()) {
                        alert(`Venda #${reverseSaleId} estornada com sucesso! Itens retornados ao estoque.`);
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
                  onClick={() => {
                    if (reverseSaleId) {
                      if (checkActionPermission()) {
                        alert(`Venda #${reverseSaleId} estornada com sucesso! Itens retornados ao estoque.`);
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
                        targetIndex = cart.length - 1;
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
                              setCart(prev => prev.filter((_, i) => i !== targetIndex));
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
                      targetIndex = cart.length - 1;
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
                            setCart(prev => prev.filter((_, i) => i !== targetIndex));
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

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden">
            <div className="bg-brand-blue px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                <HelpCircle size={24} /> Ajuda Rápida - CpSystem
              </h3>
              <button onClick={() => setShowHelp(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-8 text-sm text-brand-text-main">
              <div className="space-y-2">
                <h4 className="font-black italic uppercase text-brand-blue border-b border-brand-border pb-1">Vendas</h4>
                <p><span className="font-bold">F1</span> - Ajuda rápida</p>
                <p><span className="font-bold">F2</span> - Modo navegação (Carrinho)</p>
                <p><span className="font-bold">F3</span> - Buscar produto manual</p>
                <p><span className="font-bold">F4</span> - Alterar quantidade</p>
                <p><span className="font-bold">F5</span> - Inserir cliente</p>
                <p><span className="font-bold">F6</span> - Aplicar desconto (Item)</p>
                <p><span className="font-bold">F7</span> - Desconto na venda total</p>
                <p><span className="font-bold">F8</span> - Cancelar item</p>
                <p><span className="font-bold">F9</span> - Cancelar venda</p>
                <p><span className="font-bold">F10</span> - Finalizar venda</p>
                <p><span className="font-bold">F12</span> - Autorização rápida</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-black italic uppercase text-brand-blue border-b border-brand-border pb-1">Caixa & Consultas</h4>
                <p><span className="font-bold">Ctrl + S</span> - Sangria</p>
                <p><span className="font-bold">Ctrl + U</span> - Suprimento</p>
                <p><span className="font-bold">Ctrl + F</span> - Fechamento de caixa</p>
                <p><span className="font-bold">Alt + E</span> - Consultar estoque</p>
                <p><span className="font-bold">Ctrl + P</span> - Consultar preço</p>
                <p><span className="font-bold">Alt + H</span> - Histórico do cliente</p>
                <p><span className="font-bold">Alt + L</span> - Lista de produtos</p>
                <p><span className="font-bold">Alt + N</span> - Nota fiscal</p>
                <p><span className="font-bold">Alt + T</span> - Troca/devolução</p>
                <div className="pt-4 text-[10px] opacity-60 italic">
                  Dica: Use [Número] + F6 para desconto rápido no item.
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
        <PriceCheckModal onClose={() => setShowPriceCheckModal(false)} />
      )}

      {/* Product List Modal */}
      {showProductListModal && (
        <ProductListModal 
          onClose={() => setShowProductListModal(false)} 
          onSelectProduct={(product) => {
            selectProduct(product);
          }}
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
          onSave={(data) => {
            addProduct({
              ...data,
              id: Math.random().toString(36).substr(2, 9),
            });
            setShowProductModal(false);
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
      {!activeRegister && (
        <div className="fixed inset-0 bg-brand-text-main/90 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <Logo size="lg" theme="dark" className="mx-auto mb-4" />
              <h1 className="text-3xl font-black text-white italic tracking-widest uppercase">Acesso Bloqueado</h1>
              <p className="text-slate-400">O caixa deve estar aberto para realizar vendas.</p>
            </div>
            <CashRegisterManager />
            <button 
              onClick={() => router.push('/')}
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
                router.push('/');
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
                  className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Continuar
                </button>
                <button
                  onClick={() => {
                    setShowOldRegisterWarning(false);
                    setShowClosureModal(true);
                  }}
                  className="flex-1 h-11 bg-brand-blue-hover text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-blue transition-colors"
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
