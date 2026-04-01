'use client';

import React, { useState } from 'react';
import { useERP } from '@/lib/context';
import { Search, RotateCcw, ArrowLeft, Calendar, User, Hash, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Sale } from '@/lib/types';
import { formatDateTimeBR } from '@/lib/utils';

export default function ReturnsPage() {
  const { sales, products, addReturn, user, hasPermission } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ productId: string, quantity: number, reason: string }[]>([]);
  const [reason, setReason] = useState('Arrependimento');
  const [refundMethod, setRefundMethod] = useState('Dinheiro');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.replace('#', '').trim().toLowerCase();
    if (!query) return;
    const sale = sales.find(s => 
      s.id.toLowerCase().substring(0, 8).includes(query) ||
      s.id.toLowerCase().includes(query) || 
      (s.customerId && s.customerId.toLowerCase().includes(query))
    );
    if (sale) {
      setSelectedSale(sale);
      setSelectedItems([]);
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
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      setSelectedSale(null);
      setSelectedItems([]);
      setSearchQuery('');
    } else {
      alert('Erro ao processar devolução!');
    }
  };

  const handleFullReversal = () => {
    if (!selectedSale) return;
    setSelectedItems(selectedSale.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      reason: 'Estorno Total'
    })));
    setReason('Estorno Total');
    setShowConfirmModal(true);
  };

  if (!hasPermission('Vendas', 'view')) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-brand-text-sec font-bold uppercase tracking-widest">Acesso Negado</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black italic text-brand-text-main uppercase tracking-tighter flex items-center gap-3">
              <RotateCcw className="text-brand-blue" size={40} /> Devoluções e Estornos
            </h1>
            <p className="text-brand-text-sec font-bold uppercase text-xs tracking-widest mt-1">Gestão Profissional de Reversões</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border-2 border-brand-border rounded-3xl p-6 shadow-xl">
              <h3 className="font-black italic uppercase text-brand-blue mb-4 flex items-center gap-2">
                <Search size={18} /> Buscar Venda
              </h3>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-brand-text-sec tracking-widest">Nº Cupom / CPF / ID</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: 12345"
                    className="w-full bg-slate-50 border-2 border-brand-border rounded-xl px-4 py-3 font-bold focus:border-brand-blue outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white py-3 rounded-xl font-black italic uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-brand-blue/20"
                >
                  Localizar Venda
                </button>
              </form>
            </div>

            {selectedSale && (
              <div className="bg-white border-2 border-brand-border rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="font-black italic uppercase text-brand-blue mb-2 flex items-center gap-2">
                  <AlertCircle size={18} /> Detalhes da Venda
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-brand-border pb-2">
                    <span className="text-brand-text-sec font-bold uppercase text-[10px]">ID Venda</span>
                    <span className="font-black italic">#{selectedSale.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border pb-2">
                    <span className="text-brand-text-sec font-bold uppercase text-[10px]">Data/Hora</span>
                    <span className="font-bold">{formatDateTimeBR(selectedSale.date)}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border pb-2">
                    <span className="text-brand-text-sec font-bold uppercase text-[10px]">Total</span>
                    <span className="font-black text-brand-blue">R$ {selectedSale.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border pb-2">
                    <span className="text-brand-text-sec font-bold uppercase text-[10px]">Pagamento</span>
                    <span className="font-bold uppercase">{selectedSale.paymentMethod}</span>
                  </div>
                </div>
                <button
                  onClick={handleFullReversal}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border-2 border-rose-200 py-3 rounded-xl font-black italic uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> Estornar Venda Completa
                </button>
              </div>
            )}
          </div>

          {/* Items Section */}
          <div className="lg:col-span-2">
            {selectedSale ? (
              <div className="bg-white border-2 border-brand-border rounded-3xl shadow-xl overflow-hidden flex flex-col h-full">
                <div className="bg-slate-50 px-6 py-4 border-b border-brand-border flex justify-between items-center">
                  <h3 className="font-black italic uppercase text-brand-text-main flex items-center gap-2">
                    Itens da Venda
                  </h3>
                  <span className="text-[10px] font-black uppercase text-brand-text-sec bg-white px-3 py-1 rounded-full border border-brand-border">
                    {selectedSale.items.length} Itens Encontrados
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-brand-text-sec border-b border-brand-border">
                      <tr>
                        <th className="px-6 py-3 text-left">Produto</th>
                        <th className="px-6 py-3 text-center">Qtd Vendida</th>
                        <th className="px-6 py-3 text-center">Qtd Devolver</th>
                        <th className="px-6 py-3 text-right">Valor Unit.</th>
                        <th className="px-6 py-3 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {selectedSale.items.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId);
                        const isSelected = selectedItems.some(si => si.productId === item.productId);
                        const selectedItem = selectedItems.find(si => si.productId === item.productId);
                        
                        return (
                          <tr key={idx} className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/30 transition-colors'}>
                            <td className="px-6 py-4">
                              <p className="font-black italic text-brand-text-main uppercase leading-tight">{product?.name || 'Produto'}</p>
                              <p className="text-[10px] text-brand-text-sec font-bold">SKU: {product?.sku || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-brand-text-sec">{item.quantity}</td>
                            <td className="px-6 py-4 text-center">
                              {isSelected ? (
                                <div className="flex items-center justify-center gap-3">
                                  <button 
                                    onClick={() => updateQuantity(item.productId, (selectedItem?.quantity || 1) - 1, item.quantity)}
                                    className="w-8 h-8 flex items-center justify-center bg-white border-2 border-brand-border rounded-xl hover:bg-slate-100 transition-all active:scale-90"
                                  >-</button>
                                  <span className="font-black text-lg w-6 text-center">{selectedItem?.quantity}</span>
                                  <button 
                                    onClick={() => updateQuantity(item.productId, (selectedItem?.quantity || 1) + 1, item.quantity)}
                                    className="w-8 h-8 flex items-center justify-center bg-white border-2 border-brand-border rounded-xl hover:bg-slate-100 transition-all active:scale-90"
                                  >+</button>
                                </div>
                              ) : (
                                <span className="text-brand-text-sec opacity-30">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-brand-blue">R$ {item.price.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => toggleItem(item.productId, item.quantity)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                  isSelected 
                                    ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                                    : 'bg-slate-100 text-brand-text-sec hover:bg-slate-200'
                                }`}
                              >
                                {isSelected ? 'Remover' : 'Selecionar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedItems.length > 0 && (
                  <div className="p-6 bg-slate-50 border-t border-brand-border space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-brand-text-sec tracking-widest">Motivo da Devolução</label>
                        <select
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full bg-white border-2 border-brand-border rounded-xl px-4 py-3 font-bold focus:border-brand-blue outline-none transition-all"
                        >
                          <option>Arrependimento</option>
                          <option>Produto com Defeito</option>
                          <option>Produto Errado</option>
                          <option>Vencido</option>
                          <option>Outro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-brand-text-sec tracking-widest">Forma de Reembolso</label>
                        <select
                          value={refundMethod}
                          onChange={(e) => setRefundMethod(e.target.value)}
                          className="w-full bg-white border-2 border-brand-border rounded-xl px-4 py-3 font-bold focus:border-brand-blue outline-none transition-all"
                        >
                          <option>Dinheiro</option>
                          <option>Crédito em Loja</option>
                          <option>Estorno no Cartão</option>
                          <option>Pix</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-2 border-brand-border shadow-inner">
                      <div>
                        <p className="text-[10px] font-black uppercase text-brand-text-sec tracking-widest">Total a Devolver</p>
                        <p className="text-3xl font-black text-brand-blue italic">
                          R$ {selectedItems.reduce((acc, item) => {
                            const saleItem = selectedSale.items.find(si => si.productId === item.productId);
                            return acc + (saleItem ? saleItem.price * item.quantity : 0);
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowConfirmModal(true)}
                        className="bg-brand-blue hover:bg-brand-blue-hover text-white px-10 py-4 rounded-2xl font-black italic uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-brand-blue/20"
                      >
                        Confirmar Devolução
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-slate-50 border-2 border-dashed border-brand-border rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                  <Search size={32} className="text-brand-text-sec opacity-30" />
                </div>
                <h3 className="text-xl font-black italic text-brand-text-main uppercase mb-2">Nenhuma Venda Selecionada</h3>
                <p className="text-brand-text-sec max-w-xs">Busque uma venda pelo número do cupom ou ID para gerenciar devoluções.</p>
              </div>
            )}
          </div>
        </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-brand-border rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h3 className="text-2xl font-black italic mb-4 text-brand-text-main uppercase">Confirmar Reversão?</h3>
            <p className="text-brand-text-sec mb-8">
              Esta ação irá atualizar o estoque e registrar o reembolso de 
              <span className="font-black text-brand-blue mx-1">
                R$ {selectedItems.reduce((acc, item) => {
                  const saleItem = selectedSale?.items.find(si => si.productId === item.productId);
                  return acc + (saleItem ? saleItem.price * item.quantity : 0);
                }, 0).toFixed(2)}
              </span>
              via {refundMethod}.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-brand-text-sec font-black uppercase tracking-widest rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-1 py-4 bg-brand-blue hover:bg-brand-blue-hover text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-brand-blue/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-brand-border rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-20 h-20 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black italic mb-4 text-brand-text-main uppercase">Concluído!</h3>
            <p className="text-brand-text-sec mb-8">A devolução foi registrada com sucesso e o estoque foi atualizado.</p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-4 bg-brand-blue hover:bg-brand-blue-hover text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-brand-blue/20"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
