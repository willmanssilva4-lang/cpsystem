'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useERP } from '@/lib/context';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Printer, 
  CheckCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/types';

export default function PDVPage() {
  const { products, addSale } = useERP();
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<any>('Dinheiro');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
  const total = subtotal; // Can add discount logic here

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    addSale({
      date: new Date().toISOString(),
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.salePrice
      })),
      total,
      paymentMethod
    });

    setCart([]);
    alert('Venda finalizada com sucesso!');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Product Selection */}
      <section className="flex-[1.8] flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Buscar Produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-1/3 relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Código de Barras"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Todos', 'Bebidas', 'Lanches', 'Eletrônicos', 'Hortifruti'].map((cat, idx) => (
              <button 
                key={cat}
                className={cn(
                  "shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all",
                  idx === 0 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group"
              >
                <div className="h-32 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  <Image 
                    src={product.image} 
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm font-bold">
                    Estoque: {product.stock}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 line-clamp-1">{product.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-600 font-black">R$ {product.salePrice.toLocaleString()}</span>
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cart Summary */}
      <aside className="flex-1 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-emerald-600" size={20} />
            <h2 className="font-bold text-slate-800 dark:text-white">Resumo do Pedido</h2>
            <span className="bg-emerald-500/10 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length} Itens</span>
          </div>
          <button 
            onClick={() => setCart([])}
            className="text-rose-500 hover:text-rose-600 flex items-center gap-1 text-xs font-bold transition-colors"
          >
            <Trash2 size={14} /> LIMPAR
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {cart.map((item) => (
            <div key={item.product.id} className="p-4 flex gap-3 group">
              <div className="size-14 rounded-lg overflow-hidden relative border border-slate-100 dark:border-slate-700">
                <Image 
                  src={item.product.image} 
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{item.product.name}</h4>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">R$ {(item.product.salePrice * item.quantity).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, -1); }}
                      className="size-6 flex items-center justify-center text-slate-500 hover:text-emerald-600"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, 1); }}
                      className="size-6 flex items-center justify-center text-slate-500 hover:text-emerald-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
              <ShoppingCart size={64} />
              <p className="font-bold">Carrinho Vazio</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">R$ {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xl border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
              <span className="font-bold text-slate-900 dark:text-white">TOTAL</span>
              <span className="font-black text-emerald-600">R$ {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {['Dinheiro', 'Pix', 'Crédito', 'Débito'].map(method => (
              <button 
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all",
                  paymentMethod === method 
                    ? "border-emerald-500 bg-emerald-500/5 text-emerald-600" 
                    : "border-slate-200 dark:border-slate-700 hover:border-emerald-500/50"
                )}
              >
                <span className="text-[9px] font-bold uppercase">{method}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 px-3 py-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
            <Printer className="text-emerald-600" size={18} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">Imprimir cupom?</span>
            <input type="checkbox" className="rounded text-emerald-500 focus:ring-emerald-500" defaultChecked />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => setCart([])}
              className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 rounded-xl hover:bg-slate-300 transition-all active:scale-95"
            >
              CANCELAR
            </button>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="col-span-2 bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              <CheckCircle size={20} /> FINALIZAR VENDA
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
