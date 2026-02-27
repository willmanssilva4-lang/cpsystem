'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/types';
import { ProductForm } from '@/components/ProductForm';
import { PaymentModal } from '@/components/PaymentModal';
import { HelpCircle, X } from 'lucide-react';

export default function PDVPage() {
  const router = useRouter();
  const { products, addSale, addProduct } = useERP();
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  }, [cart]);

  const finalizeSale = (paymentData: any) => {
    addSale({
      date: new Date().toISOString(),
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.salePrice
      })),
      total: paymentData.total,
      paymentMethod: paymentData.method
    });

    setCart([]);
    setShowPaymentModal(false);
    alert('Venda finalizada com sucesso!');
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    barcodeInputRef.current?.focus();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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

      // F1 - Ajuda
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }
      // F4 - Finalizar (Abrir Pagamento)
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowPaymentModal(true);
        }
      }
      // F5 - Produtos (Foco no campo)
      if (e.key === 'F5') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      // F6 - Cancelar Venda
      if (e.key === 'F6') {
        e.preventDefault();
        setConfirmDialog({
          message: 'Deseja cancelar a venda atual?',
          onConfirm: () => setCart([])
        });
      }
      // F7 - Excluir último item
      if (e.key === 'F7') {
        e.preventDefault();
        setCart(prev => prev.slice(0, -1));
      }
      // Esc - Sair
      if (e.key === 'Escape') {
        if (searchResults.length > 0) {
          setSearchResults([]);
        } else if (showHelp) {
          setShowHelp(false);
        } else if (showProductModal) {
          setShowProductModal(false);
        } else if (showPaymentModal) {
          setShowPaymentModal(false);
        } else {
          setConfirmDialog({
            message: 'Deseja sair do PDV?',
            onConfirm: () => router.push('/dashboard')
          });
        }
      }
      // Ctrl + N - Novo Produto
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setShowProductModal(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [cart, searchResults, showHelp, showProductModal, showPaymentModal, confirmDialog, router, handleCheckout]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcode(value);
    
    // Search by barcode (exact match)
    const product = products.find(p => p.sku === value);
    if (product) {
      setCurrentProduct(product);
      setSearchResults([]);
      setSelectedIndex(-1);
    } else {
      setCurrentProduct(null);
      // Search by name (at least 3 chars)
      if (value.length >= 3) {
        const filtered = products.filter(p => 
          p.name.toLowerCase().includes(value.toLowerCase()) ||
          p.sku.toLowerCase().includes(value.toLowerCase())
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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length === 0 && barcode.length === 0) {
        setSearchResults(products.slice(0, 50));
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
    setCurrentProduct(product);
    setBarcode(product.name);
    setSearchResults([]);
    setSelectedIndex(-1);
    barcodeInputRef.current?.focus();
  };

  const addToCart = (product: Product, qty: number) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item));
    } else {
      setCart([...cart, { product, quantity: qty }]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#8B0000] text-white font-sans overflow-hidden select-none">
      {/* Top Header */}
      <header className="bg-emerald-950 px-4 py-2 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="bg-black p-1 rounded">
            <div className="text-emerald-500 font-black text-2xl italic leading-none">Cp Sister</div>
            <div className="text-orange-500 font-black text-xl leading-none">PDV</div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-widest uppercase">MERCADINHO SUPERNICE</h1>
            <p className="text-xs text-emerald-300 font-bold uppercase tracking-widest">Volte Sempre</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex gap-2 mb-1">
            <button className="size-6 bg-emerald-500 flex items-center justify-center font-bold text-xs">_</button>
            <button className="size-6 bg-red-600 flex items-center justify-center font-bold text-xs">X</button>
          </div>
          <div className="bg-[#B22222] px-4 py-1 border border-white/20 rounded">
            <span className="text-sm font-bold">{formatDate(currentTime)}</span>
          </div>
        </div>
      </header>

      {/* Sale Info Bar */}
      <div className="bg-[#B22222] px-6 py-1 flex items-center gap-8 text-xs font-bold border-b border-white/10">
        <div className="flex gap-2">
          <span className="text-white/60">N° Venda:</span>
          <span>1104</span>
        </div>
        <div className="flex gap-2">
          <span className="text-white/60">Atendente:</span>
          <span>WILL</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked readOnly className="size-3" />
          <span>Leitor Codigo De barras - F2</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" className="size-3" />
          <span>Venda Atacado</span>
        </div>
      </div>

      {/* Status Bar */}
      <div className={cn(
        "py-2 text-center shadow-inner transition-colors duration-300",
        cart.length > 0 ? "bg-red-600" : "bg-emerald-700"
      )}>
        <h2 className="text-4xl font-black tracking-[0.2em] uppercase italic">
          {cart.length > 0 ? "CAIXA OCUPADO" : "CAIXA DISPONIVEL"}
        </h2>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 flex gap-6 overflow-hidden">
        {/* Middle: Inputs */}
        <div className="w-[50%] flex flex-col gap-3">
          <div className="space-y-1 relative">
            <label className="text-2xl font-bold italic">Código de Barras - [</label>
            <input 
              ref={barcodeInputRef}
              value={barcode}
              onChange={handleBarcodeChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-black border-2 border-white/20 rounded-xl px-3 py-2 text-3xl font-black focus:border-emerald-500 outline-none transition-all"
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full max-h-64 bg-emerald-950 border-2 border-white/20 rounded-xl mt-2 shadow-2xl z-[100] overflow-y-auto">
                {searchResults.map((product, index) => (
                  <div 
                    key={product.id}
                    id={`search-result-${index}`}
                    onClick={() => selectProduct(product)}
                    className={cn(
                      "px-4 py-2 cursor-pointer border-b border-white/10 last:border-0 flex justify-between items-center transition-colors",
                      index === selectedIndex ? "bg-emerald-600 text-white" : "hover:bg-emerald-900/50"
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

          <div className="space-y-1">
            <label className="text-2xl font-bold italic">Quantidade</label>
            <input 
              ref={quantityInputRef}
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              onKeyDown={handleQuantityKeyDown}
              className="w-full bg-black border-2 border-white/20 rounded-xl px-3 py-2 text-3xl font-black text-right focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-2xl font-bold italic">Valor Unitario</label>
            <div className="bg-black border-2 border-white/20 rounded-xl px-3 py-2 text-right">
              <span className="text-3xl font-black">{formatCurrency(currentProduct?.salePrice || 0)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-2xl font-bold italic">Valor Total</label>
            <div className="bg-black border-2 border-white/20 rounded-xl px-3 py-2 text-right">
              <span className="text-3xl font-black">{formatCurrency((currentProduct?.salePrice || 0) * quantity)}</span>
            </div>
          </div>
        </div>

        {/* Right: Cupom */}
        <div className="w-[50%] flex flex-col bg-emerald-800 rounded-xl overflow-hidden shadow-2xl border border-white/20">
          <div className="py-1 text-center border-b border-white/20">
            <h3 className="text-2xl font-black italic tracking-widest">CUPOM</h3>
          </div>
          
          <div className="flex-1 bg-white text-black overflow-y-auto">
            <table className="w-full text-[10px] font-bold">
              <thead className="bg-emerald-800 text-white sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Cód de Barras</th>
                  <th className="px-2 py-1 text-left">Descrição</th>
                  <th className="px-2 py-1 text-center">Qtd.</th>
                  <th className="px-2 py-1 text-right">Vlr. Unit</th>
                  <th className="px-2 py-1 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((item, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50">
                    <td className="px-2 py-1">{item.product.sku}</td>
                    <td className="px-2 py-1 uppercase">{item.product.name}</td>
                    <td className="px-2 py-1 text-center">{item.quantity.toFixed(3)}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(item.product.salePrice)}</td>
                    <td className="px-2 py-1 text-right">{formatCurrency(item.product.salePrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-emerald-800 px-4 py-2 flex justify-between items-center border-t border-white/20">
            <span className="text-sm font-bold italic">Cliente: CONSUMIDOR FINAL</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 flex gap-6 items-end">
        <div className={cn(
          "flex-1 py-4 text-center rounded-xl border-2 border-white/20 shadow-lg transition-colors duration-300",
          cart.length > 0 ? "bg-red-600" : "bg-emerald-700"
        )}>
          <h3 className="text-5xl font-black italic tracking-[0.1em] uppercase">
            {cart.length > 0 ? "CAIXA OCUPADO" : "CAIXA LIVRE"}
          </h3>
        </div>
        
        <div className="w-[40%] flex flex-col gap-2">
          <h3 className="text-3xl font-black italic uppercase tracking-wider">SubTotal</h3>
          <div className="bg-emerald-700 py-4 text-center rounded-xl border-2 border-white/20 shadow-lg">
            <span className="text-6xl font-black tracking-tighter">{formatCurrency(subtotal)}</span>
          </div>
        </div>
      </footer>

      {/* Shortcuts Bar */}
      <div className="bg-emerald-800 py-1 px-4 text-[9px] font-bold border-t border-white/20 overflow-x-auto whitespace-nowrap">
        <div className="flex gap-4 justify-center opacity-80">
          <span>F1 - Menu Ajuda</span>
          <span>|</span>
          <span>Ctrl + A - Abrir Orçamento</span>
          <span>|</span>
          <span>F3 - Modo Orçamento</span>
          <span>|</span>
          <button onClick={handleCheckout} className="hover:text-white">F4 - Finalizar</button>
          <span>|</span>
          <span>F5 - Produtos</span>
          <span>|</span>
          <button onClick={() => setCart([])} className="hover:text-white">F6 - Cancelar</button>
          <span>|</span>
          <button onClick={() => setCart(prev => prev.slice(0, -1))} className="hover:text-white">F7 - Excluir</button>
          <span>|</span>
          <span>F8 - Clientes</span>
          <span>|</span>
          <span>F10 - Lançar Valor</span>
          <span>|</span>
          <span>Esc - Sair</span>
        </div>
        <div className="flex gap-4 justify-center opacity-80 mt-0.5">
          <span>Ctrl + B - Buscar Peso</span>
          <span>|</span>
          <button onClick={() => setShowProductModal(true)} className="hover:text-white">Ctrl + N - Novo Produto</button>
          <span>|</span>
          <span>Shift + C - Cadastrar Clientes</span>
          <span>|</span>
          <span>Shift + V - Trocar Vendedor</span>
          <span>|</span>
          <span>Ctrl + P - Alterar Preço</span>
          <span>|</span>
          <span>Ctrl + T - Altera Termo Venda</span>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-emerald-950 w-full max-w-md rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                <HelpCircle size={24} /> Ajuda do Sistema
              </h3>
              <button onClick={() => setShowHelp(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><span className="text-emerald-400 font-bold">F1</span> - Abrir Ajuda</p>
                  <p><span className="text-emerald-400 font-bold">F4</span> - Finalizar Venda</p>
                  <p><span className="text-emerald-400 font-bold">F5</span> - Focar Busca</p>
                  <p><span className="text-emerald-400 font-bold">F6</span> - Cancelar Venda</p>
                </div>
                <div className="space-y-2">
                  <p><span className="text-emerald-400 font-bold">F7</span> - Excluir Item</p>
                  <p><span className="text-emerald-400 font-bold">Esc</span> - Sair / Fechar</p>
                  <p><span className="text-emerald-400 font-bold">Ctrl+N</span> - Novo Produto</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 text-center opacity-60 text-xs italic">
                Pressione ESC para fechar esta janela
              </div>
            </div>
          </div>
        </div>
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
          total={subtotal}
          onClose={() => setShowPaymentModal(false)}
          onFinalize={finalizeSale}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border-2 border-emerald-500 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
            <h3 className="text-2xl font-black italic mb-8 text-white">{confirmDialog.message}</h3>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
              >
                SIM (Enter)
              </button>
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
              >
                NÃO (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
