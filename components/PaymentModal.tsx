'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, ArrowLeft, Settings, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useERP } from '@/lib/context';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onFinalize: (paymentData: any) => void;
}

type PaymentMethod = 'Dinheiro' | 'Pix' | 'Crédito' | 'Débito' | 'Voucher' | 'Fiado';

export function PaymentModal({ total, onClose, onFinalize }: PaymentModalProps) {
  const { user } = useERP();
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('Crédito');
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
        setActiveMethod('Dinheiro');
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setActiveMethod('Pix');
      }
      if (e.key === 'F5') {
        e.preventDefault();
        setActiveMethod('Crédito');
      }
      if (e.key === 'F6') {
        e.preventDefault();
        setActiveMethod('Voucher');
      }
      if (e.key === 'F7') {
        e.preventDefault();
        setActiveMethod('Fiado');
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
      <div className="bg-white w-full max-w-5xl rounded-3xl border-2 border-brand-border shadow-2xl overflow-hidden flex flex-col text-slate-900 font-sans">
        
        {/* Tabs */}
        <div className="flex bg-slate-50 p-1 border-b border-brand-border overflow-x-auto">
          <button 
            onClick={() => setActiveMethod('Dinheiro')}
            className={cn(
              "flex-1 py-4 px-4 text-xl font-black italic uppercase transition-all rounded-t-xl whitespace-nowrap",
              activeMethod === 'Dinheiro' ? "bg-white text-brand-text-main shadow-sm" : "text-brand-blue/60 hover:bg-brand-border/50"
            )}
          >
            Dinheiro - F2
          </button>
          <button 
            onClick={() => setActiveMethod('Pix')}
            className={cn(
              "flex-1 py-4 px-4 text-xl font-black italic uppercase transition-all rounded-t-xl whitespace-nowrap",
              activeMethod === 'Pix' ? "bg-white text-brand-text-main shadow-sm" : "text-brand-blue/60 hover:bg-brand-border/50"
            )}
          >
            PIX - F3
          </button>
          <button 
            onClick={() => setActiveMethod('Crédito')}
            className={cn(
              "flex-1 py-4 px-4 text-xl font-black italic uppercase transition-all rounded-t-xl whitespace-nowrap",
              activeMethod === 'Crédito' ? "bg-white text-brand-text-main shadow-sm" : "text-brand-blue/60 hover:bg-brand-border/50"
            )}
          >
            Crédito - F5
          </button>
          <button 
            onClick={() => setActiveMethod('Débito')}
            className={cn(
              "flex-1 py-4 px-4 text-xl font-black italic uppercase transition-all rounded-t-xl whitespace-nowrap",
              activeMethod === 'Débito' ? "bg-white text-brand-text-main shadow-sm" : "text-brand-blue/60 hover:bg-brand-border/50"
            )}
          >
            Débito
          </button>
          <button 
            onClick={() => setActiveMethod('Voucher')}
            className={cn(
              "flex-1 py-4 px-4 text-xl font-black italic uppercase transition-all rounded-t-xl whitespace-nowrap",
              activeMethod === 'Voucher' ? "bg-white text-brand-text-main shadow-sm" : "text-brand-blue/60 hover:bg-brand-border/50"
            )}
          >
            Voucher - F6
          </button>
          <button 
            onClick={() => setActiveMethod('Fiado')}
            className={cn(
              "flex-1 py-4 px-4 text-xl font-black italic uppercase transition-all rounded-t-xl whitespace-nowrap",
              activeMethod === 'Fiado' ? "bg-white text-brand-text-main shadow-sm" : "text-brand-blue/60 hover:bg-brand-border/50"
            )}
          >
            Fiado - F7
          </button>
        </div>

        <div className="p-8 flex gap-12">
          {/* Left Column */}
          <div className="w-[40%] space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-brand-text-main/60">Valor Cartão</label>
              <div className="w-full bg-slate-50 border border-brand-border rounded-lg px-4 py-3 text-2xl font-black text-right text-brand-text-main">
                {formatCurrency(cardValue)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-brand-text-main/60">Dinheiro</label>
              <input 
                ref={moneyRef}
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(Number(e.target.value))}
                className="w-full bg-white border border-brand-border rounded-lg px-4 py-3 text-2xl font-black outline-none focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 text-brand-text-main transition-all"
              />
            </div>
          </div>

          {/* Middle Column */}
          <div className="w-[30%] space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-brand-text-main/60">Tipo Cartão</label>
              <select 
                ref={cardTypeRef}
                className="w-full bg-white border border-brand-border rounded-lg px-4 py-3 text-sm font-bold outline-none appearance-none focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 text-brand-text-main transition-all"
              >
                <option>Selecione...</option>
                <option>Crédito</option>
                <option>Débito</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-brand-text-main/60">Bandeira</label>
              <div className="flex gap-2">
                <select 
                  ref={cardBrandRef}
                  className="flex-1 bg-white border border-brand-border rounded-lg px-4 py-3 text-sm font-bold outline-none appearance-none focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 text-brand-text-main transition-all"
                >
                  <option>Selecione...</option>
                  <option>Visa</option>
                  <option>Mastercard</option>
                  <option>Elo</option>
                </select>
                <button className="bg-brand-blue-hover p-2 rounded-lg hover:bg-brand-blue text-white transition-colors">
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-brand-text-main/60">2º Forma Pgto</label>
              <div className="flex gap-2">
                <select 
                  ref={secondPaymentMethodRef}
                  className="flex-1 bg-white border border-brand-border rounded-lg px-4 py-3 text-sm font-bold outline-none appearance-none focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 text-brand-text-main transition-all"
                >
                  <option>Selecione...</option>
                </select>
                <button className="bg-brand-blue-hover p-2 rounded-lg hover:bg-brand-blue text-white transition-colors">
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black italic uppercase text-brand-text-main/60">Valor 2º Pgto</label>
              <input 
                ref={secondPaymentRef}
                type="number"
                value={secondPaymentAmount}
                onChange={(e) => setSecondPaymentAmount(Number(e.target.value))}
                className="w-full bg-white border border-brand-border rounded-lg px-4 py-3 text-2xl font-black outline-none focus:border-brand-blue-hover focus:ring-4 focus:ring-brand-blue-hover/10 text-brand-text-main transition-all"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-end gap-4">
              <span className="text-4xl font-black italic uppercase tracking-tighter text-brand-text-main">TOTAL</span>
              <div className="bg-slate-50 border-2 border-brand-border rounded-xl px-6 py-4 text-4xl font-black min-w-[200px] text-right text-brand-text-main">
                {formatCurrency(finalTotal)}
              </div>
            </div>

            <div className="flex-1 bg-white border border-brand-border rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-brand-text-main px-4 py-1 flex text-[10px] font-black uppercase italic text-white">
                <span className="w-1/4">Parcela</span>
                <span className="w-1/2">Validade</span>
                <span className="w-1/4 text-right">Valor</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Installment list would go here */}
                <div className="px-4 py-2 text-xs font-bold flex border-b border-slate-50 text-brand-text-main">
                  <span className="w-1/4">01</span>
                  <span className="w-1/2">27/03/2026</span>
                  <span className="w-1/4 text-right">{formatCurrency(cardValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-8 flex justify-between items-center bg-slate-50 border-t border-brand-border">
          <div className="flex items-center gap-8">
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="bg-white hover:bg-slate-50 text-brand-text-main px-12 py-4 rounded-xl flex flex-col items-center gap-1 border-2 border-brand-border transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={32} />
                <span className="text-xl font-black italic uppercase">Voltar</span>
              </button>
              <button 
                onClick={handleFinalize}
                className="bg-brand-blue hover:bg-brand-blue-hover text-white px-12 py-4 rounded-xl flex flex-col items-center gap-1 border-2 border-brand-text-sec transition-all active:scale-95 shadow-lg shadow-brand-blue/20"
              >
                <CheckCircle size={32} className="text-brand-border" />
                <span className="text-xl font-black italic uppercase">Finalizar - F</span>
              </button>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase italic text-brand-text-main/40">Atendente</span>
              <div className="flex items-center gap-2 text-brand-text-main">
                <div className="size-8 rounded-full bg-brand-blue/10 flex items-center justify-center">
                  <User size={16} className="text-brand-blue" />
                </div>
                <span className="text-lg font-black italic uppercase">{user?.name || 'SISTEMA'}</span>
              </div>
            </div>
          </div>
          
          <button className="text-brand-text-main/40 hover:text-brand-text-main transition-colors">
            <Settings size={48} />
          </button>
        </div>
      </div>
    </div>
  );
}
