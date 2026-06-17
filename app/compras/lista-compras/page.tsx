'use client';

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search,
  Plus, 
  Trash2, 
  ShoppingCart,
  Package,
  ShoppingBag
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useERP } from '@/lib/context';
import { useRouter } from 'next/navigation';

export default function ListaComprasPage() {
  const { products } = useERP();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [shoppingList, setShoppingList] = useState<any[]>([]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20);
  }, [searchTerm, products]);

  const addProduct = (product: any) => {
    if (shoppingList.find(item => item.id === product.id)) return;
    setShoppingList([...shoppingList, { ...product, qty: 1 }]);
    setSearchTerm('');
  };

  const removeProduct = (productId: string) => {
    setShoppingList(shoppingList.filter(item => item.id !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    setShoppingList(shoppingList.map(item => 
      item.id === productId ? { ...item, qty: Math.max(1, qty) } : item
    ));
  };

  const handleSaveList = () => {
    const listId = Date.now().toString();
    const newList = {
        id: listId,
        name: `Lista ${new Date().toLocaleDateString()}`,
        items: shoppingList,
        createdAt: new Date().toISOString()
    };
    const saved = JSON.parse(localStorage.getItem('saved_shopping_lists') || '[]');
    localStorage.setItem('saved_shopping_lists', JSON.stringify([...saved, newList]));
    alert('Lista salva com sucesso!');
  };

  const handleGenerateOrder = () => {
    localStorage.setItem('shopping_list_items', JSON.stringify(shoppingList));
    router.push('/compras/novo-pedido');
  };

  return (
    <div className="p-8 space-y-8 bg-brand-bg min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/compras" className="flex items-center gap-2 text-brand-blue font-black uppercase italic tracking-tight text-xs mb-2 hover:gap-3 transition-all">
            <ArrowLeft size={14} /> Voltar para Compras
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-brand-text-main italic uppercase">Nova Lista de Compras</h1>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleSaveList}
                disabled={shoppingList.length === 0}
                className="flex items-center gap-2 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase italic tracking-tight hover:bg-slate-200 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
                Salvar Lista
            </button>
            <button 
                onClick={handleGenerateOrder}
                disabled={shoppingList.length === 0}
                className="flex items-center gap-2 px-8 py-4 bg-brand-blue text-white rounded-2xl font-black uppercase italic tracking-tight hover:bg-brand-blue-hover transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
                <ShoppingCart size={20} />
                Gerar Pedido
            </button>
        </div>
      </div>


      <div className="bg-white rounded-[32px] p-8 border border-brand-border">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-main/30" size={20} />
          <input 
            type="text" 
            placeholder="Buscar produto para adicionar à lista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-brand-blue"
          />
          {filteredProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl mt-2 shadow-xl z-50 overflow-hidden">
              {filteredProducts.map(p => (
                <button 
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="w-full text-left px-6 py-3 hover:bg-slate-50 flex items-center justify-between text-sm font-bold text-brand-text-main"
                >
                  {p.name}
                  <Plus size={16} className="text-brand-blue" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-brand-border">
              <th className="px-8 py-4 text-[10px] font-black uppercase italic text-brand-text-main/40">Produto</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase italic text-brand-text-main/40">Qtd</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase italic text-brand-text-main/40 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shoppingList.map(item => (
              <tr key={item.id}>
                <td className="px-8 py-4 text-sm font-bold text-brand-text-main">{item.name}</td>
                <td className="px-8 py-4">
                  <input 
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateQty(item.id, Number(e.target.value))}
                    className="w-20 p-2 bg-slate-50 rounded-lg text-sm font-bold text-brand-text-main"
                  />
                </td>
                <td className="px-8 py-4 text-right">
                  <button onClick={() => removeProduct(item.id)} className="text-rose-500 hover:text-rose-600">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shoppingList.length === 0 && (
          <div className="text-center py-20 text-slate-400 font-bold italic">Nenhum produto adicionado à lista.</div>
        )}
      </div>
    </div>
  );
}
