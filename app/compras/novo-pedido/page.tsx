'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, 
  Trash2, 
  Search, 
  ArrowLeft, 
  Truck, 
  Calendar, 
  CreditCard, 
  Save,
  ShoppingCart,
  ChevronRight,
  Package,
  DollarSign,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  cost: number;
  total: number;
}

export default function NewOrderPage() {
  const [supplier, setSupplier] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [suppliersRes, productsRes, paymentRes] = await Promise.all([
          supabase.from('suppliers').select('id, name').order('name'),
          supabase.from('products').select('id, name, cost_price, stock, min_stock').order('name'),
          supabase.from('payment_methods').select('id, name').eq('active', true).order('name')
        ]);

        if (suppliersRes.data) setSuppliersList(suppliersRes.data);
        if (productsRes.data) {
          setProductsList(productsRes.data);
          // Sugestões: produtos com estoque abaixo do mínimo
          const lowStock = productsRes.data.filter(p => p.stock < p.min_stock).slice(0, 5);
          setSuggestions(lowStock);
        }
        if (paymentRes.data) setPaymentMethods(paymentRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    const product = productsList.find(p => p.id === selectedProduct);
    if (!product) return;

    // Check if already in list
    if (items.some(item => item.id === product.id)) {
      alert('Produto já adicionado ao pedido.');
      return;
    }

    setItems([...items, {
      id: product.id,
      name: product.name,
      qty: 1,
      cost: Number(product.cost_price),
      total: Number(product.cost_price)
    }]);
    
    setSelectedProduct('');
  };

  const handleAddSuggestion = (product: any) => {
    if (items.some(item => item.id === product.id)) {
      alert('Produto já adicionado ao pedido.');
      return;
    }

    setItems([...items, {
      id: product.id,
      name: product.name,
      qty: 1,
      cost: Number(product.cost_price),
      total: Number(product.cost_price)
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, qty);
        return { ...item, qty: newQty, total: newQty * item.cost };
      }
      return item;
    }));
  };

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const tax = subtotal * 0.05; // 5% tax simulation
  const total = subtotal + tax;

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/compras" className="flex items-center gap-2 text-emerald-600 font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
            <ArrowLeft size={14} />
            Voltar para Compras
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-emerald-950 italic uppercase">Novo Pedido de Compra</h1>
          <p className="text-emerald-600/60 font-medium">Crie ordens de compra manuais para seus fornecedores.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-emerald-100 text-emerald-900 rounded-2xl font-black uppercase italic tracking-tight hover:bg-emerald-50 transition-all active:scale-95">
            Salvar Rascunho
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
            <Save size={20} />
            Finalizar Pedido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="xl:col-span-2 space-y-8">
          {/* Supplier & Info Card */}
          <div className="p-8 rounded-[32px] border border-emerald-100 bg-emerald-50/30 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest ml-1">Fornecedor</label>
              <div className="relative">
                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={20} />
                <select 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-emerald-100 rounded-2xl text-emerald-950 font-bold focus:ring-2 focus:ring-emerald-500 appearance-none"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                >
                  <option value="">Selecione um fornecedor...</option>
                  {suppliersList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-900/40 uppercase italic tracking-widest ml-1">Previsão de Entrega</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={20} />
                <input 
                  type="date" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-emerald-100 rounded-2xl text-emerald-950 font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-emerald-950 uppercase italic tracking-tight">Itens do Pedido</h2>
              <div className="flex items-center gap-2">
                <select 
                  className="px-4 py-2 bg-white border border-emerald-100 rounded-xl text-sm text-emerald-950 font-bold focus:ring-2 focus:ring-emerald-500"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">Selecione um produto...</option>
                  {productsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - R$ {Number(p.cost_price).toFixed(2)}</option>
                  ))}
                </select>
                <button 
                  onClick={handleAddProduct}
                  disabled={!selectedProduct}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase italic tracking-tight hover:bg-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  Adicionar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-emerald-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 border-b border-emerald-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Produto</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Qtd.</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Custo Unit.</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase italic tracking-widest text-emerald-900/40 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="hover:bg-emerald-50/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <Package size={20} />
                            </div>
                            <span className="text-sm font-bold text-emerald-950">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                            >
                              -
                            </button>
                            <input 
                              type="number" 
                              className="w-16 text-center bg-transparent border-none text-sm font-black text-emerald-950 italic focus:ring-0"
                              value={item.qty}
                              onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                            />
                            <button 
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-emerald-900">R$ {item.cost.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-emerald-950 italic">R$ {item.total.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-rose-300 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="p-12 text-center text-emerald-900/30 font-black uppercase italic tracking-widest">
                  Nenhum item adicionado ao pedido
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-8">
          <div className="p-8 rounded-[48px] bg-emerald-950 text-white space-y-8 shadow-2xl shadow-emerald-950/20">
            <div className="flex items-center gap-3 text-emerald-400">
              <Calculator size={24} />
              <h3 className="text-xl font-black uppercase italic tracking-tight">Resumo do Pedido</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-emerald-400/60 uppercase italic">Subtotal</span>
                <span className="font-black italic">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-emerald-400/60 uppercase italic">Impostos (Est.)</span>
                <span className="font-black italic">R$ {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-emerald-400/60 uppercase italic">Frete</span>
                <span className="font-black italic">R$ 0,00</span>
              </div>
              <div className="h-px bg-emerald-800 my-4" />
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-emerald-400 uppercase italic tracking-widest">Total Geral</span>
                <span className="text-4xl font-black italic tracking-tighter text-emerald-400">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-400/40 uppercase italic tracking-widest ml-1">Forma de Pagamento</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
                  <select className="w-full pl-12 pr-4 py-4 bg-emerald-900 border border-emerald-800 rounded-2xl text-white font-bold focus:ring-2 focus:ring-emerald-500 appearance-none">
                    <option value="">Selecione...</option>
                    {paymentMethods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="w-full py-5 bg-emerald-500 text-white rounded-[24px] font-black uppercase italic tracking-tight text-lg hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                Finalizar Pedido
              </button>
            </div>
          </div>

          {/* Quick Search / Suggestion */}
          <div className="p-8 rounded-[32px] border border-emerald-100 bg-white space-y-6">
            <h3 className="text-lg font-black text-emerald-950 uppercase italic tracking-tight">Sugestões de Compra</h3>
            <div className="space-y-4">
              {suggestions.length > 0 ? (
                suggestions.map((sug) => (
                  <div key={sug.id} className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-50">
                    <div>
                      <div className="text-sm font-bold text-emerald-950">{sug.name}</div>
                      <div className="text-[10px] font-black text-emerald-900/40 uppercase italic">Último custo: R$ {Number(sug.cost_price).toFixed(2)}</div>
                    </div>
                    <button 
                      onClick={() => handleAddSuggestion(sug)}
                      className="p-2 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm font-bold text-emerald-900/40 italic text-center py-4">
                  Nenhuma sugestão no momento.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
