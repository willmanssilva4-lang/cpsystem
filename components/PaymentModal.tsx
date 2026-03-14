'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, ArrowLeft, Settings, Plus, User, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useERP } from '@/lib/context';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onFinalize: (paymentData: any) => void;
}

type PaymentMethod = 'Dinheiro' | 'Pix' | 'Crédito' | 'Fiado';

export function PaymentModal({ total, onClose, onFinalize }: PaymentModalProps) {
  const { user, paymentMethods, maquininhas } = useERP();
  const activeMethods = paymentMethods.filter(m => m.active);
  const activeMaquininhas = maquininhas.filter(m => m.ativo);
  
  const [activeMethod, setActiveMethod] = useState<string>(activeMethods[0]?.name || 'Dinheiro');
  const [selectedMaquininhaId, setSelectedMaquininhaId] = useState<string>('');
  const [highlightedMaquininhaIndex, setHighlightedMaquininhaIndex] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);

  const [discount, setDiscount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [lastChange, setLastChange] = useState(0);
  
  const subtotal = total;
  const totalToPay = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const totalPaid = Math.round(payments.reduce((acc, p) => acc + p.amount, 0) * 100) / 100;
  const remainingAmount = Math.max(0, Math.round((totalToPay - totalPaid) * 100) / 100);
  const change = Math.max(0, Math.round((receivedAmount - remainingAmount) * 100) / 100);

  const selectedMethodObj = activeMethods.find(m => m.name === activeMethod);
  const isCard = selectedMethodObj?.type === 'Crédito' || selectedMethodObj?.type === 'Débito';

  const filteredMaquininhas = activeMaquininhas.filter(maq => {
    if (selectedMethodObj?.type === 'Débito') return Number(maq.taxa_debito) > 0 || maq.nome.toLowerCase().includes('débito') || maq.nome.toLowerCase().includes('debito');
    if (selectedMethodObj?.type === 'Crédito') return Number(maq.taxa_credito) > 0 || maq.nome.toLowerCase().includes('crédito') || maq.nome.toLowerCase().includes('credito');
    return true;
  });

  // Calculate tax and net amount
  let currentTaxPercentage = 0;
  if (isCard && selectedMaquininhaId) {
    const maq = activeMaquininhas.find(m => m.id === selectedMaquininhaId);
    if (maq) {
      if (selectedMethodObj?.type === 'Débito') {
        currentTaxPercentage = Number(maq.taxa_debito);
      } else if (selectedMethodObj?.type === 'Crédito') {
        // For now, assuming single credit payment. Could be expanded for installments.
        currentTaxPercentage = Number(maq.taxa_credito);
      }
    }
  } else if (selectedMethodObj) {
    currentTaxPercentage = Number(selectedMethodObj.taxPercentage);
  }

  const taxAmount = (totalToPay * currentTaxPercentage) / 100;
  const netAmount = totalToPay - taxAmount;

  const selectMethod = useCallback((method: any) => {
    setActiveMethod(method.name);
    setSelectedMaquininhaId('');
    setHighlightedMaquininhaIndex(0);
    // Sugerir o valor restante para todos os métodos para agilizar
    setReceivedAmount(Math.round(remainingAmount * 100) / 100);
  }, [remainingAmount, setActiveMethod, setSelectedMaquininhaId, setHighlightedMaquininhaIndex, setReceivedAmount]);

  const selectMaquininha = useCallback((maq: any) => {
    setSelectedMaquininhaId(maq.id);
    setReceivedAmount(Math.round(remainingAmount * 100) / 100);
  }, [remainingAmount, setSelectedMaquininhaId, setReceivedAmount]);

  const addPayment = useCallback(() => {
    const amountToApply = Math.round(Math.min(receivedAmount || remainingAmount, remainingAmount) * 100) / 100;
    if (amountToApply <= 0 && remainingAmount > 0) return;

    // Recalculate tax for this specific payment part
    let partTaxPercentage = 0;
    if (isCard && selectedMaquininhaId) {
      const maq = activeMaquininhas.find(m => m.id === selectedMaquininhaId);
      if (maq) {
        if (selectedMethodObj?.type === 'Débito') partTaxPercentage = Number(maq.taxa_debito);
        else if (selectedMethodObj?.type === 'Crédito') partTaxPercentage = Number(maq.taxa_credito);
      }
    } else if (selectedMethodObj) {
      partTaxPercentage = Number(selectedMethodObj.taxPercentage);
    }

    const partTaxAmount = Math.round(((amountToApply * partTaxPercentage) / 100) * 100) / 100;
    const partNetAmount = Math.round((amountToApply - partTaxAmount) * 100) / 100;

    const newPayment = {
      method: activeMethod,
      amount: amountToApply,
      maquininhaId: isCard ? selectedMaquininhaId : null,
      taxAmount: partTaxAmount,
      netAmount: partNetAmount,
      taxPercentage: partTaxPercentage
    };

    setPayments(prev => [...prev, newPayment]);
    if (amountToApply >= remainingAmount) {
      setLastChange(receivedAmount > remainingAmount ? receivedAmount - remainingAmount : 0);
    }
    setReceivedAmount(0);
    setSelectedMaquininhaId('');
    
    // If it was the last payment, we might want to finalize, but let's let the user click confirm
  }, [activeMethod, receivedAmount, remainingAmount, isCard, selectedMaquininhaId, activeMaquininhas, selectedMethodObj, setPayments, setReceivedAmount, setSelectedMaquininhaId, setLastChange]);

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalize = useCallback(() => {
    if (remainingAmount > 0) {
      // If there's a pending amount in receivedAmount, add it first? 
      // Better to force explicit "Add" or just handle the last one
      if (receivedAmount > 0 || (isCard && selectedMaquininhaId)) {
        // Auto-add if user clicks finalize and there's valid input
        // But for safety, let's just alert or require explicit add
      }
      if (remainingAmount > 0) return;
    }

    onFinalize({
      payments,
      discount,
      subtotal,
      total: totalToPay,
      totalPaid,
      change
    });
  }, [onFinalize, payments, discount, subtotal, totalToPay, totalPaid, remainingAmount, receivedAmount, isCard, selectedMaquininhaId, change]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for handled keys
      if (e.key.startsWith('F') && !isNaN(Number(e.key.slice(1)))) {
        e.preventDefault();
        const index = Number(e.key.slice(1)) - 1;
        if (activeMethods[index]) {
          selectMethod(activeMethods[index]);
        }
      }

      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isCard && !selectedMaquininhaId) {
          if (filteredMaquininhas[highlightedMaquininhaIndex]) {
            selectMaquininha(filteredMaquininhas[highlightedMaquininhaIndex]);
          }
        } else if (remainingAmount > 0) {
          const amountToApply = Math.round((receivedAmount || remainingAmount) * 100) / 100;
          
          // Se o valor for suficiente para quitar, finaliza direto
          if (amountToApply >= remainingAmount) {
            const finalPayment = {
              method: activeMethod,
              amount: remainingAmount,
              maquininhaId: isCard ? selectedMaquininhaId : null,
              taxAmount: taxAmount,
              netAmount: netAmount,
              taxPercentage: currentTaxPercentage
            };
            
            onFinalize({
              payments: [...payments, finalPayment],
              discount,
              subtotal,
              total: totalToPay,
              totalPaid: totalPaid + remainingAmount,
              change: Math.round((amountToApply - remainingAmount) * 100) / 100
            });
          } else {
            addPayment();
          }
        } else {
          handleFinalize();
        }
      }

      if (isCard && !selectedMaquininhaId) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedMaquininhaIndex(prev => (prev + 1) % filteredMaquininhas.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedMaquininhaIndex(prev => (prev - 1 + filteredMaquininhas.length) % filteredMaquininhas.length);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMethods, filteredMaquininhas, highlightedMaquininhaIndex, isCard, selectedMaquininhaId, selectMethod, selectMaquininha, handleFinalize, onClose, addPayment, remainingAmount, receivedAmount, payments, payments.length, activeMethod, taxAmount, netAmount, currentTaxPercentage, onFinalize, discount, subtotal, totalToPay, totalPaid, selectedMethodObj]);

  // ... (shortcuts and UI implementation)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header: Resumo */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black uppercase italic text-slate-400">Total da Venda</h2>
            <p className="text-4xl font-black italic">R$ {totalToPay.toFixed(2)}</p>
            {remainingAmount > 0 && (
              <p className="text-sm font-bold text-brand-blue mt-1 uppercase italic">Faltando: R$ {remainingAmount.toFixed(2)}</p>
            )}
            {remainingAmount === 0 && (
              <p className="text-sm font-bold text-brand-green mt-1 uppercase italic">Total Pago</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm">Subtotal: R$ {subtotal.toFixed(2)}</p>
            <p className="text-sm text-red-400">Desconto: R$ {discount.toFixed(2)}</p>
            <div className="mt-2 space-y-1">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-end gap-2 text-[10px] text-slate-400">
                  <span>{p.method}: R$ {p.amount.toFixed(2)}</span>
                  <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body: Pagamento */}
        <div className="p-6 grid grid-cols-2 gap-6">
          {/* Formas de Pagamento */}
          <div className="space-y-4">
            <h3 className="font-black uppercase italic text-slate-500">Formas de Pagamento</h3>
            <div className="grid grid-cols-2 gap-2">
              {activeMethods.map((method, index) => (
                <button 
                  key={method.id}
                  onClick={() => selectMethod(method)}
                  className={cn(
                    "p-4 rounded-xl font-black italic uppercase text-sm transition-all text-left flex justify-between items-center",
                    activeMethod === method.name ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <span>{method.name}</span>
                  <span className={cn("text-[10px] opacity-50", activeMethod === method.name ? "text-white" : "text-slate-400")}>F{index + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Detalhes do Pagamento */}
          <div className="space-y-4">
            {payments.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-[10px] font-black uppercase italic text-slate-400">Pagamentos Adicionados</h4>
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-black italic uppercase text-slate-700">{p.method}</span>
                      {p.maquininhaId && (
                        <span className="text-[9px] text-slate-400">Maq: {activeMaquininhas.find(m => m.id === p.maquininhaId)?.nome}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black italic text-brand-blue">R$ {p.amount.toFixed(2)}</span>
                      <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-500 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {isCard && !selectedMaquininhaId ? (
                <motion.div 
                  key="maq-selector"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-brand-blue" />
                    </div>
                    <h4 className="font-black uppercase italic text-slate-600 text-xs">Selecione a Maquininha</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {filteredMaquininhas.map((maq, idx) => (
                      <button
                        key={maq.id}
                        onClick={() => selectMaquininha(maq)}
                        className={cn(
                          "group flex items-center justify-between p-4 border-2 rounded-xl transition-all text-left",
                          highlightedMaquininhaIndex === idx || selectedMaquininhaId === maq.id
                            ? "border-brand-blue bg-brand-blue/5" 
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <span className={cn(
                          "font-black italic uppercase",
                          highlightedMaquininhaIndex === idx || selectedMaquininhaId === maq.id ? "text-brand-blue" : "text-slate-700"
                        )}>{maq.nome}</span>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                          highlightedMaquininhaIndex === idx || selectedMaquininhaId === maq.id ? "border-brand-blue" : "border-slate-200"
                        )}>
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full transition-all",
                            highlightedMaquininhaIndex === idx || selectedMaquininhaId === maq.id ? "bg-brand-blue" : "bg-transparent"
                          )} />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="payment-details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {isCard && selectedMaquininhaId && (
                    <div className="flex items-center justify-between p-3 bg-brand-blue/5 border-2 border-brand-blue/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-brand-blue" />
                        <span className="text-xs font-black italic uppercase text-brand-blue">
                          {activeMaquininhas.find(m => m.id === selectedMaquininhaId)?.nome}
                        </span>
                      </div>
                      <button 
                        onClick={() => setSelectedMaquininhaId('')}
                        className="text-[10px] font-black uppercase italic text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Alterar
                      </button>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-sm font-black italic text-slate-500">Valor a Receber ({activeMethod})</label>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        value={receivedAmount || ''}
                        placeholder={remainingAmount.toFixed(2)}
                        onChange={(e) => setReceivedAmount(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 min-w-0 p-4 text-2xl font-black border-2 border-slate-200 rounded-xl focus:border-brand-blue focus:ring-0 transition-all"
                        autoFocus
                      />
                      <button 
                        onClick={addPayment}
                        disabled={remainingAmount <= 0}
                        className="shrink-0 px-4 bg-brand-blue text-white rounded-xl font-black italic uppercase text-xs disabled:opacity-50 whitespace-nowrap"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-black italic text-slate-500">Troco</label>
                    <div className="w-full p-4 text-2xl font-black bg-slate-100 rounded-xl text-right">
                      R$ {(remainingAmount === 0 && payments.length > 0 ? lastChange : change).toFixed(2)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 flex justify-between items-center">
          <button onClick={onClose} className="px-8 py-4 bg-slate-200 rounded-xl font-black italic uppercase">Cancelar (ESC)</button>
          <div className="flex items-center gap-4">
            {remainingAmount > 0 && (
              <span className="text-sm font-black italic uppercase text-slate-400">Faltam R$ {remainingAmount.toFixed(2)}</span>
            )}
            <button 
              onClick={handleFinalize} 
              disabled={remainingAmount > 0}
              className={cn(
                "px-8 py-4 rounded-xl font-black italic uppercase transition-all",
                remainingAmount <= 0 ? "bg-brand-green text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              Confirmar Venda (ENTER)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
