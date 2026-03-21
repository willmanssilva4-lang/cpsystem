'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useERP } from '@/lib/context';
import { Search, X, ArrowRight, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Sale, Product } from '@/lib/types';

interface QuickReturnModalProps {
  onClose: () => void;
}

export function QuickReturnModal({ onClose }: QuickReturnModalProps) {
  const { sales, products, addReturn, user } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ productId: string, quantity: number, reason: string }[]>([]);
  const [step, setStep] = useState<'search' | 'items' | 'confirm' | 'success'>('search');
  const [reason, setReason] = useState('Arrependimento');
  const [refundMethod, setRefundMethod] = useState('Dinheiro');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'search') {
      searchInputRef.current?.focus();
    }
  }, [step]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sale = sales.find(s => s.id === searchQuery || s.id.endsWith(searchQuery));
    if (sale) {
      setSelectedSale(sale);
      setStep('items');
    } else {
      alert('Venda não encontrada!');
    }
  };

  const toggleItem = (productId: string, maxQty: number) => {
    const existing = selectedItems.find(i => i.productId === productId);
    if (existing) {
      setSelectedItems(prev => prev.filter(i => i.productId !== productId));
    } else {
      setSelectedItems(prev => [...prev, { productId, quantity: 1, reason }]);
    }
  };

  const updateQuantity = (productId: string, qty: number, maxQty: number) => {
    if (qty < 1 || qty > maxQty) return;
    setSelectedItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const handleConfirm = async () => {
    if (!selectedSale || selectedItems.length === 0) return;

    const total = selectedItems.reduce((acc, item) => {
      const saleItem = selectedSale.items.find(si => si.productId === item.productId);
      return acc + (saleItem ? saleItem.price * item.quantity : 0);
    }, 0);

    const success = await addReturn({
      saleId: selectedSale.id,
      date: new Date().toISOString(),
      items: selectedItems.map(item => {
        const saleItem = selectedSale.items.find(si => si.productId === item.productId);
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: saleItem?.price || 0,
          reason: item.reason
        };
      }),
      total,
      type: selectedItems.length === selectedSale.items.length ? 'TOTAL' : 'PARCIAL',
      refundMethod,
      userId: user?.id || 'Sistema',
      status: 'CONCLUÍDO'
    });

    if (success) {
      setStep('success');
    } else {
      alert('Erro ao processar devolução!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-brand-blue px-6 py-4 flex justify-between items-center text-white shrink-0">
          <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
            <RotateCcw size={24} /> Devolução Rápida (F2)
          </h3>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 'search' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-brand-text-sec mb-4">Informe o número do cupom ou ID da venda para iniciar a devolução.</p>
                <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nº Cupom / ID Venda"
                    className="flex-1 bg-slate-50 border-2 border-brand-border rounded-xl px-4 py-3 font-bold text-lg focus:border-brand-blue outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="bg-brand-blue hover:bg-brand-blue-hover text-white px-6 rounded-xl font-bold transition-all active:scale-95"
                  >
                    BUSCAR
                  </button>
                </form>
              </div>
            </div>
          )}

          {step === 'items' && selectedSale && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-brand-border flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-brand-text-sec uppercase">Venda #{selectedSale.id.substring(0, 8)}</p>
                  <p className="text-sm font-bold text-brand-text-main">{new Date(selectedSale.date).toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-brand-text-sec uppercase">Total da Venda</p>
                  <p className="text-lg font-black text-brand-blue">R$ {selectedSale.total.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-brand-text-main uppercase text-sm">Selecione os itens para devolver:</h4>
                <div className="border border-brand-border rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-brand-border">
                      <tr>
                        <th className="px-4 py-2 text-left">Produto</th>
                        <th className="px-4 py-2 text-center">Qtd</th>
                        <th className="px-4 py-2 text-right">Preço</th>
                        <th className="px-4 py-2 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {selectedSale.items.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId);
                        const isSelected = selectedItems.some(si => si.productId === item.productId);
                        return (
                          <tr key={idx} className={isSelected ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-3 font-medium">{product?.name || 'Produto não encontrado'}</td>
                            <td className="px-4 py-3 text-center">
                              {isSelected ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => updateQuantity(item.productId, (selectedItems.find(si => si.productId === item.productId)?.quantity || 1) - 1, item.quantity)}
                                    className="w-6 h-6 flex items-center justify-center bg-white border border-brand-border rounded-md hover:bg-slate-100"
                                  >-</button>
                                  <span className="font-bold w-4 text-center">{selectedItems.find(si => si.productId === item.productId)?.quantity}</span>
                                  <button 
                                    onClick={() => updateQuantity(item.productId, (selectedItems.find(si => si.productId === item.productId)?.quantity || 1) + 1, item.quantity)}
                                    className="w-6 h-6 flex items-center justify-center bg-white border border-brand-border rounded-md hover:bg-slate-100"
                                  >+</button>
                                  <span className="text-[10px] text-brand-text-sec ml-1">/ {item.quantity}</span>
                                </div>
                              ) : (
                                <span className="font-bold">{item.quantity}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">R$ {item.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleItem(item.productId, item.quantity)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-brand-text-sec hover:bg-slate-200'}`}
                              >
                                {isSelected ? 'SELECIONADO' : 'SELECIONAR'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-text-sec uppercase">Motivo da Devolução</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-50 border border-brand-border rounded-xl px-4 py-2 font-medium focus:border-brand-blue outline-none"
                  >
                    <option>Arrependimento</option>
                    <option>Produto com Defeito</option>
                    <option>Produto Errado</option>
                    <option>Vencido</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-text-sec uppercase">Forma de Reembolso</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-brand-border rounded-xl px-4 py-2 font-medium focus:border-brand-blue outline-none"
                  >
                    <option>Dinheiro</option>
                    <option>Crédito em Loja</option>
                    <option>Estorno no Cartão</option>
                    <option>Pix</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setStep('search')}
                  className="px-6 py-3 bg-slate-100 text-brand-text-sec font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  VOLTAR
                </button>
                <button
                  disabled={selectedItems.length === 0}
                  onClick={() => setStep('confirm')}
                  className="px-8 py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-brand-blue-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  CONTINUAR <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && selectedSale && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={48} />
              </div>
              <div>
                <h4 className="text-2xl font-black italic text-brand-text-main uppercase mb-2">Confirmar Devolução?</h4>
                <p className="text-brand-text-sec">
                  Você está devolvendo {selectedItems.reduce((acc, i) => acc + i.quantity, 0)} itens da venda #{selectedSale.id.substring(0, 8)}.
                </p>
                <div className="mt-6 bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-brand-border">
                  <p className="text-sm font-bold text-brand-text-sec uppercase mb-1">Valor a Reembolsar</p>
                  <p className="text-4xl font-black text-brand-blue">
                    R$ {selectedItems.reduce((acc, item) => {
                      const saleItem = selectedSale.items.find(si => si.productId === item.productId);
                      return acc + (saleItem ? saleItem.price * item.quantity : 0);
                    }, 0).toFixed(2)}
                  </p>
                  <p className="text-xs font-bold text-brand-text-sec mt-2 uppercase">Via {refundMethod}</p>
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-6">
                <button
                  onClick={() => setStep('items')}
                  className="px-8 py-3 bg-slate-100 text-brand-text-sec font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-10 py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-brand-blue-hover transition-all shadow-lg shadow-brand-blue/20"
                >
                  CONFIRMAR DEVOLUÇÃO
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center py-8">
              <div className="w-24 h-24 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                <CheckCircle2 size={64} />
              </div>
              <div>
                <h4 className="text-3xl font-black italic text-brand-text-main uppercase mb-2">Sucesso!</h4>
                <p className="text-brand-text-sec text-lg">A devolução foi processada e o estoque atualizado.</p>
              </div>
              <button
                onClick={onClose}
                className="mt-8 px-12 py-4 bg-brand-blue text-white font-bold rounded-2xl hover:bg-brand-blue-hover transition-all shadow-xl shadow-brand-blue/20 uppercase tracking-widest"
              >
                FECHAR (Esc)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
