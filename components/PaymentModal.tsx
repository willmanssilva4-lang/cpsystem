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

type PaymentMethod = 'Dinheiro' | 'Pix' | 'Crédito' | 'Fiado' | 'Voucher';

export function PaymentModal({ total, onClose, onFinalize }: PaymentModalProps) {
  const { user, paymentMethods, maquininhas, getVoucherByCode, updateVoucher } = useERP();
  const activeMethods = paymentMethods.filter(m => m.active);
  const activeMaquininhas = maquininhas.filter(m => m.ativo);
  
  const [activeMethod, setActiveMethod] = useState<string>(activeMethods[0]?.name || 'Dinheiro');
  const [selectedMaquininhaId, setSelectedMaquininhaId] = useState<string>('');
  const [highlightedMaquininhaIndex, setHighlightedMaquininhaIndex] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);

  const [voucherCode, setVoucherCode] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const [discount, setDiscount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [lastChange, setLastChange] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const voucherInputRef = useRef<HTMLInputElement>(null);
  
  const subtotal = total;
  const totalToPay = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const totalPaid = Math.round(payments.reduce((acc, p) => acc + p.amount, 0) * 100) / 100;
  const remainingAmount = Math.max(0, Math.round((totalToPay - totalPaid) * 100) / 100);
  const change = Math.max(0, Math.round((receivedAmount - remainingAmount) * 100) / 100);
  const dynamicRemaining = Math.max(0, Math.round((remainingAmount - (receivedAmount || 0)) * 100) / 100);

  const selectedMethodObj = activeMethods.find(m => m.name === activeMethod);
  const isCard = selectedMethodObj?.type === 'Crédito' || selectedMethodObj?.type === 'Débito' || selectedMethodObj?.type === 'Pix';
  const isVoucher = selectedMethodObj?.type === 'Voucher' || activeMethod === 'Voucher';

  useEffect(() => {
    if (isVoucher) {
      setTimeout(() => {
        voucherInputRef.current?.focus();
        voucherInputRef.current?.select();
      }, 50);
    } else if (!isCard || selectedMaquininhaId) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [activeMethod, selectedMaquininhaId, isCard, isVoucher]);

  useEffect(() => {
    setReceivedAmount(Math.round(remainingAmount * 100) / 100);
  }, [remainingAmount]);

  const filteredMaquininhas = activeMaquininhas.filter(maq => {
    if (selectedMethodObj?.type === 'Débito') return (maq.taxa_debito || 0) > 0 || maq.nome.toLowerCase().includes('débito') || maq.nome.toLowerCase().includes('debito');
    if (selectedMethodObj?.type === 'Crédito') return (maq.taxa_credito || 0) > 0 || maq.nome.toLowerCase().includes('crédito') || maq.nome.toLowerCase().includes('credito');
    if (activeMethod === 'Pix' || selectedMethodObj?.type === 'Pix') return (maq.taxa_pix || 0) > 0 || maq.nome.toLowerCase().includes('pix');
    return true;
  });

  // Calculate tax and net amount
  let currentTaxPercentage = 0;
  if (isCard && selectedMaquininhaId) {
    const maq = activeMaquininhas.find(m => m.id === selectedMaquininhaId);
    if (maq) {
      if (selectedMethodObj?.type === 'Débito') {
        currentTaxPercentage = Number(maq.taxa_debito || 0);
      } else if (selectedMethodObj?.type === 'Crédito') {
        currentTaxPercentage = Number(maq.taxa_credito || 0);
      } else if (selectedMethodObj?.type === 'Pix' || activeMethod === 'Pix') {
        currentTaxPercentage = Number(maq.taxa_pix || 0);
      }
    }
  } else if (selectedMethodObj) {
    currentTaxPercentage = Number(selectedMethodObj.taxPercentage || 0);
  }

  const taxAmount = (totalToPay * currentTaxPercentage) / 100;
  const netAmount = totalToPay - taxAmount;

  const stateRef = useRef({
    payments,
    remainingAmount,
    isCard,
    selectedMaquininhaId,
    filteredMaquininhas,
    highlightedMaquininhaIndex,
    activeMethod,
    receivedAmount,
    discount,
    subtotal,
    totalToPay,
    totalPaid,
    change,
    taxAmount,
    netAmount,
    currentTaxPercentage,
    activeMethods
  });

  stateRef.current = {
    payments,
    remainingAmount,
    isCard,
    selectedMaquininhaId,
    filteredMaquininhas,
    highlightedMaquininhaIndex,
    activeMethod,
    receivedAmount,
    discount,
    subtotal,
    totalToPay,
    totalPaid,
    change,
    taxAmount,
    netAmount,
    currentTaxPercentage,
    activeMethods
  };

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
    const inputValue = inputRef.current ? Number(inputRef.current.value) : 0;
    const amountToApply = Math.round(Math.min(inputValue || remainingAmount, remainingAmount) * 100) / 100;
    if (amountToApply <= 0 && remainingAmount > 0) return;

    // Recalculate tax for this specific payment part
    let partTaxPercentage = 0;
    if (isCard && selectedMaquininhaId) {
      const maq = activeMaquininhas.find(m => m.id === selectedMaquininhaId);
      if (maq) {
        if (selectedMethodObj?.type === 'Débito') partTaxPercentage = Number(maq.taxa_debito || 0);
        else if (selectedMethodObj?.type === 'Crédito') partTaxPercentage = Number(maq.taxa_credito || 0);
        else if (selectedMethodObj?.type === 'Pix' || activeMethod === 'Pix') partTaxPercentage = Number(maq.taxa_pix || 0);
      }
    } else if (selectedMethodObj) {
      partTaxPercentage = Number(selectedMethodObj.taxPercentage || 0);
    }

    const partTaxAmount = Math.round(((amountToApply * partTaxPercentage) / 100) * 100) / 100;
    const partNetAmount = Math.round((amountToApply - partTaxAmount) * 100) / 100;

    console.log('DEBUG: Calculando taxa', {
      amountToApply,
      partTaxPercentage,
      partTaxAmount,
      isCard,
      selectedMaquininhaId
    });

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
      setLastChange(inputValue > remainingAmount ? inputValue - remainingAmount : 0);
    }
    setReceivedAmount(0);
    setSelectedMaquininhaId('');
    
    // If it was the last payment, we might want to finalize, but let's let the user click confirm
  }, [activeMethod, remainingAmount, isCard, selectedMaquininhaId, activeMaquininhas, selectedMethodObj, setPayments, setReceivedAmount, setSelectedMaquininhaId, setLastChange]);

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoucherApply = useCallback(async () => {
    if (!voucherCode) return;
    setIsValidatingVoucher(true);
    setVoucherError(null);

    const voucher = getVoucherByCode(voucherCode);
    if (!voucher) {
      setVoucherError('CUPOM INVÁLIDO OU JÁ UTILIZADO');
      setIsValidatingVoucher(false);
      return;
    }

    // Check if this voucher is already applied in current payments
    const alreadyAppliedAmount = payments
      .filter(p => p.voucherId === voucher.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const availableValue = voucher.currentValue - alreadyAppliedAmount;

    if (availableValue <= 0) {
      setVoucherError('ESTE CUPOM JÁ FOI UTILIZADO NESSA COMPRA');
      setIsValidatingVoucher(false);
      return;
    }

    const valueToUse = Math.min(availableValue, remainingAmount);
    if (valueToUse <= 0) {
      setVoucherError('O VALOR DA VENDA JÁ FOI ATINGIDO');
      setIsValidatingVoucher(false);
      return;
    }

    const newPayment = {
      method: activeMethod,
      amount: valueToUse,
      voucherCode: voucher.code,
      voucherId: voucher.id,
      taxAmount: 0,
      netAmount: valueToUse,
      taxPercentage: 0
    };

    setPayments(prev => [...prev, newPayment]);
    setVoucherCode('');
    setIsValidatingVoucher(false);
    
    // Update voucher current value locally (will be synced on finalize or handled in addSale)
    // Actually, it's better to update it on finalize
  }, [voucherCode, getVoucherByCode, remainingAmount, activeMethod]);

  const isDinheiroMethod = useCallback((methodName: string) => {
    if (!methodName) return false;
    const nameLower = methodName.toLowerCase();
    if (nameLower === 'dinheiro' || nameLower === 'dinheiro em espécie' || nameLower === 'espécie' || nameLower === 'especie') return true;
    const methodObj = activeMethods.find(m => m.name === methodName);
    return methodObj?.type === 'Dinheiro';
  }, [activeMethods]);

  const handleFinalize = useCallback(async () => {
    const current = stateRef.current;
    if (current.remainingAmount > 0) {
      return;
    }

    // Process voucher updates before finalizing
    const voucherTotals: Record<string, number> = {};
    for (const p of current.payments) {
      if (p.voucherCode) {
        voucherTotals[p.voucherCode] = (voucherTotals[p.voucherCode] || 0) + p.amount;
      }
    }

    for (const [code, amountUsed] of Object.entries(voucherTotals)) {
      const voucher = getVoucherByCode(code);
      if (voucher) {
        const newValue = Math.max(0, voucher.currentValue - amountUsed);
        await updateVoucher({
          ...voucher,
          currentValue: newValue,
          status: newValue <= 0 ? 'Utilizado' : 'Ativo'
        });
      }
    }

    const totalCashPaid = current.payments.filter(p => isDinheiroMethod(p.method)).reduce((acc, p) => acc + p.amount, 0);
    const changeAmount = current.change || lastChange;

    onFinalize({
      payments: current.payments,
      discount: current.discount,
      subtotal: current.subtotal,
      total: current.totalToPay,
      totalPaid: current.totalPaid,
      change: changeAmount,
      cashReceived: totalCashPaid > 0 ? (totalCashPaid + changeAmount) : 0
    });
  }, [onFinalize, getVoucherByCode, updateVoucher, lastChange, isDinheiroMethod]);

  const confirmAndFinalize = useCallback(() => {
    const current = stateRef.current;
    
    if (current.remainingAmount <= 0) {
      handleFinalize();
      return;
    }

    // Auto-select card machine if it's card payment and none is selected
    let maquininhaId = current.selectedMaquininhaId;
    if (current.isCard && !maquininhaId && current.filteredMaquininhas.length > 0) {
      const targetMaquininha = current.filteredMaquininhas[current.highlightedMaquininhaIndex] || current.filteredMaquininhas[0];
      if (targetMaquininha) {
        maquininhaId = targetMaquininha.id;
      }
    }

    if (current.activeMethod === 'Vale Crédito') {
       return;
    }

    const inputValue = inputRef.current ? Number(inputRef.current.value) : 0;
    const amountToApply = Math.round((inputValue || current.receivedAmount || current.remainingAmount) * 100) / 100;

    if (amountToApply >= current.remainingAmount) {
      // Recalculate tax for this payment part
      let partTaxPercentage = 0;
      if (current.isCard && maquininhaId) {
        const maq = activeMaquininhas.find(m => m.id === maquininhaId);
        if (maq) {
          if (selectedMethodObj?.type === 'Débito') partTaxPercentage = Number(maq.taxa_debito || 0);
          else if (selectedMethodObj?.type === 'Crédito') partTaxPercentage = Number(maq.taxa_credito || 0);
          else if (selectedMethodObj?.type === 'Pix' || current.activeMethod === 'Pix') partTaxPercentage = Number(maq.taxa_pix || 0);
        }
      } else if (selectedMethodObj) {
        partTaxPercentage = Number(selectedMethodObj.taxPercentage || 0);
      }

      const partTaxAmount = Math.round(((current.remainingAmount * partTaxPercentage) / 100) * 100) / 100;
      const partNetAmount = Math.round((current.remainingAmount - partTaxAmount) * 100) / 100;

      const finalPayment = {
        method: current.activeMethod,
        amount: current.remainingAmount,
        maquininhaId: current.isCard ? maquininhaId : null,
        taxAmount: partTaxAmount,
        netAmount: partNetAmount,
        taxPercentage: partTaxPercentage
      };
      
      const finalChange = Math.max(0, Math.round((amountToApply - current.remainingAmount) * 100) / 100);
      const prevCash = current.payments.filter(p => isDinheiroMethod(p.method)).reduce((acc, p) => acc + p.amount, 0);
      const cashReceived = isDinheiroMethod(current.activeMethod) ? (prevCash + amountToApply) : prevCash;

      onFinalize({
        payments: [...current.payments, finalPayment],
        discount: current.discount,
        subtotal: current.subtotal,
        total: current.totalToPay,
        totalPaid: current.totalPaid + current.remainingAmount,
        change: finalChange,
        cashReceived: cashReceived > 0 ? cashReceived : 0
      });
    } else {
      addPayment();
    }
  }, [handleFinalize, addPayment, onFinalize, activeMaquininhas, selectedMethodObj, isDinheiroMethod]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = stateRef.current;

      // Prevent default for handled keys
      if (e.key.startsWith('F') && !isNaN(Number(e.key.slice(1))) && e.key !== 'F10') {
        e.preventDefault();
        const index = Number(e.key.slice(1)) - 1;
        if (current.activeMethods[index]) {
          selectMethod(current.activeMethods[index]);
        }
      }

      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Enter' || e.key === 'F10') {
        e.preventDefault();
        confirmAndFinalize();
      }

      if (current.isCard && !current.selectedMaquininhaId && current.filteredMaquininhas.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedMaquininhaIndex(prev => (prev + 1) % current.filteredMaquininhas.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedMaquininhaIndex(prev => (prev - 1 + current.filteredMaquininhas.length) % current.filteredMaquininhas.length);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectMethod, confirmAndFinalize, onClose]);

  // ... (shortcuts and UI implementation)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header: Resumo */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black uppercase italic text-slate-400">Total da Venda</h2>
            <p className="text-4xl font-black italic">R$ {totalToPay.toFixed(2)}</p>
            {dynamicRemaining > 0 ? (
              <p className="text-sm font-bold text-brand-blue mt-1 uppercase italic">Faltando: R$ {dynamicRemaining.toFixed(2)}</p>
            ) : (
              <p className="text-sm font-bold text-brand-green mt-1 uppercase italic">
                {remainingAmount === 0 ? "Total Pago" : "Total Coberto"}
              </p>
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
                  <span className={cn(
                    "text-[11px] px-2 py-0.5 rounded-md font-extrabold transition-colors font-mono",
                    activeMethod === method.name 
                      ? "bg-white/25 text-white border border-white/40" 
                      : "bg-slate-200 text-slate-900 border border-slate-300 shadow-sm"
                  )}>
                    F{index + 1}
                  </span>
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
              {isCard && !selectedMaquininhaId && filteredMaquininhas.length > 0 ? (
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

                  {isVoucher ? (
                    <div className="space-y-3 bg-brand-blue/5 p-4 rounded-2xl border-2 border-brand-blue/10">
                      <label className="text-sm font-black italic text-brand-blue">Informar Código do Cupom</label>
                      <div className="flex gap-2">
                        <input 
                          ref={voucherInputRef}
                          type="text"
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                          placeholder="EX: ABC123DEF"
                          className="flex-1 min-w-0 p-4 text-xl font-black border-2 border-brand-blue/20 rounded-xl focus:border-brand-blue outline-none uppercase"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.nativeEvent.stopImmediatePropagation();
                              e.stopPropagation();
                              e.preventDefault();
                              handleVoucherApply();
                            }
                          }}
                        />
                        <button 
                          onClick={handleVoucherApply}
                          disabled={!voucherCode || isValidatingVoucher}
                          className="shrink-0 px-6 bg-brand-blue text-white rounded-xl font-black italic uppercase text-xs disabled:opacity-50"
                        >
                          {isValidatingVoucher ? '...' : 'Validar'}
                        </button>
                      </div>
                      {voucherError && (
                        <p className="text-[10px] font-black text-red-500 uppercase italic flex items-center gap-1">
                          <Settings size={10} /> {voucherError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-sm font-black italic text-slate-500">Valor a Receber ({activeMethod})</label>
                        <div className="flex gap-2">
                          <input 
                            ref={inputRef}
                            type="number"
                            value={receivedAmount || ''}
                            placeholder={remainingAmount.toFixed(2)}
                            onChange={(e) => setReceivedAmount(Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="flex-1 min-w-0 p-4 text-2xl font-black border-2 border-slate-200 rounded-xl focus:border-brand-blue focus:ring-0 transition-all"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'F10') {
                                e.preventDefault();
                                e.stopPropagation();
                                confirmAndFinalize();
                              }
                            }}
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
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 flex justify-between items-center">
          <button onClick={onClose} className="px-8 py-4 bg-slate-200 rounded-xl font-black italic uppercase">Cancelar (ESC)</button>
          <div className="flex items-center gap-4">
            {dynamicRemaining > 0 ? (
              <span className="text-sm font-black italic uppercase text-slate-400">Faltam R$ {dynamicRemaining.toFixed(2)}</span>
            ) : (
              <span className="text-sm font-black italic uppercase text-brand-green">
                {remainingAmount === 0 ? "Total Pago" : "Total Coberto"}
              </span>
            )}
            <button 
              onClick={confirmAndFinalize} 
              className="px-8 py-4 rounded-xl font-black italic uppercase transition-all bg-brand-green text-white hover:bg-emerald-600 shadow-md active:scale-95"
            >
              Confirmar Venda (F10)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
