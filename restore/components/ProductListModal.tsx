import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Package, ShoppingCart } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductListModalProps {
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export function ProductListModal({ onClose, onSelectProduct }: ProductListModalProps) {
  const { products } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products.filter(p => 
    p.status !== 'Inativo' && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
    )
  ).slice(0, 100); // Limit to 100 results for performance

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0 && selectedIndex >= 0) {
        onSelectProduct(filteredProducts[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

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
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
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
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                      <Package size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">{product.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
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
                  <div className="text-right">
                    <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(product.salePrice)}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-400 mt-1 justify-end">
                      <ShoppingCart size={12} />
                      <span>Selecionar</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
