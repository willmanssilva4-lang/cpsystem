'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Tag, Package, ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useERP } from '@/lib/context';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function PriceCheckPage() {
  const router = useRouter();
  const { products, companySettings, setCustomAlert } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
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

  return (
    <div className="min-h-screen bg-brand-text-main flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto pt-6 md:pt-10">
      {/* Header Controls */}
      <div className="fixed top-6 left-6 right-6 flex justify-between items-center z-10">
        <button 
          onClick={() => router.back()}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-sm backdrop-blur-md border border-white/10"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>
        
        <button 
          onClick={toggleFullScreen}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-sm backdrop-blur-md border border-white/10"
        >
          {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
          {isFullScreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
        </button>
      </div>

      <div className="w-full max-w-4xl space-y-8 md:space-y-12 pb-20">
        {/* Logo/Title Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-blue/20 text-brand-blue rounded-2xl border border-brand-blue/30 mb-2">
            <Tag size={32} />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter">
            Terminal de Consulta
          </h1>
          <p className="text-brand-text-sec font-bold uppercase tracking-widest text-sm md:text-base">
            {companySettings?.tradeName || 'MERCADINHO SUPERNICE'}
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-brand-blue/20 blur-3xl group-focus-within:bg-brand-blue/40 transition-all rounded-full" />
          <div className="relative">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-blue transition-colors" size={32} />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Passe o código de barras ou digite o nome..."
              className="w-full pl-20 pr-8 py-8 md:py-10 bg-slate-800/80 border-4 border-slate-700 rounded-[2.5rem] text-2xl md:text-4xl font-black text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-blue transition-all backdrop-blur-xl"
            />
          </div>
          {error && (
            <div className="absolute -bottom-12 left-0 right-0 text-center animate-bounce">
              <p className="text-brand-danger font-black uppercase italic tracking-wider">{error}</p>
            </div>
          )}
        </form>

        {/* Result Area */}
        <div className="min-h-[450px] flex items-center justify-center">
          {result ? (
            <div className="w-full bg-brand-card rounded-[3rem] p-8 md:p-16 shadow-2xl shadow-brand-blue/20 animate-in zoom-in-95 duration-300 flex flex-col md:flex-row items-center gap-8 md:gap-12 border-8 border-brand-blue/10">
              <div className="w-40 h-40 md:w-64 md:h-64 bg-brand-bg rounded-[2.5rem] flex items-center justify-center text-brand-text-sec/30">
                <Package size={100} className="md:w-32 md:h-32" />
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-4 md:space-y-6">
                <div>
                  <span className="inline-block px-4 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-black uppercase tracking-widest mb-2 md:mb-4">
                    Produto Encontrado
                  </span>
                  <h2 className="text-3xl md:text-6xl font-black text-brand-text-main leading-tight">
                    {result.name}
                  </h2>
                  <p className="text-brand-text-sec font-bold text-base md:text-lg mt-1 md:mt-2 uppercase tracking-wider">
                    SKU: {result.sku}
                  </p>
                </div>

                <div className="space-y-1 w-full text-center md:text-left">
                  <p className="text-brand-text-sec font-bold uppercase text-[10px] md:text-sm">Preço de Venda</p>
                  <div className="text-5xl md:text-8xl font-black text-brand-blue leading-none break-all py-2">
                    {formatCurrency(result.salePrice || 0)}
                  </div>
                </div>

                {result.stock <= 0 && (
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-brand-danger/10 text-brand-danger rounded-2xl font-black uppercase italic tracking-wider text-sm">
                    Indisponível no momento
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6 opacity-40 py-10">
              <div className="w-24 h-24 md:w-32 md:h-32 mx-auto border-4 border-dashed border-slate-700 rounded-full flex items-center justify-center text-slate-700">
                <Search size={40} className="md:w-12 md:h-12" />
              </div>
              <p className="text-lg md:text-xl font-black text-slate-600 uppercase italic tracking-widest">
                Aguardando consulta...
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
