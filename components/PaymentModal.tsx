'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, ArrowLeft, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onFinalize: (paymentData: any) => void;
}

type PaymentMethod = 'AVISTA' | 'PIX' | 'CARTAO' | 'OUTROS';

export function PaymentModal({ total, onClose, onFinalize }: PaymentModalProps) {
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('CARTAO');
  const [cashAmount, setCashAmount] = useState(0);
  const [secondPaymentAmount, setSecondPaymentAmount] = useState(0);
  
  const moneyRef = useRef<HTMLInputElement>(null);
  const cardTypeRef = useRef<HTMLSelectElement>(null);
  const cardBrandRef = useRef<HTMLSelectElement>(null);
  const secondPaymentMethodRef = useRef<HTMLSelectElement>(null);
  const secondPaymentRef = useRef<HTMLInputElement>(null);

  const finalTotal = total;
  const cardValue = Math.max(0, finalTotal - cashAmount - secondPaymentAmount);

  const handleFinalize = useCallback(() => {
    onFinalize({
      method: activeMethod,
      discount: 0,
      addition: 0,
      cashAmount,
      secondPaymentAmount,
      cardValue,
      total: finalTotal,
      installments: 1
    });
  }, [onFinalize, activeMethod, cashAmount, secondPaymentAmount, cardValue, finalTotal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const inputs = [moneyRef, cardTypeRef, cardBrandRef, secondPaymentMethodRef, secondPaymentRef];
      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = inputs.findIndex(ref => ref.current === activeElement);

      if (e.key === 'Enter') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % inputs.length;
        inputs[nextIndex].current?.focus();
        if ('select' in (inputs[nextIndex].current || {})) {
          (inputs[nextIndex].current as HTMLInputElement)?.select();
        }
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveMethod('AVISTA');
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setActiveMethod('PIX');
      }
      if (e.key === 'F5') {
        e.preventDefault();
        setActiveMethod('CARTAO');
      }
      if (e.key === 'F6') {
        e.preventDefault();
        setActiveMethod('OUTROS');
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFinalize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleFinalize]);

  useEffect(() => {
    // Auto focus first field only on mount
    moneyRef.current?.focus();
    moneyRef.current?.select();
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-3xl border-2 border-emerald-100 shadow-2xl overflow-hidden flex flex-col text-slate-900 font-sans">
        
        {/* Tabs */}
        <div className="flex bg-emerald-50 p-1 border-b border-emerald-100">
          <button 
            onClick={() => setActiveMethod('AVISTA')}
            className={cn(
              "flex-1 py-4 text-xl font-black italic uppercase transition-all rounded-t-xl",
              activeMethod === 'AVISTA' ? "bg-white text-emerald-700 shadow-sm" : "text-emerald-600/60 hover:bg-emerald-100/50"
            )}
          >
            Avista - F2
          </button>
          <button 
            onClick={() => setActiveMethod('PIX')}
            className={cn(
              "flex-1 py-4 text-xl font-black italic uppercase transition-all rounded-t-xl",
              activeMethod === 'PIX' ? "bg-white text-emerald-700 shadow-sm" : "text-emerald-600/60 hover:bg-emerald-100/50"
            )}
          >
            PIX - F3
          </button>
          <button 
            onClick={() => setActiveMethod('CARTAO')}
            className={cn(
              "flex-1 py-4 text-xl font-black italic uppercase transition-all rounded-t-xl",
              activeMethod === 'CARTAO' ? "bg-white text-emerald-700 shadow-sm" : "text-emerald-600/60 hover:bg-emerald-100/50"
            )}
          >
            Cartão - F5
          </button>
          <button 
            onClick={() => setActiveMethod('OUTROS')}
            className={cn(
              "flex-1 py-4 text-xl font-black italic uppercase transition-all rounded-t-xl",
              activeMethod === 'OUTROS' ? "bg-white text-emerald-700 shadow-sm" : "text-emerald-600/60 hover:bg-emerald-100/50"
            )}
          >
            Outros - F6
          </button>
        </div>

        <div className="p-8 flex gap-12">
          {/* Left Column */}
          <div className="w-[40%] space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-emerald-900/60">Valor Cartão</label>
              <div className="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 text-2xl font-black text-right text-emerald-700">
                {formatCurrency(cardValue)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-emerald-900/60">Dinheiro</label>
              <input 
                ref={moneyRef}
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(Number(e.target.value))}
                className="w-full bg-white border border-emerald-200 rounded-lg px-4 py-3 text-2xl font-black outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-950 transition-all"
              />
            </div>
          </div>

          {/* Middle Column */}
          <div className="w-[30%] space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-emerald-900/60">Tipo Cartão</label>
              <select 
                ref={cardTypeRef}
                className="w-full bg-white border border-emerald-200 rounded-lg px-4 py-3 text-sm font-bold outline-none appearance-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-950 transition-all"
              >
                <option>Selecione...</option>
                <option>Crédito</option>
                <option>Débito</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-emerald-900/60">Bandeira</label>
              <div className="flex gap-2">
                <select 
                  ref={cardBrandRef}
                  className="flex-1 bg-white border border-emerald-200 rounded-lg px-4 py-3 text-sm font-bold outline-none appearance-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-950 transition-all"
                >
                  <option>Selecione...</option>
                  <option>Visa</option>
                  <option>Mastercard</option>
                  <option>Elo</option>
                </select>
                <button className="bg-emerald-500 p-2 rounded-lg hover:bg-emerald-600 text-white transition-colors">
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-emerald-900/60">2º Forma Pgto</label>
              <div className="flex gap-2">
                <select 
                  ref={secondPaymentMethodRef}
                  className="flex-1 bg-white border border-emerald-200 rounded-lg px-4 py-3 text-sm font-bold outline-none appearance-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-950 transition-all"
                >
                  <option>Selecione...</option>
                </select>
                <button className="bg-emerald-500 p-2 rounded-lg hover:bg-emerald-600 text-white transition-colors">
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-emerald-900/60">Valor 2º Pgto</label>
              <input 
                ref={secondPaymentRef}
                type="number"
                value={secondPaymentAmount}
                onChange={(e) => setSecondPaymentAmount(Number(e.target.value))}
                className="w-full bg-white border border-emerald-200 rounded-lg px-4 py-3 text-2xl font-black outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-emerald-950 transition-all"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-end gap-4">
              <span className="text-4xl font-black italic uppercase tracking-tighter text-emerald-900">TOTAL</span>
              <div className="bg-emerald-50 border-2 border-emerald-100 rounded-xl px-6 py-4 text-4xl font-black min-w-[200px] text-right text-emerald-900">
                {formatCurrency(finalTotal)}
              </div>
            </div>

            <div className="flex-1 bg-white border border-emerald-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-emerald-900 px-4 py-1 flex text-[10px] font-black uppercase italic text-white">
                <span className="w-1/4">Parcela</span>
                <span className="w-1/2">Validade</span>
                <span className="w-1/4 text-right">Valor</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Installment list would go here */}
                <div className="px-4 py-2 text-xs font-bold flex border-b border-emerald-50 text-emerald-900">
                  <span className="w-1/4">01</span>
                  <span className="w-1/2">27/03/2026</span>
                  <span className="w-1/4 text-right">{formatCurrency(cardValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-8 flex justify-between items-center bg-emerald-50 border-t border-emerald-100">
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="bg-white hover:bg-emerald-50 text-emerald-700 px-12 py-4 rounded-xl flex flex-col items-center gap-1 border-2 border-emerald-200 transition-all active:scale-95 shadow-sm"
            >
              <ArrowLeft size={32} />
              <span className="text-xl font-black italic uppercase">Voltar</span>
            </button>
            <button 
              onClick={handleFinalize}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-4 rounded-xl flex flex-col items-center gap-1 border-2 border-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle size={32} className="text-emerald-200" />
              <span className="text-xl font-black italic uppercase">Finalizar - F</span>
            </button>
          </div>
          
          <button className="text-emerald-900/40 hover:text-emerald-900 transition-colors">
            <Settings size={48} />
          </button>
        </div>
      </div>
    </div>
  );
}
