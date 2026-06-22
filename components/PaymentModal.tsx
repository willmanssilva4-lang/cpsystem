'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, ArrowLeft, Settings, Plus, User, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  
  // Garante que o Voucher esteja sempre disponível como opção de pagamento no PDV
  const hasVoucherInMethods = paymentMethods.some(m => m.active && (m.type?.toUpperCase() === 'VOUCHER' || m.name?.toUpperCase() === 'VOUCHER' || m.name?.toUpperCase() === 'VALE-LOJA' || m.name?.toUpperCase() === 'VALE CRÉDITO'));
  
  const activeMethods = [
    ...paymentMethods.filter(m => m.active).map(m => {
      let inferredType = m.type;
      if (!inferredType && m.name) {
        const upperName = m.name.toUpperCase();
        if (upperName === 'CRÉDITO' || upperName === 'CREDITO') inferredType = 'Crédito';
        else if (upperName === 'DÉBITO' || upperName === 'DEBITO') inferredType = 'Débito';
        else if (upperName === 'PIX') inferredType = 'Pix';
        else if (upperName === 'DINHEIRO') inferredType = 'Dinheiro';
        else if (upperName === 'FIADO') inferredType = 'Fiado';
        else if (upperName === 'VOUCHER' || upperName === 'VALE-LOJA' || upperName === 'VALE CRÉDITO') inferredType = 'Voucher';
      }
      return {
        ...m,
        type: inferredType
      };
    }),
    ...(hasVoucherInMethods ? [] : [{
      id: 'virtual-voucher-id',
      name: 'Voucher',
      type: 'Voucher',
      active: true,
      taxPercentage: 0
    }])
  ];
  
  const activeMaquininhas = maquininhas.filter(m => m.ativo !== false);
  
  const [activeMethod, setActiveMethod] = useState<string>(activeMethods[0]?.name || 'Dinheiro');
  const [selectedMaquininhaId, setSelectedMaquininhaId] = useState<string>('');
  const [highlightedMaquininhaIndex, setHighlightedMaquininhaIndex] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [voucherCode, setVoucherCode] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const [discount, setDiscount] = useState(0);
  const [additionalValue, setAdditionalValue] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [lastChange, setLastChange] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const voucherInputRef = useRef<HTMLInputElement>(null);
  
  const subtotal = total;
  const totalToPay = Math.max(0, Math.round((subtotal - discount + additionalValue) * 100) / 100);
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
    if (selectedMethodObj?.type === 'Débito') {
      return (maq.taxa_debito || 0) > 0 || maq.nome.toUpperCase().includes('DÉBITO') || maq.nome.toUpperCase().includes('DEBITO');
    }
    if (selectedMethodObj?.type === 'Crédito') {
      return (maq.taxa_credito || 0) > 0 || (maq.taxa_credito_parcelado || 0) > 0 || maq.nome.toUpperCase().includes('CRÉDITO') || maq.nome.toUpperCase().includes('CREDITO');
    }
    if (selectedMethodObj?.type === 'Pix' || activeMethod?.toUpperCase() === 'PIX') {
      return (maq.taxa_pix || 0) > 0 || maq.nome.toUpperCase().includes('PIX');
    }
    return true;
  });

  // Auto-select first matching maquininha when method or filtered maquininhas list changes
  useEffect(() => {
    if (isCard && filteredMaquininhas.length > 0) {
      if (!selectedMaquininhaId || !filteredMaquininhas.some(m => m.id === selectedMaquininhaId)) {
        setSelectedMaquininhaId(filteredMaquininhas[0].id);
      }
    } else {
      setSelectedMaquininhaId('');
    }
  }, [activeMethod, isCard, filteredMaquininhas, selectedMaquininhaId]);

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
    additionalValue,
    subtotal,
    totalToPay,
    totalPaid,
    change,
    taxAmount,
    netAmount,
    currentTaxPercentage,
    activeMethods,
    isSubmitting: false
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
    additionalValue,
    subtotal,
    totalToPay,
    totalPaid,
    change,
    taxAmount,
    netAmount,
    currentTaxPercentage,
    activeMethods,
    isSubmitting
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
  }, [setSelectedMaquininhaId]);

  const addPayment = useCallback(() => {
    const amountToApply = Math.round(Math.min(receivedAmount || remainingAmount, remainingAmount) * 100) / 100;
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
      maquininhaId: isCard && selectedMaquininhaId ? selectedMaquininhaId : null,
      taxAmount: partTaxAmount,
      netAmount: partNetAmount,
      taxPercentage: partTaxPercentage
    };

    setPayments(prev => [...prev, newPayment]);
    if (amountToApply >= remainingAmount) {
      setLastChange(receivedAmount > remainingAmount ? receivedAmount - remainingAmount : 0);
    }
    setReceivedAmount(0);
  }, [activeMethod, remainingAmount, isCard, selectedMaquininhaId, activeMaquininhas, selectedMethodObj, setPayments, setReceivedAmount, receivedAmount]);

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

    if (current.isSubmitting) return;
    setIsSubmitting(true);

    try {
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

      await onFinalize({
        payments: current.payments,
        discount: current.discount,
        additionalValue: current.additionalValue,
        subtotal: current.subtotal,
        total: current.totalToPay,
        totalPaid: current.totalPaid,
        change: changeAmount,
        cashReceived: totalCashPaid > 0 ? (totalCashPaid + changeAmount) : 0
      });
    } catch (error) {
      console.error('Error in handleFinalize:', error);
      setIsSubmitting(false);
    }
  }, [onFinalize, getVoucherByCode, updateVoucher, lastChange, isDinheiroMethod]);

  const confirmAndFinalize = useCallback(async () => {
    const current = stateRef.current;
    
    if (current.isSubmitting) return;

    if (current.remainingAmount <= 0) {
      await handleFinalize();
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
      setIsSubmitting(true);
      try {
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

        await onFinalize({
          payments: [...current.payments, finalPayment],
          discount: current.discount,
          subtotal: current.subtotal,
          total: current.totalToPay,
          totalPaid: current.totalPaid + current.remainingAmount,
          change: finalChange,
          cashReceived: cashReceived > 0 ? cashReceived : 0
        });
      } catch (error) {
        console.error('Error in confirmAndFinalize:', error);
        setIsSubmitting(false);
      }
    } else {
      addPayment();
    }
  }, [handleFinalize, addPayment, onFinalize, activeMaquininhas, selectedMethodObj, isDinheiroMethod]);

  const quickFinalizeWithMethod = useCallback(async (methodName: string) => {
    const current = stateRef.current;
    if (current.isSubmitting) return;

    if (current.remainingAmount <= 0) {
      await handleFinalize();
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the requested method from activeMethods
      const methodObj = current.activeMethods.find(m => m.name.toLowerCase() === methodName.toLowerCase() || m.type?.toLowerCase() === methodName.toLowerCase());
      const finalMethodName = methodObj ? methodObj.name : methodName;

      // Determine maquininha for card payments if Pix or card
      let maquininhaId = null;
      if ((methodObj?.type === 'Pix' || methodObj?.type === 'Crédito' || methodObj?.type === 'Débito' || finalMethodName === 'Pix') && current.filteredMaquininhas.length > 0) {
        maquininhaId = current.filteredMaquininhas[0].id;
      }

      // Recalculate tax
      let partTaxPercentage = 0;
      if (maquininhaId) {
        const maq = activeMaquininhas.find(m => m.id === maquininhaId);
        if (maq) {
          if (methodObj?.type === 'Débito') partTaxPercentage = Number(maq.taxa_debito || 0);
          else if (methodObj?.type === 'Crédito') partTaxPercentage = Number(maq.taxa_credito || 0);
          else if (methodObj?.type === 'Pix' || finalMethodName === 'Pix') partTaxPercentage = Number(maq.taxa_pix || 0);
        }
      } else if (methodObj) {
        partTaxPercentage = Number(methodObj.taxPercentage || 0);
      }

      const partTaxAmount = Math.round(((current.remainingAmount * partTaxPercentage) / 100) * 100) / 100;
      const partNetAmount = Math.round((current.remainingAmount - partTaxAmount) * 100) / 100;

      const finalPayment = {
        method: finalMethodName,
        amount: current.remainingAmount,
        maquininhaId: maquininhaId,
        taxAmount: partTaxAmount,
        netAmount: partNetAmount,
        taxPercentage: partTaxPercentage
      };

      const prevCash = current.payments.filter(p => isDinheiroMethod(p.method)).reduce((acc, p) => acc + p.amount, 0);
      const cashReceived = isDinheiroMethod(finalMethodName) ? (prevCash + current.remainingAmount) : prevCash;

      await onFinalize({
        payments: [...current.payments, finalPayment],
        discount: current.discount,
        subtotal: current.subtotal,
        total: current.totalToPay,
        totalPaid: current.totalPaid + current.remainingAmount,
        change: 0,
        cashReceived: cashReceived > 0 ? cashReceived : 0
      });
    } catch (error) {
      console.error('Error in quickFinalizeWithMethod:', error);
      setIsSubmitting(false);
    }
  }, [onFinalize, activeMaquininhas, isDinheiroMethod, handleFinalize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = stateRef.current;

      if (current.isSubmitting) {
        e.preventDefault();
        return;
      }

      if (e.key === 'F6') {
        e.preventDefault();
        quickFinalizeWithMethod('Dinheiro');
        return;
      }
      if (e.key === 'F7') {
        e.preventDefault();
        quickFinalizeWithMethod('Pix');
        return;
      }

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

      if (current.isCard && current.filteredMaquininhas.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const currentIndex = current.filteredMaquininhas.findIndex((m: any) => m.id === current.selectedMaquininhaId);
          const nextIndex = (currentIndex + 1) % current.filteredMaquininhas.length;
          const nextMaquininha = current.filteredMaquininhas[nextIndex];
          if (nextMaquininha) {
            setSelectedMaquininhaId(nextMaquininha.id);
          }
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const currentIndex = current.filteredMaquininhas.findIndex((m: any) => m.id === current.selectedMaquininhaId);
          const prevIndex = (currentIndex - 1 + current.filteredMaquininhas.length) % current.filteredMaquininhas.length;
          const prevMaquininha = current.filteredMaquininhas[prevIndex];
          if (prevMaquininha) {
            setSelectedMaquininhaId(prevMaquininha.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectMethod, confirmAndFinalize, onClose, quickFinalizeWithMethod]);

  // ... (shortcuts and UI implementation)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-2 md:p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header: Resumo */}
        <div className="bg-slate-900 text-white p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-[10px] md:text-sm font-black uppercase italic text-slate-400">Total da Venda</h2>
            <p className="text-2xl md:text-4xl font-black italic">R$ {totalToPay.toFixed(2)}</p>
            {remainingAmount > 0 ? (
              receivedAmount < remainingAmount ? (
                <p className="text-xs md:text-sm font-bold mt-0.5 md:mt-1 uppercase italic text-amber-500">
                  Falta Pagar: R$ {dynamicRemaining.toFixed(2)}
                </p>
              ) : (
                <p className="text-xs md:text-sm font-bold mt-0.5 md:mt-1 uppercase italic text-brand-green">
                  Valor Total Selecionado
                </p>
              )
            ) : (
              <p className="text-xs md:text-sm font-bold text-brand-green mt-0.5 md:mt-1 uppercase italic">
                {remainingAmount === 0 ? "Total Pago" : "Total Coberto"}
              </p>
            )}
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto border-t border-slate-800 pt-2.5 sm:pt-0 sm:border-t-0">
            <p className="text-xs md:text-sm">Subtotal: R$ {subtotal.toFixed(2)}</p>
            <p className="text-xs md:text-sm text-red-400">Desconto: R$ {discount.toFixed(2)}</p>
            <div className="mt-1 md:mt-2 space-y-1">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-start sm:justify-end gap-2 text-[10px] text-slate-400">
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
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-y-auto flex-1">
          {/* Formas de Pagamento */}
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-xs md:text-sm font-black uppercase italic text-slate-500">Formas de Pagamento</h3>
            <div className="grid grid-cols-2 gap-1.5 md:gap-2">
              {activeMethods.map((method, index) => (
                <button 
                  key={method.id}
                  onClick={() => selectMethod(method)}
                  className={cn(
                    "p-2 md:p-4 rounded-xl font-black italic uppercase text-xs md:text-sm transition-all text-left flex justify-between items-center",
                    activeMethod === method.name ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <span className="truncate pr-1">{method.name}</span>
                  <span className={cn(
                    "hidden xs:inline-block text-[10px] md:text-[11px] px-1.5 md:px-2 py-0.5 rounded-md font-extrabold transition-colors font-mono scale-90 md:scale-100",
                    activeMethod === method.name 
                      ? "bg-white/25 text-white border border-white/40" 
                      : "bg-slate-200 text-slate-900 border border-slate-300 shadow-sm"
                  )}>
                    F{index + 1}
                  </span>
                </button>
              ))}
            </div>

            {/* Secção de Finalização Rápida */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <h4 className="text-[10px] font-black uppercase italic text-slate-400 tracking-wider">Finalização Rápida</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickFinalizeWithMethod('Dinheiro')}
                  className="group flex flex-col justify-between items-start p-3 bg-emerald-50 hover:bg-emerald-110 border-2 border-emerald-200 rounded-2xl transition-all cursor-pointer text-left"
                >
                  <div className="flex w-full justify-between items-center mb-1">
                    <span className="text-[11px] font-black tracking-wider text-emerald-800 uppercase italic">💸 Dinheiro</span>
                    <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-mono text-[9px] font-black rounded shadow-sm">F6</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 font-mono">100% à vista</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFinalizeWithMethod('Pix')}
                  className="group flex flex-col justify-between items-start p-3 bg-cyan-50 hover:bg-cyan-110 border-2 border-cyan-200 rounded-2xl transition-all cursor-pointer text-left"
                >
                  <div className="flex w-full justify-between items-center mb-1">
                    <span className="text-[11px] font-black tracking-wider text-cyan-800 uppercase italic">⚡ Pix</span>
                    <span className="px-1.5 py-0.5 bg-cyan-600 text-white font-mono text-[9px] font-black rounded shadow-sm">F7</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-700 font-mono">Instantâneo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Detalhes do Pagamento */}
          <div className="space-y-3 md:space-y-4">
            {payments.length > 0 && (
              <div className="bg-slate-50 p-2.5 md:p-3 rounded-xl border border-slate-200 space-y-1.5 md:space-y-2">
                <h4 className="text-[9px] md:text-[10px] font-black uppercase italic text-slate-400">Pagamentos Adicionados</h4>
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-1.5 md:p-2 rounded-lg border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] md:text-xs font-black italic uppercase text-slate-700">{p.method}</span>
                      {p.maquininhaId && (
                        <span className="text-[8px] md:text-[9px] text-slate-400">Maq: {activeMaquininhas.find(m => m.id === p.maquininhaId)?.nome}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-xs md:text-sm font-black italic text-brand-blue">R$ {p.amount.toFixed(2)}</span>
                      <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-500 p-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1">
                <label className="text-xs md:text-sm font-black italic text-slate-500">Valor Adicional (R$)</label>
                <input
                    type="number"
                    value={additionalValue || ''}
                    onChange={(e) => setAdditionalValue(Number(e.target.value))}
                    className="w-full p-2.5 md:p-4 text-lg font-black border-2 border-slate-200 rounded-xl focus:border-brand-blue font-mono"
                    placeholder="0.00"
                />
            </div>


            <AnimatePresence mode="wait">
              <motion.div 
                key={activeMethod}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 md:space-y-4"
              >
                {isVoucher ? (
                  <div className="space-y-2 md:space-y-3 bg-brand-blue/5 p-3 md:p-4 rounded-2xl border-2 border-brand-blue/10">
                    <label className="text-xs md:text-sm font-black italic text-brand-blue">Informar Código do Cupom</label>
                    <div className="flex gap-1.5 md:gap-2">
                      <input 
                        ref={voucherInputRef}
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        placeholder="EX: ABC123DEF"
                        className="flex-1 min-w-0 p-2.5 md:p-4 text-lg md:text-xl font-black border-2 border-brand-blue/20 rounded-xl focus:border-brand-blue outline-none uppercase"
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
                        className="shrink-0 px-4 md:px-6 bg-brand-blue text-white rounded-xl font-black italic uppercase text-[10px] md:text-xs disabled:opacity-50"
                      >
                        {isValidatingVoucher ? '...' : 'Validar'}
                      </button>
                    </div>
                    {voucherError && (
                      <p className="text-[9px] md:text-[10px] font-black text-red-500 uppercase italic flex items-center gap-1">
                        <Settings size={10} /> {voucherError}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs md:text-sm font-black italic text-slate-500">Valor a Receber ({activeMethod})</label>
                      <div className="flex gap-1.5 md:gap-2">
                        <input 
                          ref={inputRef}
                          type="number"
                          disabled={isSubmitting}
                          value={receivedAmount || ''}
                          placeholder={remainingAmount.toFixed(2)}
                          onChange={(e) => setReceivedAmount(Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 min-w-0 p-2.5 md:p-4 text-lg md:text-2xl font-black border-2 border-slate-200 rounded-xl focus:border-brand-blue focus:ring-0 transition-all font-mono disabled:opacity-50"
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
                          type="button"
                          disabled={remainingAmount <= 0 || isSubmitting}
                          className="shrink-0 px-4 md:px-6 bg-brand-blue text-white rounded-xl font-black italic uppercase text-xs disabled:opacity-50 whitespace-nowrap active:scale-95 transition-all shadow-md"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    {isCard && filteredMaquininhas.length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                        <label className="text-xs font-black italic text-slate-500 uppercase flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CreditCard size={14} className="text-brand-blue" />
                            Selecione o Terminal / Maquininha
                          </span>
                          <span className="text-[10px] text-brand-blue font-black bg-brand-blue/10 px-2 py-0.5 rounded flex items-center gap-1">
                            Setas ↑ ↓ Mudar
                          </span>
                        </label>
                        <select
                          value={selectedMaquininhaId}
                          onChange={(e) => setSelectedMaquininhaId(e.target.value)}
                          className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-black italic text-xs md:text-sm text-slate-700 focus:border-brand-blue outline-none"
                        >
                          {filteredMaquininhas.map((maq) => (
                            <option key={maq.id} value={maq.id}>
                              {maq.nome} {selectedMethodObj?.type === 'Débito' ? `(Taxa Débito: ${maq.taxa_debito || 0}%)` : selectedMethodObj?.type === 'Crédito' ? `(Taxa Crédito: ${maq.taxa_credito || 0}%)` : `(Taxa Pix: ${maq.taxa_pix || 0}%)`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs md:text-sm font-black italic text-slate-500">Troco</label>
                      <div className="w-full p-2.5 md:p-4 text-lg md:text-2xl font-black bg-slate-100 rounded-xl text-right font-mono">
                        R$ {(remainingAmount === 0 && payments.length > 0 ? lastChange : change).toFixed(2)}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 bg-slate-50 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
          <button 
            type="button"
            disabled={isSubmitting}
            onClick={onClose} 
            className="px-4 py-2.5 md:px-8 md:py-4 bg-slate-200 rounded-xl font-black italic uppercase text-xs md:text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar <span className="hidden md:inline">(ESC)</span>
          </button>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            {remainingAmount > 0 ? (
              receivedAmount < remainingAmount ? (
                <span className="text-xs md:text-sm font-black italic uppercase text-center sm:text-right text-red-500">
                  Falta Pagar: R$ {dynamicRemaining.toFixed(2)}
                </span>
              ) : (
                <span className="text-xs md:text-sm font-black italic uppercase text-center sm:text-right text-brand-green">
                  Valor Total Selecionado
                </span>
              )
            ) : (
              <span className="text-xs md:text-sm font-black italic uppercase text-brand-green text-center sm:text-right">
                {remainingAmount === 0 ? "Total Pago" : "Total Coberto"}
              </span>
            )}
            <button 
              type="button"
              disabled={isSubmitting}
              onClick={confirmAndFinalize} 
              className="px-4 py-3 md:px-8 md:py-4 rounded-xl font-black italic uppercase transition-all bg-brand-green text-white hover:bg-emerald-600 shadow-md active:scale-95 text-xs md:text-sm text-center flex items-center justify-center gap-2 disabled:bg-emerald-800 disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processando...
                </>
              ) : (
                <>
                  Confirmar Venda <span className="hidden md:inline font-mono ml-1">(F10)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
