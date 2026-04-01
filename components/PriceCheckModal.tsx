import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Tag, Package } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PriceCheckModalProps {
  onClose: () => void;
}

export function PriceCheckModal({ onClose }: PriceCheckModalProps) {
  const { products } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!searchTerm.trim()) return;

    const term = searchTerm.toLowerCase().trim();
    const product = products.find(p => 
      p.sku.toLowerCase() === term || 
      p.name.toLowerCase().includes(term)
    );

    if (product) {
      setResult(product);
      setSearchTerm('');
    } else {
      setError('Produto não encontrado.');
    }
    
    inputRef.current?.focus();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100">Consultar Preço</h2>
              <p className="text-xs font-medium text-slate-500">Pressione ESC para fechar</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Código de barras, SKU ou Nome..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-medium focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm font-medium text-rose-500 text-center">{error}</p>
            )}
          </form>

          {result && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center animate-in slide-in-from-bottom-4">
              <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                <Package size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{result.name}</h3>
              <div className="flex justify-center gap-4 text-sm font-medium text-slate-500 mb-6">
                <span>SKU: {result.sku}</span>
              </div>
              <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {formatCurrency(result.salePrice)}
              </div>
              {result.stock <= 0 && (
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-widest">
                  Sem Estoque
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
