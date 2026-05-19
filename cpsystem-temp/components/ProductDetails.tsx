'use client';

import React from 'react';
import { 
  X, 
  Package, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ArrowLeftRight,
  ClipboardList,
  Info,
  Calendar,
  User,
  Truck,
  ShoppingBag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useERP } from '@/lib/context';
import { Product, StockMovement } from '@/lib/types';
import { cn, formatDateTimeBR } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProductDetailsProps {
  productId: string;
  onClose: () => void;
}

export function ProductDetails({ productId, onClose }: ProductDetailsProps) {
  const { products, stockMovements } = useERP();
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const product = products.find(p => p.id === productId);
  const movements = stockMovements
    .filter(m => m.productId === productId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(movements.length / itemsPerPage);
  const paginatedMovements = movements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const kitsUsingThisItem = products.filter(p => 
    p.product_type === 'KIT' && 
    p.composition?.some(c => c.productId === productId)
  );

  const stats = React.useMemo(() => {
    const entries = movements
      .filter(m => m.type === 'ENTRADA' || m.type === 'COMPRA')
      .reduce((acc, m) => acc + m.quantity, 0);
    
    const exits = movements
      .filter(m => m.type === 'SAÍDA')
      .reduce((acc, m) => acc + Math.abs(m.quantity), 0);
    
    const adjustments = movements
      .filter(m => m.type === 'AJUSTE')
      .reduce((acc, m) => acc + m.quantity, 0);

    return { entries, exits, adjustments };
  }, [movements]);

  if (!product) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
                <Package size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">{product.name}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">SKU: {product.sku}</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                    product.status === 'Ativo' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                  )}>
                    {product.status || 'Ativo'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl transition-all shadow-sm border border-slate-100 active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Info & Stats */}
              <div className="lg:col-span-1 space-y-8">
                
                {/* Basic Info Card */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
                  <div className="flex items-center gap-2 text-brand-blue border-b border-slate-200 pb-3">
                    <Info size={16} />
                    <h3 className="text-xs font-black uppercase tracking-widest italic">Informações Base</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                      <p className="text-sm font-black text-slate-700 uppercase italic">
                        {product.product_type === 'KIT' ? 'KIT de Produtos' : 
                         product.product_type === 'BASE' ? 'Insumo / Base' : 'Produto de Venda'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unidade</p>
                      <p className="text-sm font-black text-slate-700 uppercase italic">{product.unit || 'UN'}</p>
                    </div>
                  </div>

                  {product.supplier && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Último Fornecedor</p>
                      <div className="flex items-center gap-2 text-sm font-black text-brand-blue uppercase italic">
                        <Truck size={14} />
                        {product.supplier}
                      </div>
                    </div>
                  )}

                  {product.conversion_factor && product.conversion_factor !== 1 && (
                    <div className="bg-brand-blue/5 p-4 rounded-2xl border border-brand-blue/10">
                      <div className="flex items-center gap-2 text-brand-blue mb-2">
                        <ArrowLeftRight size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Conversão</span>
                      </div>
                      <p className="text-lg font-black text-brand-blue italic">
                        1 {product.unit || 'UN'} = {product.conversion_factor} {product.unit === 'UN' ? 'g/ml' : 'UN'}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estoque Atual</p>
                        <p className={cn(
                          "text-3xl font-black italic tracking-tighter",
                          product.stock > (product.minStock || 0) ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {product.stock} <span className="text-sm uppercase">{product.unit || 'UN'}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estoque Mínimo</p>
                        <p className="text-xl font-black text-slate-400 italic">{product.minStock || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Especificações Detalhadas */}
                {(product.gramatura || product.segmento || product.tipo_embalagem) && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-3">
                      <Layers size={16} />
                      <h3 className="text-xs font-black uppercase tracking-widest italic">Especificações</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      {product.segmento && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Segmento</p>
                          <p className="text-xs font-black text-slate-700 uppercase italic">{product.segmento}</p>
                        </div>
                      )}
                      {product.gramatura && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gramatura</p>
                          <p className="text-xs font-black text-slate-700 uppercase italic">{product.gramatura}</p>
                        </div>
                      )}
                      {product.tipo_embalagem && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Embalagem</p>
                          <p className="text-xs font-black text-slate-700 uppercase italic">{product.tipo_embalagem}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary Totals */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Entradas</p>
                        <p className="text-lg font-black text-emerald-600 italic">+{stats.entries}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                        <TrendingDown size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Saídas</p>
                        <p className="text-lg font-black text-rose-600 italic">-{stats.exits}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-blue rounded-3xl p-5 shadow-lg shadow-brand-blue/20 flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <ShoppingBag size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Consumo Total</p>
                        <p className="text-lg font-black italic">{stats.exits} <span className="text-xs opacity-60 font-bold uppercase">{product.unit || 'UN'}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kits Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Layers size={16} />
                    <h3 className="text-xs font-black uppercase tracking-widest italic">Utilizado nos Kits</h3>
                  </div>
                  {kitsUsingThisItem.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {kitsUsingThisItem.map(kit => (
                        <div key={kit.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all cursor-default group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-brand-blue transition-colors">
                              <Package size={14} />
                            </div>
                            <span className="text-xs font-black text-slate-600 uppercase italic tracking-tight">{kit.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-brand-blue bg-white px-2 py-1 rounded-lg border border-slate-100">
                            {kit.sku}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 group">
                       <Layers size={24} className="mx-auto mb-2 text-slate-300 opacity-50 group-hover:scale-110 transition-transform" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Este item não compõe nenhum KIT</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column - Movement History */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                      <History size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-700 uppercase italic">Histórico de Movimentações</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronologia de entradas e saídas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <div className="px-2 py-1 rounded-lg bg-white shadow-sm flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black uppercase text-slate-500 italic">Atualizado</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
                  <div className="max-h-[800px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem / Documento</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantidade</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Usuário</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedMovements.length > 0 ? (
                          paginatedMovements.map((mov) => (
                            <tr key={mov.id} className="hover:bg-white transition-all group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
                                    <Calendar size={12} />
                                  </div>
                                  <span className="text-xs font-bold text-slate-500">{formatDateTimeBR(mov.date)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase italic border",
                                  mov.type === 'ENTRADA' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                  mov.type === 'SAÍDA' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                                  "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                  {mov.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs font-black text-slate-600 uppercase italic tracking-tight">{mov.origin}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "text-xs font-black italic",
                                  mov.quantity > 0 ? "text-emerald-500" : "text-rose-500"
                                )}>
                                  {mov.quantity > 0 ? `+${mov.quantity}` : `${mov.quantity}`}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2 text-slate-400">
                                  <span className="text-[10px] font-bold uppercase tracking-widest">{mov.userName || mov.userId}</span>
                                  <User size={12} />
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center gap-3 opacity-30">
                                <ClipboardList size={48} className="text-slate-400" />
                                <p className="text-sm font-black text-slate-400 uppercase italic tracking-widest underline decoration-2 underline-offset-4 decoration-slate-200">
                                  Sem movimentações registradas
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, movements.length)} de {movements.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50 transition-all font-black uppercase italic text-[10px] flex items-center gap-1"
                        >
                          <ChevronLeft size={14} />
                          Anterior
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              if (totalPages <= 5) return true;
                              return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                            })
                            .map((page, idx, arr) => (
                              <React.Fragment key={page}>
                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                  <span className="text-slate-300 px-1">...</span>
                                )}
                                <button
                                  onClick={() => setCurrentPage(page)}
                                  className={cn(
                                    "w-8 h-8 rounded-xl text-xs font-black transition-all border",
                                    currentPage === page 
                                      ? "bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20" 
                                      : "text-slate-400 hover:bg-slate-50 border-slate-100"
                                  )}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            ))}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50 transition-all font-black uppercase italic text-[10px] flex items-center gap-1"
                        >
                          Próximo
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Legend/Footer */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Acúmulo positivo (Entrada)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Acúmulo negativo (Saída)</span>
                  </div>
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-6 ml-auto">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Legenda de Cores</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-lg shadow-slate-900/10 active:scale-95"
            >
              Fechar Visualização
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
