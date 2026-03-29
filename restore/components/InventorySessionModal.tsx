'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Search, Package, AlertCircle, CheckCircle2, Save, Trash2, ClipboardList, ChevronRight, Store, Tag, ListChecks } from 'lucide-react';
import { Product } from '@/lib/types';
import { useERP } from '@/lib/context';
import { cn } from '@/lib/utils';

interface InventorySessionModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type InventoryStep = 'setup' | 'counting' | 'summary';
type InventoryType = 'Geral' | 'Rotativo' | 'Categoria';

export function InventorySessionModal({ onClose, onComplete }: InventorySessionModalProps) {
  const { products, addInventory, addStockMovement, user, subcategorias, categorias } = useERP();
  const [step, setStep] = useState<InventoryStep>('setup');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Setup state
  const [config, setConfig] = useState({
    location: 'Loja Principal',
    type: 'Geral' as InventoryType,
    category: '',
    responsible: user?.name || 'Sistema'
  });

  const [sessionProducts, setSessionProducts] = useState<Product[]>([]);

  const handleStartSession = () => {
    let filtered = [...products];
    if (config.type === 'Categoria' && config.category) {
      const cat = categorias.find(c => c.nome === config.category);
      if (cat) {
        const subIds = subcategorias.filter(s => s.categoria_id === cat.id).map(s => s.id);
        filtered = filtered.filter(p => p.subcategoria_id && subIds.includes(p.subcategoria_id));
      } else {
        filtered = [];
      }
    } else if (config.type === 'Rotativo') {
      // For rotativo, maybe pick products with low stock or just a subset
      // For now, let's just take the first 20 or something, or let user search
      // But usually rotativo is a specific list. Let's just use all for now but label it.
    }

    setSessionProducts(filtered);
    
    const initialCounts: Record<string, number> = {};
    filtered.forEach(p => {
      initialCounts[p.id] = p.stock;
    });
    setCounts(initialCounts);
    setStep('counting');
  };

  const filteredProducts = sessionProducts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleCountChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setCounts(prev => ({ ...prev, [productId]: numValue }));
  };

  const calculateTotals = () => {
    let totalDivergenceValue = 0;
    let itemsCounted = 0;
    let itemsWithDivergence = 0;

    sessionProducts.forEach(p => {
      const physical = counts[p.id] ?? p.stock;
      if (physical !== p.stock) {
        const diff = physical - p.stock;
        const cost = typeof p.costPrice === 'number' && !isNaN(p.costPrice) ? p.costPrice : 0;
        totalDivergenceValue += diff * cost;
        itemsWithDivergence++;
      }
      itemsCounted++;
    });

    return { 
      totalDivergenceValue: isNaN(totalDivergenceValue) ? 0 : totalDivergenceValue, 
      itemsCounted, 
      itemsWithDivergence 
    };
  };

  const handleFinalize = async () => {
    setIsSaving(true);
    try {
      const { totalDivergenceValue, itemsCounted } = calculateTotals();

      // 1. Create Inventory Record
      await addInventory({
        date: new Date().toISOString(),
        location: config.location,
        itemsCounted,
        divergenceValue: totalDivergenceValue,
        status: 'Concluído',
        type: config.type,
        responsible: config.responsible,
        notes: `Inventário ${config.type} finalizado. Local: ${config.location}`
      });

      // 2. Create Stock Movements for divergences
      for (const p of sessionProducts) {
        const physical = counts[p.id] ?? p.stock;
        if (physical !== p.stock) {
          const diff = physical - p.stock;
          await addStockMovement({
            productId: p.id,
            type: 'AJUSTE',
            quantity: diff,
            origin: `Ajuste de Inventário ${config.type}`,
            date: new Date().toISOString(),
            userId: user?.email || 'system',
            userName: user?.name || 'Sistema'
          });
        }
      }

      onComplete();
    } catch (error) {
      console.error('Error finalizing inventory:', error);
      alert('Erro ao finalizar inventário. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const { totalDivergenceValue, itemsCounted, itemsWithDivergence } = calculateTotals();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">
                {step === 'setup' ? 'Configurar Inventário' : 'Sessão de Inventário'}
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                {step === 'setup' ? 'Defina os parâmetros da contagem' : `${config.type} - ${config.location}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {step === 'setup' && (
          <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center justify-center bg-slate-50/30">
            <div className="w-full max-w-md space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Store size={12} /> Selecionar Loja / Local
                  </label>
                  <select 
                    value={config.location}
                    onChange={(e) => setConfig(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-white border border-slate-200 px-4 py-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue outline-none transition-all shadow-sm"
                  >
                    <option value="Loja Principal">Loja Principal</option>
                    <option value="Depósito A">Depósito A</option>
                    <option value="Depósito B">Depósito B</option>
                    <option value="Showroom">Showroom</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Tag size={12} /> Tipo de Inventário
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Geral', 'Rotativo', 'Categoria'] as InventoryType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setConfig(prev => ({ ...prev, type: t }))}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                          config.type === t 
                            ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                            : "bg-white border-slate-200 text-slate-400 hover:border-brand-blue hover:text-brand-blue"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {config.type === 'Categoria' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar Categoria</label>
                    <select 
                      value={config.category}
                      onChange={(e) => setConfig(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-4 py-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue outline-none transition-all shadow-sm"
                    >
                      <option value="">Todas as Categorias</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                  <input 
                    type="text"
                    value={config.responsible}
                    onChange={(e) => setConfig(prev => ({ ...prev, responsible: e.target.value }))}
                    className="w-full bg-white border border-slate-200 px-4 py-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue outline-none transition-all shadow-sm"
                    placeholder="Nome do responsável..."
                  />
                </div>
              </div>

              <button 
                onClick={handleStartSession}
                className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white py-5 rounded-[24px] font-black uppercase italic tracking-widest shadow-xl shadow-brand-blue/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                Iniciar Contagem
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 'counting' && (
          <>
            {/* Search and Stats */}
            <div className="p-6 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar produto por nome ou SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Divergência Total</p>
                  <p className={cn(
                    "text-xl font-black",
                    totalDivergenceValue < 0 ? "text-rose-500" : "text-emerald-500"
                  )}>
                    R$ {totalDivergenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button 
                  onClick={() => setStep('summary')}
                  className="bg-brand-blue hover:bg-brand-blue-hover text-white px-8 py-3 rounded-2xl font-black uppercase italic text-sm tracking-widest transition-all shadow-lg shadow-brand-blue/20 active:scale-95 flex items-center gap-2"
                >
                  Revisar e Finalizar
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="grid grid-cols-1 gap-4">
                {filteredProducts.map(product => {
                  const physical = counts[product.id] ?? product.stock;
                  const diff = physical - product.stock;
                  
                  return (
                    <div key={product.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100 relative">
                        <Image 
                          src={product.image} 
                          alt={product.name} 
                          fill 
                          className="object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-700 uppercase italic truncate">{product.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SKU: {product.sku}</p>
                      </div>

                      <div className="flex items-center gap-12">
                        <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sistema</p>
                          <p className="text-sm font-black text-slate-600">{product.stock} {product.unit || 'un'}</p>
                        </div>

                        <div className="w-32">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Contagem Física</p>
                          <input 
                            type="number"
                            value={counts[product.id] ?? ''}
                            onChange={(e) => handleCountChange(product.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-center font-black text-slate-700 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/5 outline-none transition-all"
                          />
                        </div>

                        <div className="w-24 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diferença</p>
                          <p className={cn(
                            "text-sm font-black",
                            diff === 0 ? "text-slate-400" : diff < 0 ? "text-rose-500" : "text-emerald-500"
                          )}>
                            {diff > 0 ? '+' : ''}{diff}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <Package size={48} className="opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-sm">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {step === 'summary' && (
          <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30 flex flex-col items-center">
            <div className="w-full max-w-2xl space-y-8">
              <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-xl space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <ListChecks size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">Resumo do Inventário</h3>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Confira os dados antes de finalizar</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Itens Contados</p>
                    <p className="text-2xl font-black text-slate-700">{itemsCounted}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Com Divergência</p>
                    <p className="text-2xl font-black text-rose-500">{itemsWithDivergence}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Divergência Financeira Total</p>
                    <p className={cn(
                      "text-3xl font-black",
                      totalDivergenceValue < 0 ? "text-rose-500" : "text-emerald-500"
                    )}>
                      R$ {totalDivergenceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">
                      Ao finalizar, o sistema gerará automaticamente os ajustes de estoque para igualar o saldo do sistema à contagem física.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('counting')}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-400 font-black uppercase italic tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Voltar à Contagem
                  </button>
                  <button 
                    onClick={handleFinalize}
                    disabled={isSaving}
                    className="flex-[2] bg-brand-green hover:bg-brand-green-hover text-white py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-brand-green/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Finalizando...' : (
                      <>
                        <CheckCircle2 size={20} />
                        Finalizar e Ajustar Estoque
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
